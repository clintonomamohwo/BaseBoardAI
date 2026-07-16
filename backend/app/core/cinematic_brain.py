"""
Cinematic Brain — Automatic Cinematic Decision Engine.

The Director Engine should behave like an experienced film director.
A creator uploads a script, presses Generate, and receives a professionally
staged storyboard — camera, lens, lighting, mood, shot type, movement,
and purpose all chosen intelligently.

The creator only overrides when they want creative control.

Decision Priority (highest wins)
---------------------------------
  1. User Override     — any field listed in frame.locked_fields is never touched
  2. Scene Metadata    — time_of_day, environmental_type, emotional_tone, color_palette
  3. Character CKM     — classification, abilities, physical_form hints
  4. World Bible       — canon style_guide, camera_language, visual_rules
  5. Project Style     — global_aesthetic render style
  6. Director AI       — this module's decision tables (lowest priority / default)

Architecture
------------
  CinematicContext    — extracted signal from the raw frame + scene text
  _decide_*()         — one decision function per field
  fill_missing_fields() — public API: fills every unset cinematic field on a frame

Fields this module auto-fills (if not locked and currently empty / default):
  shot_type, camera_angle, camera_movement,
  lighting_notes, mood, purpose, director_notes

Lens/focal_length/depth_style are still owned by lens_planner.py.
This module defers to it and will not overwrite those fields.

Public API
----------
  fill_missing_fields(frame, scene, context_hints) -> FrameDecisions
  build_cinematic_context(frame, scene) -> CinematicContext
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.schemas.storyboard import ScriptSceneBase, StoryboardFrameBase

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# CinematicContext — structured signal extracted from raw text
# ---------------------------------------------------------------------------

@dataclass
class CinematicContext:
    """All signals the brain uses to make its decisions."""
    # From action/narrative text
    has_dialogue:       bool = False
    is_solo_frame:      bool = False      # only one character
    char_count:         int = 0
    action_intensity:   str = "low"       # low / medium / high
    has_movement:       bool = False      # running, charging, fighting etc.
    has_reveal:         bool = False      # reveal, discovers, sees
    has_confrontation:  bool = False
    has_emotion:        bool = False      # tears, crying, anger, grief etc.
    is_transition:      bool = False      # cut to, fade, transition
    # From scene metadata
    scene_type:         str = "dialogue"
    time_of_day:        str = "DAY"
    env_type:           str = "INT."
    emotional_tone:     str = "neutral"
    location_heading:   str = ""
    # Character signals (from CKM hints)
    dominant_classification: str | None = None
    has_flight:         bool = False
    has_fire:           bool = False
    # Shot history — slugs of the last 3 frames in the scene
    recent_shot_slugs:  list[str] = field(default_factory=list)
    # Frame emotion (explicit)
    frame_emotion:      str | None = None


# ---------------------------------------------------------------------------
# Text signal extraction
# ---------------------------------------------------------------------------

_HIGH_INTENSITY_KW  = ["battle", "charge", "explosion", "fight", "attack",
                       "crash", "chase", "shoot", "war", "army", "thousands",
                       "fleeing", "destroy", "collapse", "explode"]
_MEDIUM_INTENSITY_KW = ["run", "sprint", "escape", "push", "struggle",
                        "confront", "grab", "throw", "fall", "burst"]
_EMOTION_KW         = ["tears", "cries", "crying", "grief", "sob", "weep",
                       "heartbreak", "devastated", "overjoyed", "tremble",
                       "shakes", "breaks down", "smiles", "laughs", "rage"]
_REVEAL_KW          = ["reveals", "discover", "realizes", "sees", "notices",
                       "emerges", "appears", "opens", "unveil", "show"]
_DIALOGUE_KW        = ["says", "asks", "replies", "speaks", "whispers",
                       "shouts", "tells", "explains", "\""]
_MOVEMENT_KW        = ["runs", "charges", "sprints", "rushes", "races",
                       "flees", "marches", "gallops", "flies", "leaps"]
_CONFRONTATION_KW   = ["faces", "confronts", "standoff", "stares down",
                       "challenges", "points at", "blocks", "threatens"]


def _has_any(text: str, keywords: list[str]) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in keywords)


def build_cinematic_context(
    frame: "StoryboardFrameBase",
    scene: "ScriptSceneBase",
    ckg_hints: dict[str, Any] | None = None,
    recent_frames: list["StoryboardFrameBase"] | None = None,
) -> CinematicContext:
    """
    Extract all available signals from the frame and scene into a CinematicContext.

    ckg_hints: per-character CKM data from get_director_hints() keyed by char_id.
    recent_frames: the N frames immediately before this one in the scene.
    """
    from app.core.lens_planner import detect_scene_type
    from app.core.shot_balancer import _classify_shot  # type: ignore[attr-defined]

    # Combine all available text signal sources
    action_text = " ".join(filter(None, [
        frame.action_breakdown,
        getattr(frame, "narrative_action", None),
        getattr(frame, "visual_action", None),
    ]))
    probe = action_text.lower()

    # Action intensity
    intensity = "low"
    if _has_any(probe, _HIGH_INTENSITY_KW):
        intensity = "high"
    elif _has_any(probe, _MEDIUM_INTENSITY_KW):
        intensity = "medium"

    # Character count heuristic (look for capitalized names / CHAR_ tokens)
    char_tokens = re.findall(r"\bCHAR_[A-Z]+\b", action_text)
    chars_present = getattr(frame, "characters_present", None) or []
    char_count = max(len(char_tokens), len(chars_present), 1 if action_text else 0)

    # CKM signals
    dominant_classification: str | None = None
    has_flight = False
    has_fire = False
    if ckg_hints:
        for hints in ckg_hints.values():
            cls = hints.get("classification")
            if cls and dominant_classification is None:
                dominant_classification = cls
            if "flight" in hints.get("abilities", []):
                has_flight = True
            if "fire_breath" in hints.get("abilities", []):
                has_fire = True

    # Shot history
    recent_slugs: list[str] = []
    if recent_frames:
        for rf in recent_frames[-3:]:
            recent_slugs.append(_classify_shot(rf.shot_type))

    # Scene type
    scene_type = scene.__dict__.get("_scene_type") or detect_scene_type(scene)

    return CinematicContext(
        has_dialogue      = _has_any(probe, _DIALOGUE_KW),
        is_solo_frame     = char_count <= 1,
        char_count        = char_count,
        action_intensity  = intensity,
        has_movement      = _has_any(probe, _MOVEMENT_KW),
        has_reveal        = _has_any(probe, _REVEAL_KW),
        has_confrontation = _has_any(probe, _CONFRONTATION_KW),
        has_emotion       = _has_any(probe, _EMOTION_KW),
        is_transition     = any(w in probe for w in ["cut to", "fade", "transition"]),
        scene_type        = scene_type,
        time_of_day       = scene.time_of_day.upper(),
        env_type          = "EXT." if "ext." in scene.location_heading.lower() else "INT.",
        emotional_tone    = scene.emotional_tone.lower(),
        location_heading  = scene.location_heading,
        dominant_classification = dominant_classification,
        has_flight        = has_flight,
        has_fire          = has_fire,
        recent_shot_slugs = recent_slugs,
        frame_emotion     = getattr(frame, "frame_emotion", None),
    )


# ---------------------------------------------------------------------------
# Decision tables
# ---------------------------------------------------------------------------

# Shot type decision table: maps (scene_type, context_flags) → shot_type label
# Applied in priority order — first match wins.
# Each rule: (condition_fn, shot_type_label, rationale)
def _decide_shot_type(ctx: CinematicContext) -> tuple[str, str]:
    """Returns (shot_type_label, rationale)."""
    recent = ctx.recent_shot_slugs
    last   = recent[-1] if recent else ""

    # Avoid repeating the same type 3 times
    consecutive = (len(recent) >= 3 and len(set(recent[-3:])) == 1)

    if ctx.has_flight:
        if last != "drone":
            return "Aerial Wide Shot",    "Character with flight ability — aerial perspective preferred."
    if ctx.has_fire:
        if last not in ("wide", "establishing"):
            return "Wide Shot",           "Fire breath ability — wide shot captures scale of flames."
    if ctx.has_reveal:
        return "Establishing Shot",       "Reveal moment — establishing shot introduces the subject in environment."
    if ctx.has_confrontation:
        if last == "close":
            return "Over-the-Shoulder Shot", "Confrontation — OTS emphasises face-to-face tension after close-up."
        return "Medium Shot",             "Confrontation — medium shot captures both characters in standoff."
    if ctx.action_intensity == "high":
        if last == "wide":
            return "Medium Shot",         "High-action — medium shot after wide keeps momentum varied."
        return "Wide Shot",               "High-action — wide shot captures scale and movement."
    if ctx.has_emotion:
        return "Close-up Shot",           "Emotional moment — close-up registers facial performance."
    if ctx.has_dialogue and ctx.char_count >= 2:
        if last == "medium":
            return "Over-the-Shoulder Shot", "Dialogue — OTS after medium avoids repetition."
        return "Medium Shot",             "Dialogue between characters — medium shot standard."
    if ctx.has_dialogue and ctx.is_solo_frame:
        return "Medium Close-Up",         "Solo dialogue — medium close-up captures intimacy."
    if ctx.scene_type in ("horror", "intimate"):
        if consecutive:
            return "Wide Shot",           "Horror/intimate — rhythm break after consecutive close shots."
        return "Medium Close-Up",         "Horror/intimate — medium close-up builds dread through proximity."
    if ctx.scene_type == "epic":
        return "Establishing Shot",       "Epic scene — establishing shot reveals scale of environment and forces."
    if ctx.scene_type == "romance":
        if last == "close":
            return "Medium Shot",         "Romance — medium shot after close creates breathing room."
        return "Close-up Shot",           "Romance — close-up captures emotional intimacy."
    if ctx.scene_type in ("fantasy", "sci_fi", "adventure"):
        if last != "establishing":
            return "Establishing Shot",   "Genre scene — establishing shot grounds audience in the world."
        return "Medium Shot",             "Following establishing — medium shot brings focus to characters."
    if consecutive:
        # Generic rhythm break
        _BREAKS = {"close": "Wide Shot", "medium": "Close-up Shot", "wide": "Medium Shot",
                   "establishing": "Medium Shot", "ots": "Wide Shot"}
        return _BREAKS.get(last, "Medium Shot"), "Rhythm break — avoiding visual monotony."

    return "Medium Shot",                 "Default — medium shot as neutral cinematic anchor."


# Camera angle decision table
def _decide_camera_angle(ctx: CinematicContext, shot_slug: str) -> tuple[str, str]:
    """Returns (camera_angle_label, rationale)."""
    cls = ctx.dominant_classification or ""

    if cls in ("god", "deity"):
        return "Low Angle",        "God/deity classification — low angle emphasises divine power and scale."
    if cls == "demon":
        return "High Angle",       "Demon classification — high angle from victim perspective creates menace."
    if cls == "monster":
        return "Low Angle",        "Monster classification — low angle amplifies threat."
    if ctx.has_flight:
        return "Eye Level / Aerial", "Flying character — aerial/eye level tracks subject in motion."
    if shot_slug in ("establishing", "wide", "drone"):
        return "High Angle",       "Wide/establishing shot — high angle maximises environmental context."
    if ctx.has_emotion or shot_slug == "close":
        return "Eye Level",        "Emotional close-up — eye level creates direct connection."
    if ctx.action_intensity == "high":
        return "Dynamic / Dutch",  "High-action — dutch angle adds kinetic energy."
    if ctx.has_reveal:
        return "Eye Level",        "Reveal moment — eye level maintains naturalism and surprise."
    if ctx.has_confrontation:
        return "Eye Level",        "Confrontation — eye level treats both characters as equals."
    if ctx.scene_type in ("horror", "mystery"):
        if ctx.env_type == "INT.":
            return "Slightly Low",  "Interior horror — slight low angle creates unease."
        return "High Angle",       "Exterior horror/mystery — high angle makes subject feel exposed."
    return "Eye Level",            "Default — eye level as neutral cinematic anchor."


# Camera movement decision table
def _decide_camera_movement(ctx: CinematicContext, shot_slug: str) -> tuple[str, str]:
    """Returns (camera_movement_label, rationale)."""
    if ctx.action_intensity == "high":
        if shot_slug == "tracking":
            return "Handheld Tracking", "High-action — handheld tracking shot creates visceral energy."
        return "Fast Pan",          "High-action — fast pan follows movement."
    if ctx.has_reveal:
        return "Slow Push-In",      "Reveal — slow push-in builds anticipation."
    if ctx.has_emotion:
        return "Slow Push-In",      "Emotional moment — slow push-in closes distance for intimacy."
    if ctx.scene_type in ("horror", "mystery"):
        return "Slow Push-In",      "Horror/mystery — slow push-in ratchets tension."
    if ctx.scene_type in ("epic", "establishing"):
        return "Slow Pan",          "Epic/establishing — slow pan reveals scale."
    if ctx.has_dialogue:
        return "Static",            "Dialogue — static camera keeps focus on performance."
    if ctx.has_confrontation:
        return "Static",            "Confrontation — static camera holds tension in stillness."
    return "Static",                "Default — static shot as clean neutral base."


# Lighting decision table
def _decide_lighting(ctx: CinematicContext) -> tuple[str, str]:
    """Returns (lighting_notes, rationale)."""
    tod = ctx.time_of_day
    env = ctx.env_type
    tone = ctx.emotional_tone
    scene = ctx.scene_type

    # Time of day is the strongest signal
    if "night" in tod.lower():
        if scene == "horror":
            return "Low key, deep shadows, single practical source",   "Night horror — low key reinforces dread."
        if scene in ("romance", "intimate"):
            return "Soft ambient, warm candlelight, shallow pools",    "Night romance — warm intimate lighting."
        return "Moonlit, cool blue ambient, rim light",                "Night exterior — moonlit blue atmosphere."
    if "golden" in tod.lower() or "sunrise" in tod.lower() or "sunset" in tod.lower():
        return "Warm golden backlight, long shadows, high contrast",   "Golden hour — warm directional backlight."
    if "dawn" in tod.lower():
        return "Cool dawn light, soft diffuse, pale blue-grey",        "Dawn — cool diffuse light before sunrise."
    if "dusk" in tod.lower():
        return "Warm amber-purple gradient, silhouette potential",     "Dusk — dramatic warm-cool gradient."

    # Scene type overrides when TOD is neutral
    if scene == "horror":
        return "Low key, deep shadows, unsettling practical",          "Horror — low key lighting creates dread."
    if scene == "action":
        return "Hard directional light, high contrast, rim lighting",  "Action — high contrast hard light."
    if scene in ("romance", "intimate"):
        return "Soft warm fill, motivated practical, shallow shadows", "Romance/intimate — soft warm fill."
    if scene == "epic":
        return "Overcast diffuse, desaturated military tones",         "Epic battle — overcast neutralises colour."
    if scene in ("fantasy", "sci_fi"):
        return "Stylised ambient, coloured practical sources",         "Genre — stylised coloured lighting."
    if scene == "comedy":
        return "Bright even fill, minimal shadow, high key",           "Comedy — bright cheerful key light."
    if scene == "mystery":
        return "Low key, partial reveal, motivated shadow",            "Mystery — shadows conceal information."

    # Emotion fallback
    if ctx.has_emotion:
        return "Soft motivated fill, slight backlight for separation", "Emotional beat — soft fill supports performance."

    # Interior vs exterior neutral
    if env == "EXT.":
        return "Natural daylight, soft fill, slight overcast",         "Exterior daytime — natural soft light."
    return "Soft interior ambient, motivated practical",               "Interior — motivated practical lighting."


# Mood decision table
def _decide_mood(ctx: CinematicContext) -> tuple[str, str]:
    """Returns (mood_label, rationale)."""
    if ctx.frame_emotion:
        # Map common emotion → mood label
        _MAP = {
            "fear": "Dread", "terror": "Dread", "scared": "Dread",
            "sad": "Sorrow", "grief": "Sorrow", "crying": "Sorrow",
            "angry": "Rage", "rage": "Rage", "fury": "Rage",
            "happy": "Joy", "excited": "Elation", "joy": "Joy",
            "tense": "Suspense", "cautious": "Tension",
            "love": "Warmth", "tender": "Warmth",
        }
        lower_emotion = ctx.frame_emotion.lower()
        for key, mood in _MAP.items():
            if key in lower_emotion:
                return mood, f"Frame emotion '{ctx.frame_emotion}' → mood '{mood}'."
    if ctx.action_intensity == "high":
        return "Chaos",      "High-action intensity — chaotic, urgent mood."
    if ctx.has_reveal:
        return "Wonder",     "Reveal moment — sense of wonder."
    if ctx.has_confrontation:
        return "Tension",    "Confrontation — sustained tension."
    # Fall through to scene type
    _SCENE_MOODS = {
        "horror": "Dread", "mystery": "Suspense", "romance": "Warmth",
        "action": "Urgency", "epic": "Grandeur", "comedy": "Levity",
        "fantasy": "Wonder", "sci_fi": "Intrigue", "adventure": "Excitement",
        "establishing": "Anticipation", "intimate": "Intimacy", "dialogue": "Focus",
    }
    mood = _SCENE_MOODS.get(ctx.scene_type, "Neutral")
    return mood, f"Scene type '{ctx.scene_type}' → default mood '{mood}'."


# Purpose decision table
def _decide_purpose(ctx: CinematicContext, shot_slug: str) -> tuple[str, str]:
    """Returns (purpose_label, rationale)."""
    if shot_slug in ("establishing", "drone"):
        return "Introduce location",       "Establishing/wide shot — first purpose is grounding audience in space."
    if ctx.has_reveal:
        return "Reveal character or object", "Reveal keywords detected — shot purpose is the disclosure."
    if ctx.has_confrontation:
        return "Escalate conflict",        "Confrontation — purpose is escalation."
    if ctx.has_emotion:
        return "Register emotion",         "Emotional content — purpose is capturing performance."
    if ctx.has_dialogue:
        return "Advance narrative",        "Dialogue drives story forward."
    if ctx.action_intensity == "high":
        return "Sustain action",           "High-intensity — purpose is maintaining kinetic momentum."
    if ctx.scene_type == "horror":
        return "Build dread",              "Horror scene — purpose is atmospheric dread."
    if ctx.scene_type == "romance":
        return "Deepen connection",        "Romance scene — purpose is emotional intimacy."
    return "Establish staging",            "Default — staging and orientation purpose."


# ---------------------------------------------------------------------------
# FrameDecisions result object
# ---------------------------------------------------------------------------

@dataclass
class FrameDecisions:
    """The auto-selected values for a single frame, plus rationale per field."""
    shot_type:        str | None = None
    camera_angle:     str | None = None
    camera_movement:  str | None = None
    lighting_notes:   str | None = None
    mood:             str | None = None
    purpose:          str | None = None
    director_notes:   str | None = None
    # Which fields were actually auto-filled (False = already had a value)
    auto_selected:    dict[str, bool] = field(default_factory=dict)
    # Per-field rationale strings (for director_notes assembly)
    rationale:        dict[str, str]  = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Priority resolver — respects locked_fields + existing non-empty values
# ---------------------------------------------------------------------------

_EMPTY_VALUES = {"", None, "Unknown", "TBD", "Auto", "auto", "undefined"}


def _is_blank(value: Any) -> bool:
    """True if the field has no meaningful content set."""
    return value in _EMPTY_VALUES or (isinstance(value, str) and value.strip() == "")


def _is_locked(field_name: str, locked_fields: list[str]) -> bool:
    """True if the user has explicitly locked this field."""
    return field_name in locked_fields


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def fill_missing_fields(
    frame: "StoryboardFrameBase",
    scene: "ScriptSceneBase",
    ckg_hints: dict[str, Any] | None = None,
    recent_frames: list["StoryboardFrameBase"] | None = None,
) -> FrameDecisions:
    """
    Intelligently fill every missing cinematic field on a storyboard frame.

    Decision priority:
      1. User override (locked_fields) — never touched
      2. Existing non-empty value — preserved
      3. Director AI decision (this function)

    Modifies the frame object in-place.
    Returns a FrameDecisions object with what was decided and why.

    Never raises — errors are logged and the frame is returned as-is.
    """
    locked = getattr(frame, "locked_fields", None) or []
    decisions = FrameDecisions()

    try:
        ctx = build_cinematic_context(frame, scene, ckg_hints, recent_frames)

        from app.core.shot_balancer import _classify_shot  # type: ignore[attr-defined]

        # ── 1. Shot type ───────────────────────────────────────────────────────
        if not _is_locked("shot_type", locked) and _is_blank(getattr(frame, "shot_type", None)):
            value, rationale = _decide_shot_type(ctx)
            frame.shot_type = value
            decisions.shot_type = value
            decisions.auto_selected["shot_type"] = True
            decisions.rationale["shot_type"] = rationale
        shot_slug = _classify_shot(getattr(frame, "shot_type", "") or "")

        # ── 2. Camera angle ────────────────────────────────────────────────────
        if not _is_locked("camera_angle", locked) and _is_blank(getattr(frame, "camera_angle", None)):
            value, rationale = _decide_camera_angle(ctx, shot_slug)
            frame.camera_angle = value
            decisions.camera_angle = value
            decisions.auto_selected["camera_angle"] = True
            decisions.rationale["camera_angle"] = rationale

        # ── 3. Camera movement ────────────────────────────────────────────────
        if not _is_locked("camera_movement", locked) and _is_blank(getattr(frame, "camera_movement", None)):
            value, rationale = _decide_camera_movement(ctx, shot_slug)
            frame.camera_movement = value
            decisions.camera_movement = value
            decisions.auto_selected["camera_movement"] = True
            decisions.rationale["camera_movement"] = rationale

        # ── 4. Lighting notes ─────────────────────────────────────────────────
        if not _is_locked("lighting_notes", locked) and _is_blank(getattr(frame, "lighting_notes", None)):
            value, rationale = _decide_lighting(ctx)
            frame.lighting_notes = value
            decisions.lighting_notes = value
            decisions.auto_selected["lighting_notes"] = True
            decisions.rationale["lighting_notes"] = rationale

        # ── 5. Mood ───────────────────────────────────────────────────────────
        if not _is_locked("mood", locked) and _is_blank(getattr(frame, "mood", None)):
            value, rationale = _decide_mood(ctx)
            frame.mood = value
            decisions.mood = value
            decisions.auto_selected["mood"] = True
            decisions.rationale["mood"] = rationale

        # ── 6. Purpose ────────────────────────────────────────────────────────
        if not _is_locked("purpose", locked) and _is_blank(getattr(frame, "purpose", None)):
            value, rationale = _decide_purpose(ctx, shot_slug)
            frame.purpose = value
            decisions.purpose = value
            decisions.auto_selected["purpose"] = True
            decisions.rationale["purpose"] = rationale

        # ── 7. Director notes — assembled from all rationale strings ──────────
        if not _is_locked("director_notes", locked) and _is_blank(getattr(frame, "director_notes", None)):
            auto_rationale = [v for v in decisions.rationale.values() if v]
            if auto_rationale:
                notes = " ".join(auto_rationale)
                frame.director_notes = notes
                decisions.director_notes = notes
                decisions.auto_selected["director_notes"] = True

        decisions.auto_selected.setdefault("shot_type",       False)
        decisions.auto_selected.setdefault("camera_angle",    False)
        decisions.auto_selected.setdefault("camera_movement", False)
        decisions.auto_selected.setdefault("lighting_notes",  False)
        decisions.auto_selected.setdefault("mood",            False)
        decisions.auto_selected.setdefault("purpose",         False)

        logger.debug(
            "CinematicBrain: Frame %d — auto-selected: %s",
            frame.frame_number,
            [k for k, v in decisions.auto_selected.items() if v],
        )

    except Exception as exc:  # noqa: BLE001
        logger.error(
            "CinematicBrain: Frame %d decision error — %s. Frame unchanged.",
            getattr(frame, "frame_number", "?"), exc,
        )

    return decisions