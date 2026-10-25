from __future__ import annotations

import unittest
from types import SimpleNamespace

from app.core.identity_system import build_species_anatomy_prefix
from app.core.prompt_builder import build_frame_prompt
from app.core.prompts import CHARACTER_PROMPT
from app.routers.storyboard import _char_base_desc


class AnimalHumanoidPromptTests(unittest.TestCase):
    def test_species_prefix_is_unmistakably_animal_for_humanoid_form(self) -> None:
        prefix = build_species_anatomy_prefix(
            species_id="fox",
            species_label="Fox",
            physical_form="humanoid",
        )

        self.assertTrue(prefix.startswith("anthropomorphic fox humanoid"))
        self.assertIn("triangular fox ears", prefix)
        self.assertIn("pointed snout", prefix)
        self.assertIn("bushy tail", prefix)
        self.assertIn("not a human face or an animal costume", prefix)

    def test_missing_species_label_does_not_fall_back_to_human(self) -> None:
        prefix = build_species_anatomy_prefix(
            species_id="fox",
            species_label="Human",
            physical_form="humanoid",
        )

        self.assertTrue(prefix.startswith("anthropomorphic fox humanoid"))
        self.assertNotIn("anthropomorphic human humanoid", prefix)

    def test_custom_animal_id_overrides_default_human_label(self) -> None:
        prefix = build_species_anatomy_prefix(
            species_id="moon_otter",
            species_label="Human",
            species_custom_notes="silver fur, webbed paws, broad otter muzzle",
            physical_form="humanoid",
        )

        self.assertTrue(prefix.startswith("anthropomorphic moon otter humanoid"))
        self.assertNotIn("anthropomorphic human humanoid", prefix)
        self.assertIn("silver fur", prefix)

    def test_canonical_character_prompt_cannot_override_animal_anatomy(self) -> None:
        description = _char_base_desc({
            "name": "Mara",
            "species": {"species_id": "fox", "label": "Fox", "custom_notes": None},
            "physical_form": {"form": "humanoid", "has_wings": False, "has_tail": True},
            "_canonical_prompt": "Mara, short brown hair, green eyes, wearing a travel coat",
            "facial_blueprint": {},
        })

        self.assertTrue(description.startswith("anthropomorphic fox humanoid"))
        self.assertIn("pointed snout", description)
        self.assertIn("Mara", description)
        self.assertIn("short brown hair", description)
        self.assertIn("not a human face or an animal costume", description)

    def test_storyboard_frame_includes_species_constraints_before_truncation(self) -> None:
        frame = SimpleNamespace(
            shot_type="Wide Shot",
            camera_angle="Eye-level",
            action_breakdown="CHAR_MARA_12 crosses the bridge beneath the moon",
            lighting_notes="Cool moonlight",
            action_pose=None,
            props_present=[],
            screen_direction="unspecified",
            continuity_notes=None,
            characters_present=["Mara"],
            lens_prompt_suffix=None,
            focal_length=None,
            depth_style=None,
        )
        canon = {
            "approved_characters": {
                "CHAR_MARA_12": {"name": "Mara", "appearance_summary": "Mara, a brave traveler"},
            },
            "character_identities": {
                "CHAR_MARA_12": {"name": "Mara", "_canonical_prompt": "Mara, a brave traveler"},
            },
            "character_species": {
                "CHAR_MARA_12": {
                    "species_id": "fox",
                    "label": "Fox",
                    "custom_notes": None,
                    "physical_form": {
                        "form": "humanoid",
                        "custom_description": None,
                        "limb_count": None,
                        "has_wings": False,
                        "has_tail": True,
                    },
                },
            },
        }

        prompt = build_frame_prompt(frame, SimpleNamespace(), canon_context=canon)

        self.assertIn("anthropomorphic fox humanoid", prompt)
        self.assertIn("not a human face or an animal costume", prompt)
        self.assertLess(prompt.index("anthropomorphic fox humanoid"), prompt.index("CHAR_MARA_12 crosses"))
        self.assertLessEqual(len(prompt), 490)

    def test_character_stage_requires_species_and_form(self) -> None:
        self.assertIn('"species": {{', CHARACTER_PROMPT)
        self.assertIn('"physical_form": {{', CHARACTER_PROMPT)
        self.assertIn("A bipedal, speaking, or clothed animal is still that animal species, not a human.", CHARACTER_PROMPT)


if __name__ == "__main__":
    unittest.main()
