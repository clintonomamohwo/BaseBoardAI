"""
Pydantic v2 request/response schemas for the Storyboard domain.
These are the canonical validation contracts used by the FastAPI router layer.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------


class FacialBlueprint(BaseModel):
    base_ethnicity_or_type: str = Field(
        description="Visual foundation background profile"
    )
    estimated_age: int
    bone_structure: str = Field(
        description="e.g., High defined cheekbones, prominent square jawline"
    )
    distinct_markers: Optional[str] = Field(
        None, description="e.g., Small scar across the left eyebrow bridge"
    )
    fixed_seed_reference: Optional[int] = Field(
        None, description="Static generation variable weight"
    )


class CharacterProfileBase(BaseModel):
    id: str = Field(description="Unique internal identity token, e.g., CHAR_CLINTON")
    name: str
    facial_blueprint: FacialBlueprint
    wardrobe_defaults: str


class StoryboardFrameBase(BaseModel):
    frame_number: int
    shot_type: str = Field(
        description="Cinematography specification, e.g., Close-up, Establishing Wide"
    )
    camera_angle: str = Field(
        description="Camera altitude and tracking characteristics"
    )
    duration_seconds: float = Field(
        description="Calculated screen runtime for this semantic beat"
    )
    action_breakdown: str = Field(
        description="Detailed physical description including fixed character structural keys"
    )
    lighting_notes: str = Field(
        description="Color temperature parameters, illumination direction, and shadow mood"
    )
    sound_cue: Optional[str] = Field(
        None, description="Synthesized sound effects tracking triggers"
    )


class ScriptSceneBase(BaseModel):
    scene_number: int
    location_heading: str = Field(
        description="Standard screenplay slugline, e.g., INT. GYM - NIGHT"
    )
    environmental_type: str = Field(
        description="Interior or Exterior classification"
    )
    time_of_day: str = Field(
        description="Lighting phase descriptor, e.g., NIGHT, GOLDEN HOUR"
    )
    emotional_tone: str = Field(
        description="Categorized sentiment index, e.g., Tense, Melancholic"
    )
    color_palette: List[str] = Field(
        description="Hexadecimal styling colors derived from emotional valence indices"
    )
    frames: List[StoryboardFrameBase]


# ---------------------------------------------------------------------------
# Top-level project schema (request payload + response envelope)
# ---------------------------------------------------------------------------


class StoryboardProjectCreate(BaseModel):
    """Inbound creation payload — full project tree in one request."""

    project_title: str
    global_aesthetic: str
    characters: List[CharacterProfileBase]
    scenes: List[ScriptSceneBase]


class StoryboardProjectResponse(StoryboardProjectCreate):
    """Response envelope adds the server-assigned surrogate key."""

    db_id: int = Field(description="Auto-incremented database primary key")

    model_config = {"from_attributes": True}
