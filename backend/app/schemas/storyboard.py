"""
Pydantic v2 request/response schemas for the BaseBoard AI domain.
These are the canonical validation contracts used by the FastAPI router layer.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

# ---------------------------------------------------------------------------
# Character DNA — Physical Form, Classification, and Abilities
# These are the three new CKM layers that the previous Identity System lacked.
# ---------------------------------------------------------------------------

PHYSICAL_FORM_OPTIONS = Literal[
    "humanoid", "quadruped", "dragon", "bird", "serpent",
    "spirit", "robot", "vehicle", "hybrid", "custom"
]

CLASSIFICATION_OPTIONS = Literal[
    "human", "god", "demon", "angel", "alien", "robot",
    "spirit", "monster", "hero", "villain", "deity", "custom"
]

ABILITY_OPTIONS = Literal[
    "flight", "teleportation", "fire_breath", "immortality",
    "shapeshifting", "magic", "lightning", "healing",
    "super_strength", "invisibility", "mind_control", "custom"
]


# ---------------------------------------------------------------------------
# Sub-models & Domain Entities (Internal State Structures)
# ---------------------------------------------------------------------------

# Coercion helpers — let the LLM return null without crashing validation.
# Pydantic v2 does NOT substitute field defaults for explicit None inputs on
# non-optional fields; BeforeValidator is the correct fix.
def _str_or_default(default: str):
    """Return a BeforeValidator that substitutes *default* when the value is None."""
    def _coerce(v: Any) -> Any:
        return default if v is None else v
    return BeforeValidator(_coerce)

def _int_or_default(default: int):
    def _coerce(v: Any) -> Any:
        if v is None:
            return default
        try:
            return int(v)
        except (ValueError, TypeError):
            return default
    return BeforeValidator(_coerce)

def _float_or_default(default: float):
    def _coerce(v: Any) -> Any:
        return default if v is None else v
    return BeforeValidator(_coerce)

def _list_or_default(default_factory):
    def _coerce(v: Any) -> Any:
        return default_factory() if v is None else v
    return BeforeValidator(_coerce)


class FacialBlueprint(BaseModel):
    base_ethnicity_or_type: Annotated[str, _str_or_default("unspecified")] = Field(
        default="unspecified",
        description="Visual foundation background profile"
    )
    estimated_age: Annotated[int, _int_or_default(0)] = Field(
        default=0, description="Estimated age; 0 when unknown or non-human"
    )
    bone_structure: Annotated[str, _str_or_default("unspecified")] = Field(
        default="unspecified",
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


class PhysicalForm(BaseModel):
    """
    CKM Layer — HOW the character's anatomy is structured.

    Completely separate from Classification (narrative role).
    Zeus = PhysicalForm(form='humanoid'), Classification='god'.
    Dragon God = PhysicalForm(form='dragon'), Classification='god'.

    Physical Form determines QA anatomy validation and Director Engine
    composition strategy (e.g., dragon → wide/aerial shots preferred).
    """
    # pyrefly: ignore [bad-assignment]
    form: PHYSICAL_FORM_OPTIONS = Field(  # pyright: ignore[reportArgumentType]
        default="humanoid",
        description=(
            "Structural anatomy type. Drives QA validator dispatch and Director Engine "
            "composition strategy. 'humanoid' is the default for all human-base species."
        )
    )
    custom_description: str | None = Field(
        None,
        description="Free-text anatomy description — required when form='custom'"
    )
    limb_count: int | None = Field(
        None,
        description="Optional explicit limb count override (for hybrid/custom forms)"
    )
    has_wings: bool = Field(False, description="True if this form includes wings")
    has_tail: bool = Field(False, description="True if this form includes a tail")


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


class QARepairAction(BaseModel):
    """
    A single targeted fix recommended by the QA Engine.

    Instead of regenerating the whole image, the engine tells the caller
    exactly which subsystem to re-run and which API endpoint handles it.
    """
    category: str = Field(
        description="The failing category this action fixes, e.g. 'composition', 'props'"
    )
    label: str = Field(
        description="Human-readable action label, e.g. 'Regenerate Composition Only'"
    )
    endpoint: str = Field(
        description="Backend endpoint to call, e.g. '/storyboard/frame/reforge-composition'"
    )
    severity: str = Field(
        "warning",
        description="'critical' (score < 0.5) | 'warning' (0.5–0.75) | 'suggestion' (0.75–0.85)"
    )
    score: float = Field(description="Category score that triggered this action (0.0–1.0)")


class QAScoreResult(BaseModel):
    """
    Result from the Project-Aware Visual QA Engine.

    Validates a generated image against the Project Canon — including the
    asset's species profile (no human assumption), active variant, required
    props, composition, camera, lighting, and environment.
    """
    overall: float = Field(description="0.0–1.0 weighted confidence score")
    breakdown: dict[str, float] = Field(
        description=(
            "Per-category scores — 9 categories: "
            "identity, species, anatomy, composition, camera, lighting, props, environment, continuity"
        )
    )
    warning: str | None = Field(None, description="Plain-text summary of failures (backwards compat)")
    passed: bool = Field(description="True if overall >= 0.80")
    asset_type: str = Field(
        "character",
        description="Asset type that was validated: 'character' | 'creature' | 'animal' | 'robot' | 'vehicle'"
    )
    repairs: list[QARepairAction] = Field(
        default_factory=list,
        description=(
            "Ordered list of targeted fix actions — e.g. 'Regenerate Composition Only'. "
            "Only populated for categories that scored below 0.85. "
            "Empty when QA passes. Ordered by severity (critical first)."
        )
    )


class CharacterProfileBase(BaseModel):
    id: str = Field(description="Unique internal identity token, e.g., CHAR_CLINTON")
    name: str
    facial_blueprint: FacialBlueprint
    wardrobe_defaults: str

    # ── Character DNA System (CKG) ────────────────────────────────────────────
    # All layers are optional — absent for legacy characters created before the
    # DNA System was introduced. Falls back to facial_blueprint for backwards compat.
    identity: CharacterIdentity | None = Field(
        None, description="Layer 1 — canonical identity (who the character is)"
    )
    species: SpeciesProfile = Field(
        default_factory=lambda: SpeciesProfile(),  # pyright: ignore[reportCallIssue]
        description="Layer 2 — anatomy profile (what the character is). Defaults to human."
    )
    physical_form: PhysicalForm = Field(
        default_factory=lambda: PhysicalForm(),  # pyright: ignore[reportCallIssue]
        description=(
            "CKM Layer — structural anatomy type (humanoid, quadruped, dragon…). "
            "DISTINCT from species and classification. "
            "Drives QA validator dispatch and Director Engine composition strategy."
        )
    )
    classification: CLASSIFICATION_OPTIONS | None = Field(
        None,
        description=(
            "Narrative role classification (god, demon, hero, villain…). "
            "Does NOT affect anatomy — only influences story logic, world building, "
            "and cinematic behaviour (e.g. god → dramatic establishing shot preference)."
        )
    )
    abilities: list[str] = Field(
        default_factory=list,
        description=(
            "Character abilities that influence storyboard generation. "
            "e.g. ['flight', 'fire_breath']. "
            "A flying character gets aerial shots preferred; fire_breath → extreme wide or close insert."
        )
    )
    visual_rules: list[str] = Field(
        default_factory=list,
        description=(
            "Per-character visual rules enforced by the QA Engine and Director Engine. "
            "e.g. ['always show wings', 'never show without crown', 'light from above only']"
        )
    )
    variants: list[CharacterVariant] = Field(
        default_factory=list,
        description="Appearance variants — how the character looks at different story points"
    )
    active_variant_id: str | None = Field(
        None, description="Which variant is currently active for generation"
    )

    # ── Narrative role & relationships ────────────────────────────────────────
    story_role: str | None = Field(
        None,
        description="Narrative role: Protagonist | Antagonist | Supporting | Other"
    )
    relationships: list[dict] = Field(
        default_factory=list,
        description="List of relationship objects to other characters (serialised CharacterRelationship)"
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
    action_breakdown: Annotated[str, _str_or_default("")] = Field(
        default="",
        description="Detailed physical description including fixed character structural keys"
    )

    # ── Shot & camera ────────────────────────────────────────────────────────
    shot_type: Annotated[str, _str_or_default("Wide Shot")] = Field(
        default="Wide Shot",
        description="Cinematography specification, e.g., Close-up, Establishing Wide"
    )
    camera_angle: Annotated[str, _str_or_default("Eye-level")] = Field(
        default="Eye-level",
        description="Camera altitude and tracking characteristics"
    )
    camera_movement: str | None = Field(
        None,
        description="Camera movement during the shot, e.g. 'Slow Dolly Forward', 'Static', 'Handheld', 'Pan Right'"
    )

    # ── Timing ───────────────────────────────────────────────────────────────
    duration_seconds: Annotated[float, _float_or_default(3.0)] = Field(
        default=3.0,
        description="Calculated screen runtime for this semantic beat"
    )

    # ── Lighting & mood ──────────────────────────────────────────────────────
    lighting_notes: Annotated[str, _str_or_default("")] = Field(
        default="",
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
        description="Fields locked by user — never overwritten during regeneration. e.g. ['shot_type', 'camera_angle', 'lighting_notes']"
    )

    # ── Cinematic Brain auto-decision tracking ────────────────────────────────
    auto_selected: dict[str, bool] = Field(
        default_factory=dict,
        description=(
            "Tracks which cinematic fields were auto-selected by the Cinematic Brain "
            "vs. explicitly set by the LLM or user. "
            "e.g. {'shot_type': True, 'lighting_notes': True, 'camera_angle': False}. "
            "Frontend uses this to show 'AI chosen' badges. "
            "Setting a field to False means it was user-supplied or LLM-supplied."
        )
    )
    director_rationale: dict[str, str] = Field(
        default_factory=dict,
        description=(
            "Per-field rationale from the Cinematic Brain. "
            "e.g. {'shot_type': 'Emotional moment — close-up registers facial performance.', "
            "'lighting_notes': 'Night horror — low key reinforces dread.'}. "
            "Displayed in the Studio Inspector director notes panel."
        )
    )

class ScriptSceneBase(BaseModel):
    scene_number: int
    location_heading: Annotated[str, _str_or_default("UNKNOWN LOCATION")] = Field(
        default="UNKNOWN LOCATION",
        description="Standard screenplay slugline, e.g., INT. GYM - NIGHT"
    )
    environmental_type: Annotated[str, _str_or_default("Interior")] = Field(
        default="Interior",
        description="Interior or Exterior classification"
    )
    time_of_day: Annotated[str, _str_or_default("DAY")] = Field(
        default="DAY",
        description="Lighting phase descriptor, e.g., NIGHT, GOLDEN HOUR"
    )
    emotional_tone: Annotated[str, _str_or_default("Neutral")] = Field(
        default="Neutral",
        description="Categorized sentiment index, e.g., Tense, Melancholic"
    )
    color_palette: Annotated[list[str], _list_or_default(lambda: ["#888888", "#aaaaaa", "#cccccc"])] = Field(
        default_factory=lambda: ["#888888", "#aaaaaa", "#cccccc"],
        description="Hexadecimal styling colors derived from emotional valence indices"
    )
    frames: Annotated[list[StoryboardFrameBase], _list_or_default(list)] = Field(default_factory=list)

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
    # pyrefly: ignore [bad-assignment]
    director_style: Literal['balanced', 'cinematic', 'dialogue', 'action', 'intimate'] = Field(
        'balanced', description=" Director AI shot-planning style"
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

    # Set to True when the LLM output was truncated mid-generation and only a
    # partial storyboard was recovered. The frontend should warn the user.
    truncated: bool = Field(False, description="True if the storyboard was cut off by the model's token limit")


class ProjectSummary(BaseModel):
    """
    Lightweight project card data for the Project Library list view.
    Contains no frame-level data — just what the card UI needs.
    Fetched by GET /storyboard/summaries (fast, no images loaded).
    """
    db_id: int
    project_title: str
    global_aesthetic: str
    render_style: str
    scene_count: int
    frame_count: int
    character_count: int
    color_palettes: list[list[str]] = Field(
        default_factory=list,
        description="First color_palette list from each scene (for accent strips)"
    )


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
    scene: ScriptSceneBase
    render_style: Literal['bw_sketch', 'bw_detailed', 'flat_color', 'full_shaded'] = 'bw_sketch'
    reference_style_image: str | None = None


class UpgradeStyleRequest(BaseModel):
    """
    Payload for POST /storyboard/frame/upgrade-style.

    Upgrades a single frame to a new render style while preserving
    composition, characters, environment, and layout.

    The current generated_image is passed as img2img source so the model
    uses it as a composition anchor — only the visual style changes.
    """
    frame: StoryboardFrameBase
    scene: ScriptSceneBase
    target_style: str = Field(
        description=(
            "Target render style key, e.g. 'flat_color', 'concept_art', 'cinematic', 'anime_style'. "
            "Any key present in STYLE_PREFIXES is valid."
        )
    )
    source_image_b64: str | None = Field(
        None,
        description=(
            "Base64 data URL of the current frame image used as composition reference. "
            "If provided, img2img preserves framing while upgrading style. "
            "If omitted, pure text-to-image is used."
        )
    )
    canon_context: dict[str, Any] | None = Field(
        None,
        description="Project Canon — injected for character consistency constraints"
    )


class SceneUpgradeRequest(BaseModel):
    """
    Payload for POST /storyboard/scene/upgrade-style.

    Upgrades every frame in a scene to a new render style concurrently.
    Returns a list of UpgradeStyleResponse, one per frame.
    """
    frames: list[StoryboardFrameBase]
    scene: ScriptSceneBase
    target_style: str
    source_images: dict[int, str] = Field(
        default_factory=dict,
        description="frame_number → base64 data URL of the current image (optional; used as img2img source)"
    )
    canon_context: dict[str, Any] | None = None


class UpgradeStyleResponse(BaseModel):
    """Response from POST /storyboard/frame/upgrade-style"""
    frame_number: int
    generated_image_url: str | None
    target_style: str


class SceneUpgradeResponse(BaseModel):
    """Response from POST /storyboard/scene/upgrade-style"""
    scene_number: int
    frames: list[UpgradeStyleResponse]
    total: int
    succeeded: int


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
    # char_id → list[str] of ability slugs — consumed by prompt_builder and Director Engine
    character_abilities: dict[str, Any] = Field(
        default_factory=dict,
        description="char_id → list of ability slugs, e.g. ['flight', 'fire_breath']"
    )
    # char_id → list[str] of visual rules — enforced by QA Engine and Director Engine
    character_visual_rules: dict[str, Any] = Field(
        default_factory=dict,
        description="char_id → list of visual rule strings, e.g. ['always show wings']"
    )
    # char_id → base64 data URL of the chosen reference portrait
    character_portraits: dict[str, Any] = Field(
        default_factory=dict,
        description="char_id → reference portrait data URL chosen by the creator"
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

    Runs the Project-Aware Visual QA Engine against a generated prompt.
    The engine selects the correct structural validator based on asset_type,
    loads the species profile from the registry, and validates anatomy,
    identity, camera, environment, props, and continuity.
    """
    generated_prompt: str = Field(description="The assembled image prompt that was sent to the generator")
    identity: CharacterIdentity
    species_id: str = Field("human", description="Active species key, e.g. 'human', 'elf', 'wolf', 'car', 'horse'")
    variant: CharacterVariant | None = None
    # pyrefly: ignore [bad-assignment]
    asset_type: Literal["character", "creature", "animal", "robot", "vehicle"] = Field(
        "character",
        description=(
            "Asset type — determines which structural validator is loaded. "
            "'character' covers humanoids (human, elf, vampire). "
            "'creature' covers non-humanoid fantasy (dragon, wolf). "
            "'animal' covers real-world animals. "
            "'robot' covers mechanical constructs. "
            "'vehicle' covers cars, ships, spacecraft."
        )
    )
    scene_context: str | None = Field(
        None,
        description="Optional: location/environment description used to score the Environment category"
    )
    camera_spec: str | None = Field(
        None,
        description="Optional: expected camera/lens spec (e.g. '85mm portrait, shallow bokeh') for Camera scoring"
    )


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
    When canonical_prompt is provided it is stored verbatim as the
    _canonical_prompt / canonical_prompt used by the Prompt Builder for
    every subsequent image generation, overriding the auto-assembled summary.
    """
    project_id: int
    character_id: str
    identity: CharacterIdentity
    species: SpeciesProfile = Field(default_factory=lambda: SpeciesProfile())  # pyright: ignore[reportCallIssue]
    variants: list[CharacterVariant] = Field(default_factory=list)
    canonical_prompt: str | None = Field(
        None,
        description="Explicit prompt text set by the user on the AI Prompt tab. "
                    "When present, overrides the auto-assembled appearance summary "
                    "in both character_identities._canonical_prompt and "
                    "approved_characters.canonical_prompt."
    )


# ---------------------------------------------------------------------------
# Frame / Scene Continuity QA schemas
# ---------------------------------------------------------------------------

class FrameExpectedContext(BaseModel):
    """
    The authoritative metadata for a single storyboard frame drawn from the
    storyboard plan.  Passed by the frontend — never inferred.
    """
    scene_number: int
    frame_number: int
    location_heading: str = Field(
        description="Canonical slugline from the scene, e.g. 'INT. TORONTO APARTMENT - NIGHT'"
    )
    time_of_day: str = Field(description="e.g. 'DAY', 'NIGHT', 'GOLDEN HOUR'")
    environmental_type: str = Field("Interior", description="'Interior' or 'Exterior'")
    characters_present: list[str] = Field(default_factory=list)
    lighting_notes: str = Field("", description="Scene-level lighting descriptor")
    mood: str | None = None
    shot_type: str = Field("Wide Shot")
    generated_prompt: str = Field(
        description="The assembled image prompt that was sent to the generator"
    )


class FrameQAIssue(BaseModel):
    """A single detected continuity or context violation."""
    category: Literal[
        "location", "time_of_day", "lighting", "characters",
        "weather", "shot_type", "mood", "prompt_alignment"
    ]
    severity: Literal["critical", "warning", "suggestion"]
    message: str = Field(description="Human-readable description of the issue")
    expected: str | None = Field(None, description="What the storyboard says it should be")
    detected: str | None = Field(None, description="What was found in the generated prompt")
    frame_number: int


class FrameQAResult(BaseModel):
    """QA result for a single frame."""
    scene_number: int
    frame_number: int
    passed: bool
    overall: float = Field(description="0.0–1.0 confidence score")
    issues: list[FrameQAIssue] = Field(default_factory=list)
    continuity_group_id: str = Field(
        description="e.g. 'S2_INT_TORONTO_APARTMENT_NIGHT' — groups frames that should match"
    )


class ContinuityGroup(BaseModel):
    """
    A run of consecutive frames sharing the same expected location + time_of_day.
    QA only compares frames *within* a group — transitions between groups are
    intentional and never flagged.
    """
    group_id: str
    location_heading: str
    time_of_day: str
    frame_numbers: list[int]
    scene_number: int


class SceneContinuityReport(BaseModel):
    """
    Full continuity QA report for a scene (all frames).
    Contains per-frame results and the continuity groups that were detected.
    """
    scene_number: int
    location_heading: str
    total_frames: int
    frames_passed: int
    frames_failed: int
    overall: float
    continuity_groups: list[ContinuityGroup]
    frame_results: list[FrameQAResult]
    summary: str = Field(description="One-sentence human-readable summary")


class SceneQARequest(BaseModel):
    """
    Payload for POST /storyboard/scene/qa-continuity.

    Sends the full set of frames for a scene (including their expected metadata
    and generated prompts) and returns a SceneContinuityReport.
    """
    scene_number: int
    location_heading: str
    time_of_day: str
    environmental_type: str = "Interior"
    frames: list[FrameExpectedContext] = Field(
        description="All frames in the scene, each carrying its expected context + generated prompt"
    )


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
    scene: ScriptSceneBase
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


# ---------------------------------------------------------------------------
# Standalone save/load schemas (used by /standalone/* endpoints)
# ---------------------------------------------------------------------------

class StandaloneCharacterSave(BaseModel):
    """Payload for POST /standalone/characters"""
    character: "CharacterProfileBase"
    label: str | None = None


class StandaloneCharacterResponse(BaseModel):
    """Response from standalone character endpoints"""
    id: int
    char_id: str
    name: str
    story_role: str | None = None
    label: str | None = None
    character: "CharacterProfileBase"


class StandaloneWorldSave(BaseModel):
    """Payload for POST /standalone/worlds"""
    world: "EnvironmentProfileBase"
    label: str | None = None


class StandaloneWorldResponse(BaseModel):
    """Response from standalone world endpoints"""
    id: int
    location_name: str
    label: str | None = None
    world: "EnvironmentProfileBase"


class StandaloneStoryboardSave(BaseModel):
    """Payload for POST /standalone/storyboards"""
    title: str
    global_aesthetic: str
    render_style: str
    scenes: list["ScriptSceneBase"]
    label: str | None = None


class StandaloneStoryboardResponse(BaseModel):
    """Response from standalone storyboard endpoints"""
    id: int
    title: str
    global_aesthetic: str
    render_style: str
    label: str | None = None
    scenes: list["ScriptSceneBase"]
    scene_count: int
    frame_count: int


# ---------------------------------------------------------------------------
# Character DNA update — abilities, visual_rules, reference_portrait
# ---------------------------------------------------------------------------

class CharacterDNAUpdateRequest(BaseModel):
    """Persist abilities, visual_rules and/or a reference portrait into the project CKG."""
    project_id: int = Field(description="ID of the project whose CKG should be updated")
    character_id: str = Field(description="Character ID, e.g. CHAR_EMMA")
    abilities: list[str] = Field(default_factory=list)
    visual_rules: list[str] = Field(default_factory=list)
    reference_portrait: str | None = Field(
        None,
        description="Base-64 data URL of the chosen portrait image, or null to leave unchanged",
    )


class BackgroundVariationRequest(BaseModel):
    """
    Request a single background variation for one storyboard frame.

    The reference_image (the scene's stored reference) is used as an
    environmental anchor.  All character, composition, and continuity
    fields are forwarded verbatim so the image model knows exactly what
    to preserve.
    """
    frame: StoryboardFrameBase
    scene: ScriptSceneBase
    render_style: Literal['bw_sketch', 'bw_detailed', 'flat_color', 'full_shaded'] = 'bw_sketch'
    # The scene's stored reference image (base64 data URL).  Required — the
    # variation is anchored to this image.  The backend will reject the
    # request when it is missing.
    reference_image: str = Field(description="Base64 data URL of the scene reference image")
    canon_context: dict[str, Any] | None = Field(
        None,
        description="Project CKG — passed through to the image prompt builder",
    )


class BackgroundVariationResponse(BaseModel):
    """Result of a single background variation generation."""
    frame_number: int
    scene_number: int
    generated_image_url: str | None = Field(
        None,
        description="New base64 data URL, or null if generation failed",
    )
    # Informational — lets the UI log which model was used
    variation_index: int = Field(
        1,
        description="Always 1 for now.  Reserved for future multi-variation support.",
    )
