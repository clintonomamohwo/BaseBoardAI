from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app.routers.storyboard import _char_base_desc, ckg_update_identity
from app.schemas.storyboard import (
    CKGUpdateIdentityRequest,
    CharacterIdentity,
    PhysicalForm,
    SpeciesProfile,
)


class _FakeDB:
    def __init__(self) -> None:
        self.committed = False

    def commit(self) -> None:
        self.committed = True


class ApprovedCharacterPromptTests(unittest.TestCase):
    def test_saved_tortoise_identity_is_kept_with_custom_ckg_prompt(self) -> None:
        character_id = "CHAR_THEO_MENSAH"
        project = SimpleNamespace(canon=None)
        db = _FakeDB()
        payload = CKGUpdateIdentityRequest(
            project_id=1,
            character_id=character_id,
            identity=CharacterIdentity(
                name="Theo Mensah",
                body_proportions="Broad-shouldered, heavy shell, slow deliberate movements",
                age=28,
                distinct_markers="Shell engraved with faint glowing Cartographer sigils",
            ),
            species=SpeciesProfile(species_id="tortoise", label="Giant Tortoise"),
            physical_form=PhysicalForm(form="humanoid"),
            canonical_prompt="wearing a weathered navigator's cloak, carrying a brass compass",
        )

        with patch("app.routers.storyboard._load_project_or_404", return_value=project):
            result = ckg_update_identity(payload, db)

        prompt = result["canonical_prompt"]
        for required_detail in (
            "anthropomorphic giant tortoise humanoid",
            "large domed shell on back",
            "scaled reptilian skin",
            "beaked tortoise face",
            "Theo Mensah",
            "age 28",
            "Broad-shouldered",
            "heavy shell",
            "slow deliberate movements",
            "Shell engraved with faint glowing Cartographer sigils",
            "weathered navigator's cloak",
            "brass compass",
        ):
            with self.subTest(detail=required_detail):
                self.assertIn(required_detail.casefold(), prompt.casefold())

        self.assertEqual(
            prompt,
            project.canon["approved_characters"][character_id]["canonical_prompt"],
        )
        self.assertEqual(
            prompt,
            project.canon["character_identities"][character_id]["_canonical_prompt"],
        )
        self.assertTrue(db.committed)

    def test_character_package_prompt_keeps_saved_markers_with_custom_text(self) -> None:
        description = _char_base_desc({
            "name": "Theo Mensah",
            "species": {"species_id": "tortoise", "label": "Giant Tortoise"},
            "physical_form": {"form": "humanoid", "has_wings": False, "has_tail": False},
            "facial_blueprint": {
                "estimated_age": 28,
                "bone_structure": "Broad-shouldered, heavy shell, slow deliberate movements",
                "distinct_markers": "Shell engraved with faint glowing Cartographer sigils",
            },
            "wardrobe_defaults": "a dark navigator's coat",
            "_canonical_prompt": "Theo Mensah, wearing a dark navigator's coat, carrying a brass compass",
        })

        self.assertTrue(description.startswith("anthropomorphic giant tortoise humanoid"))
        for required_detail in (
            "Theo Mensah",
            "age 28",
            "Broad-shouldered",
            "heavy shell",
            "slow deliberate movements",
            "Shell engraved with faint glowing Cartographer sigils",
            "dark navigator's coat",
            "brass compass",
            "not a human face or an animal costume",
        ):
            with self.subTest(detail=required_detail):
                self.assertIn(required_detail.casefold(), description.casefold())


if __name__ == "__main__":
    unittest.main()
