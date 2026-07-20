"""
sheet_slicer.py — Deterministic PIL-based grid slicer for character package sheets.

Accepts a base64 data URL of a generated sheet image and a SheetLayout manifest,
then crops each cell to its own base64 data URL.

No AI, no detection, no computer vision — pure arithmetic slicing.
Cell boundaries are derived entirely from the layout manifest (canvas_width,
canvas_height, rows, cols).  The same manifest that drove the generation prompt
drives the slice, so cells are always aligned.

Public API
----------
    slice_sheet(sheet_data_url, layout) -> dict[str, str]
        Returns {cell_id: "data:image/png;base64,..."} for every cell.

    slice_cell(sheet_data_url, layout, cell_id) -> str | None
        Returns a single cell as a data URL, or None if cell_id not found.
"""

from __future__ import annotations

import base64
import io
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.core.sheet_layouts import SheetLayout

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _data_url_to_image(data_url: str):  # returns PIL.Image.Image
    """Decode a base64 data URL to a PIL Image."""
    try:
        from PIL import Image  # type: ignore[import-untyped]
    except ImportError as exc:
        raise RuntimeError(
            "Pillow is required for sheet slicing. "
            "Install it with: pip install Pillow"
        ) from exc

    header, b64 = data_url.split(",", 1)
    raw = base64.b64decode(b64)
    return Image.open(io.BytesIO(raw)).convert("RGBA")


def _image_to_data_url(image) -> str:  # image: PIL.Image.Image
    """Encode a PIL Image to a PNG base64 data URL."""
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return "data:image/png;base64," + b64


def _cell_box(layout: "SheetLayout", row: int, col: int) -> tuple[int, int, int, int]:
    """
    Return the pixel bounding box (left, upper, right, lower) for a grid cell.

    Uses integer cell dimensions derived from the layout canvas — no padding
    inset is applied at the crop stage so callers get the full cell including
    any whitespace border.  The prompt already instructs the model to use
    ~65% of each cell for the subject, so padding is a generation-side concern,
    not a slice-side concern.
    """
    cw = layout.cell_width
    ch = layout.cell_height
    left  = col * cw
    upper = row * ch
    right  = left + cw
    lower  = upper + ch
    return (left, upper, right, lower)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def slice_sheet(sheet_data_url: str, layout: "SheetLayout") -> dict[str, str]:
    """
    Slice a generated sheet image into individual cell images.

    Parameters
    ----------
    sheet_data_url : str
        Full base64 data URL of the sheet (e.g. "data:image/png;base64,...").
    layout : SheetLayout
        The manifest that was used to generate the sheet.

    Returns
    -------
    dict[str, str]
        Mapping of cell_id → base64 data URL for every cell in the layout.
        Cells that fail to crop are logged and omitted from the result.
    """
    try:
        sheet_img = _data_url_to_image(sheet_data_url)
    except Exception as exc:
        logger.error("sheet_slicer: failed to decode sheet image: %s", exc)
        return {}

    # Resize to canonical canvas size if the image provider returned a different
    # resolution (e.g. Pollinations may not honour exact dimensions).
    if (sheet_img.width, sheet_img.height) != (layout.canvas_width, layout.canvas_height):
        logger.debug(
            "sheet_slicer: resizing %dx%d → %dx%d",
            sheet_img.width, sheet_img.height,
            layout.canvas_width, layout.canvas_height,
        )
        try:
            from PIL import Image  # type: ignore[import-untyped]
            sheet_img = sheet_img.resize(
                (layout.canvas_width, layout.canvas_height),
                Image.Resampling.LANCZOS,
            )
        except Exception as exc:
            logger.warning("sheet_slicer: resize failed (%s), proceeding with original size", exc)

    result: dict[str, str] = {}
    for cell in layout.cells:
        try:
            box = _cell_box(layout, cell.row, cell.col)
            cropped = sheet_img.crop(box).convert("RGB")
            result[cell.id] = _image_to_data_url(cropped)
        except Exception as exc:
            logger.warning(
                "sheet_slicer: failed to crop cell '%s' at (%d,%d): %s",
                cell.id, cell.row, cell.col, exc,
            )
    return result


def slice_cell(sheet_data_url: str, layout: "SheetLayout", cell_id: str) -> str | None:
    """
    Slice and return a single named cell from a sheet.

    Returns None if cell_id is not in the layout or if decoding fails.
    """
    cell = layout.cell_by_id(cell_id)
    if cell is None:
        logger.warning("sheet_slicer: cell_id '%s' not found in layout '%s'", cell_id, layout.template)
        return None

    try:
        sheet_img = _data_url_to_image(sheet_data_url)
    except Exception as exc:
        logger.error("sheet_slicer: failed to decode sheet image: %s", exc)
        return None

    if (sheet_img.width, sheet_img.height) != (layout.canvas_width, layout.canvas_height):
        try:
            from PIL import Image  # type: ignore[import-untyped]
            sheet_img = sheet_img.resize(
                (layout.canvas_width, layout.canvas_height),
                Image.Resampling.LANCZOS,
            )
        except Exception as exc:
            logger.warning("sheet_slicer: resize failed (%s), proceeding with original size", exc)

    try:
        box = _cell_box(layout, cell.row, cell.col)
        cropped = sheet_img.crop(box).convert("RGB")
        return _image_to_data_url(cropped)
    except Exception as exc:
        logger.error("sheet_slicer: crop failed for cell '%s': %s", cell_id, exc)
        return None
