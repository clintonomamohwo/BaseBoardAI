"""
run_tom_and_jerry.py

Runs Tom & Jerry through the full BaseBoard pipeline:
  1. forge-pipeline-stream    — LLM extraction + image gen with live SSE progress
  2. character-package/generate          — portrait, turnaround (5 views),
     expressions (9), poses (7), outfits (7), props (5)    → 34 images/char
  3. character-package/generate-full-pack — turnaround_360 (8 views),
     premium_poses (8), material_closeups (5)               → 21 images/char

Total: 55 images per character × 2 characters = 110 character reference images.
Expected output: 2 characters, 6 scenes, ~18 frames (3 per scene).
Script: 6 scenes — classic cat-and-mouse chase, cinematic framing.
Render style: flat_color throughout.

Usage:
    cd /path/to/BaseBoardAI/backend
    source .venv/bin/activate
    python3 ../scripts/run_tom_and_jerry.py

Output:
    scripts/output/tom_and_jerry/storyboard/            project JSON
    scripts/output/tom_and_jerry/characters/<id>/       per-character images
      portrait.png
      turnaround/{front, three_q_front, side, three_q_back, back}.png
      expressions/{neutral, happy, laughing, angry, sad, surprised,
                   fearful, thinking, crying}.png
      poses/{standing, walking, running, sitting, pointing,
             holding_object, hero_pose}.png
      outfits/{default, casual, formal, travel, combat, winter, summer}.png
      props/<word>.png
      turnaround_360/{deg_000 … deg_315}.png
      premium_poses/{t_pose, a_pose, crouching, climbing, fighting_stance,
                     falling, celebrating, kneeling}.png
      material_closeups/{face_closeup, hair_closeup, fabric_closeup,
                         hand_closeup, eye_closeup}.png
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
OUT_ROOT    = pathlib.Path(__file__).parent / "output" / "tom_and_jerry"

# /generate  sections  (34 images per character)
STANDARD_SECTIONS = ["portrait", "turnaround", "expressions", "poses", "outfits", "props"]

# /generate-full-pack  targets  (21 images per character)
PREMIUM_TARGETS = ["turnaround_360", "premium_poses", "material_closeups"]

# ---------------------------------------------------------------------------
# Story content
# ---------------------------------------------------------------------------

RAW_CHARACTER_NOTES = """
Tom Cat — Anthropomorphic grey domestic cat. Origin: A wealthy suburban household, 1940s Americana.
Faction: House Pet (perpetual loser).
Profession: House cat — self-appointed mouse-catcher, amateur chef, and accidental musician.
Personality: Proud, vain, easily embarrassed, dramatic, surprisingly creative, terrible at everything.
Arc: Never learns. Keeps trying. Always fails. And somehow, that is the point.
Physical design: Slate-grey fur, white muzzle and chest, bright green eyes, long expressive tail.
Wears nothing — but occasionally dons a chef hat, boxing gloves, or formal bow-tie for schemes.
Signature props: rolling pin, frying pan, oversized mallet.

Jerry Mouse — Anthropomorphic brown house mouse. Origin: Same suburban household.
Faction: Free Agent (permanent winner).
Profession: Freelance chaos agent, improvised engineer, and supreme tactician.
Personality: Clever, cheeky, gleefully mischievous, always two steps ahead, secretly kind.
Arc: Wins every encounter, usually with the object Tom tried to use against him.
Physical design: Small, round, warm brown fur, oversized round ears, tiny white gloves,
wide expressive eyes, compact athletic build. No clothing — his confidence is his outfit.
Signature props: tiny hammer, cheese wedge, mousehole door.
"""

RAW_WORLD_NOTES = """
Setting: A grand 1940s American suburban house. Large, well-furnished, slightly chaotic.

Key locations:
- The Kitchen: Heart of all conflict. Gleaming white tiles, gas stove, icebox, hanging pots.
  Linoleum floor perfect for sliding. Every surface a weapon or escape route.
- The Living Room: Persian rug, grand piano, velvet armchairs, fireplace.
  Tom performs here. Jerry escapes here. Furniture is always destroyed here.
- The Backyard: White picket fence, oak tree, garden hose, birdbath.
  Outdoor chases. Tom always ends up in the birdbath.
- Jerry's Mousehole: A perfect arched door in the baseboard. Warm amber interior.
  Tom's paw can never fit through. Jerry's sanctuary.
- The Hallway: Long, waxed hardwood floor. Built for sliding chases.
  The chandelier above always wobbles ominously.

Tone: Slapstick, cinematic, expressive. Every frame is a visual gag setup or punchline.
Physics are optional. Pain is temporary. Comedy is eternal.
The house owner (a pair of legs in house slippers) occasionally intervenes — always punishing Tom.
"""

GLOBAL_AESTHETIC = (
    "1940s American suburban slapstick, hand-drawn animation aesthetic, "
    "warm domestic interiors with dramatic lighting, exaggerated cartoon physics, "
    "cinematic wide shots for chase sequences and tight close-ups for reaction beats"
)

RAW_SCRIPT_TEXT = """
SCENE 1 — INT. KITCHEN — DAY

Tom spots Jerry raiding the icebox. He creeps forward with a rolling pin.
Jerry doesn't look up. He finishes his cheese wedge. He points behind Tom.
Tom turns. Nothing there. When he turns back, Jerry is gone.
Tom is hit in the face with his own rolling pin — from nowhere.

SCENE 2 — INT. HALLWAY — DAY

Tom sprints after Jerry across the waxed hardwood floor.
He cannot stop. He slides the full length of the hall.
Jerry calmly steps aside. Tom crashes into the coat stand.
The coat stand collapses on him. A hat lands perfectly on his head.

SCENE 3 — INT. LIVING ROOM — AFTERNOON

Tom disguises himself as a lamp to catch Jerry.
Jerry stares at the lamp for a long moment. He plugs Tom in.
Tom lights up, vibrates, and launches off the floor.
He crashes into the piano. The piano plays a full chord.

SCENE 4 — EXT. BACKYARD — AFTERNOON

Tom chases Jerry with a garden hose at full pressure.
Jerry ducks. Tom shoots himself backward into the birdbath.
Jerry sits on the fence eating another cheese wedge.
He gives Tom a polite wave.

SCENE 5 — INT. KITCHEN — EVENING

Tom sets an elaborate trap: cheese on a spring-loaded platform.
Jerry disassembles the entire trap, uses the parts to build a tiny catapult.
The catapult fires Tom's rolling pin into Tom's forehead.
Jerry installs a tiny chandelier over his mousehole using the leftover wire.

SCENE 6 — INT. MOUSEHOLE — NIGHT

Jerry is inside, warm and content, reading a tiny newspaper.
Tom is outside, eye pressed to the mousehole, plotting.
Jerry slides a tiny "DO NOT DISTURB" sign under the door.
Tom stares at it. He puts it in his pocket. He walks away. He steps on a rake.
"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _save(data_url: str | None, path: pathlib.Path) -> bool:
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
# Stage 1 — LLM extraction (characters + world + storyboard plan, no images)
# ---------------------------------------------------------------------------

def run_pipeline(client: httpx.Client, skip_images: bool = False) -> dict:
    label = "STAGE 1 — LLM EXTRACTION (skip_images=True)" if skip_images else "STAGE 1 — FORGE PIPELINE (flat_color, balanced)"
    print("=" * 60)
    print(label)
    print("=" * 60)

    payload = {
        "project_title": "Tom and Jerry",
        "global_aesthetic": GLOBAL_AESTHETIC,
        "render_style": RENDER,
        "director_style": "balanced",
        "raw_character_notes": RAW_CHARACTER_NOTES,
        "raw_world_notes": RAW_WORLD_NOTES,
        "raw_script_text": RAW_SCRIPT_TEXT,
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

    out = OUT_ROOT / "storyboard"
    out.mkdir(parents=True, exist_ok=True)
    (out / "project.json").write_text(json.dumps(project, indent=2))
    print(f"    Saved → {out / 'project.json'}")

    return project


# ---------------------------------------------------------------------------
# Stage 2 — Character packages (both endpoints)
# ---------------------------------------------------------------------------

def _build_char_data(char: dict) -> dict:
    char_id = char.get("id") or char.get("char_id", "unknown")
    return {
        "id": char_id,
        "name": char.get("name", char_id),
        "wardrobe_defaults": char.get("wardrobe_defaults", ""),
        "facial_blueprint": char.get("facial_blueprint") or {
            "base_ethnicity_or_type": "unspecified",
            "estimated_age": 25,
            "bone_structure": "average",
            "distinct_markers": None,
            "fixed_seed_reference": None,
        },
    }


def _call_generate(client: httpx.Client, char_data: dict, out_dir: pathlib.Path) -> int:
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
    print("STAGE 2 — CHARACTER PACKAGES (flat_color, all sections)")
    print("  /generate         portrait, turnaround×5, expressions×9,")
    print("                    poses×7, outfits×7, props×5        (34/char)")
    print("  /generate-full-pack  turnaround_360×8, premium_poses×8,")
    print("                    material_closeups×5                (21/char)")
    print("=" * 60)

    characters = project.get("characters", [])
    if not characters:
        print("  No characters found in project — skipping.")
        return

    print(f"  {len(characters)} character(s)  ·  ~55 images each  ·  ~{len(characters) * 55} total\n")

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
# Stage 3 — Storyboard images (reforge all frames on saved project)
# ---------------------------------------------------------------------------

def run_storyboard_images(client: httpx.Client, project: dict) -> None:
    db_id        = project.get("db_id")
    scenes       = project.get("scenes", [])
    total_frames = sum(len(s.get("frames", [])) for s in scenes)

    print("\n" + "=" * 60)
    print("STAGE 3 — STORYBOARD IMAGES")
    print(f"  {total_frames} frames  ·  project db_id={db_id}")
    print("=" * 60)

    if not scenes:
        print("  No scenes found — skipping.")
        return

    done = 0
    for scene in scenes:
        for frame in scene.get("frames", []):
            try:
                resp = client.post(
                    f"{BASE_URL}/storyboard/frame/reforge-composition",
                    json={
                        "frame": frame,
                        "scene": scene,
                        "render_style": RENDER,
                    },
                    timeout=120,
                )
                resp.raise_for_status()
                result = resp.json()
                frame["generated_image_url"] = result.get("generated_image_url")
                done += 1
                bar = "█" * done + "░" * (total_frames - done)
                print(f"\r  [{bar}] {done}/{total_frames}", end="", flush=True)
            except Exception as e:
                print(f"\n  ✗ Frame {frame.get('frame_number')} scene {scene.get('scene_number')}: {e}")

    print(f"\n  ✓ {done}/{total_frames} frames generated")

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

    # ── Stage 1: LLM extraction only (no images yet) ──────────────────────
    project = run_pipeline(client, skip_images=True)

    # ── Stage 2: Full character packages ──────────────────────────────────
    run_character_packages(client, project)

    # ── Stage 3: Storyboard images (after character packages are ready) ───
    run_storyboard_images(client, project)

    client.close()

    total_chars = len(project.get("characters", []))
    print("=" * 60)
    print("DONE")
    print(f"  Characters  → {OUT_ROOT / 'characters'}/  ({total_chars} dirs, ~55 images each)")
    print(f"  Storyboard  → {OUT_ROOT / 'storyboard' / 'project.json'}")
    print("=" * 60)


if __name__ == "__main__":
    main()
