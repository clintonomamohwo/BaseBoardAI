"""Early creative-development helpers: transform an idea into an editable outline and script."""

from __future__ import annotations

from app.core.llm import _invoke_with_fallback


def _genre_instruction(genre: str | None) -> str:
    selected = (genre or "").strip()
    if selected:
        return f"The creator specified this genre: {selected}. Honor it; do not replace it with another genre."
    return "The creator did not specify a genre. Do not assign, label, or assume one; keep the story genre-open."


def _clean_output(text: str) -> str:
    """Remove accidental outer Markdown fences while preserving the authored text."""
    output = text.strip()
    if output.startswith("```"):
        first_newline = output.find("\n")
        if first_newline >= 0:
            output = output[first_newline + 1 :]
        if output.rstrip().endswith("```"):
            output = output.rstrip()[:-3].rstrip()
    return output


def generate_outline(idea: str, story_format: str, genre: str | None, notes: str = "") -> str:
    prompt = f"""You are a thoughtful story editor helping a creator develop an original idea.

CREATOR'S IDEA:
{idea.strip()}

TARGET FORMAT (follow this format, do not convert it to a different medium):
{story_format.strip()}

GENRE GUIDANCE:
{_genre_instruction(genre)}

ADDITIONAL CREATOR NOTES:
{notes.strip() or "None provided."}

Create a clear, useful, editable story outline. Preserve the creator's central idea and distinguish established details from new suggestions. Shape the structure to the target format rather than forcing a universal act structure. Include a working title if none was supplied, a one-sentence premise, the central story question or engine, key characters and their wants/conflicts, and a complete sequence of major story beats through the ending. Keep the beats concrete enough to draft, but do not write the full script yet. Do not add a genre label unless the creator supplied one. Use concise Markdown headings and bullets; return the outline only."""
    result = _clean_output(_invoke_with_fallback(prompt, max_new_tokens=6000))
    if not result:
        raise ValueError("The text provider returned an empty outline.")
    return result


def generate_script(
    idea: str,
    story_format: str,
    genre: str | None,
    outline: str,
    notes: str = "",
) -> str:
    prompt = f"""You are an experienced screenwriter and story adapter. Turn the creator-approved outline into a complete first script draft.

CREATOR'S ORIGINAL IDEA:
{idea.strip()}

TARGET FORMAT (follow its conventions; do not convert to another medium):
{story_format.strip()}

GENRE GUIDANCE:
{_genre_instruction(genre)}

CREATOR NOTES:
{notes.strip() or "None provided."}

APPROVED OUTLINE (preserve its story beats, character intent, and ending):
{outline.strip()}

Write the script itself, not a treatment or another outline. Make it readable and editable, with clear production units and headings appropriate to the specified format (for example, scenes, panels, episodes, or sequences). Keep the outline's events and ending intact; develop dialogue and action where appropriate to the format. Avoid adding an unstated genre. When the format is visual or dramatic, use clear scene headings and concrete action so a downstream visual-planning workflow can identify locations, characters, and beats. Return only the script, with no preface or commentary."""
    result = _clean_output(_invoke_with_fallback(prompt, max_new_tokens=12000))
    if not result:
        raise ValueError("The text provider returned an empty script.")
    return result
