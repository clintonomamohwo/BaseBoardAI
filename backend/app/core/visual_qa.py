"""
visual_qa.py — Gemini Vision QA and Visual DNA bridge.

Two responsibilities:

1. Visual QA (qa_frame)
   Sends a generated storyboard frame image + character reference + context to
   Gemini Vision and returns a structured QA report:
     - Continuity score (0–100)
     - Passed checks (✓)
     - Warnings (⚠)
     - Recommendation for regeneration

2. Visual DNA Bridge (extract_visual_dna)
   After Gemini Imagen generates a character reference sheet, this module sends
   that image to Gemini Vision and receives a hyper-detailed Visual DNA Token —
   a single dense paragraph that anchors the character's appearance.

   When storyboard frames are later generated via Pollinations (open-source models),
   every prompt is prefixed with this token so the character looks consistent
   across the latent-space boundary between Imagen and Flux/SDXL.

Pipeline position:

   Imagen character gen → extract_visual_dna() → store in canon.visual_dna[char_id]
                                                          ↓
   Pollinations frame gen ← inject_visual_dna_prefix(prompt, char_ids, canon)

Public API
----------
   extract_visual_dna(image_b64, character_name) → str
   inject_visual_dna_prefix(prompt, character_names, canon) → str
   qa_frame(frame_image_b64, character_refs, scene_context) → QAReport
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# QA report dataclass
# ---------------------------------------------------------------------------

@dataclass
class QAReport:
    score: int                          # 0–100 overall continuity score
    passed: list[str] = field(default_factory=list)   # ✓ checks that passed
    warnings: list[str] = field(default_factory=list) # ⚠ issues found
    recommendation: str = ""           # Suggested fix if score < threshold
    raw_response: str = ""             # Full model response for debugging

    @property
    def passed_threshold(self) -> bool:
        return self.score >= 80

    def format_summary(self) -> str:
        lines = [f"Continuity Score: {self.score}%", ""]
        for p in self.passed:
            lines.append(f"✓ {p}")
        for w in self.warnings:
            lines.append(f"⚠ {w}")
        if self.recommendation:
            lines += ["", f"Recommendation: {self.recommendation}"]
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Visual DNA extraction
# ---------------------------------------------------------------------------

def extract_visual_dna(image_b64: str, character_name: str) -> str:
    """
    Send a character reference image to Gemini Vision and return a Visual DNA
    Token — a dense paragraph describing the character's exact appearance.

    This token is stored in the Project Canon and injected into every storyboard
    prompt that features this character, ensuring cross-provider consistency
    (Imagen reference → Pollinations storyboard frames).

    Returns an empty string if the vision provider is unavailable or fails.
    """
    if not settings.GEMINI_API_KEY:
        logger.warning("extract_visual_dna: GEMINI_API_KEY not set — skipping.")
        return ""
    try:
        from app.core.ai_factory import AIFactory
        vision = AIFactory.get_vision_provider()
        dna = vision.extract_visual_dna(image_b64, character_name)
        logger.info("Visual DNA extracted for '%s' (%d chars)", character_name, len(dna))
        return dna
    except Exception as exc:
        logger.warning("Visual DNA extraction failed for '%s': %s", character_name, exc)
        return ""


# ---------------------------------------------------------------------------
# Visual DNA prompt injection
# ---------------------------------------------------------------------------

def inject_visual_dna_prefix(
    prompt: str,
    character_names: list[str],
    visual_dna: dict[str, str],
) -> str:
    """
    Prepend the Visual DNA tokens for all characters present in this frame
    to the storyboard generation prompt.

    Args:
        prompt:          The assembled storyboard frame prompt.
        character_names: Names of characters present in this frame.
        visual_dna:      Mapping of character_name → DNA token string,
                         stored in canon or passed from the pipeline.

    Returns the enriched prompt string. If no DNA tokens are found for the
    characters in this frame, returns the original prompt unchanged.
    """
    tokens: list[str] = []
    for name in character_names:
        dna = visual_dna.get(name) or visual_dna.get(name.upper()) or ""
        if dna:
            tokens.append(f"[{name}] {dna.strip()}")

    if not tokens:
        return prompt

    prefix = " | ".join(tokens)
    enriched = f"{prefix} || {prompt}"
    # Cap at 900 chars so Pollinations URL length stays manageable
    return enriched[:900]


# ---------------------------------------------------------------------------
# Visual QA
# ---------------------------------------------------------------------------

_QA_PROMPT_TEMPLATE = """\
You are a professional storyboard continuity supervisor.

CHARACTER REFERENCES:
{character_refs}

SCENE CONTEXT:
{scene_context}

Analyze the provided storyboard frame image and return a JSON object with:
{{
  "score": <integer 0-100>,
  "passed": ["list of checks that passed"],
  "warnings": ["list of issues found"],
  "recommendation": "single sentence fix suggestion if score < 80, else empty string"
}}

Check for:
- Species consistency with character references
- Outfit / wardrobe consistency
- Correct accessories and props
- Facial feature consistency
- Lighting matches scene description
- Camera angle matches shot_type
- Expression matches emotional tone
- No extra limbs or anatomical errors
- No missing signature features (tail, wings, markings)

Return ONLY valid JSON. No markdown fences. No explanation outside the JSON.
"""


def qa_frame(
    frame_image_b64: str,
    character_refs: dict[str, str],   # {character_name: description_or_dna_token}
    scene_context: str,
) -> QAReport:
    """
    Run Gemini Vision QA on a generated storyboard frame.

    Args:
        frame_image_b64: Base64 data URL of the generated frame image.
        character_refs:  Dict of character name → DNA token or wardrobe summary.
        scene_context:   Shot type, mood, lighting, and narrative action as a string.

    Returns a QAReport. On any failure, returns a minimal passing report so the
    pipeline is never blocked by QA unavailability.
    """
    if not settings.GEMINI_API_KEY:
        logger.warning("qa_frame: GEMINI_API_KEY not set — QA skipped.")
        return QAReport(score=0, warnings=["QA skipped — GEMINI_API_KEY not configured"])

    refs_text = "\n".join(f"- {name}: {desc}" for name, desc in character_refs.items())
    prompt = _QA_PROMPT_TEMPLATE.format(
        character_refs=refs_text or "No character references available.",
        scene_context=scene_context,
    )

    try:
        from app.core.ai_factory import AIFactory
        vision = AIFactory.get_vision_provider()
        raw = vision.analyze(frame_image_b64, prompt)
        return _parse_qa_response(raw)
    except Exception as exc:
        logger.warning("qa_frame failed: %s", exc)
        return QAReport(score=0, warnings=[f"QA error: {exc}"])


def _parse_qa_response(raw: str) -> QAReport:
    """Parse the model's JSON response into a QAReport."""
    import json
    import re

    # Strip markdown fences if present
    text = raw.strip()
    fence = re.search(r"```(?:json)?\s*\n?(.*?)```", text, re.DOTALL | re.IGNORECASE)
    if fence:
        text = fence.group(1).strip()

    try:
        data = json.loads(text)
        return QAReport(
            score=int(data.get("score", 0)),
            passed=list(data.get("passed", [])),
            warnings=list(data.get("warnings", [])),
            recommendation=str(data.get("recommendation", "")),
            raw_response=raw,
        )
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("QA response parse failed: %s\nRaw: %s", exc, raw[:300])
        return QAReport(
            score=0,
            warnings=["QA response could not be parsed"],
            raw_response=raw,
        )
