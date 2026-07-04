"""
Centralised environment configuration.

All environment variables are loaded once at import time from the .env file
at the backend root. Every other module imports `settings` from here instead
of calling os.getenv() directly — credential errors fail loudly on startup.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # -----------------------------------------------------------------------
    # IBM WatsonX Granite (LLM)
    # -----------------------------------------------------------------------
    WATSONX_API_KEY: str
    WATSONX_PROJECT_ID: str
    WATSONX_URL: str
    WATSONX_MODEL_ID: str = "ibm/granite-13b-chat-v2"

    # -----------------------------------------------------------------------
    # Image Generation
    # -----------------------------------------------------------------------
    # Accepted values: "pollinations" | "huggingface"
    IMAGE_PROVIDER: str = "pollinations"

    # Hugging Face — only required when IMAGE_PROVIDER=huggingface
    HF_API_TOKEN: str = ""
    HF_IMAGE_MODEL: str = "stabilityai/stable-diffusion-xl-base-1.0"

    # Pollinations dimensions (also used as target canvas size for HF)
    POLLINATIONS_WIDTH: int = 768
    POLLINATIONS_HEIGHT: int = 512


# Module-level singleton — imported by llm.py, image.py, etc.
settings = Settings()
