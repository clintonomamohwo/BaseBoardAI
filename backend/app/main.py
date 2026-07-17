"""
Baseboard AI — FastAPI application entry point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import init_db
from app.routers.storyboard import router as storyboard_router
from app.routers.standalone import router as standalone_router


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
# CORS — allow the Vite dev server (and any localhost port) to call the API
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(storyboard_router)
app.include_router(standalone_router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["meta"])
def health() -> dict:
    return {
        "status": "ok",
        "model": settings.WATSONX_MODEL_ID,
        "image_provider": settings.IMAGE_PROVIDER,
    }
