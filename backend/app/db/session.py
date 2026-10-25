"""
Database session factory.

Uses SQLite (file-based) by default so the backend runs with zero
infrastructure. Swap DATABASE_URL in your .env for Postgres in production.

  DATABASE_URL=postgresql+psycopg2://user:pass@host/db
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker, Session

from app.db.models import Base

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./baseboard.db")

# SQLite requires this connect_args; harmless to omit for other dialects
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create tables and safely add new project, scene-order, and frame fields to existing databases."""
    Base.metadata.create_all(bind=engine)

    # create_all does not alter existing tables. Add columns in place so existing
    # storyboard rows, images, and project relationships remain untouched.
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    scene_columns = (
        {column["name"] for column in inspector.get_columns("script_scenes")}
        if "script_scenes" in tables else set()
    )
    frame_columns = (
        {column["name"] for column in inspector.get_columns("storyboard_frames")}
        if "storyboard_frames" in tables else set()
    )
    character_columns = (
        {column["name"] for column in inspector.get_columns("character_profiles")}
        if "character_profiles" in tables else set()
    )
    project_columns = (
        {column["name"] for column in inspector.get_columns("storyboard_projects")}
        if "storyboard_projects" in tables else set()
    )
    with engine.begin() as connection:
        if "storyboard_projects" in tables and "story_development" not in project_columns:
            connection.exec_driver_sql(
                "ALTER TABLE storyboard_projects ADD COLUMN story_development JSON"
            )
        if "script_scenes" in tables and "sort_order" not in scene_columns:
            connection.exec_driver_sql(
                "ALTER TABLE script_scenes ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"
            )
        if "storyboard_frames" in tables and "approval_status" not in frame_columns:
            connection.exec_driver_sql(
                "ALTER TABLE storyboard_frames "
                "ADD COLUMN approval_status VARCHAR NOT NULL DEFAULT 'pending'"
            )
        if "storyboard_frames" in tables and "is_manual_override" not in frame_columns:
            connection.exec_driver_sql(
                "ALTER TABLE storyboard_frames "
                "ADD COLUMN is_manual_override BOOLEAN NOT NULL DEFAULT FALSE"
            )
        if "character_profiles" in tables and "full_data" not in character_columns:
            connection.exec_driver_sql(
                "ALTER TABLE character_profiles ADD COLUMN full_data JSON"
            )
        for column_name, column_type in (
            ("action_pose", "TEXT"),
            ("props_present", "JSON"),
            ("screen_direction", "VARCHAR"),
            ("continuity_reference_ids", "JSON"),
            ("continuity_notes", "TEXT"),
            ("continuity_dependency_ids", "JSON"),
        ):
            if "storyboard_frames" in tables and column_name not in frame_columns:
                connection.exec_driver_sql(
                    f"ALTER TABLE storyboard_frames ADD COLUMN {column_name} {column_type}"
                )
        if "storyboard_frames" in tables and "continuity_review_required" not in frame_columns:
            connection.exec_driver_sql(
                "ALTER TABLE storyboard_frames "
                "ADD COLUMN continuity_review_required BOOLEAN NOT NULL DEFAULT FALSE"
            )


def get_db():
    """FastAPI dependency that yields a scoped DB session and always closes it."""
    db: Session = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
