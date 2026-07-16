"""
LLM orchestration layer — IBM WatsonX via LangChain.

Exposes three stage functions matching the 3-stage pipeline:
  invoke_character_stage  → list[CharacterProfileBase]
  invoke_world_stage      → list[EnvironmentProfileBase]
  invoke_storyboard_stage → list[ScriptSceneBase]

Each function:
  1. Formats the relevant prompt template with caller-supplied context
  2. Calls the active model; on 429 rate-limit automatically retries down
     the FALLBACK_MODELS chain until one succeeds or all are exhausted
  3. Strips any markdown fences from the raw response
  4. Parses the JSON
  5. Validates each item against the relevant Pydantic schema
  6. Raises HTTPException(502) on any failure — never silently swallows errors
"""

from __future__ import annotations

import json
import re
from typing import Any

from fastapi import HTTPException
from langchain_ibm import ChatWatsonx
from langchain_core.messages import HumanMessage
from langchain_core.prompts import PromptTemplate

from app.core.config import settings
from app.core.prompts import CHARACTER_PROMPT, WORLD_PROMPT, STORYBOARD_PROMPT
from app.schemas.storyboard import (
    CharacterProfileBase,
    EnvironmentProfileBase,
    ScriptSceneBase,
)

# ---------------------------------------------------------------------------
# Model fallback chain
# Tried in order when a 429 rate-limit is detected on the active model.
# The primary model comes from settings so .env still controls the default.
# ---------------------------------------------------------------------------

FALLBACK_MODELS: list[str] = [
    "mistralai/mistral-small-3-1-24b-instruct-2503",
    "meta-llama/llama-3-3-70b-instruct",
    "mistralai/mistral-medium-2505",
    "mistral-large-2512",
]

# Tokens that indicate the model is unavailable / rate-limited and we should
# try the next one.  Cast to lowercase for case-insensitive matching.
_FALLBACK_TOKENS = (
    "429",
    "consumption_limit_reached",
    "model_no_support_for_function",
    "is not supported",
    "not supported for this environment",
    "unsupported model",
    "model not found",
    "resource not found",
    "400",
    "403",
)


def _should_fallback(exc: Exception) -> bool:
    """Return True if the exception should trigger a model fallback."""
    msg = str(exc).lower()
    return any(token in msg for token in _FALLBACK_TOKENS)


# ---------------------------------------------------------------------------
# LLM client factory
# ---------------------------------------------------------------------------

def _build_llm(model_id: str | None = None, max_new_tokens: int = 4096) -> ChatWatsonx:
    """Initialise and return a ChatWatsonx instance. Uses settings default when model_id is None."""
    return ChatWatsonx(
        model_id=model_id or settings.WATSONX_MODEL_ID,
        url=settings.WATSONX_URL,
        apikey=settings.WATSONX_API_KEY,
        project_id=settings.WATSONX_PROJECT_ID,
        max_tokens=max_new_tokens,
        temperature=0.2,
    )


def _invoke_with_fallback(prompt_text: str, max_new_tokens: int = 4096) -> str:
    """
    Invoke the LLM with automatic model fallback on 429 rate-limit errors.

    Tries settings.WATSONX_MODEL_ID first, then each model in FALLBACK_MODELS
    (skipping any that duplicate the primary). Raises the last exception if all
    models are exhausted.
    """
    primary = settings.WATSONX_MODEL_ID
    candidates = [primary] + [m for m in FALLBACK_MODELS if m != primary]

    last_exc: Exception = RuntimeError("No models available.")
    for model_id in candidates:
        try:
            response = _build_llm(model_id, max_new_tokens=max_new_tokens).invoke([HumanMessage(content=prompt_text)])
            return response.content
        except Exception as exc:
            if _should_fallback(exc):
                last_exc = exc
                continue  # try next model
            raise  # unrecoverable error — surface immediately

    raise last_exc


# ---------------------------------------------------------------------------
# JSON response parser
# ---------------------------------------------------------------------------

def _parse_json_response(raw: str) -> tuple[Any, bool]:
    """
    Extract and parse JSON from the LLM response.
    1. Strip markdown code fences if present.
    2. If that fails, extract the first [...] or {...} block from the text (fallback
       for models that prepend prose despite instructions).
    3. If the JSON is truncated (model hit token limit mid-output), recover any
       fully-formed leading objects from an array before raising.

    Returns a (parsed_value, truncated) tuple.
    `truncated` is True only when path 3 (truncation recovery) was used.
    Raises ValueError with context if all attempts fail.
    """
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip())
    try:
        return json.loads(cleaned), False
    except json.JSONDecodeError:
        pass

    # Fallback: extract the first complete JSON array or object
    match = re.search(r"(\[.*\]|\{.*\})", raw, flags=re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1)), False
        except json.JSONDecodeError:
            pass

    # Truncation recovery: the model was cut off mid-output (token limit hit).
    # Find the last closing brace }, close the array there, and parse what we have.
    array_start = raw.find("[")
    if array_start != -1:
        last_brace = raw.rfind("}")
        if last_brace != -1 and last_brace > array_start:
            attempt = raw[array_start : last_brace + 1] + "\n]"
            try:
                result = json.loads(attempt)
                if isinstance(result, list) and result:
                    return result, True  # partial recovery — caller must warn user
            except json.JSONDecodeError:
                pass

    raise ValueError(f"LLM returned invalid JSON.\nRaw output:\n{raw[:500]}")


# ---------------------------------------------------------------------------
# Stage 1 — Character Standardizer
# ---------------------------------------------------------------------------

def invoke_character_stage(raw_notes: str) -> list[CharacterProfileBase]:
    """
    Run CHARACTER_PROMPT against raw character notes.
    Returns a validated list of CharacterProfileBase objects.
    Raises HTTPException(502) on LLM or validation failure.
    """
    try:
        prompt_text = CHARACTER_PROMPT.format(raw_character_notes=raw_notes)
        raw_response = _invoke_with_fallback(prompt_text)
        parsed, _ = _parse_json_response(raw_response)
        if not isinstance(parsed, list):
            parsed = [parsed]
        return [CharacterProfileBase.model_validate(item) for item in parsed]
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Character stage LLM inference failed: {e}",
        )


# ---------------------------------------------------------------------------
# Stage 2 — World Architect
# ---------------------------------------------------------------------------

def invoke_world_stage(raw_notes: str) -> list[EnvironmentProfileBase]:
    """
    Run WORLD_PROMPT against raw world/location notes.
    Returns a validated list of EnvironmentProfileBase objects.
    Raises HTTPException(502) on LLM or validation failure.
    """
    try:
        prompt_text = WORLD_PROMPT.format(raw_world_notes=raw_notes)
        raw_response = _invoke_with_fallback(prompt_text)
        parsed, _ = _parse_json_response(raw_response)
        if not isinstance(parsed, list):
            parsed = [parsed]
        return [EnvironmentProfileBase.model_validate(item) for item in parsed]
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"World stage LLM inference failed: {e}",
        )


# ---------------------------------------------------------------------------
# Stage 3 — Storyboard Orchestrator
# ---------------------------------------------------------------------------

# Per-style shot distribution guidance injected into STORYBOARD_PROMPT
_STYLE_GUIDANCE: dict[str, str] = {
    "balanced": (
        "Target distribution: ~30% Wide/Establishing, ~25% Medium, ~15% Two-Shot/OTS, "
        "~10% Tracking/Dolly, ~10% Insert/Detail, ~10% Close-Up max.\n"
        "Close-Ups are reserved for genuine emotional peaks only."
    ),
    "cinematic": (
        "Target distribution: ~35% Wide/Establishing, ~30% Medium, ~15% Tracking/Dolly, "
        "~10% OTS, ~7% Insert, ~5% Close-Up max.\n"
        "Prioritise grand establishing shots and environmental storytelling. Close-Ups extremely rare."
    ),
    "dialogue": (
        "Target distribution: ~30% Medium, ~25% OTS/Two-Shot, ~20% Wide, "
        "~12% Insert, ~10% Close-Up max, ~5% Tracking.\n"
        "Vary OTS coverage — alternate A/B angles, wide callbacks, insert cutaways. Close-Ups only at emotional peaks."
    ),
    "action": (
        "Target distribution: ~35% Wide, ~25% Tracking/Dolly, ~20% Medium, "
        "~10% Establishing, ~5% POV, ~5% Close-Up max.\n"
        "Emphasise movement, geography, and dynamic angles. Close-Ups extremely rare."
    ),
    "intimate": (
        "Target distribution: ~30% Medium, ~22% Close-Up max, ~20% Wide, "
        "~15% OTS, ~8% Insert, ~5% Tracking.\n"
        "Close-Ups are permitted but must be emotionally justified — not used for simple reactions."
    ),
}


def invoke_storyboard_stage(
    characters: list[CharacterProfileBase],
    environments: list[EnvironmentProfileBase],
    raw_script_text: str,
    global_aesthetic: str,
    render_style: str = 'bw_sketch',
    director_style: str = 'balanced',
) -> tuple[list[ScriptSceneBase], bool]:
    """
    Run STORYBOARD_PROMPT with compiled character + world context and the raw screenplay.
    Returns a (scenes, truncated) tuple.
    `truncated` is True when the LLM output was cut off and only partial scenes were recovered.
    Raises HTTPException(502) on LLM or validation failure.
    """
    try:
        character_context = json.dumps(
            [c.model_dump() for c in characters], indent=2
        )
        world_context = json.dumps(
            [e.model_dump() for e in environments], indent=2
        )
        template = PromptTemplate(
            input_variables=[
                "character_context", "world_context", "raw_script_text",
                "global_aesthetic", "render_style", "director_style", "shot_distribution_guidance",
            ],
            template=STORYBOARD_PROMPT,
        )
        prompt_text = template.format(
            character_context=character_context,
            world_context=world_context,
            raw_script_text=raw_script_text,
            global_aesthetic=global_aesthetic,
            render_style=render_style,
            director_style=director_style,
            shot_distribution_guidance=_STYLE_GUIDANCE.get(director_style, _STYLE_GUIDANCE["balanced"]),
        )
        raw_response = _invoke_with_fallback(prompt_text, max_new_tokens=16384)
        parsed, truncated = _parse_json_response(raw_response)
        if not isinstance(parsed, list):
            parsed = [parsed]
        return [ScriptSceneBase.model_validate(item) for item in parsed], truncated
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Storyboard stage LLM inference failed: {e}",
        )
