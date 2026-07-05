"""
FastAPI router — /storyboard endpoints.

Validation layer:  Pydantic schemas (app.schemas.storyboard)
Persistence layer: SQLAlchemy ORM  (app.db.models)
DB dependency:     app.db.session.get_db
"""

from __future__ import annotations

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db.models import (
    CharacterProfileORM,
    ScriptSceneORM,
    StoryboardFrameORM,  # used inside _build_scene_orm
    StoryboardProjectORM,
)
from app.db.session import get_db
from app.schemas.storyboard import (
    CharacterProfileBase,
    FacialBlueprint,
    ScriptSceneBase,
    StoryboardFrameBase,
    StoryboardProjectCreate,
    StoryboardProjectResponse,
    # --- New Pipeline Schemas ---
    PipelineExecutionRequest,
    SingleCharacterRequest,
    SingleEnvironmentRequest,
    EnvironmentProfileBase,
    StandaloneStoryboardRequest
)
from app.core.llm import invoke_character_stage, invoke_world_stage, invoke_storyboard_stage
from app.core.image import generate_frame_image

router = APIRouter(prefix="/storyboard", tags=["storyboard"])


# ---------------------------------------------------------------------------
# Image generation helper endpoint
# ---------------------------------------------------------------------------

from fastapi import Body

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
    from app.core.image import _generate_pollinations, _STYLE_PREFIXES
    style_prefix = _STYLE_PREFIXES.get(render_style, _STYLE_PREFIXES["bw_sketch"])
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
    """Build a consistent base description for character image prompts."""
    fb = char_data.get("facial_blueprint", {})
    parts = [
        char_data.get("name", "character"),
        fb.get("base_ethnicity_or_type", ""),
        f"age {fb.get('estimated_age', '')}" if fb.get("estimated_age") else "",
        fb.get("bone_structure", ""),
        fb.get("distinct_markers", "") or "",
        char_data.get("wardrobe_defaults", ""),
    ]
    return ", ".join(p for p in parts if p)


def _pkg_prompt(base: str, view_desc: str, render_style: str) -> str:
    from app.core.image import _STYLE_PREFIXES
    prefix = _STYLE_PREFIXES.get(render_style, _STYLE_PREFIXES["bw_sketch"])
    return (prefix + f"{base}, {view_desc}, full body, white background, character reference sheet")[:450]


@router.post("/character-package/generate", summary="Generate all image sheets for a character")
def generate_character_package(
    char_data: dict = Body(..., description="CharacterProfile JSON"),
    render_style: str = Body("bw_sketch"),
    sections: list[str] = Body(
        default=["portrait", "turnaround", "expressions", "poses", "outfits"],
        description="Which sections to generate",
    ),
) -> dict:
    """
    Generates the requested image sections for a character and returns them
    as a dict keyed by section name. Each image is a base64 data URL.
    Only requested sections are computed — callers fetch lazily per tab.
    """
    from app.core.image import _generate_pollinations, _STYLE_PREFIXES

    base = _char_base_desc(char_data)
    result: dict = {}

    if "portrait" in sections:
        prompt = _pkg_prompt(base, "hero portrait, neutral pose, looking at camera, cinematic lighting, bust shot", render_style)
        result["portrait"] = _generate_pollinations(prompt)

    if "turnaround" in sections:
        result["turnaround"] = {}
        for key, view_desc in _TURNAROUND_ANGLES:
            prompt = _pkg_prompt(base, view_desc, render_style)
            result["turnaround"][key] = _generate_pollinations(prompt)

    if "expressions" in sections:
        result["expressions"] = {}
        for expr in _EXPRESSIONS:
            prompt = _pkg_prompt(base, f"{expr} facial expression, head and shoulders", render_style)
            result["expressions"][expr] = _generate_pollinations(prompt)

    if "poses" in sections:
        result["poses"] = {}
        for key, pose_desc in _POSES:
            prompt = _pkg_prompt(base, pose_desc, render_style)
            result["poses"][key] = _generate_pollinations(prompt)

    if "outfits" in sections:
        result["outfits"] = {}
        for key, outfit_desc in _OUTFITS:
            prompt = _pkg_prompt(base, outfit_desc, render_style)
            result["outfits"][key] = _generate_pollinations(prompt)

    if "props" in sections:
        # Auto-detect props from wardrobe description
        wardrobe = char_data.get("wardrobe_defaults", "")
        prop_words = [w.strip() for w in wardrobe.replace(",", " ").replace(".", " ").split() if len(w) > 3]
        prop_items = prop_words[:5] or ["prop", "accessory", "tool", "object", "item"]
        result["props"] = {}
        for prop in prop_items:
            prompt = (_STYLE_PREFIXES.get(render_style, _STYLE_PREFIXES["bw_sketch"]) +
                      f"close-up illustration of {prop}, isolated on white background, clean design")[:450]
            result["props"][prop] = _generate_pollinations(prompt)

    return result


@router.post("/character-package/generate-one", summary="Regenerate a single character image")
def regenerate_character_image(
    char_data: dict = Body(...),
    section: str = Body(..., description="e.g. 'portrait', 'turnaround/front', 'expressions/happy'"),
    render_style: str = Body("bw_sketch"),
) -> dict:
    """
    Regenerate exactly one image within a section. Returns { image_url: str|null }.
    `section` uses slash notation: 'turnaround/front', 'expressions/angry', 'poses/running', etc.
    """
    from app.core.image import _generate_pollinations, _STYLE_PREFIXES

    base = _char_base_desc(char_data)

    if section == "portrait":
        prompt = _pkg_prompt(base, "hero portrait, neutral pose, looking at camera, cinematic lighting, bust shot", render_style)
    elif section.startswith("turnaround/"):
        key = section.split("/", 1)[1]
        view_desc = dict(_TURNAROUND_ANGLES).get(key, key.replace("_", " "))
        prompt = _pkg_prompt(base, view_desc, render_style)
    elif section.startswith("expressions/"):
        expr = section.split("/", 1)[1]
        prompt = _pkg_prompt(base, f"{expr} facial expression, head and shoulders", render_style)
    elif section.startswith("poses/"):
        key = section.split("/", 1)[1]
        pose_desc = dict(_POSES).get(key, key.replace("_", " "))
        prompt = _pkg_prompt(base, pose_desc, render_style)
    elif section.startswith("outfits/"):
        key = section.split("/", 1)[1]
        outfit_desc = dict(_OUTFITS).get(key, key.replace("_", " ") + " outfit")
        prompt = _pkg_prompt(base, outfit_desc, render_style)
    else:
        prompt = _pkg_prompt(base, section.replace("/", " ").replace("_", " "), render_style)

    url = _generate_pollinations(prompt)
    return {"image_url": url}


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
        parsed = _parse_json_response(raw)
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
    Premium generation endpoint.  Produces:
      - turnaround_360: 8-view 360° character turntable (deg_000 … deg_315)
      - premium_poses: T-pose, A-pose + 6 extended action poses
      - material_closeups: face, hair, fabric, hand, eye close-up reference sheets
    Returns each section as a dict of key → base64 data URL.
    """
    from app.core.image import _generate_pollinations, _STYLE_PREFIXES

    base = _char_base_desc(char_data)
    result: dict = {}

    if "turnaround_360" in targets:
        result["turnaround_360"] = {}
        for key, view_desc in _TURNAROUND_360:
            prompt = _pkg_prompt(base, view_desc, render_style)
            result["turnaround_360"][key] = _generate_pollinations(prompt)

    if "premium_poses" in targets:
        result["premium_poses"] = {}
        for key, pose_desc in _PREMIUM_POSES:
            prompt = _pkg_prompt(base, pose_desc, render_style)
            result["premium_poses"][key] = _generate_pollinations(prompt)

    if "material_closeups" in targets:
        result["material_closeups"] = {}
        for key, mat_desc in _MATERIAL_CLOSEUPS:
            prefix = _STYLE_PREFIXES.get(render_style, _STYLE_PREFIXES["bw_sketch"])
            prompt = (prefix + f"{base}, {mat_desc}, technical reference, isolated white background")[:450]
            result["material_closeups"][key] = _generate_pollinations(prompt)

    return result


DbSession = Annotated[Session, Depends(get_db)]


# ---------------------------------------------------------------------------
# Helpers — schema ➜ ORM and ORM ➜ schema
# ---------------------------------------------------------------------------

def _build_project_orm(payload: StoryboardProjectCreate) -> StoryboardProjectORM:
    project = StoryboardProjectORM(
        project_title=payload.project_title,
        global_aesthetic=payload.global_aesthetic,
        render_style=payload.render_style,
    )
    for char in payload.characters:
        project.characters.append(
            CharacterProfileORM(
                char_id=char.id,
                name=char.name,
                wardrobe_defaults=char.wardrobe_defaults,
                facial_blueprint=char.facial_blueprint.model_dump(),
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
                shot_type=frame.shot_type,
                camera_angle=frame.camera_angle,
                duration_seconds=frame.duration_seconds,
                action_breakdown=frame.action_breakdown,
                lighting_notes=frame.lighting_notes,
                sound_cue=frame.sound_cue,
                generated_image_url=frame.generated_image_url,
            )
        )
    return scene


def _orm_to_response(project: StoryboardProjectORM) -> StoryboardProjectResponse:
    return StoryboardProjectResponse(
        db_id=project.db_id,
        project_title=project.project_title,
        global_aesthetic=project.global_aesthetic,
        render_style=project.render_style,
        characters=[
            CharacterProfileBase(
                id=c.char_id,
                name=c.name,
                wardrobe_defaults=c.wardrobe_defaults,
                facial_blueprint=FacialBlueprint.model_validate(c.facial_blueprint),
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
                        shot_type=f.shot_type,
                        camera_angle=f.camera_angle,
                        duration_seconds=f.duration_seconds,
                        action_breakdown=f.action_breakdown,
                        lighting_notes=f.lighting_notes,
                        sound_cue=f.sound_cue,
                        generated_image_url=f.generated_image_url,
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
    Persists the result and returns HTTP 201.
    """
    characters = invoke_character_stage(payload.raw_character_notes)
    environments = invoke_world_stage(payload.raw_world_notes)
    scenes = invoke_storyboard_stage(
        characters, environments, payload.raw_script_text, payload.global_aesthetic,
        payload.render_style,
    )
    for scene in scenes:
        for frame in scene.frames:
            frame.generated_image_url = generate_frame_image(
                frame, scene,
                reference_style_image=payload.reference_style_image,
                render_style=payload.render_style,
            )
    project_data = StoryboardProjectCreate(
        project_title=payload.project_title,
        global_aesthetic=payload.global_aesthetic,
        render_style=payload.render_style,
        characters=characters,
        scenes=scenes,
    )
    project = _build_project_orm(project_data)
    db.add(project)
    db.commit()
    return _orm_to_response(_load_project_or_404(project.db_id, db))


@router.post(
    "/parse-single-character",
    response_model=CharacterProfileBase,
    summary="Isolate parsing for a singular character note override",
)
def parse_single_character(payload: SingleCharacterRequest) -> CharacterProfileBase:
    """Runs CHARACTER_PROMPT on a single raw character note and returns the parsed profile."""
    characters = invoke_character_stage(payload.raw_notes)
    return characters[0]


@router.post(
    "/parse-single-environment",
    response_model=EnvironmentProfileBase,
    summary="Isolate parsing for a singular environment location override",
)
def parse_single_environment(payload: SingleEnvironmentRequest) -> EnvironmentProfileBase:
    """Runs WORLD_PROMPT on a single raw location note and returns the parsed environment profile."""
    environments = invoke_world_stage(payload.raw_notes)
    return environments[0]


@router.post(
    "/forge-standalone-storyboard",
    response_model=StoryboardProjectResponse,
    summary="Generate storyboard frames leveraging pre-parsed assets directly",
)
def forge_standalone_storyboard(payload: StandaloneStoryboardRequest) -> StoryboardProjectResponse:
    """
    Skips character/world generation — feeds pre-parsed characters directly into
    STORYBOARD_PROMPT. Returns an unsaved project (db_id=None); no DB write.
    """
    scenes = invoke_storyboard_stage(
        payload.characters, [], payload.raw_script_text, payload.global_aesthetic,
        'bw_sketch',
    )
    for scene in scenes:
        for frame in scene.frames:
            frame.generated_image_url = generate_frame_image(
                frame, scene,
                reference_style_image=None,
                render_style='bw_sketch',
            )
    return StoryboardProjectResponse(
        project_title=payload.project_title,
        global_aesthetic=payload.global_aesthetic,
        render_style='bw_sketch',
        characters=payload.characters,
        scenes=scenes,
        db_id=None,
    )


# ---------------------------------------------------------------------------
# Direct CRUD REST Route Handlers
# ---------------------------------------------------------------------------

@router.post("/", response_model=StoryboardProjectResponse, status_code=status.HTTP_201_CREATED)
def create_storyboard_project(payload: StoryboardProjectCreate, db: DbSession) -> StoryboardProjectResponse:
    project = _build_project_orm(payload)
    db.add(project)
    db.commit()
    return _orm_to_response(_load_project_or_404(project.db_id, db))

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