"""
Character DNA System — core layer of the Creative Knowledge Graph.

Separates a character's IDENTITY from its SPECIES, PHYSICAL FORM, CLASSIFICATION,
ABILITIES, VARIANTS, and RENDERING STYLE.
All layers are always independent — changing one never overwrites the others.

Architecture
------------
  Identity        — who they ARE (face, proportions, markers, signature features)
  Species         — what anatomy subtype they have (human, elf, wolf, dragon, robot …)
  Physical Form   — structural anatomy category (humanoid, quadruped, dragon, bird …)
                    DISTINCT from classification. Zeus: humanoid+god. Dragon God: dragon+god.
  Classification  — narrative role (god, demon, hero, villain …)
                    DOES NOT AFFECT anatomy — only story logic and cinematic behaviour.
  Abilities       — powers that influence Director Engine shot selection
                    (flight → aerial shots; fire_breath → wide or extreme close)
  Variants        — how they are dressed/aged/transformed at a given point
  Rendering Style — the artistic register (anime, sketch, painterly, 3D …)

QA Engine (v2)
--------------
  Project-Aware Visual QA — validates every generated image against the Project Canon.
  Does NOT assume human anatomy. Asset type determines which structural validator loads:

    asset_type='character'  → CharacterValidator  (humanoids: human, elf, vampire …)
    asset_type='creature'   → CreatureValidator   (non-humanoid fantasy: dragon, wolf …)
    asset_type='animal'     → AnimalValidator     (real-world animals: horse, cat …)
    asset_type='robot'      → RobotValidator      (mechanical constructs, androids …)
    asset_type='vehicle'    → VehicleValidator    (cars, ships, spacecraft …)

  Nine scored categories (weights sum to 1.0):
    identity, species, anatomy, composition, camera, lighting, props, environment, continuity

  Every category that scores < 0.85 produces a QARepairAction with:
    - label   → human-readable fix ("Regenerate Composition Only")
    - endpoint → the exact API endpoint to call
    - severity → 'critical' | 'warning' | 'suggestion'

Public API
----------
  SPECIES_REGISTRY            — built-in species profiles (defaulting to human)
  VEHICLE_REGISTRY            — built-in vehicle type profiles
  ANIMAL_REGISTRY             — built-in animal type profiles
  CLASSIFICATION_SHOT_HINTS   — preferred shot profiles keyed by classification
  ABILITY_SHOT_HINTS          — shot modifiers keyed by ability name
  PHYSICAL_FORM_ASSET_TYPE    — maps physical form to asset_type for QA dispatch
  get_species(species_id)     — returns species profile, falls back to human
  build_identity_prompt(identity, species_id, variant, classification, abilities, render_style) -> str
  get_director_hints(classification, abilities, physical_form) -> dict
  compute_qa_score(
      generated_prompt, identity, species_id, variant,
      asset_type, scene_context, camera_spec
  ) -> QAScoreResult
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Literal

if TYPE_CHECKING:
    from app.schemas.storyboard import (
        CharacterIdentity,
        CharacterVariant,
        QARepairAction,
        QAScoreResult,
    )

# ---------------------------------------------------------------------------
# Species Registry — humanoids & fantasy creatures
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
        "required_features": [],
        "forbidden_features": ["tail", "wings", "horns", "snout", "scales", "fangs", "fur", "claws"],
        "qa_anatomy_rules": [
            "exactly 2 arms",
            "exactly 2 legs",
            "no tail visible",
            "no wings visible",
            "no horns",
            "human ear shape",
        ],
        "prompt_prefix": "",
    },
    "elf": {
        "id": "elf",
        "label": "Elf",
        "limbs": "2 arms, 2 legs",
        "anatomy_notes": "Human base with pointed ears, slightly elongated proportions.",
        "ear_shape": "pointed, elongated",
        "extra_features": ["pointed ears", "elongated limbs"],
        "required_features": ["pointed ears"],
        "forbidden_features": ["tail", "wings", "scales", "fur", "snout"],
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
        "required_features": ["fur", "tail"],
        "forbidden_features": ["wings", "scales", "mechanical", "metal"],
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
        "required_features": ["wings", "scales", "tail"],
        "forbidden_features": ["fur", "mechanical", "metal plating"],
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
        "required_features": ["mechanical", "metal"],
        "forbidden_features": ["skin", "hair", "organic", "fur", "scales", "wings", "tail"],
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
        "required_features": ["pale", "fangs"],
        "forbidden_features": ["tail", "wings", "scales", "fur"],
        "qa_anatomy_rules": [
            "pale complexion",
            "fangs visible or implied",
            "human bipedal anatomy",
        ],
        "prompt_prefix": "vampire character, pale skin, fangs, sharp features, dark atmosphere, ",
    },
    "tortoise": {
        "id": "tortoise",
        "label": "Giant Tortoise",
        "limbs": "2 arms, 2 legs (anthropomorphic)",
        "anatomy_notes": "Anthropomorphic giant tortoise humanoid. Large domed shell on back, scaled reptilian skin, beaked tortoise face, powerful limbs.",
        "ear_shape": "none (reptilian head)",
        "extra_features": ["domed shell", "scaled skin", "beak", "reptilian limbs", "claws"],
        "required_features": ["shell", "scales", "beak"],
        "forbidden_features": ["fur", "human ears", "human nose", "smooth skin"],
        "qa_anatomy_rules": [
            "large domed shell visible on back",
            "scaled skin texture",
            "beaked tortoise face",
            "reptilian limbs",
            "no fur",
            "no human facial features",
        ],
        "prompt_prefix": "anthropomorphic giant tortoise humanoid, large domed shell on back, scaled reptilian skin, beaked tortoise face, powerful reptilian limbs, ",
    },
    "hare": {
        "id": "hare",
        "label": "Hare",
        "limbs": "2 arms, 2 legs (anthropomorphic)",
        "anatomy_notes": "Anthropomorphic hare humanoid. Long upright ears, fur-covered, lean athletic build, rabbit-like face.",
        "ear_shape": "long upright rabbit ears",
        "extra_features": ["long ears", "fur", "rabbit face", "digitigrade legs"],
        "required_features": ["long ears", "fur"],
        "forbidden_features": ["scales", "shell", "wings", "human ears", "smooth skin"],
        "qa_anatomy_rules": [
            "long upright rabbit ears visible",
            "fur texture present",
            "rabbit-like face",
            "no human ears",
            "no scales",
        ],
        "prompt_prefix": "anthropomorphic hare humanoid, long upright rabbit ears, fur-covered, rabbit face, lean athletic build, ",
    },
    "panther": {
        "id": "panther",
        "label": "Black Panther",
        "limbs": "2 arms, 2 legs (anthropomorphic)",
        "anatomy_notes": "Anthropomorphic black panther humanoid. Sleek black fur, feline facial features, cat ears, retractable claws.",
        "ear_shape": "pointed cat ears",
        "extra_features": ["black fur", "cat ears", "feline face", "claws", "tail"],
        "required_features": ["black fur", "cat ears", "feline features"],
        "forbidden_features": ["scales", "shell", "wings", "human ears", "smooth skin", "human nose"],
        "qa_anatomy_rules": [
            "sleek black fur texture",
            "pointed cat ears",
            "feline facial features",
            "tail present",
            "no human ears",
        ],
        "prompt_prefix": "anthropomorphic black panther humanoid, sleek black fur, feline face, pointed cat ears, tail, retractable claws, ",
    },
    "bear": {
        "id": "bear",
        "label": "Bear",
        "limbs": "2 arms, 2 legs (anthropomorphic)",
        "anatomy_notes": "Anthropomorphic bear humanoid. Dense fur, broad powerful build, ursine facial features, round ears.",
        "ear_shape": "small rounded bear ears",
        "extra_features": ["dense fur", "bear snout", "claws", "tail"],
        "required_features": ["fur", "bear snout", "round ears"],
        "forbidden_features": ["scales", "shell", "wings", "smooth skin"],
        "qa_anatomy_rules": [
            "dense fur texture",
            "round bear ears",
            "ursine snout",
            "powerful build",
            "no scales",
        ],
        "prompt_prefix": "anthropomorphic bear humanoid, dense fur, ursine face, round bear ears, powerful broad build, ",
    },
    "fox": {
        "id": "fox",
        "label": "Fox",
        "limbs": "2 arms, 2 legs (anthropomorphic)",
        "anatomy_notes": "Anthropomorphic fox humanoid. Fur, pointed snout, large triangular ears, bushy tail.",
        "ear_shape": "large triangular fox ears",
        "extra_features": ["fur", "pointed snout", "large ears", "bushy tail"],
        "required_features": ["fur", "fox ears", "bushy tail"],
        "forbidden_features": ["scales", "shell", "wings", "smooth skin"],
        "qa_anatomy_rules": [
            "large triangular fox ears",
            "fur texture",
            "pointed fox snout",
            "bushy tail",
        ],
        "prompt_prefix": "anthropomorphic fox humanoid, fur, triangular fox ears, pointed snout, bushy tail, ",
    },
    "custom": {
        "id": "custom",
        "label": "Custom Species",
        "limbs": "user-defined",
        "anatomy_notes": "Custom species — anatomy defined by user notes.",
        "ear_shape": "user-defined",
        "extra_features": [],
        "required_features": [],
        "forbidden_features": [],
        "qa_anatomy_rules": [],
        "prompt_prefix": "",
    },
}

# ---------------------------------------------------------------------------
# Vehicle Registry — no biological anatomy assumed
# ---------------------------------------------------------------------------

VEHICLE_REGISTRY: dict[str, dict[str, Any]] = {
    "car": {
        "id": "car",
        "label": "Car / Road Vehicle",
        "required_features": ["wheels", "body panel", "windscreen"],
        "forbidden_features": ["wings", "fins", "organic", "fur", "skin"],
        "qa_anatomy_rules": ["4 wheels visible", "body panel present", "windscreen present"],
        "prompt_prefix": "automobile, road vehicle, ",
    },
    "spacecraft": {
        "id": "spacecraft",
        "label": "Spacecraft",
        "required_features": ["hull", "thruster", "cockpit"],
        "forbidden_features": ["wheels", "organic", "fur", "skin"],
        "qa_anatomy_rules": ["hull structure present", "thruster or engine visible"],
        "prompt_prefix": "spacecraft, futuristic vessel, ",
    },
    "ship": {
        "id": "ship",
        "label": "Naval Vessel / Ship",
        "required_features": ["hull", "deck"],
        "forbidden_features": ["wheels", "wings", "organic"],
        "qa_anatomy_rules": ["hull present", "deck or mast visible"],
        "prompt_prefix": "naval vessel, ship, ",
    },
    "aircraft": {
        "id": "aircraft",
        "label": "Aircraft / Plane",
        "required_features": ["wings", "fuselage"],
        "forbidden_features": ["wheels on body", "organic", "fur"],
        "qa_anatomy_rules": ["wings present", "fuselage visible", "no biological anatomy"],
        "prompt_prefix": "aircraft, airplane, ",
    },
    "mech": {
        "id": "mech",
        "label": "Mech / Giant Robot",
        "required_features": ["mechanical joints", "cockpit", "armour plating"],
        "forbidden_features": ["organic", "fur", "skin", "scales"],
        "qa_anatomy_rules": ["mechanical construction", "armour plating", "cockpit or pilot hatch"],
        "prompt_prefix": "giant mech, mechanical suit, armour plating, ",
    },
}

# ---------------------------------------------------------------------------
# Animal Registry — real-world animals
# ---------------------------------------------------------------------------

ANIMAL_REGISTRY: dict[str, dict[str, Any]] = {
    "horse": {
        "id": "horse",
        "label": "Horse / Equine",
        "limbs": "4 legs",
        "required_features": ["mane", "hooves", "4 legs"],
        "forbidden_features": ["wings", "scales", "mechanical", "fangs"],
        "qa_anatomy_rules": ["4 legs visible", "mane present", "hooves"],
        "prompt_prefix": "horse, equine, four-legged, hooves, mane, ",
    },
    "cat": {
        "id": "cat",
        "label": "Cat / Feline",
        "limbs": "4 legs",
        "required_features": ["pointed ears", "tail", "fur", "whiskers"],
        "forbidden_features": ["wings", "scales", "mechanical", "horns"],
        "qa_anatomy_rules": ["4 legs", "pointed ears", "tail present", "fur texture"],
        "prompt_prefix": "cat, feline, four-legged, fur, whiskers, ",
    },
    "dog": {
        "id": "dog",
        "label": "Dog / Canine",
        "limbs": "4 legs",
        "required_features": ["fur", "tail", "snout"],
        "forbidden_features": ["wings", "scales", "mechanical", "horns"],
        "qa_anatomy_rules": ["4 legs", "snout", "tail present", "fur texture"],
        "prompt_prefix": "dog, canine, four-legged, fur, snout, ",
    },
    "bird": {
        "id": "bird",
        "label": "Bird / Avian",
        "limbs": "2 wings, 2 legs",
        "required_features": ["wings", "beak", "feathers"],
        "forbidden_features": ["fur", "scales", "mechanical", "teeth"],
        "qa_anatomy_rules": ["wings present", "beak visible", "feathers"],
        "prompt_prefix": "bird, avian, wings, beak, feathers, ",
    },
    "custom_animal": {
        "id": "custom_animal",
        "label": "Custom Animal",
        "limbs": "user-defined",
        "required_features": [],
        "forbidden_features": [],
        "qa_anatomy_rules": [],
        "prompt_prefix": "",
    },
}

DEFAULT_SPECIES_ID = "human"

# All registries merged for unified lookup
_ALL_REGISTRIES: dict[str, dict[str, Any]] = {
    **SPECIES_REGISTRY,
    **VEHICLE_REGISTRY,
    **ANIMAL_REGISTRY,
}


def get_species(species_id: str, label: str | None = None, custom_notes: str | None = None) -> dict[str, Any]:
    """
    Return the profile for the given species/asset id.

    The registry is open-ended: any species string is valid.
    - If the id is in the registry, return the full profile.
    - If it is unknown, synthesise a minimal profile from the label (or the id
      itself) so the prompt prefix is always meaningful rather than silently
      falling back to human anatomy.

    This means a character defined as species_id='giant_scorpion', label='Giant Scorpion'
    will produce "anthropomorphic giant scorpion humanoid" in the prompt without
    needing a registry entry.
    """
    sid = species_id.lower().strip() if species_id else DEFAULT_SPECIES_ID
    if sid in _ALL_REGISTRIES:
        return _ALL_REGISTRIES[sid]

    # Unknown species — synthesise from label or id so the prompt is still correct
    display = (label or sid.replace("_", " ")).strip()
    notes   = custom_notes or ""
    prefix  = f"anthropomorphic {display.lower()} humanoid"
    if notes:
        prefix = f"{prefix}, {notes}"
    prefix += ", "

    return {
        "id":               sid,
        "label":            display,
        "limbs":            "user-defined",
        "anatomy_notes":    f"Custom species: {display}. {notes}".strip(". "),
        "ear_shape":        "user-defined",
        "extra_features":   [],
        "required_features": [],
        "forbidden_features": [],
        "qa_anatomy_rules": [],
        "prompt_prefix":    prefix,
    }


# ---------------------------------------------------------------------------
# Classification → Director Engine shot hints
# ---------------------------------------------------------------------------

# Maps classification to preferred shot-type slug overrides.
# These BIAS shot selection — they do not override the scene profile completely.
# Weight = fractional additive increase applied on top of the base scene profile.
CLASSIFICATION_SHOT_HINTS: dict[str, dict[str, float]] = {
    "god":     {"establishing": 0.25, "wide": 0.20, "close": -0.10},
    "demon":   {"close": 0.20, "insert": 0.15, "wide": -0.10},
    "angel":   {"establishing": 0.20, "wide": 0.15, "aerial": 0.10},
    "deity":   {"establishing": 0.30, "wide": 0.25, "medium": -0.10},
    "monster": {"close": 0.20, "wide": 0.15, "tracking": 0.10},
    "villain": {"close": 0.15, "medium": 0.10, "establishing": 0.10},
    "hero":    {"wide": 0.15, "medium": 0.15, "close": 0.05},
    "alien":   {"establishing": 0.15, "wide": 0.10, "insert": 0.10},
    "robot":   {"medium": 0.15, "insert": 0.20, "close": 0.10},
    "spirit":  {"establishing": 0.20, "insert": 0.15, "wide": 0.10},
}

# Maps ability name to shot-type modifier and optional prompt hint
ABILITY_SHOT_HINTS: dict[str, dict[str, Any]] = {
    "flight": {
        "preferred_shots": ["aerial", "wide", "establishing"],
        "avoid_shots":     ["close"],
        "prompt_modifier": "aerial perspective, character in flight, ",
    },
    "teleportation": {
        "preferred_shots": ["insert", "close", "medium"],
        "avoid_shots":     [],
        "prompt_modifier": "energy flash, motion blur, mid-teleport, ",
    },
    "fire_breath": {
        "preferred_shots": ["wide", "extreme_wide", "close"],
        "avoid_shots":     ["ots"],
        "prompt_modifier": "fire breath, flames, dramatic orange glow, ",
    },
    "lightning": {
        "preferred_shots": ["wide", "establishing", "medium"],
        "avoid_shots":     [],
        "prompt_modifier": "lightning bolt, electric energy, dramatic flash, ",
    },
    "magic": {
        "preferred_shots": ["medium", "close", "insert"],
        "avoid_shots":     [],
        "prompt_modifier": "magical energy, arcane glow, ",
    },
    "super_strength": {
        "preferred_shots": ["wide", "medium", "tracking"],
        "avoid_shots":     [],
        "prompt_modifier": "power stance, dynamic action, ",
    },
    "shapeshifting": {
        "preferred_shots": ["medium", "close", "insert"],
        "avoid_shots":     [],
        "prompt_modifier": "mid-transformation, fluid form, ",
    },
    "immortality": {
        "preferred_shots": [],
        "avoid_shots":     [],
        "prompt_modifier": "",
    },
    "healing": {
        "preferred_shots": ["close", "insert"],
        "avoid_shots":     [],
        "prompt_modifier": "glowing aura, healing light, ",
    },
    "invisibility": {
        "preferred_shots": ["medium", "wide"],
        "avoid_shots":     [],
        "prompt_modifier": "semi-transparent silhouette, shimmer effect, ",
    },
    "mind_control": {
        "preferred_shots": ["close", "ots"],
        "avoid_shots":     [],
        "prompt_modifier": "intense eye contact, psychic energy, ",
    },
}

# Maps Physical Form to the correct QA asset_type for validator dispatch
PHYSICAL_FORM_ASSET_TYPE: dict[str, str] = {
    "humanoid":  "character",
    "quadruped": "creature",
    "dragon":    "creature",
    "bird":      "animal",
    "serpent":   "creature",
    "spirit":    "character",   # spirits use humanoid validator as fallback
    "robot":     "robot",
    "vehicle":   "vehicle",
    "hybrid":    "creature",
    "custom":    "character",   # custom falls back to character validator
}


def get_director_hints(
    classification: str | None = None,
    abilities: list[str] | None = None,
    physical_form: str = "humanoid",
) -> dict[str, Any]:
    """
    Return aggregated Director Engine hints for a character based on their
    Classification, Abilities, and Physical Form.

    Returns:
        {
          "shot_bias":        dict[str, float],  # per-shot-type additive bias
          "prompt_modifiers": list[str],         # ability prompt prefixes to inject
          "avoid_shots":      list[str],         # shot slugs to avoid for this character
          "asset_type":       str,               # QA validator to use
        }
    """
    shot_bias: dict[str, float] = {}
    prompt_modifiers: list[str] = []
    avoid_shots: list[str] = []

    # Classification bias
    if classification and classification in CLASSIFICATION_SHOT_HINTS:
        for shot, delta in CLASSIFICATION_SHOT_HINTS[classification].items():
            shot_bias[shot] = shot_bias.get(shot, 0.0) + delta

    # Ability biases + prompt modifiers
    for ability in (abilities or []):
        hint = ABILITY_SHOT_HINTS.get(ability)
        if not hint:
            continue
        for preferred in hint.get("preferred_shots", []):
            shot_bias[preferred] = shot_bias.get(preferred, 0.0) + 0.15
        for avoided in hint.get("avoid_shots", []):
            if avoided not in avoid_shots:
                avoid_shots.append(avoided)
        if hint.get("prompt_modifier"):
            prompt_modifiers.append(hint["prompt_modifier"])

    return {
        "shot_bias":        shot_bias,
        "prompt_modifiers": prompt_modifiers,
        "avoid_shots":      avoid_shots,
        "asset_type":       PHYSICAL_FORM_ASSET_TYPE.get(physical_form, "character"),
    }


# ---------------------------------------------------------------------------
# Prompt building
# ---------------------------------------------------------------------------

def build_identity_prompt(
    identity: "CharacterIdentity",
    species_id: str = DEFAULT_SPECIES_ID,
    variant: "CharacterVariant | None" = None,
    classification: str | None = None,
    abilities: list[str] | None = None,
    render_style: str = "bw_sketch",
    species_label: str | None = None,
    species_custom_notes: str | None = None,
) -> str:
    """
    Build a canonical identity-grounded character description for image generation.

    Layer order:
      1. Species prefix (anatomy constraints) — synthesised for any species, registered or not
      2. Classification modifier (god → divine authority, demon → menacing, etc.)
      3. Core identity (face, proportions, markers, hair, eyes)
      4. Active variant overrides (outfit, hair colour, accessories, age)
      5. Ability modifiers (flight → wings visible, fire_breath → flames, etc.)
      6. Render style modifier (prepended by prompt_builder — not duplicated here)

    Only the variant layer changes per scene. Identity and species never change.
    species_label and species_custom_notes are passed through to get_species so
    unknown species synthesise a correct prompt prefix from the display name.
    """
    species = get_species(species_id, label=species_label, custom_notes=species_custom_notes)

    # ── Layer 1: Species ──────────────────────────────────────────────────────
    parts: list[str] = []
    if species.get("prompt_prefix"):
        parts.append(species["prompt_prefix"].rstrip(", "))

    # ── Layer 2: Classification modifier ─────────────────────────────────────
    _CLASSIFICATION_MODIFIERS: dict[str, str] = {
        "god":     "divine authority, otherworldly presence",
        "demon":   "menacing, dark energy, infernal presence",
        "angel":   "radiant, divine light, celestial",
        "deity":   "transcendent, immortal aura, godlike scale",
        "monster": "terrifying, monstrous scale",
        "villain": "dark intensity, commanding menace",
        "hero":    "heroic bearing, determined expression",
        "alien":   "otherworldly features, alien physiology",
        "spirit":  "translucent, ethereal, ghost-like",
    }
    if classification and classification in _CLASSIFICATION_MODIFIERS:
        parts.append(_CLASSIFICATION_MODIFIERS[classification])

    # ── Layer 3: Core Identity ────────────────────────────────────────────────
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

    # ── Layer 4: Active Variant ───────────────────────────────────────────────
    if variant:
        if variant.outfit:
            parts.append(f"wearing {variant.outfit}")
        if variant.hair_override:
            parts = [p for p in parts if p != identity.hair_description]
            parts.append(variant.hair_override)
        if variant.age_override is not None:
            parts = [p for p in parts if not p.startswith("age ")]
            parts.append(f"age {variant.age_override}")
        for extra in (variant.extra_accessories or []):
            parts.append(extra)
        if variant.species_override:
            override_species = get_species(variant.species_override)
            if override_species.get("prompt_prefix"):
                parts.insert(0, override_species["prompt_prefix"].rstrip(", "))

    # ── Layer 5: Ability modifiers ────────────────────────────────────────────
    for ability in (abilities or []):
        hint = ABILITY_SHOT_HINTS.get(ability)
        if hint and hint.get("prompt_modifier"):
            parts.append(hint["prompt_modifier"].rstrip(", "))

    return ", ".join(p.strip() for p in parts if p.strip())


# ---------------------------------------------------------------------------
# QA Engine v2 — Project-Aware Visual QA
# ---------------------------------------------------------------------------

# 9-category weight table.  Weights sum to 1.0.
_QA_WEIGHTS: dict[str, float] = {
    "identity":    0.25,
    "species":     0.12,
    "anatomy":     0.13,
    "composition": 0.12,
    "camera":      0.08,
    "lighting":    0.08,
    "props":       0.07,
    "environment": 0.07,
    "continuity":  0.08,
}

# Score thresholds for repair action severity
_CRITICAL_THRESHOLD   = 0.50
_WARNING_THRESHOLD    = 0.75
_SUGGESTION_THRESHOLD = 0.85

# Targeted repair action catalogue
# Maps category → (label, endpoint)
_REPAIR_CATALOGUE: dict[str, tuple[str, str]] = {
    "identity":    ("Regenerate with Identity Anchors",     "/storyboard/character-package/generate-one"),
    "species":     ("Regenerate with Species Constraints",  "/storyboard/character-package/generate-one"),
    "anatomy":     ("Regenerate Anatomy Pass",              "/storyboard/character-package/generate-one"),
    "composition": ("Regenerate Composition Only",          "/storyboard/frame/reforge-composition"),
    "camera":      ("Regenerate Camera Angle",              "/storyboard/frame/reforge-composition"),
    "lighting":    ("Regenerate Lighting Pass",             "/storyboard/frame/reforge-composition"),
    "props":       ("Regenerate Props Only",                "/storyboard/character-package/generate-one"),
    "environment": ("Regenerate Environment Pass",          "/storyboard/frame/reforge-composition"),
    "continuity":  ("Regenerate for Continuity",            "/storyboard/frame/reforge-composition"),
}

# Keywords used per category for prompt-level heuristic scoring
_COMPOSITION_KW = ["shot", "angle", "view", "wide", "close", "medium", "ots", "pov",
                   "establishing", "tracking", "extreme", "insert", "aerial"]
_CAMERA_KW      = ["lens", "mm", "focal", "depth", "bokeh", "focus", "dolly", "handheld",
                   "crane", "pan", "tilt", "static", "tracking", "zoom"]
_LIGHTING_KW    = ["light", "shadow", "ambient", "soft", "hard", "rim", "glow", "dark",
                   "bright", "diffuse", "key", "fill", "backlight", "silhouette"]
_ENVIRONMENT_KW = ["interior", "exterior", "int.", "ext.", "location", "background",
                   "indoor", "outdoor", "setting", "environment", "room", "forest",
                   "city", "street", "space", "ocean", "desert", "night", "day"]


def _severity(score: float) -> str:
    if score < _CRITICAL_THRESHOLD:
        return "critical"
    if score < _WARNING_THRESHOLD:
        return "warning"
    return "suggestion"


def _build_repairs(breakdown: dict[str, float]) -> "list[QARepairAction]":
    """
    Build an ordered list of targeted repair actions for any category below
    the suggestion threshold (0.85).  Ordered: critical first, then warning,
    then suggestion.
    """
    from app.schemas.storyboard import QARepairAction

    actions: list[QARepairAction] = []
    for cat, score in breakdown.items():
        if score < _SUGGESTION_THRESHOLD and cat in _REPAIR_CATALOGUE:
            label, endpoint = _REPAIR_CATALOGUE[cat]
            actions.append(QARepairAction(
                category=cat,
                label=label,
                endpoint=endpoint,
                severity=_severity(score),
                score=round(score, 3),
            ))

    # Sort: critical → warning → suggestion, then by score ascending (worst first)
    _order = {"critical": 0, "warning": 1, "suggestion": 2}
    actions.sort(key=lambda a: (_order[a.severity], a.score))
    return actions


# ---------------------------------------------------------------------------
# Per-asset-type validator dispatch
# ---------------------------------------------------------------------------

AssetType = Literal["character", "creature", "animal", "robot", "vehicle"]


def _validate_character(
    prompt_lower: str,
    identity: "CharacterIdentity",
    species_id: str,
    variant: "CharacterVariant | None",
) -> dict[str, float]:
    """
    Validator for humanoid characters (human, elf, vampire, custom humanoid).
    Checks identity markers, species anatomy rules, and outfit continuity.
    """
    species = get_species(species_id)

    # Identity — presence of face/hair/eye/marker tokens in prompt
    identity_markers: list[str] = []
    if identity.name:
        identity_markers.append(identity.name.lower())
    if identity.hair_description:
        identity_markers.extend(w for w in identity.hair_description.lower().split() if len(w) > 3)
    if identity.eye_description:
        identity_markers.extend(w for w in identity.eye_description.lower().split() if len(w) > 3)
    if identity.distinct_markers:
        identity_markers.append(identity.distinct_markers.lower())
    for acc in (identity.signature_accessories or []):
        identity_markers.append(acc.lower())

    identity_hits = sum(1 for m in identity_markers if m in prompt_lower)
    identity_score = min(1.0, identity_hits / max(len(identity_markers), 1))

    # Species — prefix + required features present, forbidden absent
    species_prefix = species.get("prompt_prefix", "").lower().strip(", ")
    has_prefix = not species_prefix or any(w in prompt_lower for w in species_prefix.split(","))
    required = species.get("required_features", [])
    required_hits = sum(1 for f in required if f.lower() in prompt_lower)
    required_score = (required_hits / len(required)) if required else 1.0
    species_score = round((0.6 * (1.0 if has_prefix else 0.5)) + (0.4 * required_score), 3)

    # Anatomy — forbidden terms absent
    forbidden = species.get("forbidden_features", [])
    violations = sum(1 for t in forbidden if t.lower() in prompt_lower)
    anatomy_score = max(0.0, 1.0 - violations * 0.25)

    # Props — variant accessories
    props_score = 1.0
    if variant and variant.extra_accessories:
        hits = sum(1 for acc in variant.extra_accessories if acc.lower() in prompt_lower)
        props_score = hits / len(variant.extra_accessories)

    # Continuity — outfit match
    continuity_score = 1.0
    if variant and variant.outfit:
        outfit_words = [w for w in variant.outfit.lower().split() if len(w) > 3]
        if outfit_words:
            hits = sum(1 for w in outfit_words if w in prompt_lower)
            continuity_score = hits / len(outfit_words)

    return {
        "identity":   round(identity_score,   3),
        "species":    round(species_score,     3),
        "anatomy":    round(anatomy_score,     3),
        "props":      round(props_score,       3),
        "continuity": round(continuity_score,  3),
    }


def _validate_creature(
    prompt_lower: str,
    species_id: str,
    variant: "CharacterVariant | None",
) -> dict[str, float]:
    """
    Validator for non-humanoid fantasy creatures (dragon, wolf, etc.).
    Identity is structural (required anatomical features) rather than facial.
    """
    species = get_species(species_id)
    required = species.get("required_features", [])
    forbidden = species.get("forbidden_features", [])

    # Species / Identity for creatures = structural features present
    req_hits = sum(1 for f in required if f.lower() in prompt_lower)
    species_score = (req_hits / len(required)) if required else 1.0
    # Creatures have no human identity layer — score is structural
    identity_score = species_score

    violations = sum(1 for t in forbidden if t.lower() in prompt_lower)
    anatomy_score = max(0.0, 1.0 - violations * 0.25)

    props_score = 1.0
    if variant and variant.extra_accessories:
        hits = sum(1 for acc in variant.extra_accessories if acc.lower() in prompt_lower)
        props_score = hits / len(variant.extra_accessories)

    continuity_score = 1.0
    if variant and variant.outfit:
        continuity_score = 1.0 if any(w in prompt_lower for w in variant.outfit.lower().split()) else 0.65

    return {
        "identity":   round(identity_score,  3),
        "species":    round(species_score,   3),
        "anatomy":    round(anatomy_score,   3),
        "props":      round(props_score,     3),
        "continuity": round(continuity_score, 3),
    }


def _validate_animal(
    prompt_lower: str,
    species_id: str,
    variant: "CharacterVariant | None",
) -> dict[str, float]:
    """
    Validator for real-world animals (horse, cat, dog, bird).
    Uses ANIMAL_REGISTRY required/forbidden features.
    """
    profile = ANIMAL_REGISTRY.get(species_id.lower(), ANIMAL_REGISTRY.get("custom_animal", {}))
    required = profile.get("required_features", [])
    forbidden = profile.get("forbidden_features", [])

    req_hits = sum(1 for f in required if f.lower() in prompt_lower)
    species_score = (req_hits / len(required)) if required else 0.9
    identity_score = species_score  # animals have no facial identity layer

    violations = sum(1 for t in forbidden if t.lower() in prompt_lower)
    anatomy_score = max(0.0, 1.0 - violations * 0.25)

    props_score = 1.0
    if variant and variant.extra_accessories:
        hits = sum(1 for acc in variant.extra_accessories if acc.lower() in prompt_lower)
        props_score = hits / len(variant.extra_accessories)

    return {
        "identity":   round(identity_score,  3),
        "species":    round(species_score,   3),
        "anatomy":    round(anatomy_score,   3),
        "props":      round(props_score,     3),
        "continuity": 1.0,
    }


def _validate_robot(
    prompt_lower: str,
    species_id: str,
    variant: "CharacterVariant | None",
) -> dict[str, float]:
    """
    Validator for robots and mechanical constructs.
    Robots have no biological identity. Structural features are the identity.
    """
    profile = get_species(species_id) if species_id in SPECIES_REGISTRY else SPECIES_REGISTRY["robot"]
    required = profile.get("required_features", ["mechanical", "metal"])
    forbidden = profile.get("forbidden_features", ["skin", "hair", "organic"])

    req_hits = sum(1 for f in required if f.lower() in prompt_lower)
    species_score = (req_hits / len(required)) if required else 1.0
    identity_score = species_score  # robots' identity IS their structural spec

    violations = sum(1 for t in forbidden if t.lower() in prompt_lower)
    anatomy_score = max(0.0, 1.0 - violations * 0.3)

    props_score = 1.0
    if variant and variant.extra_accessories:
        hits = sum(1 for acc in variant.extra_accessories if acc.lower() in prompt_lower)
        props_score = hits / len(variant.extra_accessories)

    continuity_score = 1.0
    if variant and variant.outfit:
        continuity_score = 1.0 if any(w in prompt_lower for w in variant.outfit.lower().split()) else 0.65

    return {
        "identity":   round(identity_score,  3),
        "species":    round(species_score,   3),
        "anatomy":    round(anatomy_score,   3),
        "props":      round(props_score,     3),
        "continuity": round(continuity_score, 3),
    }


def _validate_vehicle(
    prompt_lower: str,
    species_id: str,
    variant: "CharacterVariant | None",
) -> dict[str, float]:
    """
    Validator for vehicles (cars, ships, spacecraft, mechs).
    Uses VEHICLE_REGISTRY required/forbidden structural features.
    Anatomy and identity are both structural — no biological concepts apply.
    """
    profile = VEHICLE_REGISTRY.get(species_id.lower(), {
        "required_features": [],
        "forbidden_features": ["organic", "skin", "fur", "biological"],
    })
    required = profile.get("required_features", [])
    forbidden = profile.get("forbidden_features", [])

    req_hits = sum(1 for f in required if f.lower() in prompt_lower)
    species_score = (req_hits / len(required)) if required else 0.9
    identity_score = species_score  # vehicle identity = structural spec match
    anatomy_score  = species_score  # no distinction for vehicles

    violations = sum(1 for t in forbidden if t.lower() in prompt_lower)
    anatomy_score = max(0.0, min(anatomy_score, 1.0 - violations * 0.3))

    props_score = 1.0
    if variant and variant.extra_accessories:
        hits = sum(1 for acc in variant.extra_accessories if acc.lower() in prompt_lower)
        props_score = hits / len(variant.extra_accessories)

    return {
        "identity":   round(identity_score, 3),
        "species":    round(species_score,  3),
        "anatomy":    round(anatomy_score,  3),
        "props":      round(props_score,    3),
        "continuity": 1.0,
    }


# ---------------------------------------------------------------------------
# Shared scoring helpers (camera, composition, lighting, environment)
# ---------------------------------------------------------------------------

def _score_composition(prompt_lower: str) -> float:
    return 1.0 if any(k in prompt_lower for k in _COMPOSITION_KW) else 0.65


def _score_camera(prompt_lower: str, camera_spec: str | None) -> float:
    """
    Camera score: checks lens/focal length/depth keywords.
    If camera_spec is provided, also validates the expected spec is present.
    """
    base = 1.0 if any(k in prompt_lower for k in _CAMERA_KW) else 0.65
    if camera_spec:
        spec_words = [w for w in camera_spec.lower().split() if len(w) > 2]
        spec_hits = sum(1 for w in spec_words if w in prompt_lower)
        spec_match = spec_hits / max(len(spec_words), 1)
        return round((base * 0.5) + (spec_match * 0.5), 3)
    return round(base, 3)


def _score_lighting(prompt_lower: str) -> float:
    return 1.0 if any(k in prompt_lower for k in _LIGHTING_KW) else 0.70


def _score_environment(prompt_lower: str, scene_context: str | None) -> float:
    """
    Environment score: checks location/setting keywords.
    If scene_context is provided, validates the expected location is present.
    """
    base = 1.0 if any(k in prompt_lower for k in _ENVIRONMENT_KW) else 0.65
    if scene_context:
        ctx_words = [w for w in scene_context.lower().split() if len(w) > 3]
        ctx_hits = sum(1 for w in ctx_words if w in prompt_lower)
        ctx_match = ctx_hits / max(len(ctx_words), 1)
        return round((base * 0.4) + (ctx_match * 0.6), 3)
    return round(base, 3)


# ---------------------------------------------------------------------------
# Public: compute_qa_score — Project-Aware Visual QA Engine
# ---------------------------------------------------------------------------

def compute_qa_score(
    generated_prompt: str,
    identity: "CharacterIdentity",
    species_id: str = DEFAULT_SPECIES_ID,
    variant: "CharacterVariant | None" = None,
    asset_type: AssetType = "character",
    scene_context: str | None = None,
    camera_spec: str | None = None,
) -> "QAScoreResult":
    """
    Project-Aware Visual QA Engine — v2.

    Validates a generated prompt against the Project Canon.  Does NOT assume
    human anatomy — the correct structural validator is selected based on
    asset_type before any scoring begins.

    Returns a QAScoreResult with:
      - overall       weighted score across 9 categories
      - breakdown     per-category scores (identity, species, anatomy,
                      composition, camera, lighting, props, environment,
                      continuity)
      - passed        True if overall >= 0.80
      - asset_type    the validator that was used
      - repairs       ordered list of targeted fix actions for failing categories
      - warning       plain-text summary (backwards compat)
    """
    from app.schemas.storyboard import QAScoreResult

    prompt_lower = generated_prompt.lower()

    # ── 1. Dispatch to correct structural validator ───────────────────────────
    _DISPATCH = {
        "character": lambda: _validate_character(prompt_lower, identity, species_id, variant),
        "creature":  lambda: _validate_creature(prompt_lower, species_id, variant),
        "animal":    lambda: _validate_animal(prompt_lower, species_id, variant),
        "robot":     lambda: _validate_robot(prompt_lower, species_id, variant),
        "vehicle":   lambda: _validate_vehicle(prompt_lower, species_id, variant),
    }
    validator = _DISPATCH.get(asset_type, _DISPATCH["character"])
    structural_scores = validator()

    # ── 2. Shared categories (same logic regardless of asset type) ────────────
    composition_score = _score_composition(prompt_lower)
    camera_score      = _score_camera(prompt_lower, camera_spec)
    lighting_score    = _score_lighting(prompt_lower)
    environment_score = _score_environment(prompt_lower, scene_context)

    # ── 3. Assemble full breakdown ────────────────────────────────────────────
    breakdown: dict[str, float] = {
        "identity":    structural_scores["identity"],
        "species":     structural_scores["species"],
        "anatomy":     structural_scores["anatomy"],
        "composition": round(composition_score, 3),
        "camera":      round(camera_score, 3),
        "lighting":    round(lighting_score, 3),
        "props":       structural_scores["props"],
        "environment": round(environment_score, 3),
        "continuity":  structural_scores["continuity"],
    }

    # ── 4. Weighted overall ───────────────────────────────────────────────────
    overall = round(sum(_QA_WEIGHTS[k] * v for k, v in breakdown.items()), 3)

    # ── 5. Targeted repair actions ────────────────────────────────────────────
    repairs = _build_repairs(breakdown)

    # ── 6. Warning string (backwards compat) ─────────────────────────────────
    warning: str | None = None
    if overall < 0.80:
        low = [k for k, v in breakdown.items() if v < _WARNING_THRESHOLD]
        if low:
            warning = f"Low confidence in: {', '.join(low)}. Use targeted repairs below."

    return QAScoreResult(
        overall=overall,
        breakdown=breakdown,
        warning=warning,
        passed=overall >= 0.80,
        asset_type=asset_type,
        repairs=repairs,
    )


# ---------------------------------------------------------------------------
# Scene Continuity QA — context-aware, storyboard-plan-driven
# ---------------------------------------------------------------------------

def _make_group_id(scene_number: int, location_heading: str, time_of_day: str) -> str:
    """
    Produce a stable group key from scene + location + time.
    e.g. 'S2_INT_TORONTO_APARTMENT_NIGHT'
    """
    import re
    slug = re.sub(r"[^A-Z0-9]+", "_", location_heading.upper()).strip("_")
    tod  = re.sub(r"[^A-Z0-9]+", "_", time_of_day.upper()).strip("_")
    return f"S{scene_number}_{slug}_{tod}"


def _extract_location_words(location_heading: str) -> set[str]:
    """
    Pull meaningful words out of a slugline like 'INT. TORONTO APARTMENT - NIGHT'.
    Strips INT/EXT prefix and time-of-day suffix; returns lowercase content words.
    """
    import re
    text = re.sub(r"\b(INT|EXT|INTERIOR|EXTERIOR)\.?\s*", "", location_heading, flags=re.IGNORECASE)
    text = re.sub(r"\s*-\s*(DAY|NIGHT|DAWN|DUSK|GOLDEN HOUR|MAGIC HOUR|MORNING|AFTERNOON|EVENING|SUNSET|SUNRISE)\b.*$",
                  "", text, flags=re.IGNORECASE)
    words = {w.lower() for w in re.findall(r"[a-z]{3,}", text.lower())}
    return words


_TIME_SYNONYMS: dict[str, set[str]] = {
    "DAY":          {"day", "daytime", "afternoon", "morning", "sunlight", "sunlit", "sunny", "bright"},
    "NIGHT":        {"night", "nighttime", "dark", "darkness", "moonlight", "midnight", "evening"},
    "GOLDEN HOUR":  {"golden", "hour", "sunset", "sunrise", "dusk", "dawn", "warm light", "golden light"},
    "DAWN":         {"dawn", "sunrise", "early morning", "first light"},
    "DUSK":         {"dusk", "sunset", "twilight", "evening"},
}


def _time_of_day_in_prompt(time_of_day: str, prompt_lower: str) -> bool:
    """Return True if any synonym for this time-of-day appears in the prompt."""
    key = time_of_day.upper()
    synonyms = _TIME_SYNONYMS.get(key, {key.lower()})
    return any(s in prompt_lower for s in synonyms)


def _score_frame_against_context(
    frame: "FrameExpectedContext",
    scene_location_words: set[str],
) -> "tuple[float, list[FrameQAIssue]]":
    """
    Score a single frame's generated_prompt against its expected storyboard context.

    Returns (overall_score, issues).
    """
    from app.schemas.storyboard import FrameQAIssue

    prompt_lower = frame.generated_prompt.lower()
    issues: list[FrameQAIssue] = []
    scores: list[float] = []

    # ── 1. Location check ────────────────────────────────────────────────────
    loc_words = scene_location_words
    if loc_words:
        hits = sum(1 for w in loc_words if w in prompt_lower)
        loc_score = hits / len(loc_words)
        scores.append(loc_score)
        if loc_score < 0.4:
            # Detect what location the prompt *does* mention (simple heuristic)
            detected = None
            for phrase in ["waterfront", "apartment", "airport", "office", "warehouse",
                           "street", "forest", "park", "beach", "hospital", "hotel",
                           "school", "laboratory", "rooftop", "basement", "corridor"]:
                if phrase in prompt_lower:
                    detected = phrase
                    break
            issues.append(FrameQAIssue(
                category="location",
                severity="critical" if loc_score < 0.2 else "warning",
                message=(
                    f"Frame {frame.frame_number}: expected location '{frame.location_heading}' "
                    f"not clearly reflected in the generated prompt."
                ),
                expected=frame.location_heading,
                detected=detected or "unrecognised location",
                frame_number=frame.frame_number,
            ))
    else:
        scores.append(1.0)  # no words to check against — can't fail

    # ── 2. Time-of-day check ────────────────────────────────────────────────
    tod_ok = _time_of_day_in_prompt(frame.time_of_day, prompt_lower)
    scores.append(1.0 if tod_ok else 0.55)
    if not tod_ok:
        issues.append(FrameQAIssue(
            category="time_of_day",
            severity="warning",
            message=(
                f"Frame {frame.frame_number}: expected time of day '{frame.time_of_day}' "
                f"not found in generated prompt."
            ),
            expected=frame.time_of_day,
            detected=None,
            frame_number=frame.frame_number,
        ))

    # ── 3. Character check ──────────────────────────────────────────────────
    if frame.characters_present:
        char_hits = sum(
            1 for name in frame.characters_present
            if name.split()[0].lower() in prompt_lower  # first name match
        )
        char_score = char_hits / len(frame.characters_present)
        scores.append(char_score)
        if char_score < 0.7:
            missing = [n for n in frame.characters_present
                       if n.split()[0].lower() not in prompt_lower]
            issues.append(FrameQAIssue(
                category="characters",
                severity="warning",
                message=(
                    f"Frame {frame.frame_number}: character(s) {missing} expected but "
                    f"not found in prompt."
                ),
                expected=", ".join(frame.characters_present),
                detected=None,
                frame_number=frame.frame_number,
            ))
    else:
        scores.append(1.0)

    # ── 4. Lighting check ───────────────────────────────────────────────────
    if frame.lighting_notes:
        light_words = {w.lower() for w in frame.lighting_notes.split() if len(w) > 3}
        if light_words:
            light_hits = sum(1 for w in light_words if w in prompt_lower)
            light_score = light_hits / len(light_words)
            scores.append(max(light_score, 0.6))  # partial credit — lighting is often implicit
            if light_score < 0.35:
                issues.append(FrameQAIssue(
                    category="lighting",
                    severity="suggestion",
                    message=(
                        f"Frame {frame.frame_number}: lighting notes '{frame.lighting_notes}' "
                        f"are not well-represented in the prompt."
                    ),
                    expected=frame.lighting_notes,
                    detected=None,
                    frame_number=frame.frame_number,
                ))
        else:
            scores.append(1.0)
    else:
        scores.append(1.0)

    # ── 5. Shot type check ──────────────────────────────────────────────────
    shot_words = {w.lower() for w in frame.shot_type.split() if len(w) > 2}
    if shot_words:
        shot_hits = sum(1 for w in shot_words if w in prompt_lower)
        shot_score = shot_hits / len(shot_words)
        scores.append(shot_score)
        if shot_score < 0.5:
            issues.append(FrameQAIssue(
                category="shot_type",
                severity="suggestion",
                message=(
                    f"Frame {frame.frame_number}: shot type '{frame.shot_type}' "
                    f"not reflected in prompt."
                ),
                expected=frame.shot_type,
                detected=None,
                frame_number=frame.frame_number,
            ))
    else:
        scores.append(1.0)

    overall = round(sum(scores) / len(scores), 3) if scores else 1.0
    return overall, issues


def compute_scene_continuity(
    scene_number: int,
    location_heading: str,
    time_of_day: str,
    environmental_type: str,
    frames: "list[FrameExpectedContext]",
) -> "SceneContinuityReport":
    """
    Context-aware continuity QA for a complete scene.

    Strategy:
    1.  Group consecutive frames that share the same (location_heading, time_of_day)
        into ContinuityGroups.  Changes between groups = intentional transitions.
    2.  For each frame, score its generated_prompt against the *expected* storyboard
        context — not against the adjacent frame.
    3.  Within a group, additionally verify intra-group consistency (lighting palette,
        int/ext agreement) so unintentional drift is still caught.

    Returns a SceneContinuityReport with per-frame results + group breakdown.
    """
    from app.schemas.storyboard import (
        FrameQAResult, ContinuityGroup, SceneContinuityReport,
        FrameExpectedContext as _FEC,
    )

    if not frames:
        return SceneContinuityReport(
            scene_number=scene_number,
            location_heading=location_heading,
            total_frames=0,
            frames_passed=0,
            frames_failed=0,
            overall=1.0,
            continuity_groups=[],
            frame_results=[],
            summary="No frames to evaluate.",
        )

    # ── Step 1: Build continuity groups ─────────────────────────────────────
    groups: list[ContinuityGroup] = []
    current_loc  = frames[0].location_heading
    current_tod  = frames[0].time_of_day
    current_fns: list[int] = []

    for f in frames:
        if f.location_heading == current_loc and f.time_of_day == current_tod:
            current_fns.append(f.frame_number)
        else:
            # Flush current group
            groups.append(ContinuityGroup(
                group_id=_make_group_id(scene_number, current_loc, current_tod),
                location_heading=current_loc,
                time_of_day=current_tod,
                frame_numbers=current_fns,
                scene_number=scene_number,
            ))
            current_loc  = f.location_heading
            current_tod  = f.time_of_day
            current_fns  = [f.frame_number]

    groups.append(ContinuityGroup(
        group_id=_make_group_id(scene_number, current_loc, current_tod),
        location_heading=current_loc,
        time_of_day=current_tod,
        frame_numbers=current_fns,
        scene_number=scene_number,
    ))

    # Build frame_number → group_id lookup
    fn_to_group: dict[int, str] = {}
    for g in groups:
        for fn in g.frame_numbers:
            fn_to_group[fn] = g.group_id

    # ── Step 2: Score each frame against its expected context ────────────────
    frame_results: list[FrameQAResult] = []
    for frame in frames:
        loc_words = _extract_location_words(frame.location_heading)
        score, issues = _score_frame_against_context(frame, loc_words)
        passed = score >= 0.75 and not any(i.severity == "critical" for i in issues)
        frame_results.append(FrameQAResult(
            scene_number=scene_number,
            frame_number=frame.frame_number,
            passed=passed,
            overall=score,
            issues=issues,
            continuity_group_id=fn_to_group.get(frame.frame_number, "unknown"),
        ))

    # ── Step 3: Scene-level aggregation ─────────────────────────────────────
    passed_count = sum(1 for r in frame_results if r.passed)
    failed_count = len(frame_results) - passed_count
    overall_scene = round(sum(r.overall for r in frame_results) / len(frame_results), 3)

    if failed_count == 0:
        summary = f"All {len(frame_results)} frames pass continuity. {len(groups)} continuity group(s) detected."
    else:
        summary = (
            f"{failed_count} of {len(frame_results)} frames have continuity issues. "
            f"Scene spans {len(groups)} continuity group(s). "
            f"Overall confidence: {round(overall_scene * 100)}%."
        )

    return SceneContinuityReport(
        scene_number=scene_number,
        location_heading=location_heading,
        total_frames=len(frame_results),
        frames_passed=passed_count,
        frames_failed=failed_count,
        overall=overall_scene,
        continuity_groups=groups,
        frame_results=frame_results,
        summary=summary,
    )


# Type-checking imports (not at module top to avoid circular)
from typing import TYPE_CHECKING  # noqa: E402
if TYPE_CHECKING:
    from app.schemas.storyboard import (
        FrameExpectedContext, FrameQAResult, FrameQAIssue,
        ContinuityGroup, SceneContinuityReport,
    )
