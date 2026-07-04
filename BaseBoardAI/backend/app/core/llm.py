"""
LLM orchestration layer — IBM WatsonX Granite via LangChain.

Exposes three stage functions matching the 3-stage pipeline:
  invoke_character_stage  → list[CharacterProfileBase]
  invoke_world_stage      → list[EnvironmentProfileBase]
  invoke_storyboard_stage → list[ScriptSceneBase]

Each function:
  1. Formats the relevant prompt template with caller-supplied context
  2. Calls the Granite model
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
from langchain_ibm import WatsonxLLM
from langchain_core.prompts import PromptTemplate

from app.core.config import settings
from app.core.prompts import CHARACTER_PROMPT, WORLD_PROMPT, STORYBOARD_PROMPT
from app.schemas.storyboard import (
    CharacterProfileBase,
    EnvironmentProfileBase,
    ScriptSceneBase,
)


# ---------------------------------------------------------------------------
# LLM client factory
# ---------------------------------------------------------------------------

def _build_llm() -> WatsonxLLM:
    """Initialise and return a WatsonxLLM instance from current settings."""
    return WatsonxLLM(
        model_id=settings.WATSONX_MODEL_ID,
        url=settings.WATSONX_URL,
        apikey=settings.WATSONX_API_KEY,
        project_id=settings.WATSONX_PROJECT_ID,
        params={
            "max_new_tokens": 2000,
            "temperature": 0.2,
            "decoding_method": "greedy",
        },
    )


# ---------------------------------------------------------------------------
# JSON response parser
# ---------------------------------------------------------------------------

def _parse_json_response(raw: str) -> Any:
    """
    Strip markdown code fences if present, then parse as JSON.
    Raises ValueError with context if parsing fails.
    """
    # Remove ```json ... ``` or ``` ... ``` wrappers
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip())
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON: {e}\nRaw output:\n{raw[:500]}")


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
        llm = _build_llm()
        template = PromptTemplate(
            input_variables=["raw_character_notes"],
            template=CHARACTER_PROMPT,
        )
        prompt_text = template.format(raw_character_notes=raw_notes)
        raw_response = llm.invoke(prompt_text)
        parsed = _parse_json_response(raw_response)
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
        llm = _build_llm()
        template = PromptTemplate(
            input_variables=["raw_world_notes"],
            template=WORLD_PROMPT,
        )
        prompt_text = template.format(raw_world_notes=raw_notes)
        raw_response = llm.invoke(prompt_text)
        parsed = _parse_json_response(raw_response)
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

def invoke_storyboard_stage(
    characters: list[CharacterProfileBase],
    environments: list[EnvironmentProfileBase],
    raw_script_text: str,
    global_aesthetic: str,
    render_style: str = 'bw_sketch',
) -> list[ScriptSceneBase]:
    """
    Run STORYBOARD_PROMPT with compiled character + world context and the raw screenplay.
    Returns a validated list of ScriptSceneBase objects.
    Raises HTTPException(502) on LLM or validation failure.

    Characters and environments are serialised to compact JSON strings and injected
    into the prompt so Granite can reference locked identifiers in action_breakdown.
    """
    try:
        character_context = json.dumps(
            [c.model_dump() for c in characters], indent=2
        )
        world_context = json.dumps(
            [e.model_dump() for e in environments], indent=2
        )
        llm = _build_llm()
        template = PromptTemplate(
            input_variables=["character_context", "world_context", "raw_script_text", "global_aesthetic", "render_style"],
            template=STORYBOARD_PROMPT,
        )
        prompt_text = template.format(
            character_context=character_context,
            world_context=world_context,
            raw_script_text=raw_script_text,
            global_aesthetic=global_aesthetic,
            render_style=render_style,
        )
        raw_response = llm.invoke(prompt_text)
        parsed = _parse_json_response(raw_response)
        if not isinstance(parsed, list):
            parsed = [parsed]
        return [ScriptSceneBase.model_validate(item) for item in parsed]
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Storyboard stage LLM inference failed: {e}",
        )
