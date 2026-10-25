from __future__ import annotations

import unittest

from app.core.identity_system import compute_scene_continuity
from app.core.prompt_builder import build_frame_prompt
from app.routers.storyboard import scene_qa_continuity
from app.schemas.storyboard import (
    FrameExpectedContext,
    SceneQARequest,
    ScriptSceneBase,
    StoryboardFrameBase,
)


LOCATION = "EXT/INT. NEO CAIRO — BENEATH THE GREAT PYRAMID"
TIME_OF_DAY = "Day"
CHARACTERS = ["Theo Mensah", "Harrison Brooks", "Amina Hassan", "Bella Alvarez"]
LIGHTING = "Desert midday — harsh overhead sun, deep shadows under the pyramid canopy"


def _scene() -> ScriptSceneBase:
    return ScriptSceneBase(
        scene_number=2,
        location_heading=LOCATION,
        environmental_type="Exterior",
        time_of_day=TIME_OF_DAY,
        emotional_tone="Tense",
        frames=[
            StoryboardFrameBase(
                frame_number=1,
                visual_action="Theo and the crew descend into the vault.",
                action_breakdown="Legacy action should not be used.",
                shot_type="Establishing Wide",
                camera_angle="Eye-level",
                duration_seconds=3,
                lighting_notes=LIGHTING,
                characters_present=CHARACTERS,
            )
        ],
    )


class SceneContinuityPromptFlowTests(unittest.TestCase):
    def test_image_prompt_contains_expected_scene_and_frame_context(self) -> None:
        scene = _scene()
        frame = scene.frames[0]

        prompt = build_frame_prompt(frame, scene, render_style="flat_color")

        self.assertIn(LOCATION, prompt)
        self.assertIn(TIME_OF_DAY, prompt)
        for name in CHARACTERS:
            with self.subTest(name=name):
                self.assertIn(name, prompt)
        self.assertIn(LIGHTING, prompt)
        self.assertIn("Theo and the crew descend into the vault.", prompt)
        self.assertNotIn("Legacy action should not be used.", prompt)

    def test_qa_rebuilds_prompt_with_shared_builder_instead_of_scoring_visual_action(self) -> None:
        scene = _scene()
        request = SceneQARequest(
            scene_number=2,
            location_heading=LOCATION,
            time_of_day=TIME_OF_DAY,
            environmental_type="Exterior",
            scene_data=scene,
            render_style="flat_color",
            canon_context=None,
            frames=[
                FrameExpectedContext(
                    scene_number=2,
                    frame_number=1,
                    location_heading=LOCATION,
                    time_of_day=TIME_OF_DAY,
                    environmental_type="Exterior",
                    characters_present=CHARACTERS,
                    lighting_notes=LIGHTING,
                    mood=None,
                    shot_type="Establishing Wide",
                    generated_prompt="Stale UI value: only the action text.",
                )
            ],
        )

        report = scene_qa_continuity(request)

        self.assertEqual(report.frames_passed, 1)
        self.assertEqual(report.frames_failed, 0)
        self.assertEqual(report.frame_results[0].issues, [])

    def test_qa_still_reports_real_context_omissions(self) -> None:
        result = compute_scene_continuity(
            scene_number=2,
            location_heading=LOCATION,
            time_of_day=TIME_OF_DAY,
            environmental_type="Exterior",
            frames=[
                FrameExpectedContext(
                    scene_number=2,
                    frame_number=1,
                    location_heading=LOCATION,
                    time_of_day=TIME_OF_DAY,
                    environmental_type="Exterior",
                    characters_present=CHARACTERS,
                    lighting_notes=LIGHTING,
                    mood=None,
                    shot_type="Wide Shot",
                    generated_prompt="Wide Shot, Eye-level. The crew enters a room.",
                )
            ],
        )

        issue_categories = {issue.category for issue in result.frame_results[0].issues}
        self.assertTrue({"location", "time_of_day", "characters", "lighting"}.issubset(issue_categories))
        self.assertEqual(result.frames_failed, 1)


if __name__ == "__main__":
    unittest.main()
