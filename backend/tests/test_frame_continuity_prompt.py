from __future__ import annotations

import unittest
from types import SimpleNamespace

from app.core.prompt_builder import build_frame_prompt


class FrameContinuityPromptTests(unittest.TestCase):
    def test_structured_pose_props_direction_and_notes_reach_image_prompt(self) -> None:
        frame = SimpleNamespace(
            shot_type="Medium Shot",
            camera_angle="Eye-level",
            action_breakdown="Mara lands on the bridge and reaches for the rail",
            lighting_notes="Cool dawn light",
            action_pose="Landing with her right hand gripping the rail",
            props_present=["red satchel"],
            screen_direction="left_to_right",
            continuity_notes="Keep the satchel on her right shoulder.",
            characters_present=[],
            lens_prompt_suffix=None,
            focal_length=None,
            depth_style=None,
        )
        prompt = build_frame_prompt(frame, SimpleNamespace(), render_style="bw_sketch")

        self.assertIn("end pose: Landing with her right hand gripping the rail", prompt)
        self.assertIn("visible props: red satchel", prompt)
        self.assertIn("screen movement: left to right", prompt)
        self.assertIn("continuity: Keep the satchel on her right shoulder.", prompt)


if __name__ == "__main__":
    unittest.main()
