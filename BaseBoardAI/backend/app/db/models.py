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

from typing import Any, Optional

from sqlalchemy import ForeignKey, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, deferred, undefer


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# StoryboardProject
# ---------------------------------------------------------------------------


class StoryboardProjectORM(Base):
    __tablename__ = "storyboard_projects"

    db_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_title: Mapped[str] = mapped_column(Text, nullable=False)
    global_aesthetic: Mapped[str] = mapped_column(Text, nullable=False)
    render_style: Mapped[str] = mapped_column(String, nullable=False, default='bw_sketch')

    # relationships
    characters: Mapped[list[CharacterProfileORM]] = relationship(
        "CharacterProfileORM",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    scenes: Mapped[list[ScriptSceneORM]] = relationship(
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
    __table_args__ = (
        UniqueConstraint("char_id", "project_id", name="uq_char_id_per_project"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    char_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    wardrobe_defaults: Mapped[str] = mapped_column(Text, nullable=False)

    # FacialBlueprint stored as a JSON column — preserves optional fields
    # and avoids a separate table for a tightly coupled value object.
    facial_blueprint: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)

    project_id: Mapped[int] = mapped_column(
        ForeignKey("storyboard_projects.db_id"), nullable=False
    )
    project: Mapped[StoryboardProjectORM] = relationship(
        "StoryboardProjectORM", back_populates="characters"
    )


# ---------------------------------------------------------------------------
# ScriptScene
# ---------------------------------------------------------------------------


class ScriptSceneORM(Base):
    __tablename__ = "script_scenes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    scene_number: Mapped[int] = mapped_column(nullable=False)
    location_heading: Mapped[str] = mapped_column(Text, nullable=False)
    environmental_type: Mapped[str] = mapped_column(Text, nullable=False)
    time_of_day: Mapped[str] = mapped_column(Text, nullable=False)
    emotional_tone: Mapped[str] = mapped_column(Text, nullable=False)
    color_palette: Mapped[list[str]] = mapped_column(JSON, nullable=False)  # List[str] of hex codes

    project_id: Mapped[int] = mapped_column(
        ForeignKey("storyboard_projects.db_id"), nullable=False
    )
    project: Mapped[StoryboardProjectORM] = relationship(
        "StoryboardProjectORM", back_populates="scenes"
    )

    frames: Mapped[list[StoryboardFrameORM]] = relationship(
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

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    frame_number: Mapped[int] = mapped_column(nullable=False)
    shot_type: Mapped[str] = mapped_column(Text, nullable=False)
    camera_angle: Mapped[str] = mapped_column(Text, nullable=False)
    duration_seconds: Mapped[float] = mapped_column(nullable=False)
    action_breakdown: Mapped[str] = mapped_column(Text, nullable=False)
    lighting_notes: Mapped[str] = mapped_column(Text, nullable=False)
    sound_cue: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Deferred: excluded from SELECT on list queries; loaded only on individual project fetch
    generated_image_url: Mapped[Optional[str]] = deferred(mapped_column(Text, nullable=True))

    scene_id: Mapped[int] = mapped_column(
        ForeignKey("script_scenes.id"), nullable=False
    )
    scene: Mapped[ScriptSceneORM] = relationship(
        "ScriptSceneORM", back_populates="frames"
    )
