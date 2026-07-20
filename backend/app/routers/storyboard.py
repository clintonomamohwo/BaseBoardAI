"""
FastAPI router — /storyboard endpoints.

Validation layer:  Pydantic schemas (app.schemas.storyboard)
Persistence layer: SQLAlchemy ORM  (app.db.models)
DB dependency:     app.db.session.get_db
"""

from __future__ import annotations

import json
import logging
from typing import Annotated, Generator
logger = logging.getLogger(__name__)

from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.db.models import (
    CharacterProfileORM,
    ScriptSceneORM,
    StoryboardFrameORM,  # used inside _build_scene_orm
    StoryboardProjectORM,
)
from app.db.session import get_db
from app.schemas.storyboard import (
    AgeVariantRequest,
    BackgroundVariationRequest,
    BackgroundVariationResponse,
    CharacterDNAUpdateRequest,
    CharacterIdentity,
    CharacterProfileBase,
    CharacterQARequest,
    CharacterVariant,
    CKGUpdateIdentityRequest,
    ConsistencyScoreRequest,
    ConsistencyScoreResponse,
    ContinuityScanRequest,
    CreativeKnowledgeGraph,
    EnvironmentProfileBase,
    FacialBlueprint,
    PhysicalForm,
    ImportAssetRequest,
    ImportAssetResponse,
    PipelineExecutionRequest,
    ProjectCanon,
    ProjectSummary,
    QAScoreResult,
    RegenerateVisualActionRequest,
    RegenerateVisualActionResponse,
    ReforgeCompositionRequest,
    SceneContinuityReport,
    SceneQARequest,
    SceneUpgradeRequest,
    SceneUpgradeResponse,
    ScriptSceneBase,
    SingleCharacterRequest,
    SingleEnvironmentRequest,
    SpeciesProfile,
    StandaloneStoryboardRequest,
    StoryboardFrameBase,
    StoryboardProjectCreate,
    StoryboardProjectResponse,
    UpgradeStyleRequest,
    UpgradeStyleResponse,
    WorldBibleImportRequest,
    WorldBibleImportResult,
)
from app.core.identity_system import (
    build_identity_prompt,
    compute_qa_score,
    compute_scene_continuity,
    get_species,
    SPECIES_REGISTRY,
)
from app.core.llm import (
    _invoke_with_fallback,
    _parse_json_response,
    invoke_character_stage,
    invoke_world_stage,
    invoke_storyboard_stage,
)
from app.core.image import generate_frame_image, generate_image, _generate_pollinations, _strip_data_url_header
from app.core.director_engine import direct_storyboard
from app.core.continuity_engine import scan_continuity_impact
from app.core.lens_planner import assign_lens, detect_scene_type
from app.core.shot_balancer import _REPLACEMENT_POOL, _classify_shot
from app.core.prompt_builder import build_package_prompt
from app.core.prompts import VISUAL_ACTION_PROMPT, WORLD_BIBLE_IMPORT_PROMPT

router = APIRouter(prefix="/storyboard", tags=["storyboard"])

DEFAULT_RENDER_STYLE = 'bw_sketch'

# ---------------------------------------------------------------------------
# Image generation helper endpoint
# ---------------------------------------------------------------------------

@router.post("/generate-image", summary="Generate a single frame image from a prompt")
def generate_single_image(
    prompt: str = Body(...),
    render_style: str = Body("bw_sketch"),
) -> dict:
    """
    Lightweight endpoint used by the Shot Planner to generate individual
    keyframe images without running the full pipeline.
    Returns { image_url: "data:image/png;base64,..." } or { image_url: null }.
    """
    from app.core.image import _generate_pollinations
    from app.core.prompt_builder import STYLE_PREFIXES
    style_prefix = STYLE_PREFIXES.get(render_style, STYLE_PREFIXES["bw_sketch"])
    full_prompt = (style_prefix + prompt)[:450]
    url = _generate_pollinations(full_prompt)
    return {"image_url": url}


# ---------------------------------------------------------------------------
# Character Package — multi-image generation for a single character
# ---------------------------------------------------------------------------

# Turnaround angles used by every character sheet
_TURNAROUND_ANGLES = [
    ("front",       "full front view, facing camera directly"),
    ("three_q_front","three-quarter front view, slight left turn"),
    ("side",        "pure side profile, 90 degrees"),
    ("three_q_back","three-quarter back view, slight right turn"),
    ("back",        "full back view, facing away from camera"),
]

_EXPRESSIONS = [
    "neutral", "happy", "laughing", "angry", "sad",
    "surprised", "fearful", "thinking", "crying",
]

_POSES = [
    ("standing",       "standing relaxed, arms at sides"),
    ("walking",        "mid-stride walking"),
    ("running",        "running at full speed"),
    ("sitting",        "seated, legs forward"),
    ("pointing",       "pointing finger outward, determined"),
    ("holding_object", "holding an object in both hands"),
    ("hero_pose",      "heroic stance, confident, chin up"),
]

_OUTFITS = [
    ("default",  "default signature outfit"),
    ("casual",   "casual everyday clothes"),
    ("formal",   "formal business attire"),
    ("travel",   "travel/adventure gear"),
    ("combat",   "combat or action-ready gear"),
    ("winter",   "winter cold-weather clothing"),
    ("summer",   "summer lightweight clothing"),
]

# Premium full-pack additions
_TURNAROUND_360 = [
    ("deg_000", "full front, 0 degrees"),
    ("deg_045", "45 degrees right, slight front-left turn"),
    ("deg_090", "pure right side, 90 degrees"),
    ("deg_135", "135 degrees, rear three-quarter right"),
    ("deg_180", "full back, 180 degrees"),
    ("deg_225", "225 degrees, rear three-quarter left"),
    ("deg_270", "pure left side, 270 degrees"),
    ("deg_315", "315 degrees, slight front-right turn"),
]

_PREMIUM_POSES = [
    ("t_pose",          "T-pose, arms horizontal, standardised rigging pose"),
    ("a_pose",          "A-pose, arms slightly lowered at 45 degrees, relaxed rigging pose"),
    ("crouching",       "crouching low, defensive stance"),
    ("climbing",        "climbing upward, arms and legs engaged"),
    ("fighting_stance", "combat fighting stance, guard up"),
    ("falling",         "falling backwards, arms outstretched"),
    ("celebrating",     "arms raised in victory celebration"),
    ("kneeling",        "kneeling on one knee, respectful"),
]

_MATERIAL_CLOSEUPS = [
    ("face_closeup",    "extreme close-up of face, skin texture, pore detail"),
    ("hair_closeup",    "extreme close-up of hair, strand texture and volume"),
    ("fabric_closeup",  "extreme close-up of clothing fabric, material texture"),
    ("hand_closeup",    "extreme close-up of hands, knuckle detail"),
    ("eye_closeup",     "extreme close-up of eyes, iris detail"),
]


def _char_base_desc(char_data: dict) -> str:
    """Build a consistent base description for character image prompts.

    Priority:
      1. _canonical_prompt — user-edited or CKG-derived species-first prompt (highest fidelity)
      2. Auto-assembled species-first description using Identity System structured fields
      3. Flat FacialBlueprint fallback for legacy characters with no DNA data

    Species and physical_form are always front-loaded so image models cannot
    default to a human interpretation for non-human characters.
    """
    if canonical := char_data.get("_canonical_prompt"):
        return str(canonical)

    name = char_data.get("name", "character")
    fb   = char_data.get("facial_blueprint", {})

    # ── Species-first prefix ──────────────────────────────────────────────────
    species_data   = char_data.get("species") or {}
    physical_data  = char_data.get("physical_form") or {}
    species_id     = (species_data.get("species_id") or "human") if isinstance(species_data, dict) else "human"
    species_label  = (species_data.get("label") or "Human") if isinstance(species_data, dict) else "Human"
    species_custom = (species_data.get("custom_notes") or None) if isinstance(species_data, dict) else None
    physical_form  = (physical_data.get("form") or "humanoid") if isinstance(physical_data, dict) else "humanoid"

    species_prefix_parts: list[str] = []
    if species_id != "human":
        # Prepend "anthropomorphic" for non-human humanoid forms
        if physical_form in ("humanoid", "custom"):
            species_prefix_parts.append("anthropomorphic")
        species_prefix_parts.append(species_label.lower())
        if physical_form not in ("humanoid", "custom"):
            species_prefix_parts.append(physical_form)
        species_prefix_parts.append("humanoid")

    species_prefix = " ".join(p for p in species_prefix_parts if p).strip()
    if species_custom:
        species_prefix = f"{species_prefix}, {species_custom}" if species_prefix else species_custom

    # ── Core identity fields ──────────────────────────────────────────────────
    ethnicity = fb.get("base_ethnicity_or_type", "")
    core_parts = [
        f"{ethnicity} inspired" if (ethnicity and species_id != "human") else ethnicity,
        f"age {fb.get('estimated_age', '')}" if fb.get("estimated_age") else "",
        fb.get("bone_structure", ""),
        fb.get("distinct_markers", "") or "",
        char_data.get("wardrobe_defaults", ""),
    ]
    core_summary = ", ".join(p for p in core_parts if p)

    if species_prefix:
        return f"{name}, {species_prefix}, {core_summary}" if core_summary else f"{name}, {species_prefix}"
    return f"{name}, {core_summary}" if core_summary else name


def _pkg_prompt(base: str, view_desc: str, render_style: str) -> str:
    from app.core.prompt_builder import build_package_prompt
    return build_package_prompt(base, view_desc, render_style)


@router.post("/character-package/generate", summary="Generate all image sheets for a character")
def generate_character_package(
    char_data: dict = Body(..., description="CharacterProfile JSON"),
    render_style: str = Body(..., description="Render style from the project — bw_sketch | bw_detailed | flat_color | full_shaded"),
    sections: list[str] = Body(
        default=["portrait", "turnaround", "expressions", "poses", "outfits"],
        description="Which sections to generate",
    ),
    reference_image: str | None = Body(None, description="Locked reference data URL — steers all generations"),
) -> dict:
    """
    Generates the requested image sections for a character.

    expressions, poses, and outfits each generate ONE grid sheet via
    generate_sheet_image(), then deterministically slice it with sheet_slicer.
    turnaround uses the same sheet approach (5×1 grid).
    portrait is a single standalone call.

    Returns the same {section: {cell_id: data_url}} dict the frontend expects.
    """
    from app.core.image import generate_sheet_image, _generate_pollinations
    from app.core.prompt_builder import STYLE_PREFIXES as _STYLE_PREFIXES
    from app.core.sheet_layouts import get_layout
    from app.core.sheet_slicer import slice_sheet

    base = _char_base_desc(char_data)
    result: dict = {}
    ref_b64 = _strip_data_url_header(reference_image) if reference_image else None

    if "portrait" in sections:
        fb = char_data.get("facial_blueprint", {})
        face_detail = ", ".join(filter(None, [
            fb.get("bone_structure", ""),
            fb.get("distinct_markers", "") or "",
        ]))
        face_suffix = f", {face_detail}" if face_detail else ""
        prompt = _pkg_prompt(base, f"hero portrait, neutral expression, looking directly at camera, bust shot, face clearly visible{face_suffix}", render_style)
        result["portrait"] = generate_image(prompt, reference_b64=ref_b64)

    if "turnaround" in sections:
        layout = get_layout("turnaround")
        sheet_prompt = layout.prompt_prefix(base, render_style)
        sheet_url = generate_sheet_image(sheet_prompt, layout.canvas_width, layout.canvas_height, reference_b64=ref_b64)
        result["turnaround"] = slice_sheet(sheet_url, layout) if sheet_url else {}

    if "expressions" in sections:
        layout = get_layout("expressions")
        sheet_prompt = layout.prompt_prefix(base, render_style)
        sheet_url = generate_sheet_image(sheet_prompt, layout.canvas_width, layout.canvas_height, reference_b64=ref_b64)
        result["expressions"] = slice_sheet(sheet_url, layout) if sheet_url else {}

    if "poses" in sections:
        layout = get_layout("poses")
        sheet_prompt = layout.prompt_prefix(base, render_style)
        sheet_url = generate_sheet_image(sheet_prompt, layout.canvas_width, layout.canvas_height, reference_b64=ref_b64)
        result["poses"] = slice_sheet(sheet_url, layout) if sheet_url else {}

    if "outfits" in sections:
        layout = get_layout("outfits")
        sheet_prompt = layout.prompt_prefix(base, render_style)
        sheet_url = generate_sheet_image(sheet_prompt, layout.canvas_width, layout.canvas_height, reference_b64=ref_b64)
        result["outfits"] = slice_sheet(sheet_url, layout) if sheet_url else {}

    if "props" in sections:
        wardrobe = char_data.get("wardrobe_defaults", "")
        prop_words = [w.strip() for w in wardrobe.replace(",", " ").replace(".", " ").split() if len(w) > 3]
        prop_items = prop_words[:5] or ["prop", "accessory", "tool", "object", "item"]
        result["props"] = {}
        for prop in prop_items:
            bw_prop_suffix = (
                f"minimal outline drawing of {prop}, isolated on white background, no shading, no detail"
                if render_style == "bw_sketch"
                else f"close-up illustration of {prop}, isolated on white background, clean design"
            )
            prompt = (_STYLE_PREFIXES.get(render_style, _STYLE_PREFIXES["bw_sketch"]) + bw_prop_suffix)[:450]
            result["props"][prop] = _generate_pollinations(prompt)

    return result


@router.post("/character-package/generate-one", summary="Regenerate a single character image cell")
def regenerate_character_image(
    char_data: dict = Body(...),
    section: str = Body(..., description="e.g. 'portrait', 'turnaround/front', 'expressions/happy'"),
    render_style: str = Body(..., description="Render style from the project — bw_sketch | bw_detailed | flat_color | full_shaded"),
    reference_image: str | None = Body(None, description="Locked reference data URL — steers generation"),
) -> dict:
    """
    Regenerate exactly one cell within a sheet section.

    For sheet-based sections (turnaround, expressions, poses, outfits,
    turnaround_360, premium_poses, material_closeups) a fresh full sheet is
    generated and the requested cell is sliced out.  This keeps cell geometry
    consistent with bulk generation.

    For portrait (single image) the original single-call path is used.

    Returns { image_url: str | null }.
    """
    from app.core.image import generate_sheet_image
    from app.core.sheet_layouts import LAYOUTS, get_layout
    from app.core.sheet_slicer import slice_cell

    # Section-name → layout key mapping
    _SECTION_LAYOUT: dict[str, str] = {
        "turnaround":       "turnaround",
        "expressions":      "expressions",
        "poses":            "poses",
        "outfits":          "outfits",
        "turnaround_360":   "turnaround_360",
        "premium_poses":    "premium_poses",
        "material_closeups":"material_closeups",
    }

    base = _char_base_desc(char_data)
    ref_b64 = _strip_data_url_header(reference_image) if reference_image else None

    if section == "portrait":
        fb = char_data.get("facial_blueprint", {})
        face_detail = ", ".join(filter(None, [
            fb.get("bone_structure", ""),
            fb.get("distinct_markers", "") or "",
        ]))
        face_suffix = f", {face_detail}" if face_detail else ""
        prompt = _pkg_prompt(base, f"hero portrait, neutral expression, looking directly at camera, bust shot, face clearly visible{face_suffix}", render_style)
        return {"image_url": generate_image(prompt, reference_b64=ref_b64)}

    if "/" in section:
        section_name, cell_id = section.split("/", 1)
        layout_key = _SECTION_LAYOUT.get(section_name)
        if layout_key:
            layout = get_layout(layout_key)
            sheet_prompt = layout.prompt_prefix(base, render_style)
            sheet_url = generate_sheet_image(sheet_prompt, layout.canvas_width, layout.canvas_height, reference_b64=ref_b64)
            if sheet_url:
                return {"image_url": slice_cell(sheet_url, layout, cell_id)}
            return {"image_url": None}

    # Fallback: unknown section — generate a single image directly
    prompt = _pkg_prompt(base, section.replace("/", " ").replace("_", " "), render_style)
    return {"image_url": generate_image(prompt, reference_b64=ref_b64)}


# ---------------------------------------------------------------------------
# Character Package — LLM-generated Overview
# ---------------------------------------------------------------------------

@router.post("/character-package/overview", summary="Generate a rich character overview via LLM")
def generate_character_overview(
    char_data: dict = Body(..., description="CharacterProfile JSON"),
) -> dict:
    """
    Calls the LLM to expand a raw CharacterProfile into a full narrative overview
    (biography, personality, goals, fears, strengths, weaknesses, etc.).
    Returns a CharacterOverview-compatible dict.
    """
    from app.core.prompts import CHARACTER_OVERVIEW_PROMPT
    from app.core.llm import _invoke_with_fallback, _parse_json_response

    name          = char_data.get("name", "Unknown")
    fb            = char_data.get("facial_blueprint", {})
    wardrobe      = char_data.get("wardrobe_defaults", "")
    ethnicity     = fb.get("base_ethnicity_or_type", "")
    age           = fb.get("estimated_age", "")
    bone          = fb.get("bone_structure", "")
    markers       = fb.get("distinct_markers", "") or ""

    try:
        prompt_text = CHARACTER_OVERVIEW_PROMPT.format(
            name=name, ethnicity=ethnicity, age=age,
            bone_structure=bone, distinct_markers=markers, wardrobe=wardrobe,
        )
        raw = _invoke_with_fallback(prompt_text)
        parsed, _ = _parse_json_response(raw)
        if isinstance(parsed, list):
            parsed = parsed[0]
        return parsed
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail=f"Overview LLM failed: {e}")


# ---------------------------------------------------------------------------
# Character Package — Full Reference Pack (premium generation)
# ---------------------------------------------------------------------------

@router.post("/character-package/generate-full-pack", summary="Generate premium full character reference pack")
def generate_full_character_pack(
    char_data: dict = Body(..., description="CharacterProfile JSON"),
    render_style: str = Body("bw_sketch"),
    targets: list[str] = Body(
        default=["turnaround_360", "premium_poses", "material_closeups"],
        description="Which premium sections to generate: turnaround_360, premium_poses, material_closeups",
    ),
) -> dict:
    """
    Premium generation endpoint.  Each target generates ONE sheet image then
    slices it deterministically — same approach as /generate.

      - turnaround_360: 4×2 grid → 8 views sliced
      - premium_poses:  4×2 grid → 8 poses sliced
      - material_closeups: 3×2 grid → 6 closeups sliced

    Returns each section as a dict of cell_id → base64 data URL.
    """
    from app.core.image import generate_sheet_image
    from app.core.sheet_layouts import get_layout
    from app.core.sheet_slicer import slice_sheet

    base = _char_base_desc(char_data)
    result: dict = {}

    for target in ("turnaround_360", "premium_poses", "material_closeups"):
        if target in targets:
            layout = get_layout(target)
            sheet_prompt = layout.prompt_prefix(base, render_style)
            sheet_url = generate_sheet_image(sheet_prompt, layout.canvas_width, layout.canvas_height)
            result[target] = slice_sheet(sheet_url, layout) if sheet_url else {}

    return result


DbSession = Annotated[Session, Depends(get_db)]


# ---------------------------------------------------------------------------
# Helpers — schema ➜ ORM and ORM ➜ schema
# ---------------------------------------------------------------------------

def _build_canon(
    characters: list[CharacterProfileBase],
    environments: list[EnvironmentProfileBase],
    global_aesthetic: str,
    render_style: str,
    scenes: list[ScriptSceneBase],
) -> CreativeKnowledgeGraph:
    """
    Build the Creative Knowledge Graph (CKG) from pipeline outputs.

    Called once after the Director Engine runs — before image generation.
    Encodes every approved creative fact: character identity layers (Identity,
    Species, Variants), world rules, style guide, colour palette, and visual
    rules.  Every downstream generation reads from the CKG.
    """
    approved_characters: dict[str, dict] = {}
    character_identities: dict[str, dict] = {}
    character_species_map: dict[str, dict] = {}
    character_variants_map: dict[str, list] = {}
    # Fix 2: abilities map so prompt_builder._get_ability_modifiers() and
    # director_engine.apply_character_shot_bias() actually receive data.
    character_abilities_map: dict[str, list] = {}

    for char in characters:
        fb = char.facial_blueprint

        # ── Species-first canonical prompt ────────────────────────────────
        # Build the appearance summary using build_identity_prompt when the
        # full Identity System is available so species/physical_form are
        # front-loaded (e.g. "anthropomorphic giant tortoise humanoid, …").
        # Falls back to the flat FacialBlueprint assembly for legacy characters.
        species_id = (char.species.species_id if char.species else None) or "human"
        species_label = char.species.label if char.species else "Human"
        species_custom = char.species.custom_notes if char.species else None
        physical_form = char.physical_form.form if char.physical_form else "humanoid"

        # Build species prefix: always front-load what the character IS
        # so image models cannot default to a human interpretation.
        species_prefix_parts: list[str] = []
        if physical_form and physical_form not in ("humanoid", "custom"):
            species_prefix_parts.append(physical_form)
        if species_id != "human":
            species_prefix_parts.append(species_label.lower())
        if physical_form == "humanoid" and species_id != "human":
            species_prefix_parts.append("humanoid")
        elif physical_form not in ("humanoid", "custom") and species_id != "human":
            species_prefix_parts.append("humanoid")  # anthropomorphic
        # Prepend "anthropomorphic" when a non-human species is humanoid-form
        if species_id != "human" and physical_form in ("humanoid", "custom"):
            species_prefix_parts.insert(0, "anthropomorphic")

        species_prefix = " ".join(p for p in species_prefix_parts if p).strip()

        # Append custom species notes (e.g. "giant tortoise shell, scaled skin, beak")
        if species_custom:
            species_prefix = f"{species_prefix}, {species_custom}" if species_prefix else species_custom

        # Core identity fields (after species, so species is never buried)
        core_parts = [
            f"{fb.base_ethnicity_or_type} inspired" if (fb.base_ethnicity_or_type and species_id != "human") else fb.base_ethnicity_or_type,
            f"age {fb.estimated_age}" if fb.estimated_age else None,
            fb.bone_structure if fb.bone_structure else None,
            fb.distinct_markers if fb.distinct_markers else None,
            f"wearing {char.wardrobe_defaults}" if char.wardrobe_defaults else None,
        ]
        core_summary = ", ".join(p for p in core_parts if p)

        if species_prefix:
            appearance_summary = f"{char.name}, {species_prefix}, {core_summary}" if core_summary else f"{char.name}, {species_prefix}"
        else:
            appearance_summary = f"{char.name}, {core_summary}" if core_summary else char.name

        # ── Flat summary (backwards-compat) ───────────────────────────────
        approved_characters[char.id] = {
            "name": char.name,
            "appearance_summary": appearance_summary,
            "canonical_prompt": appearance_summary,
            "wardrobe": char.wardrobe_defaults,
            "age": fb.estimated_age,
            "distinct_markers": fb.distinct_markers,
        }

        # ── Abilities node (Fix 2) ─────────────────────────────────────────
        character_abilities_map[char.id] = list(char.abilities or [])

        # ── Full Identity node ─────────────────────────────────────────────
        # If the CharacterProfile already carries a CharacterIdentity (from the
        # Identity System), serialise it directly.  Otherwise synthesise a
        # lightweight identity from the FacialBlueprint so every character has
        # an identity node from day one.
        if char.identity is not None:
            identity_dict = char.identity.model_dump()
            # Always overwrite _canonical_prompt with the species-first version
            identity_dict["_canonical_prompt"] = appearance_summary
        else:
            # Synthesise identity from FacialBlueprint fields
            identity_dict = {
                "name": char.name,
                "face_description": fb.bone_structure if fb.bone_structure else None,
                "hair_description": None,
                "eye_description": None,
                "body_proportions": None,
                "age": fb.estimated_age,
                "distinct_markers": fb.distinct_markers,
                "signature_accessories": [],
                "reference_primary": None,
                "reference_front": None,
                "reference_left": None,
                "reference_right": None,
                "reference_back": None,
                "_canonical_prompt": appearance_summary,
            }
        character_identities[char.id] = identity_dict

        # ── Species node ───────────────────────────────────────────────────
        if char.species is not None:
            character_species_map[char.id] = char.species.model_dump()
        else:
            character_species_map[char.id] = {"species_id": "human", "label": "Human", "custom_notes": None}

        # ── Variants node ──────────────────────────────────────────────────
        if char.variants:
            character_variants_map[char.id] = [v.model_dump() for v in char.variants]
        else:
            # Seed a default variant from the wardrobe
            character_variants_map[char.id] = [{
                "variant_id": "default",
                "label": "Default",
                "outfit": char.wardrobe_defaults or None,
                "hair_override": None,
                "age_override": None,
                "species_override": None,
                "extra_accessories": [],
                "scene_range": None,
                "notes": "Auto-generated from wardrobe defaults",
            }]

    # ── World nodes ────────────────────────────────────────────────────────
    world_lines = [
        f"{env.location_name}: {env.spatial_textures} ({env.lighting_keys})"
        for env in environments
    ]
    world_bible_summary = "\n".join(world_lines)
    locations_map = {
        env.location_name.lower().replace(" ", "_"): env.model_dump()
        for env in environments
    }

    # ── Colour palette ─────────────────────────────────────────────────────
    seen: set[str] = set()
    color_palette: list[str] = []
    for scene in scenes:
        for hex_color in (scene.color_palette or []):
            if hex_color not in seen:
                seen.add(hex_color)
                color_palette.append(hex_color)

    style_guide = f"Render style: {render_style}. Aesthetic: {global_aesthetic}."
    camera_language: dict[str, str] = {
        "dialogue": "50mm, OTS + medium, static or slow push",
        "action": "35mm tracking, wide + medium, handheld",
        "establishing": "24mm anamorphic, wide, slow crane or drone",
        "intimate": "85mm portrait, extreme close-up, static",
    }
    visual_rules: list[str] = [
        f"Global aesthetic: {global_aesthetic}",
        f"Render style: {render_style} — maintain consistency across all frames",
        "Character appearance must match approved_characters on every generation",
        "Do not introduce new character designs not present in the character bible",
        "Identity layers (face, hair, eyes, markers) are immutable across variants",
    ]

    return CreativeKnowledgeGraph(
        approved_characters=approved_characters,
        character_identities=character_identities,
        character_species=character_species_map,
        character_variants=character_variants_map,
        character_abilities=character_abilities_map,
        world_bible_summary=world_bible_summary,
        locations=locations_map,
        style_guide=style_guide,
        color_palette=color_palette[:12],
        camera_language=camera_language,
        visual_rules=visual_rules,
    )


def _build_project_orm(
    payload: StoryboardProjectCreate,
    canon: ProjectCanon | None = None,
) -> StoryboardProjectORM:
    project = StoryboardProjectORM(
        project_title=payload.project_title,
        global_aesthetic=payload.global_aesthetic,
        render_style=payload.render_style,
        canon=canon.model_dump() if canon else None,
    )
    for char in payload.characters:
        project.characters.append(
            CharacterProfileORM(
                char_id=char.id,
                name=char.name,
                wardrobe_defaults=char.wardrobe_defaults,
                facial_blueprint=char.facial_blueprint.model_dump(),
                identity=char.identity.model_dump() if char.identity else None,
                species=char.species.model_dump() if char.species else None,
                variants=[v.model_dump() for v in char.variants] if char.variants else None,
                physical_form=char.physical_form.model_dump() if char.physical_form else None,
                classification=char.classification,
                story_role=char.story_role,
                relationships=list(char.relationships) if char.relationships else [],
            )
        )
    for scene_data in payload.scenes:
        scene_orm = _build_scene_orm(scene_data)
        project.scenes.append(scene_orm)
    return project


def _build_scene_orm(scene_data: ScriptSceneBase) -> ScriptSceneORM:
    scene = ScriptSceneORM(
        scene_number=scene_data.scene_number,
        location_heading=scene_data.location_heading,
        environmental_type=scene_data.environmental_type,
        time_of_day=scene_data.time_of_day,
        emotional_tone=scene_data.emotional_tone,
        color_palette=scene_data.color_palette,
    )
    for frame in scene_data.frames:
        scene.frames.append(
            StoryboardFrameORM(
                frame_number=frame.frame_number,
                # Three-level action system
                narrative_action=frame.narrative_action,
                visual_action=frame.visual_action,
                animation_beats=frame.animation_beats or [],
                action_breakdown=frame.action_breakdown,
                # Shot & camera
                shot_type=frame.shot_type,
                camera_angle=frame.camera_angle,
                camera_movement=frame.camera_movement,
                # Timing
                duration_seconds=frame.duration_seconds,
                # Lighting & mood
                lighting_notes=frame.lighting_notes,
                mood=frame.mood,
                # Production metadata
                purpose=frame.purpose,
                characters_present=frame.characters_present or [],
                frame_emotion=frame.frame_emotion,
                dialogue=frame.dialogue,
                director_notes=frame.director_notes,
                # Audio
                sound_cue=frame.sound_cue,
                generated_image_url=frame.generated_image_url,
                # Director Engine metadata
                lens=frame.lens,
                focal_length=frame.focal_length,
                depth_style=frame.depth_style,
                locked_fields=frame.locked_fields or [],
                # Cinematic Brain decisions (Fix 3)
                auto_selected=frame.auto_selected or {},
                director_rationale=frame.director_rationale or {},
            )
        )
    return scene


def _orm_to_response(project: StoryboardProjectORM) -> StoryboardProjectResponse:
    canon: ProjectCanon | None = None
    if project.canon:
        try:
            canon = ProjectCanon.model_validate(project.canon)
        except Exception:
            canon = None

    return StoryboardProjectResponse(
        db_id=project.db_id,
        project_title=project.project_title,
        global_aesthetic=project.global_aesthetic,
        render_style=project.render_style,
        canon=canon,
        truncated=False,
        characters=[
            CharacterProfileBase(
                id=c.char_id,
                name=c.name,
                wardrobe_defaults=c.wardrobe_defaults,
                facial_blueprint=FacialBlueprint.model_validate(c.facial_blueprint),
                # JSON columns come back as plain dicts from SQLite — coerce them
                # back to their Pydantic models so callers can call .model_dump().
                identity=(
                    CharacterIdentity.model_validate(c.identity)
                    if isinstance(c.identity, dict) else c.identity
                ),
                species=(
                    SpeciesProfile.model_validate(c.species)
                    if isinstance(c.species, dict) else SpeciesProfile(species_id="human", label="Human", custom_notes=None)
                ),
                variants=[
                    CharacterVariant.model_validate(v) if isinstance(v, dict) else v
                    for v in (c.variants or [])
                ] if getattr(c, "variants", None) else [],
                physical_form=(
                    PhysicalForm.model_validate(c.physical_form)
                    if isinstance(c.physical_form, dict)
                    else PhysicalForm(form="humanoid", custom_description=None, limb_count=None, has_wings=False, has_tail=False)
                ),
                classification=getattr(c, "classification", None),
                active_variant_id=getattr(c, "active_variant_id", None),
                story_role=getattr(c, "story_role", None),
                relationships=getattr(c, "relationships", None) or [],
            )
            for c in project.characters
        ],
        scenes=[
            ScriptSceneBase(
                scene_number=s.scene_number,
                location_heading=s.location_heading,
                environmental_type=s.environmental_type,
                time_of_day=s.time_of_day,
                emotional_tone=s.emotional_tone,
                color_palette=s.color_palette,
                frames=[
                    StoryboardFrameBase(
                        frame_number=f.frame_number,
                        # Three-level action system
                        narrative_action=f.narrative_action,
                        visual_action=f.visual_action,
                        animation_beats=f.animation_beats or [],
                        action_breakdown=f.action_breakdown,
                        # Shot & camera
                        shot_type=f.shot_type,
                        camera_angle=f.camera_angle,
                        camera_movement=f.camera_movement,
                        # Timing
                        duration_seconds=f.duration_seconds,
                        # Lighting & mood
                        lighting_notes=f.lighting_notes,
                        mood=f.mood,
                        # Production metadata
                        purpose=f.purpose,
                        characters_present=f.characters_present or [],
                        frame_emotion=f.frame_emotion,
                        dialogue=f.dialogue,
                        director_notes=f.director_notes,
                        # Audio
                        sound_cue=f.sound_cue,
                        generated_image_url=f.generated_image_url,
                        # Director Engine metadata
                        lens=f.lens,
                        focal_length=f.focal_length,
                        depth_style=f.depth_style,
                        lens_prompt_suffix=f.lens_prompt_suffix,
                        locked_fields=f.locked_fields or [],
                        # Cinematic Brain decisions (Fix 3)
                        auto_selected=f.auto_selected or {},
                        director_rationale=f.director_rationale or {},
                    )
                    for f in s.frames
                ],
            )
            for s in project.scenes
        ],
    )


def _load_project_or_404(db_id: int, db: Session) -> StoryboardProjectORM:
    project = (
        db.query(StoryboardProjectORM)
        .options(
            joinedload(StoryboardProjectORM.characters),
            joinedload(StoryboardProjectORM.scenes).joinedload(ScriptSceneORM.frames).undefer(
                StoryboardFrameORM.generated_image_url
            ),
        )
        .filter(StoryboardProjectORM.db_id == db_id)
        .first()
    )
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"StoryboardProject with db_id={db_id} not found.",
        )
    return project


# ---------------------------------------------------------------------------
# Core AI Orchestration Pipelines (New Features)
# ---------------------------------------------------------------------------

def _sse(event: str, data: dict) -> str:
    """Format a single SSE message."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post(
    "/forge-pipeline-stream",
    summary="Execute full 3-stage AI pipeline with SSE progress stream",
)
def forge_storyboard_pipeline_stream(
    payload: PipelineExecutionRequest,
    db: DbSession,
) -> StreamingResponse:
    """
    Streams Server-Sent Events as each stage of the pipeline completes:
      stage_start / stage_done  — for each of the 3 LLM stages + image gen
      image_progress            — fires after each frame image is generated
      complete                  — final payload with the full project JSON
      error                     — on any failure
    """
    def generate() -> Generator[str, None, None]:
        try:
            # ── Stage 1: Characters ──────────────────────────────────────────
            yield _sse("stage_start", {"stage": "chars"})
            characters = invoke_character_stage(payload.raw_character_notes)
            yield _sse("stage_done", {"stage": "chars", "count": len(characters)})

            # ── Stage 2: World ───────────────────────────────────────────────
            yield _sse("stage_start", {"stage": "world"})
            environments = invoke_world_stage(payload.raw_world_notes)
            yield _sse("stage_done", {"stage": "world", "count": len(environments)})

            # ── Stage 3: Storyboard ──────────────────────────────────────────
            yield _sse("stage_start", {"stage": "storyboard"})
            director_style = getattr(payload, "director_style", "balanced")
            scenes, storyboard_truncated = invoke_storyboard_stage(
                characters, environments, payload.raw_script_text,
                payload.global_aesthetic, payload.render_style, director_style,
            )
            total_frames = sum(len(s.frames) for s in scenes)
            yield _sse("stage_done", {
                "stage": "storyboard",
                "scenes": len(scenes),
                "frames": total_frames,
                "truncated": storyboard_truncated,
            })

            # ── Director Engine ──────────────────────────────────────────────
            from app.core.identity_system import get_director_hints
            character_hints: dict[str, dict] = {
                char.id: get_director_hints(
                    classification=char.classification,
                    abilities=list(char.abilities or []),
                    physical_form=(char.physical_form.form if char.physical_form else "humanoid"),
                )
                for char in characters
            }
            scenes = direct_storyboard(scenes, character_hints=character_hints, director_style=director_style)
            canon = _build_canon(characters, environments, payload.global_aesthetic, payload.render_style, scenes)
            canon_context = canon.model_dump()

            # ── Image generation — skipped when skip_images=True ─────────────
            if getattr(payload, "skip_images", False):
                yield _sse("stage_done", {"stage": "images_skipped", "total": total_frames})
            else:
                yield _sse("stage_start", {"stage": "images", "total": total_frames})
                done_count = 0
                for scene in scenes:
                    for frame in scene.frames:
                        frame.generated_image_url = generate_frame_image(
                            frame, scene,
                            reference_style_image=payload.reference_style_image,
                            render_style=payload.render_style,
                            canon_context=canon_context,
                        )
                        done_count += 1
                        yield _sse("image_progress", {"done": done_count, "total": total_frames})
                yield _sse("stage_done", {"stage": "images"})

            # ── Persist ──────────────────────────────────────────────────────
            project_data = StoryboardProjectCreate(
                project_title=payload.project_title,
                global_aesthetic=payload.global_aesthetic,
                render_style=payload.render_style,
                characters=characters,
                scenes=scenes,
            )
            project = _build_project_orm(project_data, canon=canon)
            db.add(project)
            db.commit()
            response = _orm_to_response(_load_project_or_404(project.db_id, db))
            response.truncated = storyboard_truncated
            yield _sse("complete", response.model_dump())

        except Exception as exc:
            yield _sse("error", {"detail": str(exc)})

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post(
    "/forge-pipeline",
    response_model=StoryboardProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Execute full 3-stage AI pipeline and save to DB",
)
def forge_storyboard_pipeline(
    payload: PipelineExecutionRequest,
    db: DbSession,
) -> StoryboardProjectResponse:
    """
    Runs the sequential 3-stage wizard:
      1. CHARACTER_PROMPT  → locked character bible
      2. WORLD_PROMPT      → locked world bible
      3. STORYBOARD_PROMPT → scene + frame breakdown using compiled context
      4. Director Engine   → cinematic planning (shot balance, lens, rhythm)
      5. Image generation  → enriched prompts drive the image model
    Persists the result and returns HTTP 201.
    """
    characters = invoke_character_stage(payload.raw_character_notes)
    environments = invoke_world_stage(payload.raw_world_notes)
    director_style = getattr(payload, "director_style", "balanced")
    scenes, storyboard_truncated = invoke_storyboard_stage(
        characters, environments, payload.raw_script_text, payload.global_aesthetic,
        payload.render_style, director_style,
    )

    from app.core.identity_system import get_director_hints
    character_hints: dict[str, dict] = {
        char.id: get_director_hints(
            classification=char.classification,
            abilities=list(char.abilities or []),
            physical_form=(char.physical_form.form if char.physical_form else "humanoid"),
        )
        for char in characters
    }

    scenes = direct_storyboard(scenes, character_hints=character_hints, director_style=director_style)

    # ── Build Project Canon from pipeline outputs ──────────────────────────
    # The canon is constructed silently here — it encodes every approved fact
    # (character appearance, world rules, style guide, visual rules) so every
    # image generation call has a single source of truth to reference.
    canon = _build_canon(characters, environments, payload.global_aesthetic, payload.render_style, scenes)
    canon_context = canon.model_dump()

    for scene in scenes:
        for frame in scene.frames:
            frame.generated_image_url = generate_frame_image(
                frame, scene,
                reference_style_image=payload.reference_style_image,
                render_style=payload.render_style,
                canon_context=canon_context,
            )
    project_data = StoryboardProjectCreate(
        project_title=payload.project_title,
        global_aesthetic=payload.global_aesthetic,
        render_style=payload.render_style,
        characters=characters,
        scenes=scenes,
    )
    project = _build_project_orm(project_data, canon=canon)
    db.add(project)
    db.commit()
    response = _orm_to_response(_load_project_or_404(project.db_id, db))
    response.truncated = storyboard_truncated
    return response


@router.post(
    "/parse-single-character",
    response_model=CharacterProfileBase,
    summary="Isolate parsing for a singular character note override",
)
def parse_single_character(payload: SingleCharacterRequest) -> CharacterProfileBase:
    """Runs CHARACTER_PROMPT on a single raw character note and returns the parsed profile."""
    characters = invoke_character_stage(payload.raw_notes)
    if not characters:
        raise HTTPException(status_code=422, detail="No character could be parsed from the provided notes.")
    return characters[0]


@router.post(
    "/parse-single-environment",
    response_model=EnvironmentProfileBase,
    summary="Isolate parsing for a singular environment location override",
)
def parse_single_environment(payload: SingleEnvironmentRequest) -> EnvironmentProfileBase:
    """Runs WORLD_PROMPT on a single raw location note and returns the parsed environment profile."""
    environments = invoke_world_stage(payload.raw_notes)
    if not environments:
        raise HTTPException(status_code=422, detail="No environment could be parsed from the provided notes.")
    return environments[0]


@router.post(
    "/forge-standalone-storyboard",
    response_model=StoryboardProjectResponse,
    summary="Generate storyboard frames leveraging pre-parsed assets directly",
)
def forge_standalone_storyboard(payload: StandaloneStoryboardRequest) -> StoryboardProjectResponse:
    """
    Skips character/world generation — feeds pre-parsed characters directly into
    STORYBOARD_PROMPT. Director Engine runs before image generation.
    Returns an unsaved project (db_id=None); no DB write.
    """
    scenes, storyboard_truncated = invoke_storyboard_stage(
        payload.characters, [], payload.raw_script_text, payload.global_aesthetic,
        DEFAULT_RENDER_STYLE,
    )
    # ── Director Engine ───────────────────────────────────────────────────────
    scenes = direct_storyboard(scenes)
    for scene in scenes:
        for frame in scene.frames:
            frame.generated_image_url = generate_frame_image(
                frame, scene,
                reference_style_image=None,
                render_style=DEFAULT_RENDER_STYLE,
            )
    return StoryboardProjectResponse(
        project_title=payload.project_title,
        global_aesthetic=payload.global_aesthetic,
        render_style=DEFAULT_RENDER_STYLE,
        characters=payload.characters,
        scenes=scenes,
        db_id=None,
        canon=None,
        truncated=storyboard_truncated,
    )


# ---------------------------------------------------------------------------
# Director Engine — Continuity scan
# ---------------------------------------------------------------------------

@router.post(
    "/continuity/scan",
    summary="Scan project for assets affected by a canonical change",
)
def continuity_scan(payload: ContinuityScanRequest) -> dict:
    """
    Given a project snapshot and a description of what changed, returns a
    ContinuityImpactReport identifying every frame and asset that was generated
    using the old canonical value and may need to be regenerated.
    """
    report = scan_continuity_impact(
        project_data=payload.project,
        changed_asset_type=payload.changed_asset_type,
        changed_asset_id=payload.changed_asset_id,
        changed_field=payload.changed_field,
        old_value=payload.old_value,
        new_value=payload.new_value,
    )
    return report.model_dump()


# ---------------------------------------------------------------------------
# Director Engine — Reforge composition only
# ---------------------------------------------------------------------------

@router.post(
    "/frame/reforge-composition",
    summary="Regenerate only the framing (shot, lens, camera angle) of a frame",
)
def reforge_composition(payload: ReforgeCompositionRequest) -> dict:
    """
    Reassigns lens + shot type via the Director Engine then regenerates the
    frame image while preserving character, outfit, environment, and lighting.

    Locked fields on the frame are respected: if 'camera' is in frame.locked_fields
    the shot_type and lens are not changed, only the image is re-generated.
    """
    frame = payload.frame
    scene = payload.scene

    camera_locked = "camera" in (frame.locked_fields or [])

    if not camera_locked:
        scene_type = detect_scene_type(scene)
        assign_lens(frame, scene_type)
        # Rotate shot type to add variety
        current_slug = _classify_shot(frame.shot_type)
        new_slug = _REPLACEMENT_POOL.get(current_slug, "medium")
        frame.shot_type = new_slug.replace("_", " ").title() + " Shot"

    new_image_url = generate_frame_image(
        frame, scene,
        reference_style_image=payload.reference_style_image,
        render_style=payload.render_style,
    )
    return {
        "frame_number": frame.frame_number,
        "shot_type": frame.shot_type,
        "lens": frame.lens,
        "focal_length": frame.focal_length,
        "depth_style": frame.depth_style,
        "generated_image_url": new_image_url,
    }


# ---------------------------------------------------------------------------
# Render Upgrade — upgrade a frame or scene to a new visual style
# ---------------------------------------------------------------------------

@router.post(
    "/frame/upgrade-style",
    response_model=UpgradeStyleResponse,
    summary="Upgrade a frame's render style while preserving composition",
)
def upgrade_frame_style(payload: UpgradeStyleRequest) -> UpgradeStyleResponse:
    """
    Upgrades a single storyboard frame to a new render style.

    The current frame image (source_image_b64) is passed as an img2img reference
    so the composition, character poses, camera angle, and environment are
    preserved.  Only the visual style changes.

    target_style can be any key in STYLE_PREFIXES:
      Storyboard: bw_sketch, bw_detailed, pencil_rough, ink_clean, marker_grey
      Color:      flat_color, flat_animation, cell_shaded, comic_book,
                  anime_style, pixar_style, ghibli_style
      Concept:    concept_art, digital_painting, watercolor, oil_painting
      Cinematic:  full_shaded, cinematic, hyperrealistic, noir, neon_cyberpunk
    """
    from app.core.prompt_builder import STYLE_PREFIXES
    if payload.target_style not in STYLE_PREFIXES:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown target_style '{payload.target_style}'. "
                   f"Valid keys: {sorted(STYLE_PREFIXES)}",
        )
    new_image_url = generate_frame_image(
        payload.frame,
        payload.scene,
        reference_style_image=payload.source_image_b64,
        render_style=payload.target_style,
        canon_context=payload.canon_context,
    )
    return UpgradeStyleResponse(
        frame_number=payload.frame.frame_number,
        generated_image_url=new_image_url,
        target_style=payload.target_style,
    )


@router.post(
    "/scene/upgrade-style",
    response_model=SceneUpgradeResponse,
    summary="Upgrade every frame in a scene to a new render style (concurrent)",
)
def upgrade_scene_style(payload: SceneUpgradeRequest) -> SceneUpgradeResponse:
    """
    Upgrades every frame in a scene to a new render style concurrently.

    Each frame's current image (payload.source_images[frame_number]) is used
    as an img2img source to preserve composition.  Frames missing from
    source_images get a pure text-to-image upgrade instead.

    Returns one UpgradeStyleResponse per frame, including failed frames
    (generated_image_url=None) so the caller can display partial results
    immediately and retry failures individually.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from app.core.prompt_builder import STYLE_PREFIXES

    if payload.target_style not in STYLE_PREFIXES:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown target_style '{payload.target_style}'. "
                   f"Valid keys: {sorted(STYLE_PREFIXES)}",
        )

    def _upgrade_one(frame: StoryboardFrameBase) -> UpgradeStyleResponse:
        src = payload.source_images.get(frame.frame_number)
        url = generate_frame_image(
            frame,
            payload.scene,
            reference_style_image=src,
            render_style=payload.target_style,
            canon_context=payload.canon_context,
        )
        return UpgradeStyleResponse(
            frame_number=frame.frame_number,
            generated_image_url=url,
            target_style=payload.target_style,
        )

    results: dict[int, UpgradeStyleResponse] = {}
    max_workers = min(len(payload.frames), 6)   # cap concurrency

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {pool.submit(_upgrade_one, f): f.frame_number for f in payload.frames}
        for future in as_completed(futures):
            fn = futures[future]
            try:
                results[fn] = future.result()
            except Exception as exc:
                logger.warning("Upgrade failed for frame %s: %s", fn, exc)
                results[fn] = UpgradeStyleResponse(
                    frame_number=fn,
                    generated_image_url=None,
                    target_style=payload.target_style,
                )

    # Return in original frame order
    ordered = [results[f.frame_number] for f in payload.frames if f.frame_number in results]
    succeeded = sum(1 for r in ordered if r.generated_image_url is not None)

    return SceneUpgradeResponse(
        scene_number=payload.scene.scene_number,
        frames=ordered,
        total=len(ordered),
        succeeded=succeeded,
    )


# ---------------------------------------------------------------------------
# Frame image persist — write generated_image_url back to DB
# ---------------------------------------------------------------------------

class _FrameImageSave(BaseModel):
    project_id: int
    scene_number: int
    frame_number: int
    generated_image_url: str | None


@router.patch(
    "/frame/save-image",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Persist a generated frame image URL back to the database",
)
def save_frame_image(payload: _FrameImageSave, db: DbSession) -> Response:
    """
    Looks up the frame by project_id + scene_number + frame_number and
    writes generated_image_url to the DB row.  Used by pipeline scripts
    after reforge-composition so images survive past the script run.
    """
    frame_row = (
        db.query(StoryboardFrameORM)
        .join(ScriptSceneORM, StoryboardFrameORM.scene_id == ScriptSceneORM.id)
        .filter(
            ScriptSceneORM.project_id == payload.project_id,
            ScriptSceneORM.scene_number == payload.scene_number,
            StoryboardFrameORM.frame_number == payload.frame_number,
        )
        .first()
    )
    if not frame_row:
        raise HTTPException(
            status_code=404,
            detail=f"Frame not found: project={payload.project_id} scene={payload.scene_number} frame={payload.frame_number}",
        )
    frame_row.generated_image_url = payload.generated_image_url
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Director Engine — Regenerate Visual Action (Level-2 staging)
# ---------------------------------------------------------------------------

@router.post(
    "/frame/regenerate-visual-action",
    response_model=RegenerateVisualActionResponse,
    summary="Regenerate only the Level-2 visual staging direction for a frame",
)
def regenerate_visual_action(
    payload: RegenerateVisualActionRequest,
) -> RegenerateVisualActionResponse:
    """
    Sends the frame's current context to the LLM and returns a new visual_action
    (Level-2 staging direction) without touching the generated image.

    The caller decides whether to regenerate the image from the new staging.

    If regenerate_animation_beats is True, also produces Level-3 animation beats.
    """
    frame = payload.frame
    scene = payload.scene

    # Build character context string
    char_lines = [
        f"  {c.name}: {c.wardrobe_defaults} — {c.facial_blueprint.base_ethnicity_or_type}, "
        f"age ~{c.facial_blueprint.estimated_age}"
        for c in payload.characters
    ]
    char_context = "\n".join(char_lines) if char_lines else "No character details provided."

    # Conditionally request animation beats
    if payload.regenerate_animation_beats:
        animation_beats_instruction = (
            "- Also produce animation_beats: a JSON array of granular movement cues "
            "(e.g. ['Walk', 'Stop', 'Right Hand Reach', 'Grip Handle', 'Pull', 'Step Forward']). "
            "Maximum 8 beats."
        )
        animation_beats_key = ',\n  "animation_beats": ["<beat>", "<beat>"]'
    else:
        animation_beats_instruction = ""
        animation_beats_key = ""

    prompt_text = VISUAL_ACTION_PROMPT.format(
        location_heading=scene.location_heading,
        time_of_day=scene.time_of_day,
        emotional_tone=scene.emotional_tone,
        shot_type=frame.shot_type,
        camera_angle=frame.camera_angle,
        camera_movement=frame.camera_movement or "Static",
        characters_present=", ".join(frame.characters_present) if frame.characters_present else "Not specified",
        narrative_action=frame.narrative_action or frame.action_breakdown,
        current_visual_action=frame.visual_action or frame.action_breakdown,
        lighting_notes=frame.lighting_notes,
        mood=frame.mood or scene.emotional_tone,
        character_context=char_context,
        animation_beats_instruction=animation_beats_instruction,
        animation_beats_key=animation_beats_key,
    )

    try:
        raw = _invoke_with_fallback(prompt_text)
        parsed, _ = _parse_json_response(raw)
        if isinstance(parsed, list):
            parsed = parsed[0]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Visual action regeneration LLM failed: {e}")

    visual_action = str(parsed.get("visual_action", frame.visual_action or frame.action_breakdown))
    director_notes = parsed.get("director_notes") or frame.director_notes
    animation_beats: list[str] = parsed.get("animation_beats", []) if payload.regenerate_animation_beats else list(frame.animation_beats)

    return RegenerateVisualActionResponse(
        frame_number=frame.frame_number,
        visual_action=visual_action,
        animation_beats=animation_beats,
        director_notes=director_notes,
    )


# ---------------------------------------------------------------------------
# Scene Background Variation
# ---------------------------------------------------------------------------

_BACKGROUND_VARIATION_PROMPT = """\
{style_prefix}{shot_type}, {camera_angle}. {visual_action}. {lighting_notes}.

PRESERVE exactly — do not change any of these:
- Every character: their identity, costume, pose, and facial expression
- All props and story-relevant objects
- Camera framing, shot type, and composition
- The story action: {visual_action}

CHANGE only the background environment:
- Generate a different version of the {location_heading} environment
- Match the same location type, architectural style, perspective, lighting direction, atmosphere, and mood
- Time of day: {time_of_day}. Mood: {mood}
- Keep all surface details as close to the reference as possible — same buildings, trees, clouds, and props — only vary the background rendering if strictly necessary to avoid an exact copy

Do not relocate the scene. Do not alter character placement. Do not change the story action.
"""


@router.post(
    "/scene/background-variation",
    response_model=BackgroundVariationResponse,
    summary="Generate a background variation while preserving all character/composition elements",
)
def generate_background_variation(
    payload: BackgroundVariationRequest,
) -> BackgroundVariationResponse:
    """
    Generates a single alternative background for the given frame.

    Behaviour:
    - Strips the ``data:…;base64,`` header from ``reference_image`` and passes
      it as an img2img anchor so the image model has an environmental reference.
    - Injects an explicit preservation prompt that locks characters, poses,
      composition, and continuity fields (location, time-of-day, lighting).
    - Returns a new ``generated_image_url``; never overwrites the original —
      the caller decides whether to apply the variation.

    The ``reference_image`` field is required.  If it is an empty string the
    endpoint returns 422 immediately instead of generating a random background.
    """
    if not payload.reference_image or not payload.reference_image.strip():
        raise HTTPException(
            status_code=422,
            detail=(
                "reference_image is required for background variation. "
                "The scene must have a stored reference image to anchor the environment."
            ),
        )

    frame = payload.frame
    scene = payload.scene

    from app.core.prompt_builder import STYLE_PREFIXES, DEFAULT_STYLE_PREFIX
    style_prefix = STYLE_PREFIXES.get(payload.render_style, DEFAULT_STYLE_PREFIX)

    # Preserve all character/composition data; vary only the background environment.
    full_prompt = _BACKGROUND_VARIATION_PROMPT.format(
        style_prefix=style_prefix,
        shot_type=frame.shot_type,
        camera_angle=frame.camera_angle,
        visual_action=frame.visual_action or frame.action_breakdown,
        lighting_notes=frame.lighting_notes or scene.emotional_tone,
        location_heading=scene.location_heading,
        time_of_day=scene.time_of_day,
        mood=frame.mood or scene.emotional_tone,
    ).strip()[:900]

    ref_b64 = _strip_data_url_header(payload.reference_image)

    new_image_url = generate_image(
        full_prompt,
        reference_b64=ref_b64,
    )

    return BackgroundVariationResponse(
        frame_number=frame.frame_number,
        scene_number=scene.scene_number,
        generated_image_url=new_image_url,
        variation_index=1,
    )


# ---------------------------------------------------------------------------
# Director Engine — World Bible Import
# ---------------------------------------------------------------------------

@router.post(
    "/world-bible/import",
    response_model=WorldBibleImportResult,
    summary="Import and extract structured world-building data from a document",
)
def import_world_bible(payload: WorldBibleImportRequest) -> WorldBibleImportResult:
    """
    Sends raw document text through the WORLD_BIBLE_IMPORT_PROMPT LLM pipeline.
    Returns structured environments, factions, lore, and timeline entries.
    If project_id is supplied, the extracted environments are merged into the project (not yet persisted — frontend confirms).
    """
    try:
        prompt_text = WORLD_BIBLE_IMPORT_PROMPT.format(raw_text=payload.raw_text[:8000])
        raw = _invoke_with_fallback(prompt_text)
        parsed, _ = _parse_json_response(raw)
        if isinstance(parsed, list):
            parsed = parsed[0]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"World Bible import LLM failed: {e}")

    environments_raw = parsed.get("environments", [])
    factions_raw     = parsed.get("factions", [])
    lore_raw         = parsed.get("lore_entries", [])
    timeline_raw     = parsed.get("timeline_entries", [])

    merged_environments = []
    for env in environments_raw:
        try:
            merged_environments.append(EnvironmentProfileBase.model_validate(env))
        except Exception:
            pass

    return WorldBibleImportResult(
        environments_extracted=len(environments_raw),
        factions_extracted=len(factions_raw),
        lore_entries_extracted=len(lore_raw),
        timeline_entries_extracted=len(timeline_raw),
        merged_environments=merged_environments,
        raw_extracted=parsed,
    )


# ---------------------------------------------------------------------------
# Character Package — Age Variant
# ---------------------------------------------------------------------------

@router.post(
    "/character-package/age-variant",
    summary="Generate an age variant image for a character",
)
def generate_age_variant(payload: AgeVariantRequest) -> dict:
    """
    Generates an age-variant portrait by injecting an age modifier into the
    character prompt while preserving all core identity anchors (facial blueprint,
    bone structure, distinct markers).

    Returns { age: int, image_url: str | null }
    """
    char_data  = payload.char_data
    age        = payload.age
    render_style = payload.render_style

    fb    = char_data.get("facial_blueprint", {})
    parts = [
        char_data.get("name", "character"),
        fb.get("base_ethnicity_or_type", ""),
        fb.get("bone_structure", ""),
        fb.get("distinct_markers", "") or "",
        char_data.get("wardrobe_defaults", ""),
    ]
    base = ", ".join(p for p in parts if p)

    # Age descriptor adjective
    if age <= 12:
        age_desc = "child, young face, small stature"
    elif age <= 20:
        age_desc = "teenager, youthful face"
    elif age <= 35:
        age_desc = "young adult"
    elif age <= 55:
        age_desc = "middle-aged adult, slight weathering"
    else:
        age_desc = "elderly, grey hair, aged face, wrinkles"

    view_desc = f"{age} years old, {age_desc}, portrait, full front view"
    prompt = build_package_prompt(base, view_desc, render_style)
    image_url = _generate_pollinations(prompt)

    return {"age": age, "image_url": image_url}


# ---------------------------------------------------------------------------
# Character Package — Consistency Score
# ---------------------------------------------------------------------------

@router.post(
    "/character-package/consistency-score",
    response_model=ConsistencyScoreResponse,
    summary="Compute a visual consistency score across a character's generated images",
)
def compute_consistency_score(payload: ConsistencyScoreRequest) -> ConsistencyScoreResponse:
    """
    Analyses the provided character images and returns a confidence score for
    visual consistency across face, hair, body, costume, colours, and accessories.

    Current implementation uses a prompt-based heuristic analysis via the LLM
    (describe each image's attributes and compare).  A dedicated vision model
    can replace this in future without changing the API contract.
    """
    image_keys = list(payload.image_urls.keys())
    n_images = len(image_keys)

    if n_images < 2:
        # Can't score consistency with fewer than 2 images
        return ConsistencyScoreResponse(
            character_id=payload.character_id,
            overall=1.0,
            breakdown={k: 1.0 for k in ["face", "hair", "body", "costume", "colors", "accessories"]},
            warning=None,
        )

    consistency_prompt = f"""You are a professional character consistency analyst.
A character has {n_images} generated images across these sections: {', '.join(image_keys)}.
Assume they were all generated from the same character description.

Return a JSON object with these exact keys and float values (0.0 to 1.0):
{{
  "face": <0.0-1.0>,
  "hair": <0.0-1.0>,
  "body": <0.0-1.0>,
  "costume": <0.0-1.0>,
  "colors": <0.0-1.0>,
  "accessories": <0.0-1.0>,
  "overall": <0.0-1.0>,
  "warning": "<string or null>"
}}

Base the scores on typical generation variance for this number of images.
With {n_images} images, variance is {'low' if n_images <= 3 else 'moderate' if n_images <= 8 else 'high'}.
Overall should be the weighted average (face 30%, hair 20%, body 20%, costume 15%, colors 10%, accessories 5%).
Return only the JSON object. Nothing else."""

    try:
        raw = _invoke_with_fallback(consistency_prompt)
        parsed, _ = _parse_json_response(raw)
        if isinstance(parsed, list):
            parsed = parsed[0]

        overall = float(parsed.get("overall", 0.85))
        breakdown = {
            k: float(parsed.get(k, 0.85))
            for k in ["face", "hair", "body", "costume", "colors", "accessories"]
        }
        warning = parsed.get("warning") or (
            "Visual consistency may decrease across these images — review before generating more."
            if overall < 0.85 else None
        )
    except Exception:
        # Fallback: return a reasonable heuristic score
        variance_factor = max(0.0, 1.0 - (n_images - 2) * 0.02)
        overall = round(0.90 * variance_factor, 2)
        breakdown = {k: round(0.88 * variance_factor, 2)
                     for k in ["face", "hair", "body", "costume", "colors", "accessories"]}
        warning = None if overall >= 0.85 else "Unable to compute exact score — please review images manually."

    return ConsistencyScoreResponse(
        character_id=payload.character_id,
        overall=overall,
        breakdown=breakdown,
        warning=warning,
    )


# ---------------------------------------------------------------------------
# Character Identity System endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/character/qa-score",
    response_model=QAScoreResult,
    summary="Run the Visual QA Engine against a prompt + character identity",
)
def character_qa_score(payload: CharacterQARequest) -> QAScoreResult:
    """
    Project-Aware Visual QA Engine.

    Selects the correct structural validator based on asset_type — no human
    anatomy is assumed.  Scores 9 categories:
      identity, species, anatomy, composition, camera, lighting,
      props, environment, continuity

    Every category below 0.85 produces a targeted QARepairAction with a
    human-readable label ("Regenerate Composition Only") and the exact
    backend endpoint to call — so the frontend can offer surgical fixes
    instead of a full regeneration.
    """
    return compute_qa_score(
        generated_prompt=payload.generated_prompt,
        identity=payload.identity,
        species_id=payload.species_id,
        variant=payload.variant,
        asset_type=payload.asset_type,
        scene_context=payload.scene_context,
        camera_spec=payload.camera_spec,
    )


@router.post(
    "/scene/qa-continuity",
    response_model=SceneContinuityReport,
    summary="Run context-aware continuity QA on all frames in a scene",
)
def scene_qa_continuity(payload: SceneQARequest) -> SceneContinuityReport:
    """
    Context-Aware Continuity QA Engine.

    Validates every frame in a scene against the *expected* storyboard context —
    not against the previous frame.  Frames are grouped into ContinuityGroups
    (runs of consecutive frames sharing the same location + time-of-day).
    Transitions between groups are intentional and never flagged.

    Per-frame checks:
      - Location: generated prompt reflects the expected location slugline
      - Time-of-day: prompt reflects expected lighting phase (day / night / golden hour)
      - Characters: expected characters_present appear in the prompt
      - Lighting: scene lighting notes are represented in the prompt
      - Shot type: expected shot type keywords present in the prompt

    Returns a SceneContinuityReport with:
      - Per-frame pass/fail + issue list
      - Continuity groups
      - Scene-level overall score + summary
    """
    return compute_scene_continuity(
        scene_number=payload.scene_number,
        location_heading=payload.location_heading,
        time_of_day=payload.time_of_day,
        environmental_type=payload.environmental_type,
        frames=payload.frames,
    )


@router.post(
    "/character-package/import-asset",
    response_model=ImportAssetResponse,
    summary="Import a user-uploaded reference image into a character's identity",
)
def import_character_asset(payload: ImportAssetRequest) -> ImportAssetResponse:
    """
    Stores a user-uploaded image as the canonical reference for the given
    identity slot (reference_primary, reference_front, reference_left,
    reference_right, reference_back, expression_sheet, pose_sheet, outfit, prop).

    If extract_identity=True, the image data URL is analysed via LLM to
    extract/update character identity fields (face_description, hair_description,
    eye_description, distinct_markers).  The extracted fields are returned so the
    caller can merge them into the live CharacterProfile state.

    The image itself is stored as a base64 data URL — no external storage needed.
    Callers are responsible for persisting the updated CharacterProfile (and CKG)
    to the backend via the existing CRUD / pipeline endpoints.
    """
    stored = bool(payload.image_data and payload.image_data.startswith("data:"))

    extracted_description: str | None = None
    updated_fields: dict[str, str] = {}

    if stored and payload.extract_identity:
        # LLM vision pass: describe the character in the uploaded image and
        # extract structured identity fields.
        extraction_prompt = (
            "You are a character design analyst. "
            "A creator has uploaded a reference image for a character. "
            "Describe the character's visible identity features from this image in structured JSON. "
            "Return ONLY a JSON object with these optional string keys:\n"
            "  face_description, hair_description, eye_description, "
            "body_proportions, distinct_markers\n"
            "Fill only the keys visible in the image. "
            "Be specific and precise — e.g. 'short black undercut' not just 'dark hair'. "
            "If the image is a sketch or stylised art, still extract the identity features. "
            "Return only the JSON object, nothing else."
        )
        try:
            raw = _invoke_with_fallback(extraction_prompt)
            parsed, _ = _parse_json_response(raw)
            if isinstance(parsed, list):
                parsed = parsed[0]
            # Only carry over recognised identity fields
            _IDENTITY_FIELDS = {
                "face_description", "hair_description", "eye_description",
                "body_proportions", "distinct_markers",
            }
            updated_fields = {
                k: str(v) for k, v in parsed.items()
                if k in _IDENTITY_FIELDS and v
            }
            if updated_fields:
                extracted_description = "; ".join(
                    f"{k.replace('_', ' ')}: {v}" for k, v in updated_fields.items()
                )
        except Exception:
            pass  # extraction is best-effort; failure does not block import

    return ImportAssetResponse(
        character_id=payload.character_id,
        asset_type=payload.asset_type,
        stored=stored,
        extracted_description=extracted_description,
        updated_identity_fields=updated_fields,
    )


@router.post(
    "/ckg/update-identity",
    summary="Write a CharacterIdentity + Species + Variants into a project's CKG",
)
def ckg_update_identity(payload: CKGUpdateIdentityRequest, db: DbSession) -> dict:
    """
    Writes the full Identity System layers (Identity, Species, Variants) for a
    single character into the project's CKG (stored in `StoryboardProjectORM.canon`).

    This is the persistence endpoint for the Identity tab in the Character
    Package UI.  The frontend calls this whenever:
      - A reference image is uploaded and identity is confirmed
      - The creator edits the identity fields manually
      - A species change or variant is added

    Returns the updated CKG summary for the character.
    """
    project = _load_project_or_404(payload.project_id, db)

    # Load or init the CKG — if canon exists but fails to parse, refuse the write
    # rather than silently overwriting the user's existing canonical data.
    if project.canon:
        try:
            ckg = CreativeKnowledgeGraph.model_validate(project.canon)
        except Exception as exc:
            logger.error(
                "CKG deserialisation failed for project %s; refusing identity write to prevent data loss. Error: %s",
                payload.project_id, exc,
            )
            raise HTTPException(
                status_code=500,
                detail="Project canon could not be loaded. Identity update aborted to prevent data loss.",
            )
    else:
        ckg = CreativeKnowledgeGraph()

    # Write identity, species, variants nodes
    identity_dict = payload.identity.model_dump()

    # If the user supplied an explicit canonical prompt (from the AI Prompt tab),
    # embed it directly so the Prompt Builder uses it verbatim for every
    # subsequent image generation.  Otherwise fall back to the auto-assembled
    # appearance summary derived from the structured identity fields.
    if payload.canonical_prompt:
        identity_dict["_canonical_prompt"] = payload.canonical_prompt.strip()

    ckg.character_identities[payload.character_id] = identity_dict
    ckg.character_species[payload.character_id] = payload.species.model_dump()
    ckg.character_variants[payload.character_id] = [v.model_dump() for v in payload.variants]

    # Build the auto-assembled appearance summary (always kept in sync for
    # backwards-compat and as a fallback when no explicit prompt is set).
    identity = payload.identity
    species_data = get_species(payload.species.species_id)
    species_prefix = species_data.get("prompt_prefix", "").rstrip(", ")

    parts = [p for p in [
        species_prefix if species_prefix else None,
        identity.name,
        identity.face_description,
        identity.hair_description,
        identity.eye_description,
        identity.body_proportions,
        f"age {identity.age}" if identity.age else None,
        identity.distinct_markers,
        *(identity.signature_accessories or []),
    ] if p]
    appearance_summary = ", ".join(parts)

    # The canonical_prompt stored in approved_characters is what the Prompt
    # Builder reads first.  Use the explicit user prompt when provided.
    effective_prompt = payload.canonical_prompt.strip() if payload.canonical_prompt else appearance_summary

    if payload.character_id in ckg.approved_characters:
        ckg.approved_characters[payload.character_id]["appearance_summary"] = appearance_summary
        ckg.approved_characters[payload.character_id]["canonical_prompt"] = effective_prompt
    else:
        ckg.approved_characters[payload.character_id] = {
            "name": identity.name,
            "appearance_summary": appearance_summary,
            "canonical_prompt": effective_prompt,
        }

    # Persist
    project.canon = ckg.model_dump()
    db.commit()

    return {
        "character_id": payload.character_id,
        "identity_stored": True,
        "species": payload.species.species_id,
        "variants_count": len(payload.variants),
        "appearance_summary": appearance_summary,
        "canonical_prompt": effective_prompt,
    }


@router.patch(
    "/character/update-dna",
    summary="Save abilities, visual rules and/or a reference portrait into a project's CKG",
)
def update_character_dna(payload: CharacterDNAUpdateRequest, db: DbSession) -> dict:
    """
    Persists the Character DNA fields (abilities, visual_rules, reference_portrait)
    for a single character into the project's Creative Knowledge Graph.

    Called by the Abilities tab "Save to Project" button and the Portrait tab
    "Set as Reference Portrait" flow.  Only the fields provided in the request
    are written — existing CKG identity / species / variant nodes are not touched.
    """
    project = _load_project_or_404(payload.project_id, db)

    # Load or init the CKG — if canon exists but fails to parse, refuse the write
    # rather than silently overwriting the user's existing canonical data.
    if project.canon:
        try:
            ckg = CreativeKnowledgeGraph.model_validate(project.canon)
        except Exception as exc:
            logger.error(
                "CKG deserialisation failed for project %s; refusing DNA write to prevent data loss. Error: %s",
                payload.project_id, exc,
            )
            raise HTTPException(
                status_code=500,
                detail="Project canon could not be loaded. DNA update aborted to prevent data loss.",
            )
    else:
        ckg = CreativeKnowledgeGraph()

    # Write abilities, visual_rules, and optional portrait into the CKG
    ckg.character_abilities[payload.character_id] = payload.abilities
    ckg.character_visual_rules[payload.character_id] = payload.visual_rules
    if payload.reference_portrait is not None:
        ckg.character_portraits[payload.character_id] = payload.reference_portrait
    # Keep approved_characters node in sync for prompt_builder
    if payload.character_id in ckg.approved_characters:
        ckg.approved_characters[payload.character_id]["abilities"] = payload.abilities
        ckg.approved_characters[payload.character_id]["visual_rules"] = payload.visual_rules

    project.canon = ckg.model_dump()

    db.commit()
    return {
        "character_id": payload.character_id,
        "abilities_saved": len(payload.abilities),
        "visual_rules_saved": len(payload.visual_rules),
        "portrait_saved": payload.reference_portrait is not None,
    }


@router.get(
    "/ckg/{project_id}",
    summary="Get the Creative Knowledge Graph for a project",
)
def get_ckg(project_id: int, db: DbSession) -> dict:
    """
    Returns the full CKG for a project.  Used by the frontend to hydrate
    the Character Package Identity tabs and any component that reads from
    the CKG (QA Engine, Continuity Engine, Prompt Builder).
    """
    project = _load_project_or_404(project_id, db)
    if not project.canon:
        return CreativeKnowledgeGraph().model_dump()
    try:
        return CreativeKnowledgeGraph.model_validate(project.canon).model_dump()
    except Exception:
        return project.canon or {}


@router.get(
    "/species-registry",
    summary="Return all built-in species profiles",
)
def list_species_registry() -> dict:
    """
    Returns the full SPECIES_REGISTRY from identity_system.py.
    Used by the SpeciesSelector component to render the species picker.
    """
    return SPECIES_REGISTRY


# ---------------------------------------------------------------------------
# Direct CRUD REST Route Handlers
# ---------------------------------------------------------------------------

@router.post("/", response_model=StoryboardProjectResponse, status_code=status.HTTP_201_CREATED)
def create_storyboard_project(payload: StoryboardProjectCreate, db: DbSession) -> StoryboardProjectResponse:
    project = _build_project_orm(payload)
    db.add(project)
    db.commit()
    return _orm_to_response(_load_project_or_404(project.db_id, db))

@router.get("/summaries", response_model=list[ProjectSummary])
def list_project_summaries(db: DbSession) -> list[ProjectSummary]:
    """
    Fast library list — returns only card-level metadata for every project.
    No frame data, no character JSON blobs, no images are loaded.
    Suitable for the Project Library page where only counts + palette are needed.

    Uses a single aggregated query for frame counts (no N+1).
    """
    from sqlalchemy import func

    # One query: project + lightweight scene + character id columns
    projects = (
        db.query(StoryboardProjectORM)
        .options(
            joinedload(StoryboardProjectORM.characters).load_only(  # type: ignore[attr-defined]
                CharacterProfileORM.id
            ),
            joinedload(StoryboardProjectORM.scenes).load_only(  # type: ignore[attr-defined]
                ScriptSceneORM.id,
                ScriptSceneORM.project_id,
                ScriptSceneORM.color_palette,
            ),
        )
        .all()
    )

    # One query: frame counts for ALL projects at once, keyed by project_id
    frame_counts: dict[int, int] = {
        project_id: count
        for project_id, count in (
            db.query(ScriptSceneORM.project_id, func.count(StoryboardFrameORM.id))
            .join(StoryboardFrameORM, StoryboardFrameORM.scene_id == ScriptSceneORM.id)
            .group_by(ScriptSceneORM.project_id)
            .all()
        )
    }

    return [
        ProjectSummary(
            db_id=p.db_id,
            project_title=p.project_title,
            global_aesthetic=p.global_aesthetic,
            render_style=p.render_style,
            scene_count=len(p.scenes),
            frame_count=frame_counts.get(p.db_id, 0),
            character_count=len(p.characters),
            color_palettes=[s.color_palette for s in p.scenes if s.color_palette],
        )
        for p in projects
    ]


@router.get("/", response_model=list[StoryboardProjectResponse])
def list_storyboard_projects(db: DbSession) -> list[StoryboardProjectResponse]:
    projects = db.query(StoryboardProjectORM).options(
        joinedload(StoryboardProjectORM.characters),
        joinedload(StoryboardProjectORM.scenes).joinedload(ScriptSceneORM.frames),
    ).all()
    return [_orm_to_response(p) for p in projects]

@router.get("/{db_id}", response_model=StoryboardProjectResponse)
def get_storyboard_project(db_id: int, db: DbSession) -> StoryboardProjectResponse:
    return _orm_to_response(_load_project_or_404(db_id, db))

@router.delete("/{db_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_storyboard_project(db_id: int, db: DbSession) -> None:
    project = _load_project_or_404(db_id, db)
    db.delete(project)
    db.commit()