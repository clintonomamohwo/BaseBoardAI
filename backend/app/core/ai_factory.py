"""
AIFactory — provider-agnostic entry point for all AI calls in BaseBoard.

Usage
-----
    from app.core.ai_factory import AIFactory

    text   = AIFactory.get_text_provider()    # → TextProvider
    image  = AIFactory.get_image_provider()   # → ImageProvider
    vision = AIFactory.get_vision_provider()  # → VisionProvider

Each provider exposes a minimal interface so the rest of the codebase
never imports Gemini or WatsonX SDK classes directly.  To add a new
backend, implement the protocol and register it in the factory — no
other files need to change.

Provider selection is driven entirely by .env:
    TEXT_PROVIDER   = watsonx | gemini
    IMAGE_PROVIDER  = pollinations | huggingface | gemini
    VISION_PROVIDER = gemini

Recommended split for BaseBoard
--------------------------------
    TEXT_PROVIDER=watsonx       WatsonX → script parsing, character/world/canon extraction
    IMAGE_PROVIDER=pollinations Pollinations → storyboard frames (volume, no rate limit)
    VISION_PROVIDER=gemini      Gemini Flash → Visual QA + Visual DNA extraction
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from app.core.config import settings


# ---------------------------------------------------------------------------
# Provider protocols — minimal interfaces callers depend on
# ---------------------------------------------------------------------------

@runtime_checkable
class TextProvider(Protocol):
    """Synchronous text-generation interface."""

    def generate(self, prompt: str, max_tokens: int = 8192) -> str:
        """Return the model's text response for the given prompt."""
        ...


@runtime_checkable
class ImageProvider(Protocol):
    """Synchronous image-generation interface."""

    def generate(
        self,
        prompt: str,
        reference_b64: str | None = None,
        width: int = 768,
        height: int = 512,
    ) -> str | None:
        """Return a base64 data URL, or None on failure."""
        ...


@runtime_checkable
class VisionProvider(Protocol):
    """Synchronous image-analysis interface."""

    def analyze(
        self,
        image_b64: str,
        prompt: str,
    ) -> str:
        """Analyze an image and return the model's text response."""
        ...

    def extract_visual_dna(self, image_b64: str, character_name: str) -> str:
        """
        Generate a Visual DNA Token — a hyper-detailed paragraph describing
        the character's physical traits, clothing, colors, and art style.
        Used to bridge the latent-space gap when switching image providers
        (e.g. Imagen → Pollinations for storyboard frames).
        """
        ...


# ---------------------------------------------------------------------------
# WatsonX text provider
# ---------------------------------------------------------------------------

class _WatsonXTextProvider:
    """Thin wrapper around the existing llm._invoke_with_fallback()."""

    def generate(self, prompt: str, max_tokens: int = 8192) -> str:
        from app.core.llm import _invoke_with_fallback
        return _invoke_with_fallback(prompt, max_new_tokens=max_tokens)


# ---------------------------------------------------------------------------
# Gemini text provider
# ---------------------------------------------------------------------------

class _GeminiTextProvider:
    """Google Gemini text generation via google-genai SDK."""

    def generate(self, prompt: str, max_tokens: int = 8192) -> str:
        from google import genai  # type: ignore[import]
        from google.genai import types  # type: ignore[import]
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_TEXT_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=max_tokens,
                temperature=0.2,
            ),
        )
        return response.text


# ---------------------------------------------------------------------------
# Gemini Imagen image provider
# ---------------------------------------------------------------------------

class _GeminiImageProvider:
    """Google Gemini image generation via google-genai SDK (generateContent modality)."""

    def generate(
        self,
        prompt: str,
        reference_b64: str | None = None,
        width: int = 768,
        height: int = 512,
    ) -> str | None:
        import base64
        from google import genai  # type: ignore[import]
        from google.genai import types  # type: ignore[import]
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_IMAGE_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                ),
            )
            # Extract the first image part from the response
            for candidate in response.candidates:
                for part in candidate.content.parts:
                    if getattr(part, "inline_data", None) is not None:
                        raw = part.inline_data.data
                        # SDK returns raw bytes directly — no b64decode needed
                        img_bytes: bytes = raw if isinstance(raw, bytes) else base64.b64decode(raw)
                        mime = getattr(part.inline_data, "mime_type", "image/jpeg")
                        return f"data:{mime};base64," + base64.b64encode(img_bytes).decode()
            return None
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("Gemini image generation failed: %s", exc)
            return None


# ---------------------------------------------------------------------------
# Gemini Vision provider
# ---------------------------------------------------------------------------

class _GeminiVisionProvider:
    """Google Gemini multimodal vision via google-genai SDK."""

    def _client(self) -> Any:
        from google import genai  # type: ignore[import]
        return genai.Client(api_key=settings.GEMINI_API_KEY)

    def analyze(self, image_b64: str, prompt: str) -> str:
        import base64
        from google.genai import types  # type: ignore[import]
        raw = base64.b64decode(image_b64.split(",", 1)[-1])
        image_part = types.Part.from_bytes(data=raw, mime_type="image/png")
        model_id = settings.GEMINI_FAST_MODEL or settings.GEMINI_VISION_MODEL
        response = self._client().models.generate_content(
            model=model_id,
            contents=[image_part, prompt],
        )
        return response.text

    def extract_visual_dna(self, image_b64: str, character_name: str) -> str:
        """
        Send the character portrait to Gemini Vision and ask it to generate
        a Visual DNA Token — a self-contained prompt prefix that, when prepended
        to any Pollinations storyboard prompt, anchors that character's appearance
        so the open-source model stays consistent with the Imagen reference sheet.
        """
        prompt = (
            f"You are a professional character consistency director.\n"
            f"Analyze this character reference image for '{character_name}' and write a "
            f"single dense paragraph (the 'Visual DNA Token') that captures:\n"
            f"- Species and physical build (height, weight class, posture)\n"
            f"- Fur/skin color, texture, and distinctive markings\n"
            f"- Facial features: eye color/shape, nose, expression baseline\n"
            f"- Hair (if any): color, length, style\n"
            f"- Default outfit: every garment, color, material, fit\n"
            f"- Accessories: every item worn or carried\n"
            f"- Art style: line weight, shading style, color palette mood\n"
            f"Write ONLY the token — no headers, no lists, no explanation. "
            f"Start directly with the character description."
        )
        return self.analyze(image_b64, prompt)


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

class AIFactory:
    """
    Singleton factory.  Call get_*_provider() anywhere in the codebase to
    obtain the currently configured provider without importing SDK classes.
    """

    @staticmethod
    def get_text_provider() -> TextProvider:
        p = settings.TEXT_PROVIDER.lower()
        if p == "gemini":
            return _GeminiTextProvider()
        return _WatsonXTextProvider()  # default

    @staticmethod
    def get_image_provider() -> ImageProvider:
        p = settings.IMAGE_PROVIDER.lower()
        if p == "gemini":
            return _GeminiImageProvider()
        # pollinations and huggingface are handled inside image.py directly;
        # returning None signals image.py to use its own dispatch.
        # Returning the Gemini provider only when explicitly requested.
        raise ValueError(
            f"IMAGE_PROVIDER='{p}' — use generate_frame_image() from image.py "
            f"for pollinations/huggingface. Only 'gemini' routes through AIFactory."
        )

    @staticmethod
    def get_vision_provider() -> VisionProvider:
        p = settings.VISION_PROVIDER.lower()
        if p == "gemini":
            return _GeminiVisionProvider()
        raise ValueError(
            f"VISION_PROVIDER='{p}' is not supported. Set VISION_PROVIDER=gemini in .env."
        )
