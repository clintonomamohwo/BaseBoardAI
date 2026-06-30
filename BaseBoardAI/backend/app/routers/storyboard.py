"""
FastAPI router — /storyboard endpoints.

Validation layer:  Pydantic schemas (app.schemas.storyboard)
Persistence layer: SQLAlchemy ORM  (app.db.models)
DB dependency:     app.db.session.get_db

Endpoints
---------
POST   /storyboard/           Create a new StoryboardProject (full tree)
GET    /storyboard/            List all projects (summary rows only)
GET    /storyboard/{db_id}    Retrieve a single project with all nested data
DELETE /storyboard/{db_id}    Hard-delete a project and all its children
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db.models import (
    CharacterProfileORM,
    ScriptSceneORM,
    StoryboardFrameORM,
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
)

router = APIRouter(prefix="/storyboard", tags=["storyboard"])

DbSession = Annotated[Session, Depends(get_db)]


# ---------------------------------------------------------------------------
# Helpers — schema ➜ ORM and ORM ➜ schema
# ---------------------------------------------------------------------------


def _build_project_orm(payload: StoryboardProjectCreate) -> StoryboardProjectORM:
    """Parse a validated Pydantic payload into the full ORM object tree."""
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
                # model_dump() serialises nested FacialBlueprint → dict for JSON column
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
            )
        )
    return scene


def _orm_to_response(project: StoryboardProjectORM) -> StoryboardProjectResponse:
    """
    Parse the ORM row (with eagerly loaded relationships) back into the
    response schema.  JSON columns are already dicts — we pass them straight
    into the Pydantic constructors which re-validate them.
    """
    return StoryboardProjectResponse(
        db_id=project.db_id,
        project_title=project.project_title,
        global_aesthetic=project.global_aesthetic,
        characters=[
            CharacterProfileBase(
                id=c.char_id,
                name=c.name,
                wardrobe_defaults=c.wardrobe_defaults,
                # facial_blueprint is already a dict from the JSON column
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
            joinedload(StoryboardProjectORM.scenes).joinedload(ScriptSceneORM.frames),
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
# Route handlers
# ---------------------------------------------------------------------------


@router.post(
    "/",
    response_model=StoryboardProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new StoryboardProject",
)
def create_storyboard_project(
    payload: StoryboardProjectCreate,
    db: DbSession,
) -> StoryboardProjectResponse:
    """
    Accepts the full storyboard project tree in a single request.
    Validates with Pydantic, persists with SQLAlchemy, returns the saved record.
    """
    project = _build_project_orm(payload)
    db.add(project)
    db.commit()
    db.refresh(project)
    # reload with relationships for the response
    return _orm_to_response(_load_project_or_404(project.db_id, db))


@router.get(
    "/",
    response_model=list[StoryboardProjectResponse],
    summary="List all StoryboardProjects",
)
def list_storyboard_projects(
    db: DbSession,
) -> list[StoryboardProjectResponse]:
    projects = (
        db.query(StoryboardProjectORM)
        .options(
            joinedload(StoryboardProjectORM.characters),
            joinedload(StoryboardProjectORM.scenes).joinedload(ScriptSceneORM.frames),
        )
        .all()
    )
    return [_orm_to_response(p) for p in projects]


@router.get(
    "/{db_id}",
    response_model=StoryboardProjectResponse,
    summary="Retrieve a StoryboardProject by ID",
)
def get_storyboard_project(
    db_id: int,
    db: DbSession,
) -> StoryboardProjectResponse:
    return _orm_to_response(_load_project_or_404(db_id, db))


@router.delete(
    "/{db_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a StoryboardProject and all its children",
)
def delete_storyboard_project(
    db_id: int,
    db: DbSession,
) -> None:
    project = _load_project_or_404(db_id, db)
    db.delete(project)
    db.commit()
