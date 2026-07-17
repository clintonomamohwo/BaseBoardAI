"""
sheet_layouts.py — Layout manifests for all BaseBoard character package sheets.

Every sheet type has a fixed canvas size, fixed grid, and fixed cell definitions.
The same manifest is used for:
  1. Prompt construction — tells the image model exactly what to put in each cell
  2. Slicing — tells sheet_slicer.py exactly where to crop each cell

Why fixed layouts?
  - One API call per sheet instead of N calls (major cost reduction)
  - Deterministic slicing — no AI, no detection, no computer vision
  - Individual cell regeneration — update one cell without redoing the whole sheet
  - Consistent UI — every sheet of the same type has the same layout, always

Canvas conventions
  - All dimensions are in pixels
  - padding is the margin inside each cell (so the subject fills ~65% of cell area)
  - Cells are addressed by (row, col) starting from (0, 0) top-left

Usage
-----
    from app.core.sheet_layouts import LAYOUTS, get_layout
    layout = get_layout("expressions")
    # layout.cells → list of SheetCell
    # layout.canvas_width, layout.canvas_height
    # layout.rows, layout.cols
    # layout.prompt_prefix(base_desc) → full sheet generation prompt
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class SheetCell:
    id: str           # machine key, e.g. "happy"
    label: str        # human label shown in UI, e.g. "Happy"
    row: int          # 0-based row index
    col: int          # 0-based column index
    prompt_desc: str  # description injected into the sheet prompt for this cell


@dataclass(frozen=True)
class SheetLayout:
    template: str          # unique key, e.g. "expressions_3x2"
    canvas_width: int
    canvas_height: int
    rows: int
    cols: int
    padding: int           # pixels of margin inside each cell
    cells: tuple[SheetCell, ...]

    @property
    def cell_width(self) -> int:
        return self.canvas_width // self.cols

    @property
    def cell_height(self) -> int:
        return self.canvas_height // self.rows

    def cell_by_id(self, cell_id: str) -> SheetCell | None:
        return next((c for c in self.cells if c.id == cell_id), None)

    def prompt_prefix(self, base_desc: str, render_style: str = "bw_sketch") -> str:
        """
        Build the sheet generation prompt.
        Describes the full grid layout so the image model generates each cell
        in the correct position with the correct subject.
        Prepends the active render-style prefix so all sheet images honour
        the style selected at project creation.
        """
        from app.core.prompt_builder import STYLE_PREFIXES, DEFAULT_STYLE_PREFIX
        style_prefix = STYLE_PREFIXES.get(render_style, DEFAULT_STYLE_PREFIX)

        cell_descs = "  |  ".join(
            f"[{c.label}]" for c in sorted(self.cells, key=lambda x: (x.row, x.col))
        )
        grid_desc = f"{self.rows} rows × {self.cols} columns"

        if render_style == "bw_sketch":
            style_note = "minimal outline drawings only, no shading, no color, no fill"
        elif render_style == "bw_detailed":
            style_note = "detailed black and white ink illustration, crosshatch shading, no color"
        elif render_style == "flat_color":
            style_note = "flat solid color fills, clean vector outlines, no gradients, no shading"
        else:  # full_shaded
            style_note = "fully shaded 2D illustration, volumetric lighting, expressive rendering"

        return (
            style_prefix +
            f"{base_desc}, character reference sheet, {grid_desc} grid, "
            f"white background, each cell labeled: {cell_descs}, "
            f"uniform cell size, consistent character size across cells, "
            f"consistent camera distance, consistent lighting, "
            f"{style_note}, no overlap between cells"
        )

    def to_dict(self) -> dict:
        return {
            "template": self.template,
            "canvasWidth": self.canvas_width,
            "canvasHeight": self.canvas_height,
            "rows": self.rows,
            "columns": self.cols,
            "padding": self.padding,
            "cellWidth": self.cell_width,
            "cellHeight": self.cell_height,
            "cells": [
                {
                    "id": c.id,
                    "label": c.label,
                    "row": c.row,
                    "column": c.col,
                    "promptDesc": c.prompt_desc,
                }
                for c in self.cells
            ],
        }


# ---------------------------------------------------------------------------
# Expressions — 3 × 3 grid (9 cells, 1536 × 1536 canvas)
# ---------------------------------------------------------------------------

EXPRESSIONS_LAYOUT = SheetLayout(
    template="expressions_3x3",
    canvas_width=1536,
    canvas_height=1536,
    rows=3,
    cols=3,
    padding=48,
    cells=(
        SheetCell("neutral",   "Neutral",   0, 0, "neutral resting expression, relaxed face, mouth closed"),
        SheetCell("happy",     "Happy",     0, 1, "happy smiling expression, warm eyes, raised cheeks"),
        SheetCell("laughing",  "Laughing",  0, 2, "laughing expression, open mouth, squinting eyes, joy"),
        SheetCell("angry",     "Angry",     1, 0, "angry expression, furrowed brow, clenched jaw, fierce eyes"),
        SheetCell("sad",       "Sad",       1, 1, "sad expression, downcast eyes, slight frown, drooping corners"),
        SheetCell("surprised", "Surprised", 1, 2, "surprised expression, wide eyes, open mouth, raised brows"),
        SheetCell("fearful",   "Fearful",   2, 0, "fearful expression, wide frightened eyes, tense brow, open mouth"),
        SheetCell("thinking",  "Thinking",  2, 1, "thinking expression, eyes looking up-right, finger on chin, slight squint"),
        SheetCell("crying",    "Crying",    2, 2, "crying expression, tears on cheeks, scrunched eyes, quivering lip"),
    ),
)


# ---------------------------------------------------------------------------
# Turnaround — 5 × 1 grid (5 views, 2560 × 512 canvas)
# ---------------------------------------------------------------------------

TURNAROUND_LAYOUT = SheetLayout(
    template="turnaround_5x1",
    canvas_width=2560,
    canvas_height=512,
    rows=1,
    cols=5,
    padding=32,
    cells=(
        SheetCell("front",        "Front",      0, 0, "full front view, facing camera directly, head-to-toe"),
        SheetCell("three_q_front","3/4 Front",  0, 1, "three-quarter front view, slight left turn, head-to-toe"),
        SheetCell("side",         "Side",       0, 2, "pure right side profile, 90 degrees, head-to-toe"),
        SheetCell("three_q_back", "3/4 Back",   0, 3, "three-quarter rear view, slight right turn, head-to-toe"),
        SheetCell("back",         "Back",       0, 4, "full back view, facing away from camera, head-to-toe"),
    ),
)


# ---------------------------------------------------------------------------
# Poses — 4 × 2 grid (7 poses + 1 spare, 2048 × 1024 canvas)
# ---------------------------------------------------------------------------

POSES_LAYOUT = SheetLayout(
    template="poses_4x2",
    canvas_width=2048,
    canvas_height=1024,
    rows=2,
    cols=4,
    padding=40,
    cells=(
        SheetCell("standing",       "Standing",       0, 0, "standing relaxed, arms at sides, full body front view"),
        SheetCell("walking",        "Walking",        0, 1, "mid-stride walking, natural gait, full body"),
        SheetCell("running",        "Running",        0, 2, "running at full speed, dynamic forward lean, full body"),
        SheetCell("sitting",        "Sitting",        0, 3, "sitting down, relaxed posture, full body"),
        SheetCell("pointing",       "Pointing",       1, 0, "pointing forward with one arm extended, full body"),
        SheetCell("holding_object", "Holding Object", 1, 1, "holding an object in both hands, full body"),
        SheetCell("hero_pose",      "Hero Pose",      1, 2, "heroic stance, confident, chin up, full body"),
    ),
)


# ---------------------------------------------------------------------------
# Outfits — 4 × 2 grid (7 outfits + 1 spare, 2048 × 1024 canvas)
# ---------------------------------------------------------------------------

OUTFITS_LAYOUT = SheetLayout(
    template="outfits_4x2",
    canvas_width=2048,
    canvas_height=1024,
    rows=2,
    cols=4,
    padding=40,
    cells=(
        SheetCell("default", "Default", 0, 0, "default signature outfit, full body front view"),
        SheetCell("casual",  "Casual",  0, 1, "casual everyday clothes, relaxed fit, full body front view"),
        SheetCell("formal",  "Formal",  0, 2, "formal attire, elegant, full body front view"),
        SheetCell("travel",  "Travel",  0, 3, "travel outfit, practical layers, full body front view"),
        SheetCell("combat",  "Combat",  1, 0, "combat or action-ready gear, full body front view"),
        SheetCell("winter",  "Winter",  1, 1, "winter outfit, warm coat and layers, full body front view"),
        SheetCell("summer",  "Summer",  1, 2, "summer outfit, light breathable clothing, full body front view"),
    ),
)


# ---------------------------------------------------------------------------
# Turnaround 360 — 4 × 2 grid (8 views, 2048 × 1024 canvas)
# ---------------------------------------------------------------------------

TURNAROUND_360_LAYOUT = SheetLayout(
    template="turnaround_360_4x2",
    canvas_width=2048,
    canvas_height=1024,
    rows=2,
    cols=4,
    padding=32,
    cells=(
        SheetCell("deg_000", "0°",   0, 0, "full front, 0 degrees, head-to-toe"),
        SheetCell("deg_045", "45°",  0, 1, "45 degrees right turn, head-to-toe"),
        SheetCell("deg_090", "90°",  0, 2, "pure right side, 90 degrees, head-to-toe"),
        SheetCell("deg_135", "135°", 0, 3, "135 degrees rear-right, head-to-toe"),
        SheetCell("deg_180", "180°", 1, 0, "full back, 180 degrees, head-to-toe"),
        SheetCell("deg_225", "225°", 1, 1, "225 degrees rear-left, head-to-toe"),
        SheetCell("deg_270", "270°", 1, 2, "pure left side, 270 degrees, head-to-toe"),
        SheetCell("deg_315", "315°", 1, 3, "315 degrees front-left, head-to-toe"),
    ),
)


# ---------------------------------------------------------------------------
# Premium poses — 4 × 2 grid (8 poses, 2048 × 1024 canvas)
# ---------------------------------------------------------------------------

PREMIUM_POSES_LAYOUT = SheetLayout(
    template="premium_poses_4x2",
    canvas_width=2048,
    canvas_height=1024,
    rows=2,
    cols=4,
    padding=40,
    cells=(
        SheetCell("t_pose",          "T-Pose",     0, 0, "T-pose, arms horizontal, standardised rigging pose"),
        SheetCell("a_pose",          "A-Pose",     0, 1, "A-pose, arms at 45 degrees, relaxed rigging pose"),
        SheetCell("crouching",       "Crouching",  0, 2, "crouching low, defensive stance"),
        SheetCell("climbing",        "Climbing",   0, 3, "climbing upward, arms and legs engaged"),
        SheetCell("fighting_stance", "Fighting",   1, 0, "combat fighting stance, guard up"),
        SheetCell("falling",         "Falling",    1, 1, "falling backwards, arms outstretched"),
        SheetCell("celebrating",     "Celebrate",  1, 2, "arms raised in victory celebration"),
        SheetCell("kneeling",        "Kneeling",   1, 3, "kneeling on one knee, respectful"),
    ),
)


# ---------------------------------------------------------------------------
# Material closeups — 3 × 2 grid (5 closeups + 1 spare, 1536 × 1024 canvas)
# ---------------------------------------------------------------------------

MATERIAL_CLOSEUPS_LAYOUT = SheetLayout(
    template="material_closeups_3x2",
    canvas_width=1536,
    canvas_height=1024,
    rows=2,
    cols=3,
    padding=32,
    cells=(
        SheetCell("face_closeup",   "Face",    0, 0, "extreme close-up of face, skin/fur texture detail"),
        SheetCell("hair_closeup",   "Hair",    0, 1, "extreme close-up of hair, strand texture and volume"),
        SheetCell("fabric_closeup", "Fabric",  0, 2, "extreme close-up of clothing fabric, material texture"),
        SheetCell("hand_closeup",   "Hands",   1, 0, "extreme close-up of hands, knuckle and claw detail"),
        SheetCell("eye_closeup",    "Eyes",    1, 1, "extreme close-up of eyes, iris and pupil detail"),
        SheetCell("accessory",      "Accessory", 1, 2, "close-up of signature accessory or prop, isolated"),
    ),
)


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

LAYOUTS: dict[str, SheetLayout] = {
    "expressions":       EXPRESSIONS_LAYOUT,
    "turnaround":        TURNAROUND_LAYOUT,
    "poses":             POSES_LAYOUT,
    "outfits":           OUTFITS_LAYOUT,
    "turnaround_360":    TURNAROUND_360_LAYOUT,
    "premium_poses":     PREMIUM_POSES_LAYOUT,
    "material_closeups": MATERIAL_CLOSEUPS_LAYOUT,
}


def get_layout(name: str) -> SheetLayout:
    """Return the layout for the given package type. Raises KeyError if not found."""
    if name not in LAYOUTS:
        raise KeyError(f"No sheet layout for '{name}'. Available: {list(LAYOUTS)}")
    return LAYOUTS[name]
