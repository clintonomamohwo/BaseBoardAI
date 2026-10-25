from __future__ import annotations

import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from pydantic import ValidationError

from app.db.models import Base
import app.db.session as database_session
from app.routers.storyboard import (
    _FrameImageSave,
    _build_project_orm,
    get_storyboard_project,
    save_frame_image,
    update_storyboard_project,
)
from app.schemas.storyboard import (
    CharacterProfileBase,
    FacialBlueprint,
    ScriptSceneBase,
    StoryDevelopmentDraft,
    StoryboardFrameBase,
    StoryboardProjectCreate,
    StoryboardProjectUpdate,
)


class StoryboardPersistenceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.session_factory = sessionmaker(bind=self.engine, autoflush=False)
        self.db = self.session_factory()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def test_frame_edits_approval_and_image_survive_project_update(self) -> None:
        original = StoryboardProjectCreate(
            project_title="Original title",
            global_aesthetic="Original aesthetic",
            render_style="bw_sketch",
            scenes=[
                ScriptSceneBase(
                    scene_number=1,
                    location_heading="INT. STUDIO - DAY",
                    environmental_type="Interior",
                    time_of_day="Day",
                    emotional_tone="Calm",
                    frames=[
                        StoryboardFrameBase(
                            frame_number=1,
                            action_breakdown="Old action",
                            shot_type="Wide Shot",
                            camera_angle="Eye-level",
                            duration_seconds=3,
                            lighting_notes="Soft light",
                        )
                    ],
                )
            ],
        )
        project = _build_project_orm(original)
        self.db.add(project)
        self.db.commit()
        project_id = project.db_id

        edited_frame = StoryboardFrameBase(
            frame_number=1,
            narrative_action="A performer enters",
            visual_action="The performer crosses toward the window",
            action_breakdown="The performer crosses toward the window",
            shot_type="Medium Shot",
            camera_angle="Low Angle",
            camera_movement="Slow Dolly In",
            duration_seconds=4.5,
            lighting_notes="Warm window light",
            mood="Hopeful",
            generated_image_url="data:image/png;base64,aW1hZ2U=",
            approval_status="approved",
            is_manual_override=True,
            lens="50mm Prime",
            focal_length="50mm",
            depth_style="shallow focus",
            lens_prompt_suffix="shot on 50mm lens, shallow focus",
            locked_fields=["camera_angle"],
            auto_selected={"shot_type": False},
            director_rationale={"shot_type": "User selected"},
            action_pose="Kneeling, facing the doorway",
            props_present=["brass key", "blue folder"],
            screen_direction="right_to_left",
            continuity_reference_ids=["scene_1_frame_1"],
            continuity_notes="Keep the key in the left hand.",
            continuity_dependency_ids=["scene_1_frame_2"],
            continuity_review_required=True,
        )
        update = StoryboardProjectUpdate(
            project_title="Edited title",
            global_aesthetic="Edited aesthetic",
            render_style="flat_color",
            scenes=[
                ScriptSceneBase(
                    scene_number=1,
                    location_heading="INT. STUDIO - NIGHT",
                    environmental_type="Interior",
                    time_of_day="Night",
                    emotional_tone="Hopeful",
                    frames=[edited_frame],
                )
            ],
        )

        response = update_storyboard_project(project_id, update, self.db)
        self.db.expire_all()
        reloaded = get_storyboard_project(project_id, self.db)

        for saved in (response, reloaded):
            self.assertEqual(saved.project_title, "Edited title")
            frame = saved.scenes[0].frames[0]
            self.assertEqual(frame.visual_action, "The performer crosses toward the window")
            self.assertEqual(frame.approval_status, "approved")
            self.assertTrue(frame.is_manual_override)
            self.assertEqual(frame.generated_image_url, "data:image/png;base64,aW1hZ2U=")
            self.assertEqual(frame.lens_prompt_suffix, "shot on 50mm lens, shallow focus")
            self.assertEqual(frame.locked_fields, ["camera_angle"])
            self.assertEqual(frame.director_rationale, {"shot_type": "User selected"})
            self.assertEqual(frame.action_pose, "Kneeling, facing the doorway")
            self.assertEqual(frame.props_present, ["brass key", "blue folder"])
            self.assertEqual(frame.screen_direction, "right_to_left")
            self.assertEqual(frame.continuity_reference_ids, ["scene_1_frame_1"])
            self.assertEqual(frame.continuity_notes, "Keep the key in the left hand.")
            self.assertEqual(frame.continuity_dependency_ids, ["scene_1_frame_2"])
            self.assertTrue(frame.continuity_review_required)

    def test_init_db_adds_new_frame_columns_without_losing_legacy_rows(self) -> None:
        legacy_engine = create_engine("sqlite://")
        with legacy_engine.begin() as connection:
            connection.exec_driver_sql(
                "CREATE TABLE storyboard_projects ("
                "db_id INTEGER PRIMARY KEY, project_title TEXT NOT NULL, "
                "global_aesthetic TEXT NOT NULL, render_style VARCHAR NOT NULL, canon JSON)"
            )
            connection.exec_driver_sql(
                "INSERT INTO storyboard_projects "
                "(db_id, project_title, global_aesthetic, render_style, canon) "
                "VALUES (1, 'Legacy project', 'Cinematic', 'bw_sketch', NULL)"
            )
            connection.exec_driver_sql(
                "CREATE TABLE script_scenes ("
                "id INTEGER PRIMARY KEY, scene_number INTEGER NOT NULL, "
                "location_heading TEXT NOT NULL, environmental_type TEXT NOT NULL, "
                "time_of_day TEXT NOT NULL, emotional_tone TEXT NOT NULL, "
                "color_palette JSON NOT NULL, project_id INTEGER NOT NULL)"
            )
            connection.exec_driver_sql(
                "INSERT INTO script_scenes "
                "(id, scene_number, location_heading, environmental_type, time_of_day, "
                "emotional_tone, color_palette, project_id) "
                "VALUES (1, 4, 'INT. LEGACY - DAY', 'Interior', 'Day', 'Calm', '[]', 1)"
            )
            connection.exec_driver_sql(
                "CREATE TABLE storyboard_frames (id INTEGER PRIMARY KEY, legacy_note TEXT)"
            )
            connection.exec_driver_sql(
                "INSERT INTO storyboard_frames (id, legacy_note) VALUES (1, 'keep me')"
            )

        try:
            with patch.object(database_session, "engine", legacy_engine):
                database_session.init_db()

            columns = {column["name"] for column in inspect(legacy_engine).get_columns("storyboard_frames")}
            self.assertIn("approval_status", columns)
            self.assertIn("is_manual_override", columns)
            self.assertIn("action_pose", columns)
            self.assertIn("props_present", columns)
            self.assertIn("screen_direction", columns)
            self.assertIn("continuity_reference_ids", columns)
            self.assertIn("continuity_notes", columns)
            self.assertIn("continuity_dependency_ids", columns)
            self.assertIn("continuity_review_required", columns)
            character_columns = {column["name"] for column in inspect(legacy_engine).get_columns("character_profiles")}
            self.assertIn("full_data", character_columns)
            scene_columns = {column["name"] for column in inspect(legacy_engine).get_columns("script_scenes")}
            self.assertIn("sort_order", scene_columns)
            project_columns = {column["name"] for column in inspect(legacy_engine).get_columns("storyboard_projects")}
            self.assertIn("story_development", project_columns)
            with legacy_engine.connect() as connection:
                row = connection.execute(
                    text(
                        "SELECT legacy_note, approval_status, is_manual_override, continuity_review_required "
                        "FROM storyboard_frames WHERE id = 1"
                    )
                ).one()
            self.assertEqual(row.legacy_note, "keep me")
            self.assertEqual(row.approval_status, "pending")
            self.assertFalse(row.is_manual_override)
            self.assertFalse(row.continuity_review_required)
            with legacy_engine.connect() as connection:
                scene_row = connection.execute(
                    text("SELECT scene_number, sort_order FROM script_scenes WHERE id = 1")
                ).one()
            self.assertEqual(scene_row.scene_number, 4)
            self.assertEqual(scene_row.sort_order, 0)
            with legacy_engine.connect() as connection:
                legacy_project = connection.execute(
                    text("SELECT project_title, story_development FROM storyboard_projects WHERE db_id = 1")
                ).one()
            self.assertEqual(legacy_project.project_title, "Legacy project")
            self.assertIsNone(legacy_project.story_development)
        finally:
            legacy_engine.dispose()

    def test_replacing_an_approved_frame_image_resets_approval(self) -> None:
        initial = StoryboardProjectCreate(
            project_title="Approved image",
            global_aesthetic="Cinematic",
            render_style="bw_sketch",
            scenes=[
                ScriptSceneBase(
                    scene_number=1,
                    location_heading="INT. ROOM - DAY",
                    environmental_type="Interior",
                    time_of_day="Day",
                    emotional_tone="Calm",
                    frames=[
                        StoryboardFrameBase(
                            frame_number=1,
                            action_breakdown="A person waits",
                            shot_type="Medium Shot",
                            camera_angle="Eye-level",
                            duration_seconds=3,
                            lighting_notes="Soft",
                            generated_image_url="data:image/png;base64,b2xk",
                            approval_status="approved",
                        )
                    ],
                )
            ],
        )
        project = _build_project_orm(initial)
        self.db.add(project)
        self.db.commit()

        save_frame_image(
            _FrameImageSave(
                project_id=project.db_id,
                scene_number=1,
                frame_number=1,
                generated_image_url="data:image/png;base64,bmV3",
            ),
            self.db,
        )

        updated = get_storyboard_project(project.db_id, self.db)
        frame = updated.scenes[0].frames[0]
        self.assertEqual(frame.generated_image_url, "data:image/png;base64,bmV3")
        self.assertEqual(frame.approval_status, "pending")

    def test_update_requires_scenes_and_positive_finite_duration(self) -> None:
        with self.assertRaises(ValidationError):
            StoryboardProjectUpdate.model_validate({
                "project_title": "No scenes",
                "global_aesthetic": "Cinematic",
                "render_style": "bw_sketch",
            })

        for invalid_duration in (0, -1, float("inf"), float("nan")):
            with self.subTest(duration=invalid_duration):
                with self.assertRaises(ValidationError):
                    StoryboardFrameBase(
                        frame_number=1,
                        action_breakdown="A person waits",
                        shot_type="Medium Shot",
                        camera_angle="Eye-level",
                        duration_seconds=invalid_duration,
                        lighting_notes="Soft",
                    )

        with self.assertRaises(ValidationError):
            ScriptSceneBase(scene_number=0)

        with self.assertRaises(ValidationError):
            StoryboardProjectUpdate(
                project_title="Duplicate numbers",
                global_aesthetic="Cinematic",
                render_style="bw_sketch",
                scenes=[ScriptSceneBase(scene_number=1), ScriptSceneBase(scene_number=1)],
            )

    def test_scene_reorder_survives_project_update_and_reload(self) -> None:
        def make_scene(scene_number: int) -> ScriptSceneBase:
            return ScriptSceneBase(
                scene_number=scene_number,
                location_heading=f"INT. ROOM {scene_number} - DAY",
            )

        original = StoryboardProjectCreate(
            project_title="Scene order",
            global_aesthetic="Cinematic",
            render_style="bw_sketch",
            scenes=[make_scene(1), make_scene(2)],
        )
        project = _build_project_orm(original)
        self.db.add(project)
        self.db.commit()

        update = StoryboardProjectUpdate(
            project_title="Scene order",
            global_aesthetic="Cinematic",
            render_style="bw_sketch",
            scenes=[make_scene(2), make_scene(1)],
        )
        response = update_storyboard_project(project.db_id, update, self.db)
        self.db.expire_all()
        reloaded = get_storyboard_project(project.db_id, self.db)

        self.assertEqual([scene.scene_number for scene in response.scenes], [2, 1])
        self.assertEqual([scene.scene_number for scene in reloaded.scenes], [2, 1])

    def test_story_development_survives_project_update_and_reload(self) -> None:
        draft = StoryDevelopmentDraft(
            idea="A lighthouse receives a letter from tomorrow",
            genre=None,
            format="animated short",
            notes="Keep the ending quiet",
            outline="The keeper follows the letter to its source.",
            script="INT. LIGHTHOUSE - NIGHT\nThe keeper opens the letter.",
        )
        created = StoryboardProjectCreate(
            project_title="Tomorrow's Light",
            global_aesthetic="Soft, atmospheric",
            render_style="bw_sketch",
            scenes=[],
            story_development=draft,
        )
        project = _build_project_orm(created)
        self.db.add(project)
        self.db.commit()

        # Older clients omit the optional field; an unrelated edit must not erase it.
        update = StoryboardProjectUpdate(
            project_title="Tomorrow's Light — revised",
            global_aesthetic="Soft, atmospheric",
            render_style="bw_sketch",
            scenes=[],
        )
        updated = update_storyboard_project(project.db_id, update, self.db)
        self.db.expire_all()
        reloaded = get_storyboard_project(project.db_id, self.db)

        for response in (updated, reloaded):
            self.assertEqual(response.story_development.idea, draft.idea)
            self.assertIsNone(response.story_development.genre)
            self.assertEqual(response.story_development.format, "animated short")
            self.assertEqual(response.story_development.outline, draft.outline)
            self.assertEqual(response.story_development.script, draft.script)

    def test_character_tab_edits_survive_project_update_and_reload(self) -> None:
        created = StoryboardProjectCreate(
            project_title="Character edit",
            global_aesthetic="Cinematic",
            render_style="bw_sketch",
            scenes=[],
        )
        project = _build_project_orm(created)
        self.db.add(project)
        self.db.commit()

        character = CharacterProfileBase(
            id="CHAR_MARA",
            name="Mara",
            facial_blueprint=FacialBlueprint(),
            wardrobe_defaults="A weathered red coat",
            abilities=["flight"],
            visual_rules=["Keep the silver braid visible"],
        )
        update = StoryboardProjectUpdate(
            project_title="Character edit",
            global_aesthetic="Cinematic",
            render_style="bw_sketch",
            scenes=[],
            characters=[character],
        )
        response = update_storyboard_project(project.db_id, update, self.db)
        self.db.expire_all()
        reloaded = get_storyboard_project(project.db_id, self.db)

        for saved in (response, reloaded):
            self.assertEqual(saved.characters[0].name, "Mara")
            self.assertEqual(saved.characters[0].abilities, ["flight"])
            self.assertEqual(saved.characters[0].visual_rules, ["Keep the silver braid visible"])


if __name__ == "__main__":
    unittest.main()
