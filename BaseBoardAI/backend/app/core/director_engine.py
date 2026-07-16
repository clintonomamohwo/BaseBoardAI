"""
Director Engine — Cinematic planning orchestrator.

This module is the single entry point for all visual decision-making that
occurs BEFORE image generation begins.  It sits between the LLM Storyboard
Orchestrator (Stage 3) output and the image generation loop.

Pipeline position:
    invoke_storyboard_stage() → direct_storyboard() → generate_frame_image()

Responsibilities:
  1. Detect scene category (dialogue / action / horror / etc.)
  2. Apply scene-type composition profiles (preferred shot ratios)
  3. Apply per-character shot bias from Classification + Abilities (CKM integration)
  4. Call shot_balancer to enforce composition diversity thresholds
  5. Call lens_planner to assign focal length + depth style to every frame
  6. Maintain cinematic rhythm (no N consecutive identical shot types)
  7. Cinematic Brain auto-fill — fills all missing cinematic fields intelligently
  8. Log the Composition Diversity Score for observability

CKM Integration
---------------
  Characters with Classification='god' → dramatic establishing shot bias
  Characters with Classification='demon' → close/insert shot bias
  Characters with ability='flight' → aerial/wide preferred, close avoided
  Characters with ability='fire_breath' → wide/extreme wide preferred
  These biases are ADDITIVE — they layer on top of, not replace, scene profiles.

Cinematic Brain (Step 7)
------------------------
  After lens assignment, fill_missing_fields() is called for every frame that
  has any blank cinematic fields.  Decision priority:
    1. User-locked fields (locked_fields list) — never touched
    2. Existing non-empty LLM values — preserved
    3. Director AI decision (cinematic_brain.py decision tables)

  Fields auto-filled: shot_type, camera_angle, camera_movement,
                      lighting_notes, mood, purpose, director_notes
  Fields NOT touched: lens, focal_length, depth_style (owned by lens_planner)

All decisions are soft: they modify shot_type and lens metadata on frames but
never delete frames or override user-locked fields.  The image generation
layer receives fully enriched frames with all metadata populated.

Public API
----------
direct_storyboard(scenes, project_settings, character_hints) -> list[ScriptSceneBase]
apply_character_shot_bias(scenes, character_hints) -> list[ScriptSceneBase]
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from app.core.lens_planner import assign_lens_to_scene, detect_scene_type
from app.core.shot_balancer import balance_shot_distribution, compute_diversity_score

if TYPE_CHECKING:
    from app.schemas.storyboard import ScriptSceneBase

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Scene-type composition profiles
# Each profile maps shot-type slugs to a preferred fraction [0–1].
# These guide the Shot Balancer when it enforces per-scene composition.
# ---------------------------------------------------------------------------

SCENE_TYPE_PROFILES: dict[str, dict[str, float]] = {
    "dialogue": {
        "medium":      0.35,
        "ots":         0.25,
        "close":       0.20,
        "wide":        0.10,
        "insert":      0.10,
    },
    "action": {
        "wide":        0.35,
        "tracking":    0.30,
        "medium":      0.20,
        "close":       0.15,
    },
    "romance": {
        "close":       0.35,
        "ots":         0.20,
        "medium":      0.20,
        "insert":      0.20,
        "wide":        0.05,
    },
    "horror": {
        "close":       0.30,
        "insert":      0.20,
        "medium":      0.20,
        "wide":        0.15,
        "establishing": 0.15,
    },
    "mystery": {
        "medium":      0.25,
        "close":       0.25,
        "ots":         0.15,
        "insert":      0.15,
        "wide":        0.20,
    },
    "fantasy": {
        "wide":        0.30,
        "medium":      0.25,
        "close":       0.20,
        "insert":      0.10,
        "establishing": 0.15,
    },
    "sci_fi": {
        "wide":        0.25,
        "medium":      0.25,
        "close":       0.20,
        "tracking":    0.15,
        "insert":      0.10,
        "establishing": 0.05,
    },
    "adventure": {
        "wide":        0.35,
        "medium":      0.25,
        "close":       0.20,
        "tracking":    0.15,
        "establishing": 0.05,
    },
    "comedy": {
        "medium":      0.35,
        "wide":        0.25,
        "close":       0.20,
        "insert":      0.10,
        "ots":         0.10,
    },
    "establishing": {
        "establishing": 0.40,
        "wide":         0.40,
        "medium":       0.20,
    },
    "epic": {
        "wide":         0.40,
        "establishing": 0.30,
        "medium":       0.20,
        "tracking":     0.10,
    },
    "default": {
        "medium":      0.35,
        "close":       0.30,
        "wide":        0.20,
        "ots":         0.15,
    },
}


# ---------------------------------------------------------------------------
# Cinematic rhythm enforcement
# ---------------------------------------------------------------------------

_MAX_CONSECUTIVE_SAME_TYPE = 3   # no more than N identical shot types in a row


def _enforce_cinematic_rhythm(scenes: "list[ScriptSceneBase]") -> "list[ScriptSceneBase]":
    """
    Walk frames in scene order.  Whenever the same shot-type slug appears more
    than _MAX_CONSECUTIVE_SAME_TYPE times in a row, replace it with a logical
    cinematic break (wide → medium, close → medium, anything else → wide).
    """
    from app.core.shot_balancer import _classify_shot

    _BREAK_TYPES: dict[str, str] = {
        "close":    "Medium Shot",
        "medium":   "Wide Shot",
        "wide":     "Establishing Shot",
        "ots":      "Medium Shot",
        "tracking": "Wide Shot",
    }

    streak_type: str = ""
    streak_count: int = 0

    for scene in scenes:
        for frame in scene.frames:
            slug = _classify_shot(frame.shot_type)
            if slug == streak_type:
                streak_count += 1
            else:
                streak_type = slug
                streak_count = 1

            if streak_count > _MAX_CONSECUTIVE_SAME_TYPE:
                break_type = _BREAK_TYPES.get(slug, "Wide Shot")
                logger.debug(
                    "Rhythm break: Scene %d Frame %d — %s streak %d → %s",
                    scene.scene_number, frame.frame_number, slug, streak_count, break_type,
                )
                frame.shot_type = break_type
                streak_type = _classify_shot(break_type)
                streak_count = 1

    return scenes


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# CKM Character Shot Bias — applies per-character hints from Classification + Abilities
# ---------------------------------------------------------------------------

def apply_character_shot_bias(
    scenes: "list[ScriptSceneBase]",
    character_hints: dict[str, Any] | None = None,
) -> "list[ScriptSceneBase]":
    """
    Apply CKM-derived shot biases to frames that feature specific characters.

    character_hints structure (from identity_system.get_director_hints):
        {
          char_id: {
            "shot_bias":   {"aerial": 0.15, "wide": 0.20, ...},
            "avoid_shots": ["close"],
            ...
          }
        }

    For each frame: if any character in characters_present has a shot bias,
    the frame's shot_type may be replaced if it falls in the avoid list and
    there is a strongly preferred alternative.

    This is a SOFT override — user-locked fields (locked_fields) are never touched.
    """
    if not character_hints:
        return scenes

    from app.core.shot_balancer import _classify_shot  # type: ignore[attr-defined]

    _SLUG_TO_LABEL: dict[str, str] = {
        "aerial":       "Aerial Wide Shot",
        "wide":         "Wide Shot",
        "establishing": "Establishing Shot",
        "medium":       "Medium Shot",
        "close":        "Close-up Shot",
        "insert":       "Insert Shot",
        "tracking":     "Tracking Shot",
        "ots":          "Over-the-Shoulder Shot",
    }

    for scene in scenes:
        for frame in scene.frames:
            # Skip user-locked frames
            locked = getattr(frame, "locked_fields", None) or []
            if "shot_type" in locked:
                continue

            # Collect all biases for characters present in this frame
            combined_bias: dict[str, float] = {}
            combined_avoid: list[str] = []
            for char_id, hints in character_hints.items():
                # Match by char_id token or by name prefix in action_breakdown
                action = (getattr(frame, "action_breakdown", "") or "").lower()
                if char_id.lower() not in action and not any(
                    c.lower() in action for c in (getattr(frame, "characters_present", None) or [])
                ):
                    continue
                for slug, bias in hints.get("shot_bias", {}).items():
                    combined_bias[slug] = combined_bias.get(slug, 0.0) + bias
                combined_avoid.extend(hints.get("avoid_shots", []))

            if not combined_bias:
                continue

            current_slug = _classify_shot(frame.shot_type)

            # If current shot is in the avoid list, replace with the highest-biased preferred
            if current_slug in combined_avoid:
                best_slug = max(
                    (s for s, v in combined_bias.items() if v > 0 and s not in combined_avoid),
                    key=lambda s: combined_bias[s],
                    default=None,
                )
                if best_slug and best_slug in _SLUG_TO_LABEL:
                    logger.debug(
                        "CKM bias: Scene %d Frame %d — shot '%s' avoided → '%s'",
                        scene.scene_number, frame.frame_number,
                        current_slug, best_slug,
                    )
                    frame.shot_type = _SLUG_TO_LABEL[best_slug]

    return scenes


def direct_storyboard(
    scenes: "list[ScriptSceneBase]",
    project_settings: dict | None = None,
    character_hints: dict[str, Any] | None = None,
) -> "list[ScriptSceneBase]":
    """
    Orchestrate all cinematic planning for a full storyboard.

    Steps:
      1. Detect scene type per scene and attach as scene metadata (scene_type attr)
      2. Apply per-scene shot profile ceilings via Shot Balancer
      3. Apply CKM character shot biases (Classification + Abilities)
      4. Enforce cinematic rhythm (no long runs of identical shot types)
      5. Assign lens + focal length + depth style to every frame (lens_planner)
      6. Cinematic Brain — fill all missing cinematic fields intelligently
      7. Log the final Composition Diversity Score

    character_hints: optional dict of {char_id: get_director_hints() result}
    obtained from identity_system.get_director_hints() for each character in the project.

    Returns the enriched scene list (same objects, mutated in-place).
    Never raises — failures are logged and the pipeline continues.
    """
    if not scenes:
        return scenes

    settings = project_settings or {}

    try:
        # ── Step 1: Detect scene types ───────────────────────────────────────
        scene_types: dict[int, str] = {}
        for scene in scenes:
            stype = detect_scene_type(scene)
            scene_types[scene.scene_number] = stype
            # Cache on the object's __dict__ for downstream prompt_builder lookup.
            # The outer try/except on the whole block guards Pydantic frozen models.
            try:
                scene.__dict__["_scene_type"] = stype
            except (AttributeError, TypeError):
                pass

        logger.info(
            "Director Engine — detected scene types: %s",
            {n: t for n, t in scene_types.items()},
        )

        # ── Step 2: Shot balancing (global distribution + scene-type profiles) ─
        thresholds = settings.get("shot_thresholds", None)
        scenes = balance_shot_distribution(scenes, thresholds=thresholds)

        # ── Step 3: CKM character shot biases ────────────────────────────────
        if character_hints:
            scenes = apply_character_shot_bias(scenes, character_hints)
            logger.info(
                "Director Engine — applied CKM character hints for %d character(s).",
                len(character_hints),
            )

        # ── Step 4: Cinematic rhythm enforcement ─────────────────────────────
        scenes = _enforce_cinematic_rhythm(scenes)

        # ── Step 5: Lens assignment per scene ───────────────────────────────
        for i, scene in enumerate(scenes):
            scenes[i] = assign_lens_to_scene(scene)

        # ── Step 6: Cinematic Brain — fill every missing cinematic field ──────
        scenes = _run_cinematic_brain(scenes, character_hints)

        # ── Step 7: Log diversity report ─────────────────────────────────────
        report = compute_diversity_score(scenes, thresholds)
        for line in report.summary_lines():
            logger.info("  %s", line)

    except Exception as exc:  # noqa: BLE001
        logger.error("Director Engine encountered an error: %s — pipeline continues.", exc)

    return scenes


def _run_cinematic_brain(
    scenes: "list[ScriptSceneBase]",
    character_hints: dict[str, Any] | None = None,
) -> "list[ScriptSceneBase]":
    """
    Run the Cinematic Brain over every frame in every scene.

    Builds shot-history context per scene so the brain can avoid visual monotony.
    Stores auto_selected + director_rationale back onto the frame.
    """
    from app.core.cinematic_brain import fill_missing_fields

    auto_filled_total = 0

    for scene in scenes:
        recent_frames: list[Any] = []
        for frame in scene.frames:
            decisions = fill_missing_fields(
                frame=frame,
                scene=scene,
                ckg_hints=character_hints,
                recent_frames=recent_frames,
            )
            # Store tracking data back onto the frame
            try:
                if hasattr(frame, "auto_selected"):
                    # Merge — don't overwrite fields already marked by a previous pass
                    merged = {**frame.auto_selected, **decisions.auto_selected}
                    frame.auto_selected = merged
                if hasattr(frame, "director_rationale"):
                    merged_r = {**frame.director_rationale, **decisions.rationale}
                    frame.director_rationale = merged_r
            except (AttributeError, TypeError):
                pass

            auto_filled_total += sum(1 for v in decisions.auto_selected.values() if v)
            recent_frames.append(frame)

    logger.info("Cinematic Brain — auto-filled %d field(s) across all frames.", auto_filled_total)
    return scenes


def get_scene_type(scene: "ScriptSceneBase") -> str:
    """
    Retrieve the scene type cached by direct_storyboard(), or re-detect live.
    Used by prompt_builder to look up the correct lens/modifier.
    """
    cached = scene.__dict__.get("_scene_type")
    if cached:
        return cached
    return detect_scene_type(scene)
