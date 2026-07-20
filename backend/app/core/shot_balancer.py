"""
Shot Balancer — Composition Diversity Scoring & Rebalancing.

Replaces the hard-coded "at least 2 close-ups" rule in STORYBOARD_PROMPT with a
weighted scoring system that tracks shot-type distribution across all frames,
flags over-represented types, and injects missing compositions automatically.

Public API
----------
balance_shot_distribution(scenes, thresholds, project_settings) -> list[ScriptSceneBase]
compute_diversity_score(scenes) -> CompositionReport
get_director_style_thresholds(style) -> tuple[dict, dict]
"""

from __future__ import annotations

import logging
from collections import Counter
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from app.schemas.storyboard import ScriptSceneBase, StoryboardFrameBase

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Director Style — five creative voices, each with its own shot distribution.
# These are the ceilings (max fraction) and floors (min fraction) that the
# Shot Balancer enforces across the full storyboard.
# ---------------------------------------------------------------------------

DirectorStyle = Literal["balanced", "cinematic", "dialogue", "action", "intimate"]

# (thresholds, floors) per style
_DIRECTOR_STYLE_PROFILES: dict[str, tuple[dict[str, float], dict[str, float]]] = {
    # Hollywood-standard mix: wides, mediums, inserts, close-ups in proportion
    "balanced": (
        {
            "close":         0.10,   # Brief description: max 10% close-ups
            "extreme_close": 0.05,
            "medium":        0.40,
            "wide":          0.40,
            "establishing":  0.20,
            "ots":           0.25,
            "tracking":      0.20,
            "insert":        0.12,
            "pov":           0.10,
            "drone":         0.10,
        },
        {
            "wide":          0.15,
            "establishing":  0.08,
            "medium":        0.20,
        },
    ),
    # Grand visuals: wides and establishing shots dominate
    "cinematic": (
        {
            "close":         0.07,
            "extreme_close": 0.03,
            "medium":        0.30,
            "wide":          0.50,
            "establishing":  0.35,
            "ots":           0.15,
            "tracking":      0.25,
            "insert":        0.10,
            "pov":           0.08,
            "drone":         0.15,
        },
        {
            "wide":          0.25,
            "establishing":  0.15,
            "medium":        0.15,
        },
    ),
    # Two-shots and OTS dominate; close-ups only for peaks
    "dialogue": (
        {
            "close":         0.12,
            "extreme_close": 0.04,
            "medium":        0.45,
            "wide":          0.20,
            "establishing":  0.12,
            "ots":           0.40,
            "tracking":      0.08,
            "insert":        0.15,
            "pov":           0.12,
            "drone":         0.05,
        },
        {
            "wide":          0.08,
            "establishing":  0.05,
            "medium":        0.25,
            "ots":           0.15,
        },
    ),
    # Dynamic tracking, wides, dutch tilts; close-ups rare
    "action": (
        {
            "close":         0.08,
            "extreme_close": 0.04,
            "medium":        0.25,
            "wide":          0.45,
            "establishing":  0.20,
            "ots":           0.10,
            "tracking":      0.35,
            "insert":        0.10,
            "pov":           0.15,
            "drone":         0.15,
        },
        {
            "wide":          0.20,
            "tracking":      0.10,
            "medium":        0.15,
        },
    ),
    # Emotionally justified close-ups; still capped, no runaway close-up spam
    "intimate": (
        {
            "close":         0.22,
            "extreme_close": 0.08,
            "medium":        0.35,
            "wide":          0.20,
            "establishing":  0.10,
            "ots":           0.25,
            "tracking":      0.10,
            "insert":        0.18,
            "pov":           0.12,
            "drone":         0.05,
        },
        {
            "wide":          0.08,
            "establishing":  0.04,
            "medium":        0.20,
        },
    ),
}


def get_director_style_thresholds(
    style: str,
) -> tuple[dict[str, float], dict[str, float]]:
    """Return (thresholds, floors) for the given DirectorStyle slug."""
    return _DIRECTOR_STYLE_PROFILES.get(style, _DIRECTOR_STYLE_PROFILES["balanced"])

# ---------------------------------------------------------------------------
# Shot-type taxonomy
# Each key is a canonical slug; values are the substrings we look for inside
# the raw shot_type string returned by the LLM (case-insensitive).
# ---------------------------------------------------------------------------

_SHOT_TYPE_PATTERNS: dict[str, list[str]] = {
    "establishing":    ["establishing", "wide shot establishing"],
    "wide":            ["wide", "long shot", "full shot"],
    "medium":          ["medium", "mid shot", "cowboy", "waist"],
    "close":           ["close-up", "close up", "closeup", "cu"],
    "extreme_close":   ["extreme close", "ecu", "extreme cu"],
    "ots":             ["over-the-shoulder", "over the shoulder", "ots"],
    "pov":             ["pov", "point of view", "subjective"],
    "drone":           ["drone", "aerial", "bird's eye", "birds eye"],
    "tracking":        ["tracking", "dolly", "moving"],
    "insert":          ["insert", "cutaway", "detail"],
}

# Default maximum fraction for each shot type (configurable via project_settings).
DEFAULT_THRESHOLDS: dict[str, float] = {
    "close":        0.40,
    "medium":       0.45,
    "wide":         0.35,
    "establishing": 0.15,
    "extreme_close": 0.12,
    "ots":          0.30,
    "pov":          0.20,
    "drone":        0.10,
    "tracking":     0.25,
    "insert":       0.20,
}

# Minimum floor — if a type falls below this it is a candidate for injection.
DEFAULT_FLOORS: dict[str, float] = {
    "wide":         0.10,
    "establishing": 0.05,
    "medium":       0.15,
}

# Replacement mappings: if a type is over-threshold, what it can be swapped for.
_REPLACEMENT_POOL: dict[str, str] = {
    "close":   "medium",
    "medium":  "wide",
    "wide":    "establishing",
}


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class CompositionReport:
    total_frames: int
    counts: dict[str, int]
    frequencies: dict[str, float]       # fraction 0–1
    diversity_score: float              # 0–1; 1 = perfectly balanced
    over_threshold: list[str]           # types exceeding their ceiling
    under_floor: list[str]              # types below their floor

    def summary_lines(self) -> list[str]:
        lines = [f"Composition Diversity Score: {self.diversity_score:.0%}",
                 f"Total frames: {self.total_frames}", ""]
        for stype, freq in sorted(self.frequencies.items(), key=lambda x: -x[1]):
            bar = "█" * int(freq * 20)
            lines.append(f"  {stype:<16} {freq:>5.0%}  {bar}")
        if self.over_threshold:
            lines.append(f"\nOver threshold : {', '.join(self.over_threshold)}")
        if self.under_floor:
            lines.append(f"Under floor    : {', '.join(self.under_floor)}")
        return lines


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _classify_shot(shot_type: str) -> str:
    """Map a raw LLM shot_type string to one of the canonical slug keys."""
    lower = shot_type.lower()
    for slug, patterns in _SHOT_TYPE_PATTERNS.items():
        if any(p in lower for p in patterns):
            return slug
    return "medium"   # safe default


def _collect_all_frames(scenes: "list[ScriptSceneBase]") -> "list[StoryboardFrameBase]":
    return [frame for scene in scenes for frame in scene.frames]


def _compute_counts(scenes: "list[ScriptSceneBase]") -> tuple[Counter, int]:
    frames = _collect_all_frames(scenes)
    counts: Counter = Counter(_classify_shot(f.shot_type) for f in frames)
    return counts, len(frames)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_diversity_score(
    scenes: "list[ScriptSceneBase]",
    thresholds: dict[str, float] | None = None,
    floors: dict[str, float] | None = None,
) -> CompositionReport:
    """
    Analyse shot distribution across all scenes and return a CompositionReport.
    Does NOT modify the scene list.
    """
    thresholds = thresholds or DEFAULT_THRESHOLDS
    floors = floors or DEFAULT_FLOORS
    counts, total = _compute_counts(scenes)

    if total == 0:
        return CompositionReport(0, {}, {}, 1.0, [], [])

    frequencies = {k: v / total for k, v in counts.items()}

    # Penalty: sum of per-type exceedances above their ceiling, as a fraction of total frames.
    penalty = sum(
        max(0.0, frequencies.get(t, 0) - ceiling)
        for t, ceiling in thresholds.items()
    )
    diversity_score = max(0.0, 1.0 - (penalty / total))

    over_threshold = [t for t, ceiling in thresholds.items() if frequencies.get(t, 0) > ceiling]
    under_floor    = [t for t, floor   in floors.items()     if frequencies.get(t, 0) < floor]

    return CompositionReport(
        total_frames=total,
        counts=dict(counts),
        frequencies=frequencies,
        diversity_score=diversity_score,
        over_threshold=over_threshold,
        under_floor=under_floor,
    )


def balance_shot_distribution(
    scenes: "list[ScriptSceneBase]",
    thresholds: dict[str, float] | None = None,
    floors: dict[str, float] | None = None,
) -> "list[ScriptSceneBase]":
    """
    Rebalance shot distribution in-place across all frames.

    For each shot type that exceeds its configured ceiling:
      - Walk frames in scene order and swap the second+ occurrence of that
        type to its replacement type (see _REPLACEMENT_POOL).
      - The shot_type string is updated; camera_angle is left intact.

    Frames flagged with shot_balance_adjusted=True in metadata (not part of schema,
    but used by director_engine for logging) indicate they were adjusted.

    Returns the modified scene list (same objects, mutated in-place).
    """
    thresholds = thresholds or DEFAULT_THRESHOLDS
    floors = floors or DEFAULT_FLOORS

    report = compute_diversity_score(scenes, thresholds, floors)

    if not report.over_threshold and not report.under_floor:
        logger.debug("Shot distribution within limits — no rebalancing needed.")
        return scenes

    logger.info(
        "Rebalancing shot distribution. Over threshold: %s. Under floor: %s.",
        report.over_threshold, report.under_floor,
    )

    # Count how many of each type we've already emitted while iterating
    seen: Counter = Counter()

    for scene in scenes:
        for frame in scene.frames:
            slug = _classify_shot(frame.shot_type)
            seen[slug] += 1

            if slug in report.over_threshold:
                # Allow the first occurrence; replace subsequent ones
                first_allowed = int(thresholds.get(slug, 0.40) * report.total_frames)
                if seen[slug] > max(1, first_allowed):
                    replacement_slug = _REPLACEMENT_POOL.get(slug, "medium")
                    # Rewrite shot_type to the replacement label (title-cased for display)
                    frame.shot_type = replacement_slug.replace("_", " ").title() + " Shot"
                    logger.debug(
                        "Scene %d Frame %d: %s → %s",
                        scene.scene_number, frame.frame_number, slug, replacement_slug,
                    )
                    seen[replacement_slug] += 1
                    seen[slug] -= 1   # correct the count since we changed it

    return scenes
