"""
FastAPI router — /standalone endpoints.  # noqa: E501

Provides full CRUD for characters, worlds, and storyboards saved
independently of any project. These live in their own tables:
  standalone_characters
  standalone_worlds
  standalone_storyboards

Endpoints
---------
Characters
  POST   /standalone/characters           — save a character
  GET    /standalone/characters           — list all saved characters
  GET    /standalone/characters/{id}      — load one character
  DELETE /standalone/characters/{id}      — delete one character

Worlds
  POST   /standalone/worlds               — save a world/location
  GET    /standalone/worlds               — list all saved worlds
  GET    /standalone/worlds/{id}          — load one world
  DELETE /standalone/worlds/{id}          — delete one world

Storyboards
  POST   /standalone/storyboards          — save scenes + frames
  GET    /standalone/storyboards          — list all saved storyboards
  GET    /standalone/storyboards/{id}     — load one storyboard
  DELETE /standalone/storyboards/{id}     — delete one storyboard
"""

from __future__ import annotations

from typing import Annotated, Generator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.models import (
    StandaloneCharacterORM,
    StandaloneWorldORM,
    StandaloneStoryboardORM,
)
from app.db.session import get_db
from app.schemas.storyboard import (
    CharacterProfileBase,
    EnvironmentProfileBase,
    FacialBlueprint,
    ScriptSceneBase,
    StandaloneCharacterSave,
    StandaloneCharacterResponse,
    StandaloneWorldSave,
    StandaloneWorldResponse,
    StandaloneStoryboardSave,
    StandaloneStoryboardResponse,
)

router = APIRouter(prefix="/standalone", tags=["standalone"])

DbSession = Annotated[Session, Depends(get_db)]


# ---------------------------------------------------------------------------
# Conversion helpers
# ---------------------------------------------------------------------------

def _orm_to_char_response(row: StandaloneCharacterORM) -> StandaloneCharacterResponse:
    char = CharacterProfileBase.model_validate(row.full_data)
    return StandaloneCharacterResponse(
        id=row.id,
        char_id=row.char_id,
        name=row.name,
        story_role=row.story_role,
        label=row.label,
        character=char,
    )


def _orm_to_world_response(row: StandaloneWorldORM) -> StandaloneWorldResponse:
    world = EnvironmentProfileBase.model_validate(row.full_data)
    return StandaloneWorldResponse(
        id=row.id,
        location_name=row.location_name,
        label=row.label,
        world=world,
    )


def _orm_to_storyboard_response(row: StandaloneStoryboardORM) -> StandaloneStoryboardResponse:
    scenes = [ScriptSceneBase.model_validate(s) for s in row.scenes]
    frame_count = sum(len(s.frames) for s in scenes)
    return StandaloneStoryboardResponse(
        id=row.id,
        title=row.title,
        global_aesthetic=row.global_aesthetic,
        render_style=row.render_style,
        label=row.label,
        scenes=scenes,
        scene_count=len(scenes),
        frame_count=frame_count,
    )


# ---------------------------------------------------------------------------
# Characters
# ---------------------------------------------------------------------------

@router.post(
    "/characters",
    response_model=StandaloneCharacterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a character independently (no project required)",
)
def save_standalone_character(
    payload: StandaloneCharacterSave,
    db: DbSession,
) -> StandaloneCharacterResponse:
    """
    Persists a CharacterProfileBase to the standalone_characters table.
    Returns the saved row including its auto-generated id.
    """
    char = payload.character
    row = StandaloneCharacterORM(
        char_id=char.id,
        name=char.name,
        wardrobe_defaults=char.wardrobe_defaults,
        facial_blueprint=char.facial_blueprint.model_dump(),
        story_role=char.story_role,
        relationships=[r.model_dump() for r in char.relationships] if char.relationships else [],
        full_data=char.model_dump(),
        label=payload.label,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _orm_to_char_response(row)


@router.get(
    "/characters",
    response_model=list[StandaloneCharacterResponse],
    summary="List all standalone saved characters",
)
def list_standalone_characters(db: DbSession) -> list[StandaloneCharacterResponse]:
    rows = db.query(StandaloneCharacterORM).order_by(StandaloneCharacterORM.id.desc()).all()
    return [_orm_to_char_response(r) for r in rows]


@router.get(
    "/characters/{char_id}",
    response_model=StandaloneCharacterResponse,
    summary="Load a single standalone character by DB id",
)
def get_standalone_character(char_id: int, db: DbSession) -> StandaloneCharacterResponse:
    row = db.get(StandaloneCharacterORM, char_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Standalone character {char_id} not found")
    return _orm_to_char_response(row)


@router.delete(
    "/characters/{char_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Delete a standalone character",
)
def delete_standalone_character(char_id: int, db: DbSession) -> Response:
    row = db.get(StandaloneCharacterORM, char_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Standalone character {char_id} not found")
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Worlds
# ---------------------------------------------------------------------------

@router.post(
    "/worlds",
    response_model=StandaloneWorldResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a world/location independently (no project required)",
)
def save_standalone_world(
    payload: StandaloneWorldSave,
    db: DbSession,
) -> StandaloneWorldResponse:
    world = payload.world
    row = StandaloneWorldORM(
        location_name=world.location_name,
        spatial_textures=world.spatial_textures,
        lighting_keys=world.lighting_keys,
        full_data=world.model_dump(),
        label=payload.label,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _orm_to_world_response(row)


@router.get(
    "/worlds",
    response_model=list[StandaloneWorldResponse],
    summary="List all standalone saved worlds",
)
def list_standalone_worlds(db: DbSession) -> list[StandaloneWorldResponse]:
    rows = db.query(StandaloneWorldORM).order_by(StandaloneWorldORM.id.desc()).all()
    return [_orm_to_world_response(r) for r in rows]


@router.get(
    "/worlds/{world_id}",
    response_model=StandaloneWorldResponse,
    summary="Load a single standalone world by DB id",
)
def get_standalone_world(world_id: int, db: DbSession) -> StandaloneWorldResponse:
    row = db.get(StandaloneWorldORM, world_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Standalone world {world_id} not found")
    return _orm_to_world_response(row)


@router.delete(
    "/worlds/{world_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Delete a standalone world",
)
def delete_standalone_world(world_id: int, db: DbSession) -> Response:
    row = db.get(StandaloneWorldORM, world_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Standalone world {world_id} not found")
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Storyboards
# ---------------------------------------------------------------------------

@router.post(
    "/storyboards",
    response_model=StandaloneStoryboardResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save scenes + frames independently (no project required)",
)
def save_standalone_storyboard(
    payload: StandaloneStoryboardSave,
    db: DbSession,
) -> StandaloneStoryboardResponse:
    row = StandaloneStoryboardORM(
        title=payload.title,
        global_aesthetic=payload.global_aesthetic,
        render_style=payload.render_style,
        scenes=[s.model_dump() for s in payload.scenes],
        label=payload.label,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _orm_to_storyboard_response(row)


@router.get(
    "/storyboards",
    response_model=list[StandaloneStoryboardResponse],
    summary="List all standalone saved storyboards",
)
def list_standalone_storyboards(db: DbSession) -> list[StandaloneStoryboardResponse]:
    rows = db.query(StandaloneStoryboardORM).order_by(StandaloneStoryboardORM.id.desc()).all()
    return [_orm_to_storyboard_response(r) for r in rows]


@router.get(
    "/storyboards/{board_id}",
    response_model=StandaloneStoryboardResponse,
    summary="Load a single standalone storyboard by DB id",
)
def get_standalone_storyboard(board_id: int, db: DbSession) -> StandaloneStoryboardResponse:
    row = db.get(StandaloneStoryboardORM, board_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Standalone storyboard {board_id} not found")
    return _orm_to_storyboard_response(row)


@router.delete(
    "/storyboards/{board_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Delete a standalone storyboard",
)
def delete_standalone_storyboard(board_id: int, db: DbSession) -> Response:
    row = db.get(StandaloneStoryboardORM, board_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Standalone storyboard {board_id} not found")
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
