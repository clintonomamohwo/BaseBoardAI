"""
run_distance_between_us.py

Runs "The Distance Between Us" through the full BaseBoard pipeline:

  Stage 1 — forge-pipeline-stream (LLM extraction, skip_images=True)
              → 3 characters, 8 scenes, ~15 frames
              → Saved: scripts/output/distance_between_us/storyboard/project.json

  Stage 2 — character-package/generate  (standard sections per character)
              → portrait, turnaround (5 views), expressions (6), poses (4),
                outfits (4), props
              → Saved: scripts/output/distance_between_us/characters/<id>/...

  Stage 3 — character-package/generate-full-pack  (premium sections)
              → turnaround_360, premium_poses, material_closeups
              → Saved: scripts/output/distance_between_us/characters/<id>/...

  Stage 4 — reforge-composition per frame (storyboard images)
              → Updated project.json with generated_image_url per frame

Characters:  Emma Clarke (Toronto), Kai Tanaka (Tokyo), Lucas Ferreira (Toronto)
Artifacts:   Shared Sketchbook, Sunrise Polaroid, Vintage Camera,
             Cherry Blossom Wish Ribbon, Boarding Pass, Compass Pendant
Genre:       Contemporary Romance / Drama
Render:      flat_color

Usage:
    cd /path/to/BaseBoardAI/backend
    source .venv/bin/activate
    python3 ../scripts/run_distance_between_us.py

Output tree:
    scripts/output/distance_between_us/
        storyboard/
            project.json
        characters/
            <char_id>/
                portrait.png
                turnaround/{front, three_q_front, side, three_q_back, back}.png
                expressions/{neutral, happy, angry, sad, surprised, determined}.png
                poses/{standing, walking, running, hero_pose}.png
                outfits/{default, casual, combat, formal}.png
                props/<word>.png
                turnaround_360/{deg_000 … deg_315}.png
                premium_poses/{t_pose, a_pose, crouching, climbing,
                               fighting_stance, falling, celebrating, kneeling}.png
                material_closeups/{face_closeup, hair_closeup, fabric_closeup,
                                   hand_closeup, eye_closeup, accessory}.png
"""

import base64
import json
import pathlib
import sys
import time
import urllib.request

import httpx

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BASE_URL    = "http://localhost:8000"
RENDER      = "flat_color"
SCRIPT_PATH = pathlib.Path(__file__).parent / "the_distance_between_us.md"
OUT_ROOT    = pathlib.Path(__file__).parent / "output" / "distance_between_us"

STANDARD_SECTIONS = ["portrait", "turnaround", "expressions", "poses", "outfits", "props"]
PREMIUM_TARGETS   = ["turnaround_360", "premium_poses", "material_closeups"]

# ---------------------------------------------------------------------------
# Pipeline payload
# ---------------------------------------------------------------------------

RAW_CHARACTER_NOTES = """
Emma Clarke — age 26, Toronto, Canada. Graphic design student and part-time studio
assistant. Creative, observant, quietly stubborn, fiercely loyal.
Appearance: warm medium-brown skin, natural hair pinned up with a pencil or charcoal
stick, paint-stained fingers, wire-frame glasses, layered knits and vintage denim.
Compass pendant always visible at the throat. Owns the shared sketchbook.
Arc: learns to trust the future she has built rather than the certainty she craves.

Kai Tanaka — age 27, Tokyo, Japan. Robotics engineer, university research lab.
Methodical, tender, quietly funny. Thinks in systems but feels deeply.
Appearance: Japanese, lean build, dark hair grown slightly too long, grease or solder
marks on hands, plain technical tees under open flannels. Sunrise polaroid in
passport holder.
Arc: learns that commitment is not a sacrifice — it is a choice made freely.

Lucas Ferreira — age 26, Toronto, Canada (Brazilian heritage). Documentary photography
student. Perceptive, warm, self-deprecating. Fiercely protective of Emma while honest
enough to challenge her.
Appearance: Brazilian-Canadian, curly dark hair, vintage camera strap always over one
shoulder, well-worn canvas jacket, laugh lines forming.
Arc: learns to let Emma go and trust that she has chosen well.
"""

RAW_WORLD_NOTES = """
Contemporary setting. Two cities, thirteen time zones apart.

Toronto, Canada:
Exposed-brick art studios, late-night diners, university library stacks.
Grey skies and warm interiors. The Studio Circle gathers on Friday nights.
Emma's apartment: small, string lights, half-finished canvases, library books.
Lucas's photo lab: film developing trays, prints on wire lines.
Pearson International Airport: arrivals hall, barriers, harsh fluorescent light.
Toronto waterfront: city skyline reflected in the lake, golden-hour light.

Tokyo, Japan:
Robotics lab corridors, fluorescent precision.
Cherry blossom parks, shrine walkways, pre-dawn quiet.
Neighbourhood shrines with wooden wish-ribbon frames.
Kai's apartment: kitchen table, laptop, botanics equipment, polaroid above the monitor.

Long-distance relationship context:
Video calls disrupted by buffering. Care packages. Time-zone math.
A shared sketchbook posted back and forth — Emma draws, Kai annotates.
Six artifacts anchor the relationship across the distance:
  - Shared Sketchbook: passed by post, filled jointly, a future built page by page
  - Sunrise Polaroid: a Tokyo sunrise Emma sent; Kai keeps it above his desk
  - Vintage Camera: Lucas's 35mm film camera, documents everything
  - Cherry Blossom Wish Ribbon: tied at a Tokyo shrine, "Bring us together"
  - Boarding Pass: multiple cancelled tickets; the final one is used
  - Compass Pendant: silver compass necklace, Kai's first-anniversary gift to Emma
"""

RAW_WORLD_NOTES += """
Artifact ownership and scene appearances:
  Shared Sketchbook (Emma & Kai): images 1, 2, 9, 11, 15
  Sunrise Polaroid (Kai): images 2, 6, 11
  Vintage Camera (Lucas): images 3, 5, 10, 15
  Cherry Blossom Wish Ribbon (Kai): images 8, 11, 15
  Boarding Pass (Kai): images 6, 11, 13
  Compass Pendant (Emma): images 1, 4, 9, 13, 15
"""

GLOBAL_AESTHETIC = (
    "Contemporary romance drama, present day, naturalistic lighting, "
    "warm interior tones contrasted with cool city exteriors, "
    "intimate character moments, golden-hour outdoor scenes, "
    "emotionally grounded cinematography"
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _save(data_url: str | None, path: pathlib.Path) -> bool:
    """Decode a base64 data URL (or plain URL) and write to disk as PNG."""
    if not data_url:
        return False
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        if data_url.startswith("data:"):
            _, b64 = data_url.split(",", 1)
            path.write_bytes(base64.b64decode(b64))
        else:
            urllib.request.urlretrieve(data_url, path)
        return True
    except Exception as e:
        print(f"    ✗ save failed {path.name}: {e}")
        return False


def _health_check(client: httpx.Client) -> None:
    try:
        h = client.get(f"{BASE_URL}/health", timeout=10).json()
        print(f"Backend: {h.get('status')}  model: {h.get('model')}\n")
    except Exception:
        print("✗ Cannot reach backend at http://localhost:8000 — is uvicorn running?")
        sys.exit(1)


# ---------------------------------------------------------------------------
# Stage 1 — LLM extraction
# ---------------------------------------------------------------------------

def run_pipeline(client: httpx.Client, skip_images: bool = True) -> dict:
    label = "STAGE 1 — LLM EXTRACTION" if skip_images else "STAGE 1 — FORGE PIPELINE"
    print("=" * 60)
    print(label)
    print("  Story: The Distance Between Us")
    print("  Characters: Emma Clarke, Kai Tanaka, Lucas Ferreira")
    print("=" * 60)

    payload = {
        "project_title": "The Distance Between Us",
        "global_aesthetic": GLOBAL_AESTHETIC,
        "render_style": RENDER,
        "director_style": "intimate",
        "raw_character_notes": RAW_CHARACTER_NOTES,
        "raw_world_notes": RAW_WORLD_NOTES,
        "raw_script_text": SCRIPT_PATH.read_text(),
        "skip_images": skip_images,
    }

    project: dict = {}
    t0   = time.time()
    kind = None

    with client.stream(
        "POST",
        f"{BASE_URL}/storyboard/forge-pipeline-stream",
        json=payload,
        timeout=1800,
    ) as resp:
        resp.raise_for_status()
        for raw_line in resp.iter_lines():
            if raw_line.startswith("event:"):
                kind = raw_line[6:].strip()
                continue
            if not raw_line.startswith("data:"):
                continue

            data = json.loads(raw_line[5:].strip())

            if kind == "stage_start":
                stage  = data.get("stage", "?")
                total  = data.get("total", "")
                suffix = f"  ({total} frames)" if total else ""
                print(f"\n  ▶ {stage}{suffix}")

            elif kind == "stage_done":
                stage = data.get("stage", "?")
                extra = " ".join(f"{k}={v}" for k, v in data.items() if k != "stage")
                print(f"  ✓ {stage}  {extra}")

            elif kind == "image_progress":
                done  = data.get("done", 0)
                total = data.get("total", 0)
                bar   = "█" * done + "░" * (total - done)
                print(f"\r  [{bar}] {done}/{total}", end="", flush=True)

            elif kind == "complete":
                project = data
                elapsed = time.time() - t0
                print(f"\n\n  ✓ Pipeline complete in {elapsed:.0f}s")
                print(f"    Project ID : {project.get('db_id')}")
                print(f"    Characters : {len(project.get('characters', []))}")
                print(f"    Scenes     : {len(project.get('scenes', []))}")
                frames = sum(len(s.get("frames", [])) for s in project.get("scenes", []))
                print(f"    Frames     : {frames}")
                if project.get("truncated"):
                    print("  ⚠ Output was truncated — partial scenes recovered")

            elif kind == "error":
                print(f"\n  ✗ Pipeline error: {data.get('detail')}")
                sys.exit(1)

    # Save full project JSON
    out = OUT_ROOT / "storyboard"
    out.mkdir(parents=True, exist_ok=True)
    (out / "project.json").write_text(json.dumps(project, indent=2))
    print(f"    Saved → {out / 'project.json'}")

    return project


# ---------------------------------------------------------------------------
# Stage 2 & 3 — Character packages
# ---------------------------------------------------------------------------

def _build_char_data(char: dict) -> dict:
    char_id = char.get("id") or char.get("char_id", "unknown")
    return {
        "id": char_id,
        "name": char.get("name", char_id),
        "wardrobe_defaults": char.get("wardrobe_defaults", ""),
        "facial_blueprint": char.get("facial_blueprint") or {
            "base_ethnicity_or_type": "unspecified",
            "estimated_age": 26,
            "bone_structure": "average",
            "distinct_markers": None,
            "fixed_seed_reference": None,
        },
    }


def _call_generate(client: httpx.Client, char_data: dict, out_dir: pathlib.Path) -> int:
    """POST /character-package/generate — 1 sheet per section, sliced."""
    resp = client.post(
        f"{BASE_URL}/storyboard/character-package/generate",
        json={"char_data": char_data, "render_style": RENDER, "sections": STANDARD_SECTIONS},
        timeout=600,
    )
    resp.raise_for_status()
    saved = 0
    for section, value in resp.json().items():
        if isinstance(value, dict):
            for key, url in value.items():
                if _save(url, out_dir / section / f"{key}.png"):
                    saved += 1
        elif isinstance(value, str):
            if _save(value, out_dir / f"{section}.png"):
                saved += 1
    return saved


def _call_full_pack(client: httpx.Client, char_data: dict, out_dir: pathlib.Path) -> int:
    """POST /character-package/generate-full-pack — 1 sheet per section, sliced."""
    resp = client.post(
        f"{BASE_URL}/storyboard/character-package/generate-full-pack",
        json={"char_data": char_data, "render_style": RENDER, "targets": PREMIUM_TARGETS},
        timeout=600,
    )
    resp.raise_for_status()
    saved = 0
    for section, images in resp.json().items():
        if not isinstance(images, dict):
            continue
        for key, url in images.items():
            if _save(url, out_dir / section / f"{key}.png"):
                saved += 1
    return saved


def run_character_packages(client: httpx.Client, project: dict) -> None:
    print("\n" + "=" * 60)
    print("STAGE 2 — CHARACTER PACKAGES")
    print("  /generate         portrait + 4 sheets (turnaround, expressions,")
    print("                    poses, outfits) + props  →  1 API call/sheet")
    print("  /generate-full-pack  3 premium sheets (turnaround_360,")
    print("                    premium_poses, material_closeups)")
    print("=" * 60)

    characters = project.get("characters", [])
    if not characters:
        print("  No characters found — skipping.")
        return

    print(f"  {len(characters)} character(s)\n")

    for char in characters:
        char_id   = char.get("id") or char.get("char_id", "unknown")
        name      = char.get("name", char_id)
        out_dir   = OUT_ROOT / "characters" / char_id
        char_data = _build_char_data(char)
        t0        = time.time()
        saved     = 0

        print(f"  ── {name} ({char_id})")

        print(f"     standard sections ...", end=" ", flush=True)
        try:
            n = _call_generate(client, char_data, out_dir)
            saved += n
            print(f"✓  {n} images")
        except httpx.HTTPStatusError as e:
            print(f"✗  HTTP {e.response.status_code}: {e.response.text[:120]}")
        except Exception as e:
            print(f"✗  {e}")

        print(f"     premium sections  ...", end=" ", flush=True)
        try:
            n = _call_full_pack(client, char_data, out_dir)
            saved += n
            print(f"✓  {n} images")
        except httpx.HTTPStatusError as e:
            print(f"✗  HTTP {e.response.status_code}: {e.response.text[:120]}")
        except Exception as e:
            print(f"✗  {e}")

        elapsed = time.time() - t0
        print(f"     {saved} images saved  {elapsed:.0f}s → {out_dir}\n")


# ---------------------------------------------------------------------------
# Stage 4 — Storyboard frame images
# ---------------------------------------------------------------------------

def run_storyboard_images(client: httpx.Client, project: dict) -> None:
    scenes       = project.get("scenes", [])
    total_frames = sum(len(s.get("frames", [])) for s in scenes)
    db_id        = project.get("db_id")

    print("\n" + "=" * 60)
    print("STAGE 3 — STORYBOARD IMAGES")
    print(f"  {total_frames} frames  ·  project db_id={db_id}")
    print("=" * 60)

    if not scenes:
        print("  No scenes found — skipping.")
        return

    # Also save each frame image as a standalone PNG
    frames_dir = OUT_ROOT / "storyboard" / "frames"

    done = 0
    for scene in scenes:
        scene_num = scene.get("scene_number", 0)
        for frame in scene.get("frames", []):
            frame_num = frame.get("frame_number", 0)
            try:
                resp = client.post(
                    f"{BASE_URL}/storyboard/reforge-composition",
                    json={"frame": frame, "scene": scene, "render_style": RENDER},
                    timeout=120,
                )
                resp.raise_for_status()
                result = resp.json()
                img_url = result.get("generated_image_url")
                frame["generated_image_url"] = img_url
                # Save individual frame PNG
                _save(img_url, frames_dir / f"s{scene_num:02d}_f{frame_num:03d}.png")
                done += 1
                bar = "█" * done + "░" * (total_frames - done)
                print(f"\r  [{bar}] {done}/{total_frames}", end="", flush=True)
            except Exception as e:
                print(f"\n  ✗ Frame {frame_num} scene {scene_num}: {e}")

    print(f"\n  ✓ {done}/{total_frames} frames generated")

    # Save updated project JSON (now includes generated_image_url per frame)
    out = OUT_ROOT / "storyboard"
    out.mkdir(parents=True, exist_ok=True)
    (out / "project.json").write_text(json.dumps(project, indent=2))
    print(f"    Saved → {out / 'project.json'}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    client = httpx.Client(timeout=900)
    _health_check(client)

    # Stage 1: LLM extraction (no images yet — characters come first)
    project = run_pipeline(client, skip_images=True)

    # Stage 2: Character packages (sheet → slice, 1 API call per sheet type)
    run_character_packages(client, project)

    # Stage 3: Storyboard frame images (reforge per frame)
    run_storyboard_images(client, project)

    client.close()

    total_chars = len(project.get("characters", []))
    total_frames = sum(len(s.get("frames", [])) for s in project.get("scenes", []))

    print("\n" + "=" * 60)
    print("DONE — The Distance Between Us")
    print(f"  Characters  → {OUT_ROOT / 'characters'}/  ({total_chars} dirs)")
    print(f"  Frames      → {OUT_ROOT / 'storyboard' / 'frames'}/  ({total_frames} PNGs)")
    print(f"  Project     → {OUT_ROOT / 'storyboard' / 'project.json'}")
    print("=" * 60)


if __name__ == "__main__":
    main()
