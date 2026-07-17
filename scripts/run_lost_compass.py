"""
run_lost_compass.py

Runs The Lost Compass through the full BaseBoard pipeline:
  1. forge-pipeline-stream    — 3-stage LLM + image gen with live SSE progress
  2. character-package/generate          — portrait, turnaround (5 views),
     expressions (9), poses (7), outfits (7), props (5)    → 34 images/char
  3. character-package/generate-full-pack — turnaround_360 (8 views),
     premium_poses (8), material_closeups (5)               → 21 images/char

Total: 55 images per character × 4 characters = 220 character reference images.
Expected output: 4 characters, 7 scenes, ~21 frames (3 per scene).
Script: 7 scenes (dense, hackathon-optimised version).
Render style: flat_color throughout.

Usage:
    cd /path/to/BaseBoardAI/backend
    source .venv/bin/activate
    python3 ../scripts/run_lost_compass.py

Output:
    scripts/output/lost_compass/storyboard/            project JSON
    scripts/output/lost_compass/characters/<id>/       per-character images
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
SCRIPT_PATH = pathlib.Path(__file__).parent / "the_lost_compass.md"
OUT_ROOT    = pathlib.Path(__file__).parent / "output" / "lost_compass"

# /generate  sections  (34 images per character)
STANDARD_SECTIONS = ["portrait", "turnaround", "expressions", "poses", "outfits", "props"]

# /generate-full-pack  targets  (21 images per character)
PREMIUM_TARGETS = ["turnaround_360", "premium_poses", "material_closeups"]

# ---------------------------------------------------------------------------
# Pipeline payload
# ---------------------------------------------------------------------------

RAW_CHARACTER_NOTES = """
Theo Mensah — Giant Tortoise Humanoid. Origin: Neo Accra, Ghana. Faction: The Cartographers.
Profession: Systems Engineer. Personality: Quiet, patient, methodical, never gives up.
Artifact: Bronze Compass Fragment. Arc: learns to become a leader. Love interest: Bella.
Shell engraved with faint Cartographer sigils. Broad-shouldered build.

Harrison Brooks — Hare Humanoid. Origin: Neo New York. Faction: None (Independent).
Profession: Professional Hover Runner. Personality: Cocky, competitive, overconfident.
Artifact: Silver Compass Fragment. Arc: learns humility.
White fur, lean athletic build, always wearing a racing helmet visor.

Amina Hassan — Black Panther Humanoid. Origin: Neo Nairobi. Faction: The Keepers.
Profession: Archaeologist. Personality: Calm, analytical, quietly determined, emotionally perceptive.
Artifact: Ancient Atlas Key. Arc: learns to trust others.
Sleek black fur, field archaeologist gear, silver ear studs.

Bella Alvarez — Deer Humanoid. Origin: Neo Mexico City. Faction: Medical Corps.
Profession: Combat Medic. Personality: Caring, courageous, observant.
Artifact: Life Crystal (worn around neck). Arc: learns courage. Love interest: Theo.
Warm brown fur, graceful build, combat medic uniform, Life Crystal glowing gold.
"""

RAW_WORLD_NOTES = """
Year 2248. Earth is a network of futuristic megacities (Neo Cities) connected by orbital transit gates.
Ancient civilizations are considered myths — until now.

Neo Accra, Ghana: Floating urban gardens spiral above gleaming biodomes. Hover trains slice between
living towers draped in engineered vines. Solar lattices power everything.

Neo Nairobi, Kenya: City built vertically into cliff faces. Glass corridors connect ancient stone
foundations to glass-and-steel towers. Below: excavation zones where Keepers sift geological strata.

Neo New York, USA: Hover-racing circuit in the upper atmosphere. The Manhattan Skyspire punches
through cloud cover. Times Square has four vertical screens playing races on loop.

Neo Mexico City, Mexico: Medical Corps Megahospital floating on anti-grav supports above ancient
Aztec canals converted into trauma response channels.

Neo Cairo, Egypt: The Great Pyramid stands untouched — a Cartographer sanctuary. Around it:
sand-white towers, solar sails, and magnetic transit pods.

Neo Rome, Italy: Seven ancient hills threaded with underground archive networks. Renaissance marble
shares walls with quantum-glass display panels.

Swiss Sky Railway: Mountain rail suspended 4,000 metres above sea level between floating plateaus.
Dining car windows face a horizon of snow peaks and clouds.

Neo Kyoto, Japan: Ancient bamboo sanctuaries preserved under climate domes. Lantern light beside
holographic shrine interfaces. Engineered silence rings the district.

Factions:
- The Cartographers: protect knowledge
- The Keepers: protect history
- The Obsidian Circle: seek absolute control through knowledge

Antagonist: Seraphis — King Cobra Humanoid. Leader of The Obsidian Circle.
Calculating, ruthless, obsessed with controlling all knowledge.
Enormous build, hood fanned, obsidian armor, scaled green-black skin.
Appears in Scene 5 as the primary villain. Not a playable character.

The Compass of Unity only awakens when four worthy guardians appear.
The Vault of Humanity contains the complete history of the human species — not gold, but knowledge.
Engineering, medicine, history, art, astronomy, navigation, culture — all of it, for everyone.
"""

GLOBAL_AESTHETIC = (
    "Futuristic Sci-Fi Adventure, Year 2248, Neo Cities with floating gardens and orbital transit gates, "
    "ancient ruins and underground vaults, anthropomorphic humanoid characters, "
    "cinematic wide establishing shots mixed with intimate character moments"
)

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
        "project_title": "The Lost Compass",
        "global_aesthetic": GLOBAL_AESTHETIC,
        "render_style": RENDER,
        "director_style": "balanced",
        "raw_character_notes": RAW_CHARACTER_NOTES,
        "raw_world_notes": RAW_WORLD_NOTES,
        "raw_script_text": SCRIPT_PATH.read_text(),
        "skip_images": skip_images,
    }

    project: dict = {}
    t0    = time.time()
    kind  = None   # current event type, set by "event:" lines

    with client.stream(
        "POST",
        f"{BASE_URL}/storyboard/forge-pipeline-stream",
        json=payload,
        timeout=1800,
    ) as resp:
        resp.raise_for_status()
        for raw_line in resp.iter_lines():
            # SSE format:
            #   event: <type>
            #   data: <json>
            #   (blank line)
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
    """POST /character-package/generate — portrait, turnaround, expressions, poses, outfits, props."""
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
            # portrait is returned as a bare URL string, not a dict
            if _save(value, out_dir / f"{section}.png"):
                saved += 1
    return saved


def _call_full_pack(client: httpx.Client, char_data: dict, out_dir: pathlib.Path) -> int:
    """POST /character-package/generate-full-pack — turnaround_360, premium_poses, material_closeups."""
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
    """
    Trigger image generation for every frame in the already-saved project.
    Uses /forge-pipeline-stream with skip_images=False on the saved project's
    db_id by calling the reforge-composition endpoint per frame instead.
    """
    db_id = project.get("db_id")
    scenes = project.get("scenes", [])
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
                # Patch the frame's image URL in the local project dict
                frame["generated_image_url"] = result.get("generated_image_url")
                done += 1
                bar = "█" * done + "░" * (total_frames - done)
                print(f"\r  [{bar}] {done}/{total_frames}", end="", flush=True)
            except Exception as e:
                print(f"\n  ✗ Frame {frame.get('frame_number')} scene {scene.get('scene_number')}: {e}")

    print(f"\n  ✓ {done}/{total_frames} frames generated")

    # Save updated project JSON with image URLs
    out = OUT_ROOT / "storyboard"
    out.mkdir(parents=True, exist_ok=True)
    (out / "project.json").write_text(json.dumps(project, indent=2))
    print(f"    Saved → {out / 'project.json'}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="The Lost Compass — BaseBoard pipeline")
    parser.add_argument(
        "--stage3-only",
        action="store_true",
        help="Skip Stages 1 & 2 — load saved project.json and regenerate storyboard images only",
    )
    args = parser.parse_args()

    client = httpx.Client(timeout=900)
    _health_check(client)

    if args.stage3_only:
        saved_json = OUT_ROOT / "storyboard" / "project.json"
        if not saved_json.exists():
            print(f"✗ No saved project found at {saved_json}")
            print("  Run without --stage3-only first to generate the project.")
            sys.exit(1)
        project = json.loads(saved_json.read_text())
        frames = sum(len(s.get("frames", [])) for s in project.get("scenes", []))
        print(f"Loaded saved project: {len(project.get('characters', []))} chars, "
              f"{len(project.get('scenes', []))} scenes, {frames} frames\n")
        run_storyboard_images(client, project)
    else:
        # ── Stage 1: LLM extraction only (no images yet) ──────────────────────
        project = run_pipeline(client, skip_images=True)

        # ── Stage 2: Full character packages ──────────────────────────────────
        # Characters are generated first so Visual DNA tokens can be extracted
        # and injected into storyboard prompts for cross-provider consistency.
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
