"""
Baseboard AI — FastAPI application entry point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db.session import init_db
from app.routers.storyboard import router as storyboard_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on first run (SQLite dev convenience)."""
    init_db()
    yield


app = FastAPI(
    title="Baseboard AI",
    description="Storyboard generation and management API",
    version="0.1.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(storyboard_router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok"}
