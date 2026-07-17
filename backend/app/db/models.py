"""
SQLAlchemy ORM models — database parsing layer.

Design decisions:
- Nested JSON sub-structures (FacialBlueprint, StoryboardFrame, color_palette)
  are stored as JSON columns so the full nested tree is persisted without
  excessive join complexity at this stage.
- StoryboardProject  →  1-N  →  CharacterProfile
- StoryboardProject  →  1-N  →  ScriptScene
- ScriptScene        →  1-N  →  StoryboardFrame (stored inline as JSON for now)

Standalone tables (project-independent):
- StandaloneCharacter  — single character saved outside any project
- StandaloneWorld      — single location/environment saved outside any project
- StandaloneStoryboard — scenes + frames saved outside any project
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import ForeignKey, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, deferred, mapped_column, relationship


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

    # Project Canon — the single source of truth for all AI generation in this project.
    # Stored as a JSON blob alongside the project; nullable for backwards compatibility.
    canon: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

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

    # Story role & relationships — set by CHARACTER_PROMPT, nullable for backwards compat
    story_role: Mapped[str | None] = mapped_column(Text, nullable=True)
    relationships: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)

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

    # ── Three-level action system (nullable for backwards compatibility) ──────
    narrative_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    visual_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    animation_beats: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)

    # ── Legacy (kept for backwards compat) ───────────────────────────────────
    action_breakdown: Mapped[str] = mapped_column(Text, nullable=False)

    # ── Shot & camera ─────────────────────────────────────────────────────────
    shot_type: Mapped[str] = mapped_column(Text, nullable=False)
    camera_angle: Mapped[str] = mapped_column(Text, nullable=False)
    camera_movement: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Timing ────────────────────────────────────────────────────────────────
    duration_seconds: Mapped[float] = mapped_column(nullable=False)

    # ── Lighting & mood ───────────────────────────────────────────────────────
    lighting_notes: Mapped[str] = mapped_column(Text, nullable=False)
    mood: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Production metadata ───────────────────────────────────────────────────
    purpose: Mapped[str | None] = mapped_column(Text, nullable=True)
    characters_present: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    frame_emotion: Mapped[str | None] = mapped_column(Text, nullable=True)
    dialogue: Mapped[str | None] = mapped_column(Text, nullable=True)
    director_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Audio ─────────────────────────────────────────────────────────────────
    sound_cue: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Deferred: excluded from SELECT on list queries; loaded only on individual project fetch
    generated_image_url: Mapped[str | None] = deferred(mapped_column(Text, nullable=True))

    # ── Director Engine metadata (nullable for backwards compatibility) ───────
    lens: Mapped[str | None] = mapped_column(Text, nullable=True)
    focal_length: Mapped[str | None] = mapped_column(Text, nullable=True)
    depth_style: Mapped[str | None] = mapped_column(Text, nullable=True)
    lens_prompt_suffix: Mapped[str | None] = mapped_column(Text, nullable=True)
    locked_fields: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)

    # ── Cinematic Brain decisions (Fix 3) ─────────────────────────────────────
    # Persisting these means the Director Notes panel in the Studio Inspector
    # continues to show AI badges and rationale after a page reload.
    auto_selected: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    director_rationale: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    scene_id: Mapped[int] = mapped_column(
        ForeignKey("script_scenes.id"), nullable=False
    )
    scene: Mapped[ScriptSceneORM] = relationship(
        "ScriptSceneORM", back_populates="frames"
    )


# ---------------------------------------------------------------------------
# StandaloneCharacter
# ---------------------------------------------------------------------------


class StandaloneCharacterORM(Base):
    """A character saved independently — not tied to any project."""
    __tablename__ = "standalone_characters"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    char_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    wardrobe_defaults: Mapped[str] = mapped_column(Text, nullable=False)
    facial_blueprint: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    story_role: Mapped[str | None] = mapped_column(Text, nullable=True)
    relationships: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    # Full CharacterProfileBase blob — preserves all DNA layers, variants, etc.
    full_data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    label: Mapped[str | None] = mapped_column(Text, nullable=True)  # user-given nickname/tag


# ---------------------------------------------------------------------------
# StandaloneWorld
# ---------------------------------------------------------------------------


class StandaloneWorldORM(Base):
    """A world/environment saved independently — not tied to any project."""
    __tablename__ = "standalone_worlds"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    location_name: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    spatial_textures: Mapped[str] = mapped_column(Text, nullable=False)
    lighting_keys: Mapped[str] = mapped_column(Text, nullable=False)
    # Full EnvironmentProfileBase blob
    full_data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    label: Mapped[str | None] = mapped_column(Text, nullable=True)


# ---------------------------------------------------------------------------
# StandaloneStoryboard
# ---------------------------------------------------------------------------


class StandaloneStoryboardORM(Base):
    """Scenes + frames saved independently — not tied to any project."""
    __tablename__ = "standalone_storyboards"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    global_aesthetic: Mapped[str] = mapped_column(Text, nullable=False)
    render_style: Mapped[str] = mapped_column(String, nullable=False, default="bw_sketch")
    # Full list[ScriptSceneBase] blob — scenes + frames stored as JSON
    scenes: Mapped[list[Any]] = mapped_column(JSON, nullable=False)
    label: Mapped[str | None] = mapped_column(Text, nullable=True)
