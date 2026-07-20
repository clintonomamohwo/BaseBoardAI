"""
Centralised environment configuration.

All environment variables are loaded once at import time from the .env file
at the backend root. Every other module imports `settings` from here instead
of calling os.getenv() directly — credential errors fail loudly on startup.

Provider routing
----------------
Three independent provider axes — each can be set independently in .env:

  TEXT_PROVIDER   = watsonx | gemini
  IMAGE_PROVIDER  = pollinations | huggingface | gemini
  VISION_PROVIDER = gemini

  Current intended split:
    TEXT_PROVIDER=watsonx       # Script parsing, character extraction, world bible
    IMAGE_PROVIDER=pollinations # Storyboard frames (high volume, no rate limits)
    VISION_PROVIDER=gemini      # Visual QA, character consistency, DNA extraction

  To switch any axis, change only the .env value — no code changes required.
"""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Always resolve .env relative to the backend/ directory so the server can be
# started from any working directory (e.g. via the repo-root `baseboard` script).
_BACKEND_ROOT = Path(__file__).resolve().parents[2]  # backend/app/core → backend/


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # -----------------------------------------------------------------------
    # Provider routing — change these to switch AI backends
    # -----------------------------------------------------------------------
    # TEXT_PROVIDER:   watsonx | gemini
    TEXT_PROVIDER: str = "watsonx"
    # IMAGE_PROVIDER:  pollinations | huggingface | gemini
    IMAGE_PROVIDER: str = "pollinations"
    # VISION_PROVIDER: gemini  (only gemini supported today)
    VISION_PROVIDER: str = "gemini"

    # CORS allowed origins — space-separated list loaded from .env.
    # Defaults to Vite dev server. Add your deployed frontend URL here or in .env.
    # Example: CORS_ORIGINS=http://localhost:5173 https://my-app.example.com
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"]

    # -----------------------------------------------------------------------
    # IBM WatsonX (TEXT_PROVIDER=watsonx)
    # -----------------------------------------------------------------------
    WATSONX_API_KEY: str = ""
    WATSONX_PROJECT_ID: str = ""
    WATSONX_URL: str = "https://us-south.ml.cloud.ibm.com"

    # Model fallback chain — tried in order on rate-limit / model errors.
    # Set only PRIMARY to keep a single model; leave FALLBACK/LAST_RESORT
    # empty to skip those slots entirely.
    WATSONX_PRIMARY_TEXT_MODEL: str = "meta-llama/llama-3-3-70b-instruct"
    WATSONX_FALLBACK_TEXT_MODEL: str = "mistralai/mistral-small-3-1-24b-instruct-2503"
    WATSONX_LAST_RESORT_MODEL: str = "meta-llama/llama-3-1-8b"

    # -----------------------------------------------------------------------
    # Google Gemini (TEXT_PROVIDER=gemini, IMAGE_PROVIDER=gemini,
    #                VISION_PROVIDER=gemini)
    # -----------------------------------------------------------------------
    GEMINI_API_KEY: str = ""
    # Text / Director Engine model
    GEMINI_TEXT_MODEL: str = "gemini-2.0-flash"
    # Vision / QA model — maps to GEMINI_FAST_MODEL in .env
    GEMINI_VISION_MODEL: str = "gemini-2.0-flash"
    GEMINI_FAST_MODEL: str = "gemini-2.0-flash"   # alias accepted from .env
    # Image generation model (Imagen)
    GEMINI_IMAGE_MODEL: str = "imagen-3.0-generate-001"

    # -----------------------------------------------------------------------
    # Hugging Face (IMAGE_PROVIDER=huggingface)
    # -----------------------------------------------------------------------
    HF_API_TOKEN: str = ""
    HF_IMAGE_MODEL: str = "stabilityai/stable-diffusion-xl-base-1.0"
    HF_IMG2IMG_MODEL: str = "stabilityai/stable-diffusion-xl-refiner-1.0"

    # -----------------------------------------------------------------------
    # Pollinations (IMAGE_PROVIDER=pollinations)
    # -----------------------------------------------------------------------
    POLLINATIONS_WIDTH: int = 768
    POLLINATIONS_HEIGHT: int = 512


# Module-level singleton — imported by llm.py, image.py, ai_factory.py, etc.
settings = Settings()
