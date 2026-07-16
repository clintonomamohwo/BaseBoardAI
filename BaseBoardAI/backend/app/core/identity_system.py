"""
Character Identity System — core layer of the Creative Knowledge Graph.

Separates a character's IDENTITY from its SPECIES, VARIANTS, and RENDERING STYLE.
These four layers are always independent — changing one never overwrites the others.

Architecture
------------
  Identity       — who they ARE (face, proportions, markers, signature features)
  Species        — what anatomy they have (human, elf, wolf, dragon, robot …)
  Variants       — how they are dressed/aged/transformed at a given point
  Rendering Style— the artistic register (anime, sketch, painterly, 3D …)

Public API
----------
  SPECIES_REGISTRY            — built-in species profiles (defaulting to human)
  build_identity_prompt(identity, species_id, variant, render_style) -> str
  compute_qa_score(frame_desc, identity, species_id, variant) -> QAScoreResult
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.schemas.storyboard import (
        CharacterIdentity,
        CharacterVariant,
        QAScoreResult,
    )

# ---------------------------------------------------------------------------
# Species Registry — built-in profiles
# Default species is Human; all characters are Human unless overridden.
# ---------------------------------------------------------------------------

SPECIES_REGISTRY: dict[str, dict[str, Any]] = {
    "human": {
        "id": "human",
        "label": "Human",
        "limbs": "2 arms, 2 legs",
        "anatomy_notes": "Standard bipedal human anatomy. No tail, no wings, no horns.",
        "ear_shape": "standard rounded",
        "extra_features": [],
        "qa_anatomy_rules": [
            "exactly 2 arms",
            "exactly 2 legs",
            "no tail visible",
            "no wings visible",
            "no horns",
            "human ear shape",
        ],
        "prompt_prefix": "",   # no extra prefix needed for humans
    },
    "elf": {
        "id": "elf",
        "label": "Elf",
        "limbs": "2 arms, 2 legs",
        "anatomy_notes": "Human base with pointed ears, slightly elongated proportions.",
        "ear_shape": "pointed, elongated",
        "extra_features": ["pointed ears", "elongated limbs"],
        "qa_anatomy_rules": [
            "exactly 2 arms",
            "exactly 2 legs",
            "pointed ears clearly visible",
            "no tail",
            "no wings",
            "no horns",
        ],
        "prompt_prefix": "elf character, pointed ears, elongated graceful proportions, ",
    },
    "wolf": {
        "id": "wolf",
        "label": "Wolf / Werewolf",
        "limbs": "4 legs (or 2 legs 2 arms if werewolf)",
        "anatomy_notes": "Fur-covered, canine features, tail present.",
        "ear_shape": "pointed canine",
        "extra_features": ["fur", "tail", "snout", "canine teeth"],
        "qa_anatomy_rules": [
            "fur texture visible",
            "tail present",
            "canine snout",
            "pointed ears",
        ],
        "prompt_prefix": "wolf character, fur, canine features, tail, snout, ",
    },
    "dragon": {
        "id": "dragon",
        "label": "Dragon",
        "limbs": "4 legs, 2 wings",
        "anatomy_notes": "Large scaled creature with wings, tail, and horns.",
        "ear_shape": "horned",
        "extra_features": ["wings", "tail", "scales", "horns", "claws"],
        "qa_anatomy_rules": [
            "wings present",
            "tail present",
            "scales visible",
            "horns present",
            "4 limbs",
        ],
        "prompt_prefix": "dragon character, scales, wings, horns, tail, claws, ",
    },
    "robot": {
        "id": "robot",
        "label": "Robot / Android",
        "limbs": "2 arms, 2 legs (mechanical)",
        "anatomy_notes": "Mechanical limbs, sensor array, no biological anatomy.",
        "ear_shape": "sensor panel or none",
        "extra_features": ["mechanical joints", "sensors", "plating", "LED indicators"],
        "qa_anatomy_rules": [
            "mechanical limb construction",
            "no organic skin texture",
            "visible joints or plating",
        ],
        "prompt_prefix": "robot android character, mechanical limbs, metal plating, sensor eyes, ",
    },
    "vampire": {
        "id": "vampire",
        "label": "Vampire",
        "limbs": "2 arms, 2 legs",
        "anatomy_notes": "Human base with pale skin, fangs, and often sharp features.",
        "ear_shape": "slightly pointed",
        "extra_features": ["fangs", "pale complexion", "sharp features"],
        "qa_anatomy_rules": [
            "pale complexion",
            "fangs visible or implied",
            "human bipedal anatomy",
        ],
        "prompt_prefix": "vampire character, pale skin, fangs, sharp features, dark atmosphere, ",
    },
    "custom": {
        "id": "custom",
        "label": "Custom Species",
        "limbs": "user-defined",
        "anatomy_notes": "Custom species — anatomy defined by user notes.",
        "ear_shape": "user-defined",
        "extra_features": [],
        "qa_anatomy_rules": [],
        "prompt_prefix": "",
    },
}

DEFAULT_SPECIES_ID = "human"


def get_species(species_id: str) -> dict[str, Any]:
    """Return the species profile for the given id. Falls back to human."""
    return SPECIES_REGISTRY.get(species_id.lower(), SPECIES_REGISTRY[DEFAULT_SPECIES_ID])


# ---------------------------------------------------------------------------
# Prompt building
# ---------------------------------------------------------------------------

def build_identity_prompt(
    identity: "CharacterIdentity",
    species_id: str = DEFAULT_SPECIES_ID,
    variant: "CharacterVariant | None" = None,
    render_style: str = "bw_sketch",
) -> str:
    """
    Build a canonical identity-grounded character description for image generation.

    Layer order:
      1. Species prefix (anatomy constraints)
      2. Core identity (face, proportions, markers, hair, eyes)
      3. Active variant overrides (outfit, hair colour, accessories, age)
      4. Render style modifier

    Only the variant layer changes per scene. Identity and species never change.
    """
    species = get_species(species_id)

    # ── Layer 1: Species ──────────────────────────────────────────────────────
    parts: list[str] = []
    if species["prompt_prefix"]:
        parts.append(species["prompt_prefix"].rstrip(", "))

    # ── Layer 2: Core Identity ────────────────────────────────────────────────
    parts.append(identity.name)

    if identity.face_description:
        parts.append(identity.face_description)
    if identity.hair_description:
        parts.append(identity.hair_description)
    if identity.eye_description:
        parts.append(identity.eye_description)
    if identity.body_proportions:
        parts.append(identity.body_proportions)
    if identity.age is not None:
        parts.append(f"age {identity.age}")
    if identity.distinct_markers:
        parts.append(identity.distinct_markers)
    for acc in (identity.signature_accessories or []):
        parts.append(acc)

    # ── Layer 3: Active Variant ───────────────────────────────────────────────
    if variant:
        if variant.outfit:
            parts.append(f"wearing {variant.outfit}")
        if variant.hair_override:
            # Replace hair_description with the variant override
            parts = [p for p in parts if p != identity.hair_description]
            parts.append(variant.hair_override)
        if variant.age_override is not None:
            parts = [p for p in parts if not p.startswith("age ")]
            parts.append(f"age {variant.age_override}")
        for extra in (variant.extra_accessories or []):
            parts.append(extra)
        if variant.species_override:
            override_species = get_species(variant.species_override)
            if override_species["prompt_prefix"]:
                parts.insert(0, override_species["prompt_prefix"].rstrip(", "))

    # ── Layer 4: Render style modifier ───────────────────────────────────────
    # (style prefix is prepended by prompt_builder — not duplicated here)

    return ", ".join(p.strip() for p in parts if p.strip())


# ---------------------------------------------------------------------------
# QA scoring (heuristic — no vision model required at v1)
# ---------------------------------------------------------------------------

# Weights for each QA category
_QA_WEIGHTS: dict[str, float] = {
    "identity":    0.30,
    "species":     0.15,
    "anatomy":     0.15,
    "composition": 0.15,
    "lighting":    0.10,
    "props":       0.05,
    "continuity":  0.10,
}


def compute_qa_score(
    generated_prompt: str,
    identity: "CharacterIdentity",
    species_id: str = DEFAULT_SPECIES_ID,
    variant: "CharacterVariant | None" = None,
) -> "QAScoreResult":
    """
    Heuristic QA engine — v1.

    Evaluates how well the generation prompt encodes the character identity,
    species anatomy rules, and active variant. Returns category scores and
    an overall weighted confidence.

    This is prompt-level QA (not pixel-level). Pixel-level validation
    requires a vision model and is planned for v2.
    """
    from app.schemas.storyboard import QAScoreResult

    prompt_lower = generated_prompt.lower()
    species = get_species(species_id)

    # ── Identity score: how many identity markers appear in the prompt ────────
    identity_markers: list[str] = []
    if identity.name:
        identity_markers.append(identity.name.lower())
    if identity.hair_description:
        identity_markers.extend(identity.hair_description.lower().split())
    if identity.eye_description:
        identity_markers.extend(identity.eye_description.lower().split())
    if identity.distinct_markers:
        identity_markers.append(identity.distinct_markers.lower())
    for acc in (identity.signature_accessories or []):
        identity_markers.append(acc.lower())

    identity_hits = sum(1 for m in identity_markers if m in prompt_lower)
    identity_score = min(1.0, identity_hits / max(len(identity_markers), 1))

    # ── Species score: anatomy prefix present ────────────────────────────────
    species_prefix = species.get("prompt_prefix", "").lower().strip(", ")
    species_score = 1.0 if (not species_prefix or species_prefix in prompt_lower) else 0.6

    # ── Anatomy score: no contradicting features ──────────────────────────────
    # Penalise if forbidden anatomy appears (e.g. "tail" for humans)
    forbidden: dict[str, list[str]] = {
        "human":   ["tail", "wings", "horns", "snout", "scales", "fangs"],
        "elf":     ["tail", "wings", "scales"],
        "wolf":    [],
        "dragon":  [],
        "robot":   ["skin", "hair", "organic"],
        "vampire": ["tail", "wings", "scales"],
    }
    forbidden_terms = forbidden.get(species_id, [])
    violations = sum(1 for t in forbidden_terms if t in prompt_lower)
    anatomy_score = max(0.0, 1.0 - violations * 0.25)

    # ── Composition score: shot type + camera angle present ──────────────────
    composition_keywords = ["shot", "angle", "view", "wide", "close", "medium", "ots", "pov"]
    composition_score = 1.0 if any(k in prompt_lower for k in composition_keywords) else 0.7

    # ── Lighting score: lighting notes present ────────────────────────────────
    lighting_keywords = ["light", "shadow", "ambient", "soft", "hard", "rim", "glow", "dark", "bright"]
    lighting_score = 1.0 if any(k in prompt_lower for k in lighting_keywords) else 0.75

    # ── Props score: variant accessories mentioned ────────────────────────────
    props_score = 1.0
    if variant and variant.extra_accessories:
        prop_hits = sum(1 for acc in variant.extra_accessories if acc.lower() in prompt_lower)
        props_score = prop_hits / len(variant.extra_accessories)

    # ── Continuity score: canonical outfit / wardrobe present ─────────────────
    continuity_score = 1.0
    if variant and variant.outfit:
        continuity_score = 1.0 if variant.outfit.lower() in prompt_lower else 0.65

    # ── Weighted overall ──────────────────────────────────────────────────────
    breakdown = {
        "identity":    round(identity_score,    3),
        "species":     round(species_score,     3),
        "anatomy":     round(anatomy_score,     3),
        "composition": round(composition_score, 3),
        "lighting":    round(lighting_score,    3),
        "props":       round(props_score,       3),
        "continuity":  round(continuity_score,  3),
    }
    overall = round(
        sum(_QA_WEIGHTS[k] * v for k, v in breakdown.items()), 3
    )

    warning: str | None = None
    if overall < 0.80:
        low = [k for k, v in breakdown.items() if v < 0.75]
        warning = f"Low confidence in: {', '.join(low)}. Consider regenerating."

    return QAScoreResult(
        overall=overall,
        breakdown=breakdown,
        warning=warning,
        passed=overall >= 0.80,
    )
