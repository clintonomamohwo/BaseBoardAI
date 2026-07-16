"""
Lens Planner — Per-frame focal length & depth style assignment.

Every storyboard frame receives an explicit cinematic lens recommendation based
on the detected scene type.  These values are stored as metadata on the frame
schema and injected into image generation prompts via prompt_builder.py.

Public API
----------
assign_lens(frame, scene_type) -> StoryboardFrameBase
assign_lens_to_scene(scene, scene_type) -> ScriptSceneBase
detect_scene_type(scene) -> str
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.schemas.storyboard import ScriptSceneBase, StoryboardFrameBase

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lens profiles per scene type
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class LensProfile:
    focal_length: str   # e.g. "85mm"
    lens_label: str     # e.g. "85mm portrait lens"
    depth_style: str    # e.g. "shallow bokeh"
    prompt_suffix: str  # cinematic modifier appended to image prompt


_LENS_PROFILES: dict[str, LensProfile] = {
    "establishing": LensProfile(
        focal_length="24mm",
        lens_label="24mm Anamorphic",
        depth_style="deep focus",
        prompt_suffix="shot on 24mm anamorphic lens, deep focus, wide environment",
    ),
    "dialogue": LensProfile(
        focal_length="50mm",
        lens_label="50mm Standard",
        depth_style="natural depth",
        prompt_suffix="shot on 50mm lens, natural perspective, shallow background blur",
    ),
    "intimate": LensProfile(
        focal_length="85mm",
        lens_label="85mm Portrait",
        depth_style="shallow bokeh",
        prompt_suffix="shot on 85mm portrait lens, shallow depth of field, creamy bokeh",
    ),
    "action": LensProfile(
        focal_length="35mm",
        lens_label="35mm Tracking",
        depth_style="deep focus",
        prompt_suffix="shot on 35mm tracking lens, deep focus, dynamic motion",
    ),
    "epic": LensProfile(
        focal_length="18mm",
        lens_label="18mm Ultra Wide",
        depth_style="deep focus",
        prompt_suffix="shot on 18mm ultra wide lens, sweeping deep focus, epic scale",
    ),
    "horror": LensProfile(
        focal_length="28mm",
        lens_label="28mm Wide",
        depth_style="unsettling distortion",
        prompt_suffix="shot on 28mm wide lens, slight distortion, deep focus, unsettling",
    ),
    "romance": LensProfile(
        focal_length="85mm",
        lens_label="85mm Portrait",
        depth_style="shallow bokeh",
        prompt_suffix="shot on 85mm portrait lens, soft shallow bokeh, warm depth",
    ),
    "comedy": LensProfile(
        focal_length="35mm",
        lens_label="35mm Normal",
        depth_style="normal focus",
        prompt_suffix="shot on 35mm lens, natural perspective, normal depth of field",
    ),
    "mystery": LensProfile(
        focal_length="35mm",
        lens_label="35mm Normal",
        depth_style="deep focus",
        prompt_suffix="shot on 35mm lens, deep focus, moody atmosphere",
    ),
    "fantasy": LensProfile(
        focal_length="21mm",
        lens_label="21mm Wide",
        depth_style="deep focus",
        prompt_suffix="shot on 21mm wide lens, deep focus, otherworldly scale",
    ),
    "sci_fi": LensProfile(
        focal_length="24mm",
        lens_label="24mm Anamorphic",
        depth_style="deep focus",
        prompt_suffix="shot on 24mm anamorphic lens, lens flares, deep focus",
    ),
    "adventure": LensProfile(
        focal_length="24mm",
        lens_label="24mm Wide",
        depth_style="deep focus",
        prompt_suffix="shot on 24mm wide lens, deep focus, expansive environment",
    ),
    "default": LensProfile(
        focal_length="50mm",
        lens_label="50mm Standard",
        depth_style="natural depth",
        prompt_suffix="shot on 50mm standard lens",
    ),
}


# ---------------------------------------------------------------------------
# Scene-type detection
# ---------------------------------------------------------------------------

# Keyword maps for heuristic detection from tone + heading + action text.
_SCENE_TYPE_KEYWORDS: dict[str, list[str]] = {
    "horror":    ["horror", "terror", "blood", "scream", "dark", "fear", "monster", "ghost", "stalk"],
    "action":    ["fight", "chase", "battle", "explosion", "combat", "run", "attack", "shoot", "crash"],
    "romance":   ["kiss", "love", "romantic", "embrace", "tender", "intimate", "date"],
    "comedy":    ["laugh", "joke", "funny", "comic", "humour", "humor", "silly", "gag"],
    "mystery":   ["mystery", "clue", "investigate", "detective", "secret", "hidden", "suspect"],
    "fantasy":   ["magic", "dragon", "spell", "wizard", "fairy", "enchant", "mystical", "realm"],
    "sci_fi":    ["spaceship", "laser", "robot", "android", "alien", "cyber", "future", "tech"],
    "adventure": ["explore", "journey", "quest", "discover", "expedition", "wilderness"],
    "epic":      ["army", "war", "battle", "siege", "empire", "vast", "sweeping"],
    "establishing": ["int. ", "ext. ", "establishing", "panoramic"],
    "intimate":  ["whisper", "close", "tears", "monologue", "confession"],
    "dialogue":  ["says", "asks", "replies", "dialogue", "conversation", "talk"],
}


def detect_scene_type(scene: "ScriptSceneBase") -> str:
    """
    Infer the cinematic scene type from emotional_tone, location_heading, and
    the combined action text of all frames.  Falls back to 'dialogue' if
    no keyword matches.
    """
    probe = " ".join([
        scene.emotional_tone.lower(),
        scene.location_heading.lower(),
        " ".join(f.action_breakdown.lower() for f in scene.frames),
    ])

    # Score each candidate type by keyword hit count
    scores: dict[str, int] = {t: 0 for t in _SCENE_TYPE_KEYWORDS}
    for stype, keywords in _SCENE_TYPE_KEYWORDS.items():
        for kw in keywords:
            if kw in probe:
                scores[stype] += 1

    best = max(scores, key=lambda k: scores[k])
    if scores[best] == 0:
        return "dialogue"

    return best


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def assign_lens(frame: "StoryboardFrameBase", scene_type: str) -> "StoryboardFrameBase":
    """
    Assign lens metadata to a single frame based on scene_type.
    Mutates `lens`, `focal_length`, and `depth_style` fields (if present on the model).
    Always returns the frame for chaining.
    """
    profile = _LENS_PROFILES.get(scene_type, _LENS_PROFILES["default"])

    # Gracefully set only if the schema has these fields (added in Phase 2 schema update).
    if hasattr(frame, "lens"):
        frame.lens = profile.lens_label
    if hasattr(frame, "focal_length"):
        frame.focal_length = profile.focal_length
    if hasattr(frame, "depth_style"):
        frame.depth_style = profile.depth_style
    if hasattr(frame, "lens_prompt_suffix"):
        frame.lens_prompt_suffix = profile.prompt_suffix

    return frame


def assign_lens_to_scene(scene: "ScriptSceneBase") -> "ScriptSceneBase":
    """
    Detect scene type then assign lens metadata to every frame in the scene.
    Returns the mutated scene for chaining.
    """
    scene_type = detect_scene_type(scene)
    for frame in scene.frames:
        assign_lens(frame, scene_type)
    return scene


def get_lens_prompt_suffix(scene_type: str) -> str:
    """Return the prompt suffix string for a scene type (used by prompt_builder)."""
    return _LENS_PROFILES.get(scene_type, _LENS_PROFILES["default"]).prompt_suffix
