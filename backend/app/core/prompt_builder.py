"""
Prompt Builder — Structured cinematic prompt assembly.

Replaces the inline string concatenation in image.py with a single, ordered
assembly function that incorporates all Director Engine metadata:
  1. Style prefix (render mode)
  2. Shot type + composition descriptor
  3. Action breakdown
  4. Lens + depth style (from Lens Planner)
  5. Scene-type modifier
  6. Lighting notes
  7. Character appearance constraints (from Project Canon, if provided)
  8. Negative constraints (B&W styles)
  9. URL-safe 500-character cap

Public API
----------
build_frame_prompt(frame, scene, render_style, scene_type, canon_context) -> str
build_package_prompt(base_desc, view_desc, render_style) -> str
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.schemas.storyboard import ScriptSceneBase, StoryboardFrameBase

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Style prefixes (single source of truth — image.py imports from here)
# ---------------------------------------------------------------------------

STYLE_PREFIXES: dict[str, str] = {
    "bw_sketch":   "clean minimal black and white line art, simple outline only, no shading, no cross-hatching, no fill, no texture, loose gestural sketch, artist rough, white background. ",
    "bw_detailed": "black and white ink illustration, bold clean outlines, detailed crosshatch shading, high contrast shadows, no color, professional comic book art, white background. ",
    "flat_color":  "2D animation cel, cartoon illustration, flat solid color fills, clean vector outlines, no gradients, no photo realism, Studio Ghibli style. ",
    "full_shaded": "2D animated film frame, cinematic cartoon, volumetric lighting, expressive character art, no photo realism. ",
}
DEFAULT_STYLE_PREFIX = STYLE_PREFIXES["bw_sketch"]

# Negative constraints appended for B&W modes
_BW_SKETCH_NEGATIVES   = ", simple outlines only, no shading, no crosshatch, no texture, no color, no photo"
_BW_DETAILED_NEGATIVES = ", black and white only, no color, no photo realism, no gradients"

# Scene-type → cinematic mood modifier injected between action and lighting
_SCENE_TYPE_MODIFIERS: dict[str, str] = {
    "establishing": "environment dominant, sense of place, ",
    "dialogue":     "two-person exchange, conversational, ",
    "intimate":     "emotional intensity, intimate framing, ",
    "action":       "kinetic energy, motion blur, dynamic, ",
    "epic":         "sweeping scale, grandeur, ",
    "horror":       "dread, shadow, unsettling atmosphere, ",
    "romance":      "warmth, soft light, emotional connection, ",
    "comedy":       "bright, expressive, exaggerated, ",
    "mystery":      "shadow, partial reveal, suspense, ",
    "fantasy":      "magical atmosphere, otherworldly, ",
    "sci_fi":       "futuristic, high-tech, sleek, ",
    "adventure":    "expansive, bold colours, heroic, ",
}

# Maximum combined prompt length (stays within Pollinations GET URL limit)
_MAX_PROMPT_LENGTH = 490


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_lens_suffix(frame: "StoryboardFrameBase") -> str:
    """Extract lens prompt suffix from frame if the fields exist, else empty string."""
    suffix = getattr(frame, "lens_prompt_suffix", None)
    if suffix:
        return suffix + ", "
    focal = getattr(frame, "focal_length", None)
    depth = getattr(frame, "depth_style", None)
    if focal and depth:
        return f"shot on {focal} lens, {depth}, "
    if focal:
        return f"shot on {focal} lens, "
    return ""


def _get_canon_constraints(
    char_ids_in_action: list[str],
    canon_context: dict[str, Any] | None,
) -> str:
    """
    Build a character appearance constraint string from the CKG.

    Priority order (highest wins):
      1. CKG character_identities[char_id]._canonical_prompt  (identity-system-derived)
      2. CKG approved_characters[char_id].appearance_summary  (backwards-compat flat summary)

    Only returns constraints for characters that appear in this frame's action text.
    """
    if not canon_context or not char_ids_in_action:
        return ""

    identities = canon_context.get("character_identities", {})
    approved   = canon_context.get("approved_characters", {})

    constraints: list[str] = []
    for char_id in char_ids_in_action:
        # Prefer the richer identity-system canonical prompt
        if char_id in identities:
            prompt = identities[char_id].get("_canonical_prompt") or identities[char_id].get("face_description") or ""
            if prompt:
                constraints.append(prompt)
                continue
        # Fall back to flat approved_characters summary
        if char_id in approved:
            constraints.append(approved[char_id].get("appearance_summary", ""))

    return ", ".join(c for c in constraints if c)


def _get_ability_modifiers(
    char_ids_in_action: list[str],
    canon_context: dict[str, Any] | None,
) -> str:
    """
    Build ability-derived prompt modifiers for characters present in this frame.

    Reads the 'abilities' list from each character's CKG node and returns
    the corresponding prompt_modifier strings from ABILITY_SHOT_HINTS.

    e.g. a frame with a flying character gets: "aerial perspective, character in flight"
    """
    if not canon_context or not char_ids_in_action:
        return ""

    from app.core.identity_system import ABILITY_SHOT_HINTS

    char_abilities_map = canon_context.get("character_abilities", {})
    if not char_abilities_map:
        return ""

    modifiers: list[str] = []
    seen: set[str] = set()
    for char_id in char_ids_in_action:
        abilities = char_abilities_map.get(char_id, [])
        for ability in abilities:
            hint = ABILITY_SHOT_HINTS.get(ability)
            if hint and hint.get("prompt_modifier") and ability not in seen:
                seen.add(ability)
                modifiers.append(hint["prompt_modifier"].rstrip(", "))

    return ", ".join(m for m in modifiers if m)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_frame_prompt(
    frame: "StoryboardFrameBase",
    scene: "ScriptSceneBase",
    render_style: str = "bw_sketch",
    scene_type: str = "dialogue",
    canon_context: dict[str, Any] | None = None,
) -> str:
    """
    Assemble a complete image generation prompt for a storyboard frame.

    Assembly order:
      [style_prefix] [shot_type], [camera_angle]. [scene_type_modifier]
      [lens_suffix][action_breakdown]. [lighting_notes][canon_constraints]
      [negatives]

    Capped at _MAX_PROMPT_LENGTH characters.
    """
    style_prefix = STYLE_PREFIXES.get(render_style, DEFAULT_STYLE_PREFIX)
    scene_mod    = _SCENE_TYPE_MODIFIERS.get(scene_type, "")
    lens_suffix  = _get_lens_suffix(frame)

    # Detect any CHAR_ID tokens in the action text for canon lookup
    char_ids = re.findall(r"\bCHAR_[A-Z]+\b", frame.action_breakdown or "")
    canon_str   = _get_canon_constraints(char_ids, canon_context)
    ability_str = _get_ability_modifiers(char_ids, canon_context)

    body = (
        f"{frame.shot_type}, {frame.camera_angle}. "
        f"{scene_mod}"
        f"{lens_suffix}"
        f"{frame.action_breakdown}. "
        f"{frame.lighting_notes}"
    )
    if ability_str:
        body += f", {ability_str}"
    if canon_str:
        body += f", {canon_str}"

    # Append B&W negative constraints via lookup (no chained if/elif needed)
    _NEGATIVES: dict[str, str] = {
        "bw_sketch":   _BW_SKETCH_NEGATIVES,
        "bw_detailed": _BW_DETAILED_NEGATIVES,
    }
    body += _NEGATIVES.get(render_style, "")

    full = style_prefix + body

    # ── Visual DNA injection ─────────────────────────────────────────────────
    # If the Project Canon contains visual_dna tokens (extracted by Gemini Vision
    # after Imagen character generation), prefix the prompt with them so that
    # Pollinations / open-source models stay anchored to the Imagen reference.
    if canon_context:
        visual_dna: dict[str, str] = canon_context.get("visual_dna", {})
        if visual_dna:
            char_names = list(getattr(frame, "characters_present", None) or [])
            if char_names:
                from app.core.visual_qa import inject_visual_dna_prefix
                full = inject_visual_dna_prefix(full, char_names, visual_dna)

    return full[:_MAX_PROMPT_LENGTH]


def build_package_prompt(
    base_desc: str,
    view_desc: str,
    render_style: str = "bw_sketch",
    selected_emotion: str | None = None,
    selected_pose: str | None = None,
) -> str:
    """
    Assemble a character package image prompt.
    Optionally incorporates a selected emotion or pose override from the
    Emotion/Pose Library (Sub-Task 34).
    """
    style_prefix = STYLE_PREFIXES.get(render_style, DEFAULT_STYLE_PREFIX)

    # Override view_desc if emotion/pose library selection is active
    if selected_emotion:
        view_desc = f"{selected_emotion} facial expression, head and shoulders"
    elif selected_pose:
        view_desc = f"{selected_pose} pose, full body"

    if render_style == "bw_sketch":
        suffix = f"{base_desc}, {view_desc}, full body, white background, minimal outline drawing, no detail"
    elif render_style == "bw_detailed":
        suffix = f"{base_desc}, {view_desc}, full body, white background, detailed ink drawing, character reference sheet"
    else:
        suffix = f"{base_desc}, {view_desc}, full body, white background, character reference sheet"

    return (style_prefix + suffix)[:450]
