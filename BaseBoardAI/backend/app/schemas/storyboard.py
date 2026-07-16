"""
Pydantic v2 request/response schemas for the BaseBoard AI domain.
These are the canonical validation contracts used by the FastAPI router layer.
"""

from __future__ import annotations

from typing import Any, Literal

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

# ---------------------------------------------------------------------------
# Character Identity System — the four independent layers
# ---------------------------------------------------------------------------

class CharacterIdentity(BaseModel):
    """
    Layer 1 — WHO the character is.

    Remains constant regardless of species, outfit, or rendering style.
    Every AI generation reads this before producing an image.
    """
    name: str
    face_description: str | None = Field(
        None, description="e.g. 'sharp cheekbones, angular jaw, intense deep-set eyes'"
    )
    hair_description: str | None = Field(
        None, description="e.g. 'short black hair, undercut'"
    )
    eye_description: str | None = Field(
        None, description="e.g. 'green almond-shaped eyes'"
    )
    body_proportions: str | None = Field(
        None, description="e.g. 'tall athletic build, broad shoulders'"
    )
    age: int | None = None
    distinct_markers: str | None = Field(
        None, description="e.g. 'thin scar from left temple to ear'"
    )
    signature_accessories: list[str] = Field(
        default_factory=list,
        description="Items always worn regardless of outfit, e.g. ['broken compass pendant']"
    )
    # Reference images — user-uploaded canonical visuals.
    # Stored as base64 data URLs; nullable if not yet uploaded.
    reference_primary: str | None = Field(None, description="Primary portrait reference (base64)")
    reference_front:   str | None = Field(None, description="Front-view reference")
    reference_left:    str | None = Field(None, description="Left-profile reference")
    reference_right:   str | None = Field(None, description="Right-profile reference")
    reference_back:    str | None = Field(None, description="Back-view reference")


class SpeciesProfile(BaseModel):
    """
    Layer 2 — WHAT the character is (anatomy type).

    Default is 'human'. Species determines anatomy validation rules
    applied by the QA Engine.
    """
    species_id: str = Field("human", description="Registry key, e.g. 'human', 'elf', 'wolf', 'dragon', 'robot'")
    label: str = Field("Human", description="Display name shown in the UI")
    custom_notes: str | None = Field(
        None, description="Free-text overrides for custom species"
    )


class CharacterVariant(BaseModel):
    """
    Layer 3 — HOW the character appears at a specific point (outfit/age/form).

    Variants inherit the identity. They never replace it.
    """
    variant_id: str = Field(description="e.g. 'default', 'battle_armor', 'winter', 'elf_form'")
    label: str = Field(description="Display label, e.g. 'Battle Armor'")
    outfit: str | None = None
    hair_override: str | None = Field(
        None, description="Hair change for this variant — does not modify the base identity"
    )
    age_override: int | None = Field(
        None, description="Age at this variant stage (for timeline variants)"
    )
    species_override: str | None = Field(
        None, description="If set, uses a different species for this variant only"
    )
    extra_accessories: list[str] = Field(default_factory=list)
    scene_range: tuple[int, int] | None = Field(
        None, description="Scene numbers [first, last] where this variant is active"
    )
    notes: str | None = None


class QAScoreResult(BaseModel):
    """Result from the Visual QA Engine for a single frame."""
    overall: float = Field(description="0.0–1.0 weighted confidence score")
    breakdown: dict[str, float] = Field(
        description="Per-category scores: identity, species, anatomy, composition, lighting, props, continuity"
    )
    warning: str | None = None
    passed: bool = Field(description="True if overall >= 0.80")


class CharacterProfileBase(BaseModel):
    id: str = Field(description="Unique internal identity token, e.g., CHAR_CLINTON")
    name: str
    facial_blueprint: FacialBlueprint
    wardrobe_defaults: str

    # ── Character Identity System (CKG) ──────────────────────────────────────
    # All three layers are optional — absent for legacy characters created before
    # the Identity System was introduced. Identity defaults to None (the system
    # falls back to facial_blueprint for backwards compat).
    identity: CharacterIdentity | None = Field(
        None, description="Canonical identity — who the character is"
    )
    species: SpeciesProfile = Field(
        default_factory=SpeciesProfile,
        description="Anatomy profile — what the character is. Defaults to human."
    )
    variants: list[CharacterVariant] = Field(
        default_factory=list,
        description="Appearance variants — how the character looks at different story points"
    )
    active_variant_id: str | None = Field(
        None, description="Which variant is currently active for generation"
    )

class EnvironmentProfileBase(BaseModel):
    location_name: str = Field(description="e.g., GYM, ALLEYWAY, OFFICE")
    spatial_textures: str = Field(description="Physical properties: industrial concrete, exposed brick")
    lighting_keys: str = Field(description="Default light source direction and mood parameters")

class StoryboardFrameBase(BaseModel):
    frame_number: int

    # ── Three-level action system ────────────────────────────────────────────
    narrative_action: str | None = Field(
        None,
        description=(
            "Level 1 — verbatim excerpt from the source screenplay. "
            "Never AI-modified; read-only anchor for the frame."
        )
    )
    visual_action: str | None = Field(
        None,
        description=(
            "Level 2 — AI-directed staging interpretation. "
            "What BaseBoard generates from the narrative: character movement, body language, "
            "environmental interaction, camera-relevant staging. "
            "Editable and independently regeneratable without touching the image."
        )
    )
    animation_beats: list[str] = Field(
        default_factory=list,
        description=(
            "Level 3 — granular animation cues for Maya / Unreal. "
            "e.g. ['Walk', 'Stop', 'Right Hand Reach', 'Grip Handle', 'Pull', 'Step Forward']. "
            "Empty list until explicitly requested."
        )
    )

    # ── Legacy field: kept for backwards compat; visual_action is the primary ──
    action_breakdown: str = Field(
        description="Detailed physical description including fixed character structural keys"
    )

    # ── Shot & camera ────────────────────────────────────────────────────────
    shot_type: str = Field(
        description="Cinematography specification, e.g., Close-up, Establishing Wide"
    )
    camera_angle: str = Field(
        description="Camera altitude and tracking characteristics"
    )
    camera_movement: str | None = Field(
        None,
        description="Camera movement during the shot, e.g. 'Slow Dolly Forward', 'Static', 'Handheld', 'Pan Right'"
    )

    # ── Timing ───────────────────────────────────────────────────────────────
    duration_seconds: float = Field(
        description="Calculated screen runtime for this semantic beat"
    )

    # ── Lighting & mood ──────────────────────────────────────────────────────
    lighting_notes: str = Field(
        description="Color temperature parameters, illumination direction, and shadow mood"
    )
    mood: str | None = Field(
        None,
        description="Frame-level emotional atmosphere, e.g. 'Isolation', 'Dread', 'Wonder'. Distinct from scene-level emotional_tone."
    )

    # ── Production metadata ──────────────────────────────────────────────────
    purpose: str | None = Field(
        None,
        description="Director's intent for this frame, e.g. 'Introduce location', 'Reveal character', 'Escalate tension'"
    )
    characters_present: list[str] = Field(
        default_factory=list,
        description="Names of characters visible or active in this frame"
    )
    frame_emotion: str | None = Field(
        None,
        description="Dominant emotion of the central character in this frame, e.g. 'Cautious', 'Terrified', 'Relieved'"
    )
    dialogue: str | None = Field(
        None,
        description="Spoken dialogue in this frame, or null if none. Used for comic speech bubbles and animatic captions."
    )
    director_notes: str | None = Field(
        None,
        description="AI-generated rationale for compositional choices, e.g. 'Keep Emma small in frame to emphasise isolation. Hold silence for two seconds.'"
    )

    # ── Audio ────────────────────────────────────────────────────────────────
    sound_cue: str | None = Field(
        None, description="Synthesized sound effects tracking triggers"
    )

    # ── Generated output ─────────────────────────────────────────────────────
    generated_image_url: str | None = Field(
        None,
        description=(
            "Self-contained base64 data URL of the AI-generated frame thumbnail. "
            "Rendered directly via <img src={...} /> on the canvas — no cross-origin fetching."
        ),
    )

    # ── Director Engine metadata (populated by director_engine.py) ──────────
    lens: str | None = Field(
        None, description="Cinematic lens label, e.g. '85mm Portrait'"
    )
    focal_length: str | None = Field(
        None, description="Focal length string, e.g. '85mm'"
    )
    depth_style: str | None = Field(
        None, description="Depth of field style, e.g. 'shallow bokeh', 'deep focus'"
    )
    lens_prompt_suffix: str | None = Field(
        None, description="Prompt modifier injected by Lens Planner, e.g. 'shot on 85mm lens, shallow bokeh'"
    )
    locked_fields: list[str] = Field(
        default_factory=list,
        description="Fields locked by user — never overwritten during regeneration. e.g. ['face','camera']"
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
    render_style: Literal['bw_sketch', 'flat_color', 'full_shaded'] = Field(
        'bw_sketch', description="Visual rendering pipeline mode"
    )
    reference_style_image: str | None = Field(
        None, description="Optional user-uploaded reference style image encoded as a Base64 data URL string."
    )
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
    render_style: Literal['bw_sketch', 'flat_color', 'full_shaded'] = Field(
        'bw_sketch', description="Visual rendering pipeline mode"
    )
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
    render_style: str
    characters: list[CharacterProfileBase] = Field(description="The standardized, locked-in character bible")
    scenes: list[ScriptSceneBase] = Field(description="The final parsed, continuity-checked scenes and frames")

    # Optional DB primary key placeholder for persistent storage tracking
    db_id: int | None = Field(None, description="Auto-incremented database primary key if saved")

    # Project Canon — the single source of truth for all AI generation.
    # Null for projects created before the Canon was introduced (backwards compat).
    canon: "ProjectCanon | None" = Field(None, description="Approved visual facts consulted by every generation")


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


# ---------------------------------------------------------------------------
# Director Engine request/response models
# ---------------------------------------------------------------------------

class ContinuityScanRequest(BaseModel):
    """Payload for POST /storyboard/continuity/scan"""
    project: dict[str, Any] = Field(description="Serialised StoryboardProjectResponse dict")
    changed_asset_type: Literal["character", "environment", "outfit", "prop", "style"]
    changed_asset_id: str = Field(description="Character ID, environment slug, or 'global'")
    changed_field: str = Field(description="The field that changed, e.g. 'wardrobe_defaults'")
    old_value: str = Field(description="Previous value of the changed field")
    new_value: str = Field(description="New value of the changed field")


class ReforgeCompositionRequest(BaseModel):
    """Payload for POST /storyboard/frame/reforge-composition"""
    frame: StoryboardFrameBase
    scene: "ScriptSceneBase"
    render_style: Literal['bw_sketch', 'bw_detailed', 'flat_color', 'full_shaded'] = 'bw_sketch'
    reference_style_image: str | None = None


class WorldBibleImportRequest(BaseModel):
    """Payload for POST /storyboard/world-bible/import"""
    raw_text: str = Field(description="Extracted text from uploaded world bible document")
    project_id: int | None = Field(None, description="If set, merge into this existing project")


class WorldBibleImportResult(BaseModel):
    """Response from POST /storyboard/world-bible/import"""
    environments_extracted: int
    factions_extracted: int
    lore_entries_extracted: int
    timeline_entries_extracted: int
    merged_environments: list[EnvironmentProfileBase] = []
    raw_extracted: dict[str, Any] = {}


class AgeVariantRequest(BaseModel):
    """Payload for POST /storyboard/character-package/age-variant"""
    char_data: dict[str, Any] = Field(description="CharacterProfile JSON")
    age: int = Field(description="Target age for the variant, e.g. 18")
    render_style: Literal['bw_sketch', 'bw_detailed', 'flat_color', 'full_shaded'] = 'bw_sketch'


class ConsistencyScoreRequest(BaseModel):
    """Payload for POST /storyboard/character-package/consistency-score"""
    character_id: str
    image_urls: dict[str, str] = Field(
        description="section_key → base64 data URL, e.g. {'portrait': 'data:image/png;...', 'turnaround/front': '...'}"
    )


class ConsistencyScoreResponse(BaseModel):
    """Response from POST /storyboard/character-package/consistency-score"""
    overall: float = Field(description="0.0–1.0 overall consistency confidence")
    breakdown: dict[str, float] = Field(
        description="Per-attribute score: face, hair, body, costume, colors, accessories"
    )
    warning: str | None = Field(
        None, description="Warning message if overall < 0.85"
    )
    character_id: str


# ---------------------------------------------------------------------------
# Creative Knowledge Graph (CKG) — was "Project Canon"
#
# The CKG is the single authoritative node graph for all AI generation in a
# project.  It stores every approved creative fact BaseBoard knows about:
# characters (with their full Identity System layers), species, variants,
# world bible, style guide, director rules, and visual rules.
#
# "ProjectCanon" is kept as an alias for backwards compatibility.
# ---------------------------------------------------------------------------

class CreativeKnowledgeGraph(BaseModel):
    """
    The Creative Knowledge Graph — every AI generation reads this before
    producing output.  Replaces the flat ProjectCanon with a structured
    graph that separates identity, species, variants, locations, props,
    relationships, and style rules into independent nodes.

    Stored as a JSON blob alongside the project.
    """
    project_id: int | None = None

    # ── Character Identity nodes ──────────────────────────────────────────
    # char_id → full CharacterIdentity dict (face, hair, eyes, reference images …)
    character_identities: dict[str, Any] = Field(
        default_factory=dict,
        description="char_id → CharacterIdentity dict"
    )
    # char_id → SpeciesProfile dict
    character_species: dict[str, Any] = Field(
        default_factory=dict,
        description="char_id → SpeciesProfile dict (defaults to human)"
    )
    # char_id → list[CharacterVariant] dicts
    character_variants: dict[str, Any] = Field(
        default_factory=dict,
        description="char_id → list of CharacterVariant dicts"
    )
    # Backwards-compat: char_id → flat appearance summary used by prompt_builder
    approved_characters: dict[str, Any] = Field(
        default_factory=dict,
        description="char_id → {appearance_summary, canonical_prompt, reference_image_b64}"
    )

    # ── Asset libraries ───────────────────────────────────────────────────
    expression_sheets: dict[str, Any] = Field(
        default_factory=dict,
        description="char_id → expression key-value image dict"
    )
    pose_libraries: dict[str, Any] = Field(
        default_factory=dict,
        description="char_id → pose key-value image dict"
    )
    outfit_libraries: dict[str, Any] = Field(
        default_factory=dict,
        description="char_id → outfit key-value image dict"
    )
    accessory_libraries: dict[str, Any] = Field(
        default_factory=dict,
        description="char_id → accessory key-value image dict"
    )

    # ── World nodes ───────────────────────────────────────────────────────
    world_bible_summary: str = ""
    locations: dict[str, Any] = Field(
        default_factory=dict,
        description="location_slug → EnvironmentProfileBase dict"
    )
    props: dict[str, Any] = Field(
        default_factory=dict,
        description="prop_id → description + reference image"
    )
    timeline: list[Any] = Field(
        default_factory=list,
        description="Ordered timeline entries for the story world"
    )
    relationships: dict[str, Any] = Field(
        default_factory=dict,
        description="char_id → list of CharacterRelationship dicts"
    )

    # ── Style & direction nodes ───────────────────────────────────────────
    style_guide: str = ""
    color_palette: list[str] = Field(default_factory=list)
    camera_language: dict[str, Any] = Field(
        default_factory=dict,
        description="scene_type → preferred shot distribution overrides"
    )
    director_profile: str = Field(
        default="",
        description="e.g. 'Kubrickian symmetry', 'Handheld verité'"
    )
    visual_rules: list[str] = Field(
        default_factory=list,
        description="e.g. ['never use dutch angle in dialogue scenes']"
    )


# Backwards-compatibility alias — existing code that imports ProjectCanon continues to work.
ProjectCanon = CreativeKnowledgeGraph


# ---------------------------------------------------------------------------
# Character Identity System — QA endpoint schemas
# ---------------------------------------------------------------------------

class CharacterQARequest(BaseModel):
    """
    Payload for POST /storyboard/character/qa-score.

    Runs the Visual QA Engine against a generated prompt, identity, and
    species/variant context and returns a full QAScoreResult.
    """
    generated_prompt: str = Field(description="The assembled image prompt that was sent to the generator")
    identity: CharacterIdentity
    species_id: str = Field("human", description="Active species key, e.g. 'human', 'elf', 'wolf'")
    variant: CharacterVariant | None = None


class ImportAssetRequest(BaseModel):
    """
    Payload for POST /storyboard/character-package/import-asset.

    Accepts a single uploaded asset (base64) and stores it in the character
    identity as the canonical reference for that view.
    """
    character_id: str
    asset_type: Literal[
        "reference_primary",
        "reference_front",
        "reference_left",
        "reference_right",
        "reference_back",
        "expression_sheet",
        "pose_sheet",
        "outfit",
        "prop",
    ] = Field(description="Which slot in the identity or package to write this image to")
    image_data: str = Field(description="Base64 data URL of the uploaded image, e.g. 'data:image/png;base64,...'")
    extract_identity: bool = Field(
        True,
        description="If true, run LLM vision pass to extract/update character identity prompt from the image"
    )


class ImportAssetResponse(BaseModel):
    """Response from POST /storyboard/character-package/import-asset."""
    character_id: str
    asset_type: str
    stored: bool
    extracted_description: str | None = Field(
        None,
        description="LLM-extracted character description from the uploaded image, if extract_identity=True"
    )
    updated_identity_fields: dict[str, str] = Field(
        default_factory=dict,
        description="Fields that were updated in CharacterIdentity based on image extraction"
    )


class CKGUpdateIdentityRequest(BaseModel):
    """
    Payload for POST /storyboard/ckg/update-identity.

    Writes a CharacterIdentity into the CKG for a project.
    """
    project_id: int
    character_id: str
    identity: CharacterIdentity
    species: SpeciesProfile = Field(default_factory=SpeciesProfile)
    variants: list[CharacterVariant] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Visual Action regeneration schemas
# ---------------------------------------------------------------------------

class RegenerateVisualActionRequest(BaseModel):
    """
    Payload for POST /storyboard/frame/regenerate-visual-action.

    Sends the current frame + scene context back to the LLM to produce a new
    Level-2 visual_action (staging direction) without touching the image.
    The caller decides whether to regenerate the image afterwards.
    """
    frame: StoryboardFrameBase
    scene: "ScriptSceneBase"
    characters: list[CharacterProfileBase] = Field(
        default_factory=list,
        description="Character profiles present in the scene — used to ground the staging"
    )
    regenerate_animation_beats: bool = Field(
        False,
        description="If true, also regenerate Level-3 animation_beats for the frame"
    )


class RegenerateVisualActionResponse(BaseModel):
    """Response from POST /storyboard/frame/regenerate-visual-action"""
    frame_number: int
    visual_action: str
    animation_beats: list[str] = Field(default_factory=list)
    director_notes: str | None = None
