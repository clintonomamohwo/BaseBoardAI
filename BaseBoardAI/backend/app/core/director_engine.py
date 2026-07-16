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
  3. Call shot_balancer to enforce composition diversity thresholds
  4. Call lens_planner to assign focal length + depth style to every frame
  5. Maintain cinematic rhythm (no N consecutive identical shot types)
  6. Log the Composition Diversity Score for observability

All decisions are soft: they modify shot_type and lens metadata on frames but
never delete frames or override user-locked fields.  The image generation
layer receives fully enriched frames with all metadata populated.

Public API
----------
direct_storyboard(scenes, project_settings) -> list[ScriptSceneBase]
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

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

def direct_storyboard(
    scenes: "list[ScriptSceneBase]",
    project_settings: dict | None = None,
) -> "list[ScriptSceneBase]":
    """
    Orchestrate all cinematic planning for a full storyboard.

    Steps:
      1. Detect scene type per scene and attach as scene metadata (scene_type attr)
      2. Apply per-scene shot profile ceilings via Shot Balancer
      3. Enforce cinematic rhythm (no long runs of identical shot types)
      4. Assign lens + focal length + depth style to every frame
      5. Log the final Composition Diversity Score

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

        # ── Step 3: Cinematic rhythm enforcement ─────────────────────────────
        scenes = _enforce_cinematic_rhythm(scenes)

        # ── Step 4: Lens assignment per scene ───────────────────────────────
        for i, scene in enumerate(scenes):
            scenes[i] = assign_lens_to_scene(scene)

        # ── Step 5: Log diversity report ────────────────────────────────────
        report = compute_diversity_score(scenes, thresholds)
        for line in report.summary_lines():
            logger.info("  %s", line)

    except Exception as exc:  # noqa: BLE001
        logger.error("Director Engine encountered an error: %s — pipeline continues.", exc)

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
