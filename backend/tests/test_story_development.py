from __future__ import annotations

import unittest
from unittest.mock import patch

from pydantic import ValidationError

from app.core import llm, story_development
from app.schemas.storyboard import StoryOutlineRequest, StoryScriptRequest


class StoryDevelopmentTests(unittest.TestCase):
    def test_outline_request_allows_missing_genre_and_requires_format(self) -> None:
        request = StoryOutlineRequest(idea="A lighthouse receives a letter from tomorrow", format="animated short")
        self.assertIsNone(request.genre)
        self.assertEqual(request.format, "animated short")

        blank_genre = StoryOutlineRequest(
            idea="A lighthouse receives a letter from tomorrow",
            format="animated short",
            genre="   ",
        )
        self.assertIsNone(blank_genre.genre)
        with self.assertRaises(ValidationError):
            StoryOutlineRequest(idea="A premise", format="   ")

    def test_outline_prompt_keeps_unspecified_genre_open_and_honors_format(self) -> None:
        with patch.object(story_development, "_invoke_with_fallback", return_value="# Outline") as invoke:
            outline = story_development.generate_outline(
                "A lighthouse receives a letter from tomorrow", "animated short", None
            )

        self.assertEqual(outline, "# Outline")
        prompt = invoke.call_args.args[0]
        self.assertIn("TARGET FORMAT", prompt)
        self.assertIn("animated short", prompt)
        self.assertIn("did not specify a genre", prompt)
        self.assertIn("Do not assign, label, or assume one", prompt)

    def test_creator_specified_genre_is_preserved_in_script_prompt(self) -> None:
        request = StoryScriptRequest(
            idea="A lighthouse receives a letter from tomorrow",
            format="radio play",
            genre="mystery",
            outline="The keeper investigates the letter and discovers it is their own.",
        )
        with patch.object(story_development, "_invoke_with_fallback", return_value="ACT ONE") as invoke:
            script = story_development.generate_script(
                request.idea, request.format, request.genre, request.outline, request.notes
            )

        self.assertEqual(script, "ACT ONE")
        prompt = invoke.call_args.args[0]
        self.assertIn("creator specified this genre: mystery", prompt)
        self.assertIn("radio play", prompt)
        self.assertIn("APPROVED OUTLINE", prompt)
        self.assertIn(request.outline, prompt)

    def test_plain_text_output_strips_outer_fence_only(self) -> None:
        with patch.object(story_development, "_invoke_with_fallback", return_value="```text\nSCENE 1\nAction.\n```"):
            script = story_development.generate_script("Idea", "short film", None, "Ending")
        self.assertEqual(script, "SCENE 1\nAction.")

    def test_storyboard_prompt_receives_creator_format_and_open_genre_context(self) -> None:
        context = "Creator-selected format: graphic novel.\nNo genre was specified. Do not assign or assume one."
        with patch.object(llm, "_invoke_with_fallback", return_value="[]") as invoke:
            scenes, truncated = llm._invoke_storyboard_chunk(
                "SCENE 1: A traveler opens a door.",
                "[]",
                "[]",
                "Creator visual style",
                "bw_sketch",
                "balanced",
                0,
                story_context=context,
            )

        self.assertEqual(scenes, [])
        self.assertFalse(truncated)
        self.assertIn("Creator-selected format: graphic novel", invoke.call_args.args[0])
        self.assertIn("No genre was specified. Do not assign or assume one.", invoke.call_args.args[0])


if __name__ == "__main__":
    unittest.main()
