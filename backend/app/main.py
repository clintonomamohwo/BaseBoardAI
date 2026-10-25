"""
Baseboard AI — FastAPI application entry point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.generation_security import require_generation_access
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

_GENERATION_PATH_MARKERS = (
    "/story-development/",
    "/generate-image",
    "/character-package/",
    "/forge-pipeline",
    "/forge-standalone-storyboard",
    "/parse-single-character",
    "/parse-single-environment",
    "/frame/reforge-composition",
    "/frame/render",
    "/frame/upgrade-style",
    "/scene/upgrade-style",
    "/scene/background-variation",
    "/frame/regenerate-visual-action",
    "/world-bible/import",
    "/character-package/age-variant",
    "/character-package/consistency-score",
    "/character/qa-score",
    "/scene/qa-continuity",
)


@app.middleware("http")
async def guard_generation_endpoints(request: Request, call_next):
    """Apply auth and per-principal rate/day limits before any AI provider call."""
    path = request.url.path
    if request.method == "POST" and any(marker in path for marker in _GENERATION_PATH_MARKERS):
        try:
            require_generation_access(request)
        except HTTPException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
                headers=exc.headers,
            )
    return await call_next(request)

# ---------------------------------------------------------------------------
# CORS — origins loaded from CORS_ORIGINS in .env (defaults to localhost dev
# servers). Add your deployed frontend URL to .env before hosting.
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
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
        "primary_model": settings.WATSONX_PRIMARY_TEXT_MODEL,
        "fallback_model": settings.WATSONX_FALLBACK_TEXT_MODEL,
        "last_resort_model": settings.WATSONX_LAST_RESORT_MODEL,
        "image_provider": settings.IMAGE_PROVIDER,
    }
