"""
LLM orchestration layer — IBM WatsonX via LangChain.

Exposes three stage functions matching the 3-stage pipeline:
  invoke_character_stage  → list[CharacterProfileBase]
  invoke_world_stage      → list[EnvironmentProfileBase]
  invoke_storyboard_stage → list[ScriptSceneBase]

Each function:
  1. Formats the relevant prompt template with caller-supplied context
  2. Calls WATSONX_PRIMARY_TEXT_MODEL; on retryable errors (rate limits,
     unsupported model, transient server errors) automatically tries
     WATSONX_FALLBACK_TEXT_MODEL then WATSONX_LAST_RESORT_MODEL.
     Auth / config errors (401, 403, invalid key) surface immediately.
  3. Strips any markdown fences from the raw response
  4. Parses the JSON
  5. Validates each item against the relevant Pydantic schema
  6. Raises HTTPException(502) on any failure — never silently swallows errors

Scene chunking (invoke_storyboard_stage):
  Long screenplays are split into individual scene blocks (by INT./EXT. heading)
  and each block is sent as a separate LLM call, then merged.  This avoids
  output-token limits that cause mid-JSON truncation on large scripts.
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
# Model fallback behaviour
#
# The candidate list is built at call time from settings so changes to .env
# are always reflected without restarting (e.g. during development).
#
# Only transient / model-specific errors trigger a fallback.  Auth and
# configuration errors (bad API key, invalid project ID) fail immediately
# so misconfiguration is never hidden by a silent retry.
# ---------------------------------------------------------------------------

# Errors that indicate a temporary or model-specific problem — retry allowed.
_RETRYABLE_TOKENS: tuple[str, ...] = (
    "429",
    "consumption_limit_reached",
    "token_quota_reached",           # account-level quota — try next model
    "model_no_support_for_function",
    "is not supported",
    "not supported for this environment",
    "unsupported model",
    "model not found",
    "resource not found",
    "503",                           # upstream service temporarily unavailable
    "502",                           # bad gateway (transient infra error)
    "timeout",
    "timed out",
    "connection",
)

# Errors that indicate a setup/config problem — fail immediately.
_FATAL_TOKENS: tuple[str, ...] = (
    "401",
    "unauthorized",
    "invalid api key",
    "authentication",
    "403",                           # forbidden — wrong project / IAM role
    "invalid project",
    "project not found",
)


def _should_fallback(exc: Exception) -> bool:
    """
    Return True only when the error is transient or model-specific.

    Auth / config errors always return False so they surface immediately
    instead of being swallowed by the fallback loop.
    """
    msg = str(exc).lower()
    if any(token in msg for token in _FATAL_TOKENS):
        return False
    return any(token in msg for token in _RETRYABLE_TOKENS)


# ---------------------------------------------------------------------------
# LLM client factory
# ---------------------------------------------------------------------------

def _build_llm(model_id: str, max_new_tokens: int = 4096) -> ChatWatsonx:
    """Initialise and return a ChatWatsonx instance for the given model_id."""
    return ChatWatsonx(
        model_id=model_id,
        url=settings.WATSONX_URL,
        apikey=settings.WATSONX_API_KEY,
        project_id=settings.WATSONX_PROJECT_ID,
        max_tokens=max_new_tokens,
        temperature=0.2,
    )


def _watsonx_candidates() -> list[str]:
    """
    Build the ordered model candidate list from settings at call time.

    Slots that are left empty in .env are skipped, so callers can run
    with only a primary model by leaving the others blank.
    """
    slots = [
        settings.WATSONX_PRIMARY_TEXT_MODEL,
        settings.WATSONX_FALLBACK_TEXT_MODEL,
        settings.WATSONX_LAST_RESORT_MODEL,
    ]
    # Deduplicate while preserving order; drop empty strings.
    seen: set[str] = set()
    candidates: list[str] = []
    for m in slots:
        if m and m not in seen:
            candidates.append(m)
            seen.add(m)
    return candidates


def _invoke_with_fallback(prompt_text: str, max_new_tokens: int = 4096) -> str:
    """
    Invoke the configured TEXT_PROVIDER with automatic fallback.

    TEXT_PROVIDER=watsonx (default):
        Tries WATSONX_PRIMARY_TEXT_MODEL, then WATSONX_FALLBACK_TEXT_MODEL,
        then WATSONX_LAST_RESORT_MODEL on retryable errors (rate limits,
        unsupported model, transient server errors).
        Auth / config errors (401, 403, invalid API key) fail immediately.

    TEXT_PROVIDER=gemini:
        Routes directly to _GeminiTextProvider from ai_factory.py.
        No WatsonX calls are made.

    Raises the last exception if all candidates are exhausted.
    """
    import logging
    log = logging.getLogger(__name__)

    if settings.TEXT_PROVIDER.lower() == "gemini":
        try:
            from app.core.ai_factory import AIFactory
            return AIFactory.get_text_provider().generate(prompt_text, max_tokens=max_new_tokens)
        except Exception as exc:
            log.warning("Gemini text provider failed (%s) — falling back to WatsonX.", exc)
            # Fall through to WatsonX below

    candidates = _watsonx_candidates()
    if not candidates:
        raise RuntimeError(
            "No WatsonX models configured. "
            "Set WATSONX_PRIMARY_TEXT_MODEL in your .env file."
        )

    last_exc: Exception = RuntimeError("No models available.")
    for model_id in candidates:
        try:
            log.debug("Trying WatsonX model: %s", model_id)
            response = _build_llm(model_id, max_new_tokens=max_new_tokens).invoke(
                [HumanMessage(content=prompt_text)]
            )
            if model_id != candidates[0]:
                log.warning("Fell back to WatsonX model: %s", model_id)
            return response.content
        except Exception as exc:
            if _should_fallback(exc):
                log.warning("Model %s failed (%s) — trying next.", model_id, exc)
                last_exc = exc
                continue  # try next model
            raise  # unrecoverable (auth/config) — surface immediately

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
    text = raw.strip()

    # ── Pass 1: strip any markdown code fence (handles leading prose + fence) ──
    # Matches ```json ... ``` or ``` ... ``` anywhere in the response
    fence_match = re.search(r"```(?:json)?\s*\n?(.*?)```", text, flags=re.DOTALL | re.IGNORECASE)
    if fence_match:
        candidate = fence_match.group(1).strip()
        try:
            return json.loads(candidate), False
        except json.JSONDecodeError:
            pass

    # ── Pass 2: strip leading/trailing fences with anchors (older pattern) ───
    cleaned = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```\s*$", "", cleaned.strip())
    try:
        return json.loads(cleaned), False
    except json.JSONDecodeError:
        pass

    # ── Pass 3: extract first complete JSON array or object from anywhere ────
    match = re.search(r"(\[.*\]|\{.*\})", text, flags=re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1)), False
        except json.JSONDecodeError:
            pass

    # ── Pass 4: truncation recovery ──────────────────────────────────────────
    # Model was cut off mid-output — recover fully-formed leading objects by
    # walking backwards through closing-braces until a valid parse is found.
    array_start = text.find("[")
    if array_start != -1:
        # Collect all positions of "}" in the text (descending order).
        brace_positions = [i for i, ch in enumerate(text) if ch == "}" and i > array_start]
        for pos in reversed(brace_positions):
            attempt = text[array_start : pos + 1] + "\n]"
            try:
                result = json.loads(attempt)
                if isinstance(result, list) and result:
                    return result, True  # partial recovery — caller must warn user
            except json.JSONDecodeError:
                continue

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


# ---------------------------------------------------------------------------
# Scene chunking helpers
# ---------------------------------------------------------------------------

# Matches either:
#   **SCENE N — ...  (markdown bold heading used in this project's screenplays)
#   INT. / EXT. / INT/EXT. / EXT/INT. at line start  (standard sluglines)
_SCENE_BOUNDARY_RE = re.compile(
    r"^(?:\*\*SCENE\s+\d+|[ \t]*(?:INT\.|EXT\.|INT/EXT\.|EXT/INT\.))",
    re.IGNORECASE | re.MULTILINE,
)

# Maximum number of screenplay scene-blocks to send in a single LLM call.
# Keeping this low avoids hitting the model's output-token limit.
_SCENES_PER_CHUNK = 3


def _split_into_scene_blocks(script_text: str) -> list[str]:
    """
    Split a screenplay into individual scene blocks.

    Boundaries are detected by:
      • ``**SCENE N —`` markdown headings (this project's screenplay format)
      • Standard sluglines: INT. / EXT. / INT/EXT. / EXT/INT. at line start

    Returns a list of non-empty strings.  Any preamble before the first
    detected boundary is discarded (it is world/character metadata, not
    screenplay action).  Falls back to returning the whole text as one block
    when no boundaries are found.
    """
    boundaries = [m.start() for m in _SCENE_BOUNDARY_RE.finditer(script_text)]
    if not boundaries:
        return [script_text]

    blocks: list[str] = []
    for idx, start in enumerate(boundaries):
        end = boundaries[idx + 1] if idx + 1 < len(boundaries) else len(script_text)
        block = script_text[start:end].strip()
        if block:
            blocks.append(block)

    return blocks if blocks else [script_text]


def _invoke_storyboard_chunk(
    chunk_text: str,
    character_context: str,
    world_context: str,
    global_aesthetic: str,
    render_style: str,
    director_style: str,
    scene_number_offset: int,
) -> tuple[list[ScriptSceneBase], bool]:
    """
    Invoke the storyboard LLM for a single chunk of screenplay text.
    Renumbers scene_number fields so they are contiguous across chunks.
    """
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
        raw_script_text=chunk_text,
        global_aesthetic=global_aesthetic,
        render_style=render_style,
        director_style=director_style,
        shot_distribution_guidance=_STYLE_GUIDANCE.get(director_style, _STYLE_GUIDANCE["balanced"]),
    )
    raw_response = _invoke_with_fallback(prompt_text, max_new_tokens=16384)
    parsed, truncated = _parse_json_response(raw_response)
    if not isinstance(parsed, list):
        parsed = [parsed]
    scenes: list[ScriptSceneBase] = []
    for i, item in enumerate(parsed):
        # Re-number scenes so the merged list is contiguous.
        item["scene_number"] = scene_number_offset + i + 1
        scenes.append(ScriptSceneBase.model_validate(item))
    return scenes, truncated


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

    Long screenplays are automatically split into scene chunks (≤ _SCENES_PER_CHUNK
    sluglines per call) and each chunk is sent as a separate LLM invocation to avoid
    hitting output-token limits.  Results are merged into a single flat list.

    Returns a (scenes, truncated) tuple.
    `truncated` is True when any chunk's LLM output was cut off and only partial
    scenes were recovered.
    Raises HTTPException(502) on LLM or validation failure.
    """
    try:
        character_context = json.dumps(
            [c.model_dump() for c in characters], indent=2
        )
        world_context = json.dumps(
            [e.model_dump() for e in environments], indent=2
        )

        # ── Split screenplay into scene blocks ───────────────────────────────
        scene_blocks = _split_into_scene_blocks(raw_script_text)

        # ── Group blocks into chunks of _SCENES_PER_CHUNK ────────────────────
        chunks: list[str] = []
        for i in range(0, len(scene_blocks), _SCENES_PER_CHUNK):
            chunk_blocks = scene_blocks[i : i + _SCENES_PER_CHUNK]
            chunks.append("\n\n".join(chunk_blocks))

        # ── Invoke LLM per chunk, merge results ──────────────────────────────
        all_scenes: list[ScriptSceneBase] = []
        any_truncated = False
        for chunk_text in chunks:
            chunk_scenes, chunk_truncated = _invoke_storyboard_chunk(
                chunk_text,
                character_context,
                world_context,
                global_aesthetic,
                render_style,
                director_style,
                scene_number_offset=len(all_scenes),
            )
            all_scenes.extend(chunk_scenes)
            if chunk_truncated:
                any_truncated = True

        return all_scenes, any_truncated

    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Storyboard stage LLM inference failed: {e}",
        )
