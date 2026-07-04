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

DbSession = Annotated[Session, Depends(get_db)]


# ---------------------------------------------------------------------------
# Helpers — schema ➜ ORM and ORM ➜ schema
# ---------------------------------------------------------------------------

def _build_project_orm(payload: StoryboardProjectCreate) -> StoryboardProjectORM:
    project = StoryboardProjectORM(
        project_title=payload.project_title,
        global_aesthetic=payload.global_aesthetic,
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
        characters, environments, payload.raw_script_text, payload.global_aesthetic
    )
    for scene in scenes:
        for frame in scene.frames:
            frame.generated_image_url = generate_frame_image(frame, scene)
    project_data = StoryboardProjectCreate(
        project_title=payload.project_title,
        global_aesthetic=payload.global_aesthetic,
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
        payload.characters, [], payload.raw_script_text, payload.global_aesthetic
    )
    for scene in scenes:
        for frame in scene.frames:
            frame.generated_image_url = generate_frame_image(frame, scene)
    return StoryboardProjectResponse(
        project_title=payload.project_title,
        global_aesthetic=payload.global_aesthetic,
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