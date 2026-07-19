"""
Smoke test for the Genesis Engine LLM pipeline.

Runs directly against the WatsonX API — no server needed.
Exercises all 3 stages with minimal payloads to verify the model
and credentials are working end-to-end.

Usage (from BaseBoardAI/backend/):
    python smoke_test.py
"""

import sys
import json

# Resolve imports relative to this file's directory
sys.path.insert(0, ".")

from app.core.config import settings
from app.core.llm import invoke_character_stage, invoke_world_stage, invoke_storyboard_stage

CHAR_NOTES = (
    "Alex Chen, 28, hacker. Lean build, short dark hair with a blue streak. "
    "Usually wears a grey hoodie and cargo pants. Nervous energy, chews pen caps."
)

WORLD_NOTES = (
    "A cramped underground server room, dimly lit by blinking rack LEDs, "
    "damp concrete walls, faint hum of cooling fans."
)

SCRIPT = (
    "INT. SERVER ROOM - NIGHT\n"
    "Alex types frantically. A red warning light floods the room.\n"
    "Alex stares at the screen, then slams the laptop shut."
)

SEP = "-" * 60


def _ok(label: str, result: object) -> None:
    print(f"[PASS] {label}")
    print(json.dumps(
        result if isinstance(result, list) else [result],
        default=lambda o: o.model_dump() if hasattr(o, "model_dump") else str(o),
        indent=2,
    ))


def _run() -> None:
    print(SEP)
    print(f"Primary: {settings.WATSONX_PRIMARY_TEXT_MODEL}")
    print(f"Fallbk : {settings.WATSONX_FALLBACK_TEXT_MODEL or '(none)'}")
    print(f"Last   : {settings.WATSONX_LAST_RESORT_MODEL or '(none)'}")
    print(f"URL    : {settings.WATSONX_URL}")
    print(f"Project: {settings.WATSONX_PROJECT_ID}")
    print(SEP)

    print("\n[Stage 1] Character Standardizer...")
    characters = invoke_character_stage(CHAR_NOTES)
    _ok("Character stage", characters)

    print(f"\n{SEP}\n[Stage 2] World Architect...")
    environments = invoke_world_stage(WORLD_NOTES)
    _ok("World stage", environments)

    print(f"\n{SEP}\n[Stage 3] Storyboard Orchestrator...")
    scenes = invoke_storyboard_stage(characters, environments, SCRIPT, "noir", "bw_sketch")
    _ok("Storyboard stage", scenes)

    print(f"\n{SEP}\nAll 3 stages passed.")


if __name__ == "__main__":
    _run()
