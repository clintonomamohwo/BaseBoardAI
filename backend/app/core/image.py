"""
Image generation module — unified base64 downloader.

Both providers return an identical data:image/png;base64,... string that the
React canvas renders directly via <img src={frame.generated_image_url} />.
No cross-origin fetching. No external URL dependencies in the DB.

Provider is selected by settings.IMAGE_PROVIDER:
  "pollinations"  — zero config, no API key required
  "huggingface"   — requires settings.HF_API_TOKEN

generate_frame_image() is the sole public entry point. It is non-fatal:
any failure is logged and returns None so the pipeline continues uninterrupted.

Prompt assembly is delegated entirely to prompt_builder.py (Director Engine).
This module is responsible for image generation only.
"""

from __future__ import annotations

import base64
import logging
import time
import urllib.parse
from typing import TYPE_CHECKING, Any

import httpx

from app.core.config import settings
# _STYLE_PREFIXES re-exported so router code can import from one location.
# build_frame_prompt is the sole prompt-assembly entry point for frame images.
from app.core.prompt_builder import STYLE_PREFIXES as _STYLE_PREFIXES, build_frame_prompt

if TYPE_CHECKING:
    from app.schemas.storyboard import ScriptSceneBase, StoryboardFrameBase

logger = logging.getLogger(__name__)

_DEFAULT_STYLE_PREFIX = _STYLE_PREFIXES["bw_sketch"]

_BW_SKETCH_NEGATIVE_CONSTRAINTS = (
    ", simple outlines only, no shading, no crosshatch, no texture, no color, no photo"
)
_BW_DETAILED_NEGATIVE_CONSTRAINTS = (
    ", black and white only, no color, no photo realism, no gradients"
)


# ---------------------------------------------------------------------------
# Shared byte → data URL encoder
# ---------------------------------------------------------------------------

def _convert_bytes_to_data_url(content: bytes) -> str:
    """Encode raw image bytes to a self-contained base64 data URL."""
    return "data:image/png;base64," + base64.b64encode(content).decode("utf-8")


def _strip_data_url_header(data_url: str) -> str:
    """Strip the `data:...;base64,` header from a data URL, returning the raw base64 string."""
    return data_url.split(',', 1)[1]


def _inject_sketch_constraints(prompt: str) -> str:
    """Append bw_sketch constraints and cap at 500 chars."""
    return (prompt + _BW_SKETCH_NEGATIVE_CONSTRAINTS)[:500]


# ---------------------------------------------------------------------------
# Prompt assembly — delegate to prompt_builder (Director Engine)
# ---------------------------------------------------------------------------

def _build_image_prompt(
    frame: "StoryboardFrameBase",
    scene: "ScriptSceneBase",
    render_style: str = "bw_sketch",
    canon_context: dict[str, Any] | None = None,
) -> str:
    """
    Build a cinematic image generation prompt by delegating to prompt_builder.
    Scene type is inferred from the director engine cache on the scene object,
    or re-detected live.
    """
    from app.core.director_engine import get_scene_type
    scene_type = get_scene_type(scene)
    return build_frame_prompt(frame, scene, render_style, scene_type, canon_context)


# ---------------------------------------------------------------------------
# Provider: Pollinations.ai (text-to-image)
# ---------------------------------------------------------------------------

_RETRY_DELAYS = (0, 5, 15)  # seconds before each attempt (0 = immediate first try)

def _generate_pollinations(prompt: str) -> str | None:
    """
    Download image bytes from Pollinations.ai and return as a base64 data URL.
    Uses model=flux for better stylistic instruction-following.
    Retries up to 3 times with exponential backoff on non-200 responses.
    """
    encoded = urllib.parse.quote(prompt)
    url = (
        f"https://image.pollinations.ai/prompt/{encoded}"
        f"?width={settings.POLLINATIONS_WIDTH}"
        f"&height={settings.POLLINATIONS_HEIGHT}"
        f"&model=flux"
        f"&nologo=true"
    )
    for attempt, delay in enumerate(_RETRY_DELAYS, start=1):
        if delay:
            time.sleep(delay)
        try:
            response = httpx.get(url, timeout=60, follow_redirects=True)
            if response.status_code == 200:
                return _convert_bytes_to_data_url(response.content)
            logger.warning(
                "Pollinations attempt %d/%d returned %s for prompt: %s",
                attempt, len(_RETRY_DELAYS), response.status_code, prompt[:60],
            )
        except httpx.TimeoutException:
            logger.warning("Pollinations attempt %d/%d timed out for prompt: %s", attempt, len(_RETRY_DELAYS), prompt[:60])
    return None


# ---------------------------------------------------------------------------
# Provider: Pollinations.ai (img2img)
# ---------------------------------------------------------------------------

def _generate_pollinations_img2img(prompt: str, reference_base64: str) -> str | None:
    """
    Img2img via Pollinations: include the reference image as a query parameter.
    Falls back to text-only (with retries) on non-200.
    """
    encoded_prompt = urllib.parse.quote(prompt)
    encoded_ref = urllib.parse.quote(reference_base64)
    url = (
        f"https://image.pollinations.ai/prompt/{encoded_prompt}"
        f"?image={encoded_ref}"
        f"&width={settings.POLLINATIONS_WIDTH}"
        f"&height={settings.POLLINATIONS_HEIGHT}"
        f"&nologo=true"
    )
    try:
        response = httpx.get(url, timeout=60, follow_redirects=True)
        if response.status_code == 200:
            return _convert_bytes_to_data_url(response.content)
        logger.warning("Pollinations img2img returned %s, falling back to text-only", response.status_code)
    except httpx.TimeoutException:
        logger.warning("Pollinations img2img timed out, falling back to text-only")
    return _generate_pollinations(prompt)


# ---------------------------------------------------------------------------
# Provider: Hugging Face Inference API (text-to-image)
# ---------------------------------------------------------------------------

def _generate_huggingface(prompt: str) -> str | None:
    """
    POST to HF Inference API and return image bytes as a base64 data URL.
    Returns None on 503 (cold start) or any other non-200 response.
    """
    url = f"https://api-inference.huggingface.co/models/{settings.HF_IMAGE_MODEL}"
    headers = {"Authorization": f"Bearer {settings.HF_API_TOKEN}"}
    response = httpx.post(url, headers=headers, json={"inputs": prompt}, timeout=60)
    if response.status_code == 200:
        return _convert_bytes_to_data_url(response.content)
    logger.warning(
        "HuggingFace Inference API returned %s (model may be cold-starting): %s",
        response.status_code,
        prompt[:60],
    )
    return None


# ---------------------------------------------------------------------------
# Provider: Hugging Face Inference API (img2img)
# ---------------------------------------------------------------------------

def _generate_huggingface_img2img(prompt: str, reference_base64: str, strength: float = 0.55) -> str | None:
    """
    Img2img via HF Inference API. `strength` controls how much the reference steers output.
    Falls back to text-only on non-200.
    """
    url = f"https://api-inference.huggingface.co/models/{settings.HF_IMG2IMG_MODEL}"
    headers = {"Authorization": f"Bearer {settings.HF_API_TOKEN}"}
    payload = {"inputs": prompt, "image": reference_base64, "parameters": {"strength": strength}}
    response = httpx.post(url, headers=headers, json=payload, timeout=90)
    if response.status_code == 200:
        return _convert_bytes_to_data_url(response.content)
    logger.warning(
        "HuggingFace img2img returned %s, falling back to text-only: %s",
        response.status_code,
        prompt[:60],
    )
    return _generate_huggingface(prompt)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def generate_frame_image(
    frame: "StoryboardFrameBase",
    scene: "ScriptSceneBase",
    reference_style_image: str | None = None,
    render_style: str = 'bw_sketch',
    canon_context: dict[str, Any] | None = None,
) -> str | None:
    """
    Generate a thumbnail image for a storyboard frame.

    Three dispatch branches (resolved in order):
      1. bw_sketch + reference → sketch-intersection path (sketch constraints injected, strength=0.78)
      2. reference present, other style → standard img2img (strength=0.55)
      3. No reference → existing text-to-image path

    Returns a base64 data URL string on success, or None on any failure.
    Never raises — image generation is non-fatal to the pipeline.
    """
    try:
        prompt = _build_image_prompt(frame, scene, render_style, canon_context)
        ref_b64 = _strip_data_url_header(reference_style_image) if reference_style_image else None
        provider = settings.IMAGE_PROVIDER.lower()

        # ── Gemini Imagen branch (falls back to Pollinations on failure) ──────
        if provider == "gemini":
            try:
                from app.core.ai_factory import AIFactory
                result = AIFactory.get_image_provider().generate(
                    prompt,
                    reference_b64=ref_b64,
                    width=settings.POLLINATIONS_WIDTH,
                    height=settings.POLLINATIONS_HEIGHT,
                )
                if result:
                    return result
                raise RuntimeError("Gemini Imagen returned None")
            except Exception as exc:
                logger.warning(
                    "Gemini Imagen failed for frame %s (%s) — falling back to Pollinations.",
                    frame.frame_number, exc,
                )
                provider = "pollinations"  # fall through to Pollinations branches below

        # ── Branch 1: bw_sketch + reference → sketch-intersection path ───────
        if ref_b64 and render_style == 'bw_sketch':
            sketch_prompt = _inject_sketch_constraints(prompt)
            if provider == "huggingface":
                return _generate_huggingface_img2img(sketch_prompt, ref_b64, strength=0.78)
            return _generate_pollinations_img2img(sketch_prompt, ref_b64)

        # ── Branch 2: reference present, other render style → img2img ────────
        if ref_b64:
            if provider == "huggingface":
                return _generate_huggingface_img2img(prompt, ref_b64, strength=0.55)
            return _generate_pollinations_img2img(prompt, ref_b64)

        # ── Branch 3: no reference → text-to-image ────────────────────────────
        if provider == "huggingface":
            return _generate_huggingface(prompt)
        return _generate_pollinations(prompt)
    except Exception as e:
        logger.error("Image generation failed for frame %s: %s", frame.frame_number, e)
        return None


# ---------------------------------------------------------------------------
# Sheet image generation (one call → full grid)
# ---------------------------------------------------------------------------

def generate_sheet_image(
    sheet_prompt: str,
    canvas_width: int,
    canvas_height: int,
) -> str | None:
    """
    Generate a single full-grid sheet image using the active image provider.

    The prompt is the full sheet generation prompt produced by
    SheetLayout.prompt_prefix().  The canvas dimensions come from the layout
    manifest so the image matches the grid geometry exactly.

    Returns a base64 data URL on success, or None on any failure.
    Never raises — sheet generation is non-fatal.
    """
    try:
        provider = settings.IMAGE_PROVIDER.lower()

        if provider == "gemini":
            try:
                from app.core.ai_factory import AIFactory
                result = AIFactory.get_image_provider().generate(
                    sheet_prompt,
                    width=canvas_width,
                    height=canvas_height,
                )
                if result:
                    return result
                raise RuntimeError("Gemini Imagen returned None")
            except Exception as exc:
                logger.warning(
                    "Gemini Imagen sheet generation failed (%s) — falling back to Pollinations.", exc
                )
                provider = "pollinations"

        # Pollinations: encode prompt and request exact canvas dimensions
        encoded = urllib.parse.quote(sheet_prompt)
        url = (
            f"https://image.pollinations.ai/prompt/{encoded}"
            f"?width={canvas_width}"
            f"&height={canvas_height}"
            f"&model=flux"
            f"&nologo=true"
        )
        for attempt, delay in enumerate(_RETRY_DELAYS, start=1):
            if delay:
                time.sleep(delay)
            try:
                response = httpx.get(url, timeout=90, follow_redirects=True)
                if response.status_code == 200:
                    return _convert_bytes_to_data_url(response.content)
                logger.warning(
                    "Pollinations sheet attempt %d/%d returned %s",
                    attempt, len(_RETRY_DELAYS), response.status_code,
                )
            except httpx.TimeoutException:
                logger.warning("Pollinations sheet attempt %d/%d timed out", attempt, len(_RETRY_DELAYS))
        return None
    except Exception as exc:
        logger.error("Sheet image generation failed: %s", exc)
        return None
