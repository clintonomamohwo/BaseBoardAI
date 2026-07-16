"""
Database session factory.

Uses SQLite (file-based) by default so the backend runs with zero
infrastructure. Swap DATABASE_URL in your .env for Postgres in production.

  DATABASE_URL=postgresql+psycopg2://user:pass@host/db
"""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.db.models import Base

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./baseboard.db")

# SQLite requires this connect_args; harmless to omit for other dialects
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create all tables if they do not exist yet (dev / SQLite convenience)."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency that yields a scoped DB session and always closes it."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
