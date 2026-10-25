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
from typing import TYPE_CHECKING, Any, Literal

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

def _detect_mime(content: bytes, content_type: str | None = None) -> str | None:
    """Detect supported image MIME types without labeling error pages as images."""
    if content[:3] == b'\xff\xd8\xff':
        return "image/jpeg"
    if content[:4] == b'\x89PNG':
        return "image/png"
    if content[:6] in (b'GIF87a', b'GIF89a'):
        return "image/gif"
    if content[:4] == b'RIFF' and content[8:12] == b'WEBP':
        return "image/webp"
    declared_type = (content_type or "").split(";", 1)[0].strip().lower()
    if declared_type in {"image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"}:
        return declared_type
    return None


def _convert_bytes_to_data_url(content: bytes, content_type: str | None = None) -> str | None:
    """Encode raw image bytes to a self-contained base64 data URL with correct MIME type."""
    mime = _detect_mime(content, content_type)
    if not content or mime is None:
        return None
    return f"data:{mime};base64," + base64.b64encode(content).decode("utf-8")


def _strip_data_url_header(data_url: str) -> str:
    """Strip the `data:...;base64,` header from a data URL, returning the raw base64 string."""
    return data_url.split(',', 1)[1]


def _split_image_data_url(image_data: str) -> tuple[str, str]:
    """Return the MIME type and base64 payload from a data URL or raw base64 string."""
    if image_data.startswith("data:"):
        header, separator, encoded = image_data.partition(",")
        mime_type = header[5:].split(";", 1)[0].lower()
        if not separator or "base64" not in header.lower() or not mime_type.startswith("image/"):
            raise ValueError("Reference image must be a base64-encoded image data URL")
        return mime_type, encoded
    return "image/png", image_data


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
# Provider-agnostic single image generator
# ---------------------------------------------------------------------------

_GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"


def _gemini_output_image(response_data: dict[str, Any]) -> dict[str, Any] | None:
    """Find the final image part in the Interactions API response."""
    output_image = response_data.get("output_image")
    if isinstance(output_image, dict) and isinstance(output_image.get("data"), str):
        return output_image

    image_parts: list[dict[str, Any]] = []
    steps = response_data.get("steps")
    if isinstance(steps, list):
        for step in steps:
            if not isinstance(step, dict) or step.get("type") != "model_output":
                continue
            content = step.get("content")
            if isinstance(content, list):
                image_parts.extend(
                    part for part in content
                    if isinstance(part, dict)
                    and part.get("type") == "image"
                    and isinstance(part.get("data"), str)
                )
    if not image_parts:
        output = response_data.get("output")
        if isinstance(output, list):
            image_parts.extend(
                part for part in output
                if isinstance(part, dict)
                and part.get("type") == "image"
                and isinstance(part.get("data"), str)
            )
    return image_parts[-1] if image_parts else None


def _generate_gemini_nano_banana(prompt: str, reference_image: str | None = None) -> str | None:
    """Generate one premium frame directly through Google's Gemini API."""
    api_key = settings.GEMINI_API_KEY.strip()
    model = settings.GEMINI_NANO_BANANA_MODEL.strip()
    if not api_key:
        logger.warning("Nano Banana 2.1 generation requires GEMINI_API_KEY.")
        return None
    if not model:
        logger.error("GEMINI_NANO_BANANA_MODEL is empty; refusing premium generation.")
        return None

    request_data: dict[str, Any] = {
        "model": model,
        "input": [{"type": "text", "text": prompt}],
        "response_format": {
            "type": "image",
            "mime_type": "image/jpeg",
            "aspect_ratio": "16:9",
            "image_size": "1K",
        },
        "store": False,
    }
    if reference_image:
        try:
            mime_type, image_base64 = _split_image_data_url(reference_image)
        except ValueError as exc:
            logger.warning("Nano Banana 2.1 reference image is invalid: %s", exc)
            return None
        request_data["input"].append({
            "type": "image",
            "data": image_base64,
            "mime_type": mime_type,
        })

    try:
        response = httpx.post(
            _GEMINI_INTERACTIONS_URL,
            headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
            json=request_data,
            timeout=180,
        )
    except httpx.RequestError as exc:
        logger.warning("Nano Banana 2.1 request failed: %s", exc)
        return None
    if response.status_code != 200:
        error_detail = ""
        try:
            response_payload = response.json()
            provider_error = (
                response_payload.get("error")
                if isinstance(response_payload, dict)
                else None
            )
            if isinstance(provider_error, dict):
                safe_fields = [
                    str(value)
                    for value in (provider_error.get("status"), provider_error.get("message"))
                    if isinstance(value, str) and value
                ]
                if safe_fields:
                    error_detail = " (" + "; ".join(safe_fields)[:500] + ")"
        except ValueError:
            pass
        logger.warning(
            "Nano Banana 2.1 returned HTTP %s%s.", response.status_code, error_detail
        )
        return None

    try:
        response_data = response.json()
    except ValueError:
        logger.warning("Nano Banana 2.1 returned an invalid JSON response.")
        return None
    if not isinstance(response_data, dict):
        logger.warning("Nano Banana 2.1 returned an invalid response payload.")
        return None
    image_part = _gemini_output_image(response_data)
    if not image_part:
        logger.warning("Nano Banana 2.1 response did not contain an output image.")
        return None
    try:
        image_bytes = base64.b64decode(image_part["data"], validate=True)
    except (TypeError, ValueError):
        logger.warning("Nano Banana 2.1 returned invalid base64 image data.")
        return None
    return _convert_bytes_to_data_url(
        image_bytes,
        image_part.get("mime_type") or image_part.get("mimeType") or "image/png",
    )


def generate_image(
    prompt: str,
    reference_b64: str | None = None,
    width: int | None = None,
    height: int | None = None,
    quality_tier: Literal["draft", "premium"] = "draft",
) -> str | None:
    """
    Generate one image using whichever IMAGE_PROVIDER is active in .env.

    Works for all three providers — gemini, pollinations, huggingface.
    If reference_b64 is provided the provider's img2img path is used.
    Does not automatically retry or switch providers after a provider call: the
    response may have been lost after generation completed and could be billable.

    width/height are only used by the Pollinations text-to-image path
    (img2img always uses the reference dimensions).
    """
    w = width  or settings.POLLINATIONS_WIDTH
    h = height or settings.POLLINATIONS_HEIGHT
    if quality_tier == "premium":
        return _generate_gemini_nano_banana(prompt, reference_b64)

    provider = settings.IMAGE_PROVIDER.lower()

    # ── Gemini ──────────────────────────────────────────────────────────────
    if provider == "gemini":
        try:
            from app.core.ai_factory import AIFactory
            result = AIFactory.get_image_provider().generate(
                prompt,
                reference_b64=reference_b64,
                width=w,
                height=h,
            )
            if result:
                return result
        except Exception as exc:
            logger.warning("Gemini image generation failed; not retrying another provider (%s).", exc)
        return None

    # ── Hugging Face ─────────────────────────────────────────────────────────
    if provider == "huggingface":
        try:
            result = (
                _generate_huggingface_img2img(prompt, reference_b64)
                if reference_b64 else _generate_huggingface(prompt)
            )
            if result:
                return result
        except Exception as exc:
            logger.warning("Hugging Face image generation failed; not retrying another provider (%s).", exc)
        logger.warning("Hugging Face returned no image; not retrying another provider.")
        return None

    # ── Pollinations (default) ────────────────────────────────────────────────
    if reference_b64:
        return _generate_pollinations_img2img(prompt, reference_b64)
    return _generate_pollinations(prompt, width=w, height=h)


# ---------------------------------------------------------------------------
# Provider: Pollinations.ai (text-to-image)
# ---------------------------------------------------------------------------

_RETRY_DELAYS = (0, 5, 15)  # seconds before each legacy API attempt


def _configured_models(setting_value: str, default_models: tuple[str, ...]) -> list[str]:
    models = [item.strip() for item in setting_value.split(",") if item.strip()]
    return models or list(default_models)


def _generate_pollinations(
    prompt: str,
    width: int | None = None,
    height: int | None = None,
) -> str | None:
    """Generate through the supported API when configured, otherwise use legacy compatibility."""
    w = width or settings.POLLINATIONS_WIDTH
    h = height or settings.POLLINATIONS_HEIGHT
    if settings.POLLINATIONS_API_KEY.strip():
        return _generate_pollinations_api(prompt, w, h)
    return _generate_pollinations_legacy(prompt, w, h)


def _generate_pollinations_api(
    prompt: str,
    width: int,
    height: int,
) -> str | None:
    """Use only the configured low-cost draft-model fallback chain."""
    models = _configured_models(
        settings.POLLINATIONS_IMAGE_MODELS,
        ("black-forest-labs/flux.1-schnell", "tongyi-mai/z-image-turbo"),
    )
    url = f"https://gen.pollinations.ai/image/{urllib.parse.quote(prompt, safe='')}"
    headers = {"Authorization": f"Bearer {settings.POLLINATIONS_API_KEY.strip()}"}

    for model_index, model in enumerate(models):
        try:
            response = httpx.get(
                url,
                params={"width": width, "height": height, "model": model},
                headers=headers,
                timeout=90,
                follow_redirects=True,
            )
        except httpx.RequestError as exc:
            logger.warning("Pollinations model %s request failed; outcome is uncertain, not retrying: %s", model, exc)
            return None

        if response.status_code == 200:
            data_url = _convert_bytes_to_data_url(
                response.content, response.headers.get("content-type")
            )
            if data_url:
                return data_url
            logger.warning("Pollinations model %s returned an invalid image; not retrying after a possibly billable response", model)
            return None
        logger.warning("Pollinations model %s returned %s", model, response.status_code)
        if response.status_code in (401, 402, 403):
            # Authentication, balance, and permission failures cannot be fixed by changing models.
            return None
        if response.status_code not in (400, 404, 422) or model_index == len(models) - 1:
            # Only a definitive request/model rejection permits trying a
            # different model. Timeouts, throttling, and 5xx errors can follow
            # completed generation and must not be retried.
            return None
    return None


def _generate_pollinations_legacy(prompt: str, width: int, height: int) -> str | None:
    """Use the no-key Free API Classic endpoint as a compatibility fallback."""
    encoded = urllib.parse.quote(prompt, safe="")
    url = (
        f"https://image.pollinations.ai/prompt/{encoded}"
        f"?width={width}&height={height}&model=flux&nologo=true"
    )
    for attempt, delay in enumerate(_RETRY_DELAYS, start=1):
        if delay:
            time.sleep(delay)
        try:
            response = httpx.get(url, timeout=60, follow_redirects=True)
            if response.status_code == 200:
                data_url = _convert_bytes_to_data_url(
                    response.content, response.headers.get("content-type")
                )
                if data_url:
                    return data_url
                logger.warning("Pollinations legacy endpoint returned a non-image response")
            else:
                logger.warning(
                    "Pollinations legacy attempt %d/%d returned %s for prompt: %s",
                    attempt, len(_RETRY_DELAYS), response.status_code, prompt[:60],
                )
        except httpx.RequestError as exc:
            logger.warning(
                "Pollinations legacy attempt %d/%d failed for prompt %s: %s",
                attempt, len(_RETRY_DELAYS), prompt[:60], exc,
            )
    return None


# ---------------------------------------------------------------------------
# Provider: Pollinations.ai (img2img)
# ---------------------------------------------------------------------------

def _generate_pollinations_img2img(
    prompt: str,
    reference_base64: str,
    reference_mime_type: str = "image/png",
) -> str | None:
    """
    Img2img via Pollinations: include the reference image as a query parameter.
    The unauthenticated legacy path falls back to text-only on failure. When a
    key is configured, do not issue a second request after an uncertain edit
    result; it could duplicate a charge if the provider completed the edit but
    the response was lost.
    """
    if settings.POLLINATIONS_API_KEY.strip():
        return _generate_pollinations_edit_api(prompt, reference_base64, reference_mime_type)

    encoded_prompt = urllib.parse.quote(prompt, safe="")
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
    except httpx.RequestError as exc:
        logger.warning("Pollinations img2img failed (%s), falling back to text-only", exc)
    return _generate_pollinations(prompt)


def _generate_pollinations_edit_api(
    prompt: str,
    reference_base64: str,
    reference_mime_type: str = "image/png",
) -> str | None:
    """Submit reference-guided generation to the unified API without putting image data in a URL."""
    models = _configured_models(
        settings.POLLINATIONS_EDIT_MODELS,
        ("microsoft/mai-image-2.5-flash",),
    )
    url = "https://gen.pollinations.ai/v1/images/edits"
    headers = {"Authorization": f"Bearer {settings.POLLINATIONS_API_KEY.strip()}"}
    reference_data_url = f"data:{reference_mime_type};base64,{reference_base64}"

    for model_index, model in enumerate(models):
        try:
            response = httpx.post(
                url,
                headers=headers,
                json={
                    "prompt": prompt,
                    "image": [{"image_url": reference_data_url}],
                    "model": model,
                    "size": f"{settings.POLLINATIONS_WIDTH}x{settings.POLLINATIONS_HEIGHT}",
                    "response_format": "b64_json",
                },
                timeout=120,
            )
        except httpx.RequestError as exc:
            logger.warning("Pollinations edit model %s request failed; outcome is uncertain, not retrying: %s", model, exc)
            return None

        if response.status_code != 200:
            logger.warning("Pollinations edit model %s returned %s", model, response.status_code)
            if response.status_code in (401, 402, 403):
                return None
            if response.status_code not in (400, 404, 422) or model_index == len(models) - 1:
                return None
            continue

        try:
            image = response.json()["data"][0]
            image_base64 = image.get("b64_json")
            if image_base64:
                mime = image.get("media_type") or "image/png"
                return f"data:{mime};base64,{image_base64}"
        except (KeyError, IndexError, TypeError, ValueError):
            logger.warning("Pollinations edit model %s returned an invalid image payload; not retrying after a possibly billable response", model)
            return None
    return None


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
    Returns None on failure; never sends a second request after an uncertain outcome.
    """
    url = f"https://api-inference.huggingface.co/models/{settings.HF_IMG2IMG_MODEL}"
    headers = {"Authorization": f"Bearer {settings.HF_API_TOKEN}"}
    payload = {"inputs": prompt, "image": reference_base64, "parameters": {"strength": strength}}
    response = httpx.post(url, headers=headers, json=payload, timeout=90)
    if response.status_code == 200:
        return _convert_bytes_to_data_url(response.content)
    logger.warning(
        "HuggingFace img2img returned %s; not retrying with a second text-to-image request: %s",
        response.status_code,
        prompt[:60],
    )
    return None


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def generate_frame_image(
    frame: "StoryboardFrameBase",
    scene: "ScriptSceneBase",
    reference_style_image: str | None = None,
    render_style: str = 'bw_sketch',
    canon_context: dict[str, Any] | None = None,
    quality_tier: Literal["draft", "premium"] = "draft",
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
        ref_mime_type = _split_image_data_url(reference_style_image)[0] if reference_style_image else "image/png"
        if quality_tier == "premium":
            return _generate_gemini_nano_banana(prompt, reference_style_image)

        provider = settings.IMAGE_PROVIDER.lower()

        # ── Gemini Imagen branch — never retry a possibly billable request ────
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
                logger.warning("Gemini Imagen returned no image; not retrying another provider.")
                return None
            except Exception as exc:
                logger.warning(
                    "Gemini Imagen failed for frame %s; outcome is uncertain, not retrying another provider (%s).",
                    frame.frame_number, exc,
                )
                return None

        # ── Branch 1: bw_sketch + reference → sketch-intersection path ───────
        if ref_b64 and render_style == 'bw_sketch':
            sketch_prompt = _inject_sketch_constraints(prompt)
            if provider == "huggingface":
                try:
                    result = _generate_huggingface_img2img(sketch_prompt, ref_b64, strength=0.78)
                    if result:
                        return result
                except Exception as exc:
                    logger.warning("Hugging Face img2img failed; not retrying another provider (%s).", exc)
                    return None
                logger.warning("Hugging Face img2img returned no image; not retrying another provider.")
                return None
            return _generate_pollinations_img2img(sketch_prompt, ref_b64, ref_mime_type)

        # ── Branch 2: reference present, other render style → img2img ────────
        if ref_b64:
            if provider == "huggingface":
                try:
                    result = _generate_huggingface_img2img(prompt, ref_b64, strength=0.55)
                    if result:
                        return result
                except Exception as exc:
                    logger.warning("Hugging Face img2img failed; not retrying another provider (%s).", exc)
                    return None
                logger.warning("Hugging Face img2img returned no image; not retrying another provider.")
                return None
            return _generate_pollinations_img2img(prompt, ref_b64, ref_mime_type)

        # ── Branch 3: no reference → text-to-image ────────────────────────────
        if provider == "huggingface":
            try:
                result = _generate_huggingface(prompt)
                if result:
                    return result
            except Exception as exc:
                logger.warning("Hugging Face image generation failed; not retrying another provider (%s).", exc)
                return None
            logger.warning("Hugging Face returned no frame image; not retrying another provider.")
            return None
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
    reference_b64: str | None = None,
) -> str | None:
    """
    Generate a single full-grid sheet image using the active image provider.

    The prompt is the full sheet generation prompt produced by
    SheetLayout.prompt_prefix().  The canvas dimensions come from the layout
    manifest so the image matches the grid geometry exactly.

    If reference_b64 is provided the locked reference image is passed as
    img2img guidance (strength=0.55) so the generated sheet stays visually
    consistent with the locked image.

    Returns a base64 data URL on success, or None on any failure.
    Never raises — sheet generation is non-fatal.
    """
    try:
        # If no reference: use canvas dimensions so Pollinations matches the grid
        # If reference is present: generate_image routes img2img through active provider
        return generate_image(sheet_prompt, reference_b64=reference_b64, width=canvas_width, height=canvas_height)
    except Exception as exc:
        logger.error("Sheet image generation failed: %s", exc)
        return None
