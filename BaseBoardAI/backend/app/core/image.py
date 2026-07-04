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
"""

from __future__ import annotations

import base64
import logging
import urllib.parse
from typing import TYPE_CHECKING

import httpx

from app.core.config import settings

if TYPE_CHECKING:
    from app.schemas.storyboard import ScriptSceneBase, StoryboardFrameBase

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Shared byte → data URL encoder
# ---------------------------------------------------------------------------

def _convert_bytes_to_data_url(content: bytes) -> str:
    """Encode raw image bytes to a self-contained base64 data URL."""
    return "data:image/png;base64," + base64.b64encode(content).decode("utf-8")


def _strip_data_url_header(data_url: str) -> str:
    """Strip the `data:...;base64,` header from a data URL, returning the raw base64 string."""
    return data_url.split(',', 1)[1]


# ---------------------------------------------------------------------------
# BW sketch negative constraints (load-bearing — do not inline)
# ---------------------------------------------------------------------------

_BW_SKETCH_NEGATIVE_CONSTRAINTS = (
    " Negative: color, color fills, gradients, tones, shading, texture, paint, "
    "watercolor, photograph, render. "
    "Positive: fine-tip fineliner ink pen, cross-hatching, "
    "pure black linework, pure white background only."
)


def _inject_sketch_constraints(prompt: str) -> str:
    """Append bw_sketch negative/positive constraints and cap at 400 chars."""
    return (prompt + _BW_SKETCH_NEGATIVE_CONSTRAINTS)[:400]


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _build_image_prompt(
    frame: "StoryboardFrameBase",
    scene: "ScriptSceneBase",
) -> str:
    """
    Assemble a cinematic image generation prompt from frame and scene fields.
    Capped at 200 characters to stay within model prompt limits.
    """
    palette_str = ", ".join(scene.color_palette) if scene.color_palette else ""
    prompt = (
        f"{frame.shot_type}, {frame.camera_angle}. "
        f"{frame.action_breakdown}. "
        f"{frame.lighting_notes}. "
        f"Color palette: {palette_str}."
    )
    return prompt[:200]


# ---------------------------------------------------------------------------
# Provider: Pollinations.ai (text-to-image)
# ---------------------------------------------------------------------------

def _generate_pollinations(prompt: str) -> str | None:
    """
    Download image bytes from Pollinations.ai and return as a base64 data URL.
    Makes a real HTTP GET — does not return the URL string directly.
    """
    encoded = urllib.parse.quote(prompt)
    url = (
        f"https://image.pollinations.ai/prompt/{encoded}"
        f"?width={settings.POLLINATIONS_WIDTH}"
        f"&height={settings.POLLINATIONS_HEIGHT}"
        f"&nologo=true"
    )
    response = httpx.get(url, timeout=30, follow_redirects=True)
    if response.status_code == 200:
        return _convert_bytes_to_data_url(response.content)
    logger.warning("Pollinations returned %s for prompt: %s", response.status_code, prompt[:60])
    return None


# ---------------------------------------------------------------------------
# Provider: Pollinations.ai (img2img)
# ---------------------------------------------------------------------------

def _generate_pollinations_img2img(prompt: str, reference_base64: str) -> str | None:
    """
    Img2img via Pollinations: include the reference image as a query parameter.
    Falls back to text-only on non-200.
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
    response = httpx.get(url, timeout=30, follow_redirects=True)
    if response.status_code == 200:
        return _convert_bytes_to_data_url(response.content)
    logger.warning("Pollinations img2img returned %s, falling back to text-only", response.status_code)
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
        prompt = _build_image_prompt(frame, scene)
        ref_b64 = _strip_data_url_header(reference_style_image) if reference_style_image else None

        # Branch 1: bw_sketch + reference → sketch-intersection path
        if ref_b64 and render_style == 'bw_sketch':
            sketch_prompt = _inject_sketch_constraints(prompt)
            if settings.IMAGE_PROVIDER == "huggingface":
                return _generate_huggingface_img2img(sketch_prompt, ref_b64, strength=0.78)
            return _generate_pollinations_img2img(sketch_prompt, ref_b64)

        # Branch 2: reference present, other render style → standard img2img
        if ref_b64:
            if settings.IMAGE_PROVIDER == "huggingface":
                return _generate_huggingface_img2img(prompt, ref_b64, strength=0.55)
            return _generate_pollinations_img2img(prompt, ref_b64)

        # Branch 3: no reference → text-to-image
        if settings.IMAGE_PROVIDER == "huggingface":
            return _generate_huggingface(prompt)
        return _generate_pollinations(prompt)
    except Exception as e:
        logger.error("Image generation failed for frame %s: %s", frame.frame_number, e)
        return None
