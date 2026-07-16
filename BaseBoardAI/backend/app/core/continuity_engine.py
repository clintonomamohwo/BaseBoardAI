"""
Continuity Engine — Cross-asset consistency scanning & change propagation.

When a canonical asset changes (character hair colour, outfit, location), this
module scans the project to identify every other asset that was generated using
that canonical data and returns a ContinuityImpactReport.

The router layer uses this report to surface a "Update affected assets? YES/NO"
prompt before triggering any selective regeneration.

Public API
----------
scan_continuity_impact(project_data, changed_asset_type, changed_asset_id,
                       changed_field, old_value, new_value) -> ContinuityImpactReport
"""

from __future__ import annotations

import logging
import re
from typing import Any, Literal

from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

AssetType = Literal["character", "environment", "outfit", "prop", "style"]


class ContinuityImpactReport(BaseModel):
    """
    Describes every project asset that references the changed canonical value
    and therefore needs to be considered for regeneration.
    """
    changed_asset_id: str
    changed_asset_type: AssetType
    changed_field: str
    old_value: str
    new_value: str

    # Affected asset IDs grouped by type
    affected_frame_ids: list[str] = []          # "scene_{n}_frame_{m}"
    affected_scene_numbers: list[int] = []
    affected_character_ref_ids: list[str] = []  # char.id values
    affected_environment_slugs: list[str] = []

    total_affected: int = 0
    regeneration_prompt: str = ""

    def build_summary(self) -> str:
        parts = []
        if self.affected_frame_ids:
            parts.append(f"{len(self.affected_frame_ids)} storyboard frames")
        if self.affected_character_ref_ids:
            parts.append(f"{len(self.affected_character_ref_ids)} character references")
        if self.affected_environment_slugs:
            parts.append(f"{len(self.affected_environment_slugs)} locations")
        if not parts:
            return "No affected assets found."
        return "Affected: " + ", ".join(parts) + "."


# ---------------------------------------------------------------------------
# Scanning helpers
# ---------------------------------------------------------------------------

def _normalise(value: str) -> str:
    """Lower-case and strip punctuation for fuzzy matching."""
    return re.sub(r"[^a-z0-9\s]", "", value.lower()).strip()


def _text_references_value(text: str, value: str) -> bool:
    """Return True if `value` (normalised) appears in `text` (normalised)."""
    if not value:
        return False
    return _normalise(value) in _normalise(text)


def _scan_frames_for_character(
    scenes: list[Any],
    char_id: str,
    char_name: str,
    changed_field: str,
    old_value: str,
) -> tuple[list[str], list[int]]:
    """
    Return (frame_id_list, scene_number_list) for every frame whose
    action_breakdown references either the char_id token or the char_name.
    Also matches if the old value text appears in the action.
    """
    frame_ids: list[str] = []
    scene_numbers: list[int] = []

    for scene in scenes:
        scene_hit = False
        for frame in scene.get("frames", []):
            action = frame.get("action_breakdown", "")
            lighting = frame.get("lighting_notes", "")
            combined = f"{action} {lighting}"

            hit = (
                char_id in combined
                or _text_references_value(combined, char_name)
                or _text_references_value(combined, old_value)
            )
            if hit:
                frame_ids.append(f"scene_{scene['scene_number']}_frame_{frame['frame_number']}")
                scene_hit = True

        if scene_hit and scene["scene_number"] not in scene_numbers:
            scene_numbers.append(scene["scene_number"])

    return frame_ids, scene_numbers


def _scan_frames_for_environment(
    scenes: list[Any],
    location_slug: str,
    old_value: str,
) -> tuple[list[str], list[int]]:
    frame_ids: list[str] = []
    scene_numbers: list[int] = []

    for scene in scenes:
        heading = scene.get("location_heading", "")
        env_type = scene.get("environmental_type", "")
        combined_scene = f"{heading} {env_type}"

        # A scene is affected if its heading references the location slug or old value
        scene_referenced = (
            _text_references_value(combined_scene, location_slug)
            or _text_references_value(combined_scene, old_value)
        )
        if not scene_referenced:
            continue

        scene_numbers.append(scene["scene_number"])
        for frame in scene.get("frames", []):
            frame_ids.append(
                f"scene_{scene['scene_number']}_frame_{frame['frame_number']}"
            )

    return frame_ids, scene_numbers


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def scan_continuity_impact(
    project_data: dict[str, Any],
    changed_asset_type: AssetType,
    changed_asset_id: str,
    changed_field: str,
    old_value: str,
    new_value: str,
) -> ContinuityImpactReport:
    """
    Scan a serialised project dict for all assets affected by a canonical change.

    `project_data` is expected to be a dict with keys matching
    StoryboardProjectResponse (characters, scenes).

    Returns a ContinuityImpactReport with all affected asset IDs populated.
    Never modifies the project data.
    """
    report = ContinuityImpactReport(
        changed_asset_id=changed_asset_id,
        changed_asset_type=changed_asset_type,
        changed_field=changed_field,
        old_value=old_value,
        new_value=new_value,
    )

    scenes: list[Any] = project_data.get("scenes", [])
    characters: list[Any] = project_data.get("characters", [])

    if changed_asset_type == "character":
        # Find the matching character profile to get its name
        char_name = changed_asset_id
        for char in characters:
            if char.get("id") == changed_asset_id:
                char_name = char.get("name", changed_asset_id)
                break

        frame_ids, scene_numbers = _scan_frames_for_character(
            scenes, changed_asset_id, char_name, changed_field, old_value
        )
        report.affected_frame_ids = frame_ids
        report.affected_scene_numbers = scene_numbers

        # All other character records that reference this character's wardrobe/appearance
        # could also be re-generated (relationship images, etc.)
        if changed_field in ("wardrobe_defaults", "bone_structure", "distinct_markers",
                             "base_ethnicity_or_type"):
            report.affected_character_ref_ids = [changed_asset_id]

    elif changed_asset_type == "environment":
        frame_ids, scene_numbers = _scan_frames_for_environment(
            scenes, changed_asset_id, old_value
        )
        report.affected_frame_ids = frame_ids
        report.affected_scene_numbers = scene_numbers
        report.affected_environment_slugs = [changed_asset_id]

    elif changed_asset_type == "outfit":
        # Outfit changes affect all frames that mention the character who owns the outfit
        char_name = changed_asset_id
        frame_ids, scene_numbers = _scan_frames_for_character(
            scenes, changed_asset_id, char_name, changed_field, old_value
        )
        report.affected_frame_ids = frame_ids
        report.affected_scene_numbers = scene_numbers
        report.affected_character_ref_ids = [changed_asset_id]

    elif changed_asset_type == "style":
        # A style change affects every single frame
        for scene in scenes:
            report.affected_scene_numbers.append(scene.get("scene_number", 0))
            for frame in scene.get("frames", []):
                report.affected_frame_ids.append(
                    f"scene_{scene['scene_number']}_frame_{frame['frame_number']}"
                )

    report.total_affected = len(report.affected_frame_ids)
    report.regeneration_prompt = report.build_summary()

    logger.info(
        "Continuity scan: %s '%s' field '%s' → %d affected frames across %d scenes.",
        changed_asset_type, changed_asset_id, changed_field,
        len(report.affected_frame_ids), len(report.affected_scene_numbers),
    )

    return report
