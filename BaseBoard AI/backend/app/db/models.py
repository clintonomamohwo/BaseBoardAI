"""
SQLAlchemy ORM models — database parsing layer.

Design decisions:
- Nested JSON sub-structures (FacialBlueprint, StoryboardFrame, color_palette)
  are stored as JSON columns so the full nested tree is persisted without
  excessive join complexity at this stage.
- StoryboardProject  →  1-N  →  CharacterProfile
- StoryboardProject  →  1-N  →  ScriptScene
- ScriptScene        →  1-N  →  StoryboardFrame (stored inline as JSON for now)
"""

from __future__ import annotations

from sqlalchemy import (
    Column,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# StoryboardProject
# ---------------------------------------------------------------------------


class StoryboardProjectORM(Base):
    __tablename__ = "storyboard_projects"

    db_id = Column(Integer, primary_key=True, autoincrement=True)
    project_title = Column(String(255), nullable=False)
    global_aesthetic = Column(Text, nullable=False)

    # relationships
    characters: list[CharacterProfileORM] = relationship(
        "CharacterProfileORM",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    scenes: list[ScriptSceneORM] = relationship(
        "ScriptSceneORM",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="ScriptSceneORM.scene_number",
    )


# ---------------------------------------------------------------------------
# CharacterProfile
# ---------------------------------------------------------------------------


class CharacterProfileORM(Base):
    __tablename__ = "character_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    char_id = Column(String(64), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    wardrobe_defaults = Column(Text, nullable=False)

    # FacialBlueprint stored as a JSON column — preserves optional fields
    # and avoids a separate table for a tightly coupled value object.
    facial_blueprint = Column(JSON, nullable=False)

    project_id = Column(Integer, ForeignKey("storyboard_projects.db_id"), nullable=False)
    project: StoryboardProjectORM = relationship(
        "StoryboardProjectORM", back_populates="characters"
    )


# ---------------------------------------------------------------------------
# ScriptScene
# ---------------------------------------------------------------------------


class ScriptSceneORM(Base):
    __tablename__ = "script_scenes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scene_number = Column(Integer, nullable=False)
    location_heading = Column(String(255), nullable=False)
    environmental_type = Column(String(64), nullable=False)
    time_of_day = Column(String(64), nullable=False)
    emotional_tone = Column(String(128), nullable=False)
    color_palette = Column(JSON, nullable=False)  # List[str] of hex codes

    project_id = Column(Integer, ForeignKey("storyboard_projects.db_id"), nullable=False)
    project: StoryboardProjectORM = relationship(
        "StoryboardProjectORM", back_populates="scenes"
    )

    frames: list[StoryboardFrameORM] = relationship(
        "StoryboardFrameORM",
        back_populates="scene",
        cascade="all, delete-orphan",
        order_by="StoryboardFrameORM.frame_number",
    )


# ---------------------------------------------------------------------------
# StoryboardFrame
# ---------------------------------------------------------------------------


class StoryboardFrameORM(Base):
    __tablename__ = "storyboard_frames"

    id = Column(Integer, primary_key=True, autoincrement=True)
    frame_number = Column(Integer, nullable=False)
    shot_type = Column(String(128), nullable=False)
    camera_angle = Column(String(255), nullable=False)
    duration_seconds = Column(Float, nullable=False)
    action_breakdown = Column(Text, nullable=False)
    lighting_notes = Column(Text, nullable=False)
    sound_cue = Column(String(255), nullable=True)

    scene_id = Column(Integer, ForeignKey("script_scenes.id"), nullable=False)
    scene: ScriptSceneORM = relationship(
        "ScriptSceneORM", back_populates="frames"
    )
