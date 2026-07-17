"""
generate_character_packages.py

Fetches all saved projects from the local BaseBoard library and generates
a full character package (360° turnaround, premium poses, material close-ups)
for every character in every project.

Output: scripts/output/character_packages/<project_id>/<char_id>/<section>/<key>.png

Usage:
    cd /path/to/BaseBoardAI/backend
    source .venv/bin/activate
    python3 ../scripts/generate_character_packages.py

Optional flags:
    --project-id 3          Only process one project
    --render-style bw_sketch  Override render style (bw_sketch | flat_color | full_shaded)
    --targets turnaround_360 premium_poses material_closeups  Limit which sections to generate
    --dry-run               Print what would be generated without calling the API
"""

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path

import httpx

BASE_URL = "http://localhost:8000"
OUTPUT_DIR = Path(__file__).parent / "output" / "character_packages"

SECTIONS = ["turnaround_360", "premium_poses", "material_closeups"]


def fetch_projects(client: httpx.Client) -> list[dict]:
    resp = client.get(f"{BASE_URL}/storyboard/")
    resp.raise_for_status()
    return resp.json()


def fetch_project(client: httpx.Client, db_id: int) -> dict:
    resp = client.get(f"{BASE_URL}/storyboard/{db_id}")
    resp.raise_for_status()
    return resp.json()


def save_image(data_url: str | None, path: Path) -> bool:
    """Decode a base64 data URL and save as PNG. Returns True on success."""
    if not data_url:
        return False
    try:
        # data:image/png;base64,<data>  OR  plain URL
        if data_url.startswith("data:"):
            header, b64 = data_url.split(",", 1)
            img_bytes = base64.b64decode(b64)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(img_bytes)
        else:
            # It's a plain URL (Pollinations returns URLs, not base64)
            import urllib.request
            path.parent.mkdir(parents=True, exist_ok=True)
            urllib.request.urlretrieve(data_url, path)
        return True
    except Exception as e:
        print(f"    ✗ Failed to save {path.name}: {e}")
        return False


def generate_package(
    client: httpx.Client,
    char: dict,
    render_style: str,
    targets: list[str],
    out_dir: Path,
    dry_run: bool,
) -> None:
    char_id = char.get("id") or char.get("char_id", "unknown")
    name = char.get("name", char_id)

    print(f"\n  Character: {name} ({char_id})")

    if dry_run:
        for target in targets:
            print(f"    [dry-run] would generate {target}")
        return

    # Build the char_data payload the endpoint expects
    char_data = {
        "id": char_id,
        "name": name,
        "wardrobe_defaults": char.get("wardrobe_defaults", ""),
        "facial_blueprint": char.get("facial_blueprint", {
            "base_ethnicity_or_type": "unspecified",
            "estimated_age": 25,
            "bone_structure": "average",
            "distinct_markers": None,
            "fixed_seed_reference": None,
        }),
    }

    start = time.time()
    try:
        resp = client.post(
            f"{BASE_URL}/storyboard/character-package/generate-full-pack",
            json={
                "char_data": char_data,
                "render_style": render_style,
                "targets": targets,
            },
            timeout=600,
        )
        resp.raise_for_status()
    except httpx.HTTPStatusError as e:
        print(f"    ✗ HTTP {e.response.status_code}: {e.response.text[:200]}")
        return
    except Exception as e:
        print(f"    ✗ Request failed: {e}")
        return

    elapsed = time.time() - start
    data = resp.json()

    saved = 0
    for section, images in data.items():
        if not isinstance(images, dict):
            continue
        for key, url in images.items():
            path = out_dir / char_id / section / f"{key}.png"
            if save_image(url, path):
                saved += 1

    print(f"    ✓ {saved} images saved in {elapsed:.0f}s → {out_dir / char_id}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate character packages for all BaseBoard projects")
    parser.add_argument("--project-id", type=int, help="Only process this project db_id")
    parser.add_argument("--render-style", default=None, help="Override render style")
    parser.add_argument("--targets", nargs="+", default=SECTIONS, choices=SECTIONS, help="Sections to generate")
    parser.add_argument("--dry-run", action="store_true", help="Print plan without calling API")
    args = parser.parse_args()

    client = httpx.Client(timeout=900)

    # Health check
    try:
        health = client.get(f"{BASE_URL}/health").json()
        print(f"Backend: {health.get('status')} — model: {health.get('model')}")
    except Exception:
        print("✗ Cannot reach backend at http://localhost:8000 — is uvicorn running?")
        sys.exit(1)

    # Fetch project(s)
    if args.project_id:
        projects = [fetch_project(client, args.project_id)]
    else:
        projects = fetch_projects(client)

    if not projects:
        print("No projects found in library.")
        return

    print(f"\nFound {len(projects)} project(s). Generating packages for targets: {args.targets}\n")

    total_chars = 0
    for project in projects:
        db_id     = project.get("db_id", "?")
        title     = project.get("project_title", "Untitled")
        style     = args.render_style or project.get("render_style", "bw_sketch")
        chars     = project.get("characters", [])

        print(f"{'='*60}")
        print(f"Project #{db_id}: {title}  [{style}]  — {len(chars)} character(s)")

        if not chars:
            print("  No characters — skipping.")
            continue

        out_dir = OUTPUT_DIR / f"project_{db_id}"

        for char in chars:
            generate_package(client, char, style, args.targets, out_dir, args.dry_run)
            total_chars += 1

    client.close()
    print(f"\n{'='*60}")
    print(f"Done. {total_chars} character package(s) processed.")
    print(f"Output: {OUTPUT_DIR.resolve()}")


if __name__ == "__main__":
    main()
