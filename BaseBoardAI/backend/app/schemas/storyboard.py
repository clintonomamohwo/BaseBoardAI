"""
Pydantic v2 request/response schemas for the BaseBoard AI domain.
These are the canonical validation contracts used by the FastAPI router layer.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# Sub-models & Domain Entities (Internal State Structures)
# ---------------------------------------------------------------------------

class FacialBlueprint(BaseModel):
    base_ethnicity_or_type: str = Field(
        description="Visual foundation background profile"
    )
    estimated_age: int
    bone_structure: str = Field(
        description="e.g., High defined cheekbones, prominent square jawline"
    )
    distinct_markers: str | None = Field(
        None, description="e.g., Small scar across the left eyebrow bridge"
    )
    fixed_seed_reference: int | None = Field(
        None, description="Static generation variable weight"
    )

class CharacterProfileBase(BaseModel):
    id: str = Field(description="Unique internal identity token, e.g., CHAR_CLINTON")
    name: str
    facial_blueprint: FacialBlueprint
    wardrobe_defaults: str

class EnvironmentProfileBase(BaseModel):
    location_name: str = Field(description="e.g., GYM, ALLEYWAY, OFFICE")
    spatial_textures: str = Field(description="Physical properties: industrial concrete, exposed brick")
    lighting_keys: str = Field(description="Default light source direction and mood parameters")

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
    sound_cue: str | None = Field(
        None, description="Synthesized sound effects tracking triggers"
    )
    generated_image_url: str | None = Field(
        None,
        description=(
            "Self-contained base64 data URL of the AI-generated frame thumbnail. "
            "Rendered directly via <img src={...} /> on the canvas — no cross-origin fetching."
        ),
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
    color_palette: list[str] = Field(
        description="Hexadecimal styling colors derived from emotional valence indices"
    )
    frames: list[StoryboardFrameBase]

# ---------------------------------------------------------------------------
# Pipeline Request & Response Envelopes
# ---------------------------------------------------------------------------

class PipelineExecutionRequest(BaseModel):
    """
    Inbound request payload from the React Multi-Step Wizard.
    Captures raw user descriptions before processing them through the AI pipeline.
    """
    project_title: str = Field(default="Untitled PreViz Project")
    global_aesthetic: str = Field(description="e.g., Cinematic High-Contrast, Neon Cyberpunk")
    raw_character_notes: str = Field(description="Raw text entered in Step 1 Character Builder")
    raw_world_notes: str = Field(description="Raw text entered in Step 2 World Builder")
    raw_script_text: str = Field(description="The complete raw screenplay pasted in Step 3")

class StoryboardProjectCreate(BaseModel):
    """
    Inbound payload for directly creating a storyboard project with fully structured data.
    Used by the direct CRUD POST / endpoint.
    """
    project_title: str = Field(default="Untitled PreViz Project")
    global_aesthetic: str = Field(description="e.g., Cinematic High-Contrast, Neon Cyberpunk")
    characters: list[CharacterProfileBase] = Field(default_factory=list)
    scenes: list[ScriptSceneBase] = Field(default_factory=list)


class StoryboardProjectResponse(BaseModel):
    """
    The finalized, fully synthesized multi-modal project blueprint.
    Returned to the React client to render the complete 3-column workspace views.
    """
    model_config = ConfigDict(from_attributes=True)

    project_title: str
    global_aesthetic: str
    characters: list[CharacterProfileBase] = Field(description="The standardized, locked-in character bible")
    scenes: list[ScriptSceneBase] = Field(description="The final parsed, continuity-checked scenes and frames")

    # Optional DB primary key placeholder for persistent storage tracking
    db_id: int | None = Field(None, description="Auto-incremented database primary key if saved")


# --- STANDALONE RUNNER PAYLOADS ---

class SingleCharacterRequest(BaseModel):
    raw_notes: str = Field(description="Raw text notes for a single character")

class SingleEnvironmentRequest(BaseModel):
    raw_notes: str = Field(description="Raw text notes for a single location")

class StandaloneStoryboardRequest(BaseModel):
    project_title: str
    global_aesthetic: str
    # Pass pre-structured bibles from previous client state if they already exist
    characters: list[CharacterProfileBase]
    raw_script_text: str