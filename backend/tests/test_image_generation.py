import base64
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.core.image import (
    _generate_huggingface_img2img,
    _generate_pollinations_img2img,
    generate_frame_image,
    generate_image,
)
from app.routers.storyboard import generate_full_character_pack, generate_single_image, render_frame

PNG_FIXTURE = b"\x89PNG\r\n\x1a\nmock-image-bytes"
GEMINI_IMAGE_B64 = base64.b64encode(PNG_FIXTURE).decode("ascii")
GEMINI_IMAGE_RESPONSE = {
    "output_image": {"data": GEMINI_IMAGE_B64, "mime_type": "image/png"},
}


class ImageGenerationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_settings = {
            "IMAGE_PROVIDER": settings.IMAGE_PROVIDER,
            "HF_API_TOKEN": settings.HF_API_TOKEN,
            "GEMINI_API_KEY": settings.GEMINI_API_KEY,
            "GEMINI_NANO_BANANA_MODEL": settings.GEMINI_NANO_BANANA_MODEL,
            "POLLINATIONS_API_KEY": settings.POLLINATIONS_API_KEY,
            "POLLINATIONS_IMAGE_MODELS": settings.POLLINATIONS_IMAGE_MODELS,
            "POLLINATIONS_EDIT_MODELS": settings.POLLINATIONS_EDIT_MODELS,
            "POLLINATIONS_WIDTH": settings.POLLINATIONS_WIDTH,
            "POLLINATIONS_HEIGHT": settings.POLLINATIONS_HEIGHT,
            "ENABLE_PREMIUM_IMAGE_GENERATION": settings.ENABLE_PREMIUM_IMAGE_GENERATION,
        }

    def tearDown(self) -> None:
        for name, value in self.original_settings.items():
            setattr(settings, name, value)

    def test_supported_api_tries_fallback_model_only_after_definitive_rejection(self) -> None:
        settings.IMAGE_PROVIDER = "pollinations"
        settings.POLLINATIONS_API_KEY = "mock-key"
        settings.POLLINATIONS_IMAGE_MODELS = "primary/model,fallback/model"
        responses = [
            httpx.Response(404),
            httpx.Response(200, content=PNG_FIXTURE, headers={"content-type": "image/png"}),
        ]
        with patch("app.core.image.httpx.get", side_effect=responses) as get, patch(
            "app.core.image.time.sleep"
        ):
            result = generate_image("A test image", width=640, height=480)
        self.assertTrue(result and result.startswith("data:image/png;base64,"))
        self.assertEqual(get.call_count, 2)
        first_call, second_call = get.call_args_list
        self.assertEqual(first_call.args[0], "https://gen.pollinations.ai/image/A%20test%20image")
        self.assertEqual(first_call.kwargs["headers"]["Authorization"], "Bearer mock-key")
        self.assertEqual(first_call.kwargs["params"], {
            "width": 640, "height": 480, "model": "primary/model",
        })
        self.assertEqual(second_call.kwargs["params"]["model"], "fallback/model")

    def test_supported_api_does_not_retry_after_uncertain_server_error(self) -> None:
        settings.IMAGE_PROVIDER = "pollinations"
        settings.POLLINATIONS_API_KEY = "mock-key"
        settings.POLLINATIONS_IMAGE_MODELS = "primary/model,fallback/model"
        with patch("app.core.image.httpx.get", return_value=httpx.Response(503)) as get:
            self.assertIsNone(generate_image("A test image"))
        self.assertEqual(get.call_count, 1)

    def test_supported_api_does_not_retry_after_transport_error(self) -> None:
        settings.IMAGE_PROVIDER = "pollinations"
        settings.POLLINATIONS_API_KEY = "mock-key"
        settings.POLLINATIONS_IMAGE_MODELS = "primary/model,fallback/model"
        with patch("app.core.image.httpx.get", side_effect=httpx.ReadTimeout("response lost")) as get:
            self.assertIsNone(generate_image("A test image"))
        self.assertEqual(get.call_count, 1)

    def test_auth_failure_stops_without_trying_other_models(self) -> None:
        settings.IMAGE_PROVIDER = "pollinations"
        settings.POLLINATIONS_API_KEY = "mock-key"
        settings.POLLINATIONS_IMAGE_MODELS = "primary/model,fallback/model"
        with patch("app.core.image.httpx.get", return_value=httpx.Response(401)) as get:
            self.assertIsNone(generate_image("A test image"))
        self.assertEqual(get.call_count, 1)

    def test_premium_generation_uses_direct_gemini_api(self) -> None:
        settings.IMAGE_PROVIDER = "huggingface"
        settings.GEMINI_API_KEY = "mock-gemini-key"
        settings.POLLINATIONS_API_KEY = ""
        with patch(
            "app.core.image.httpx.post",
            return_value=httpx.Response(200, json=GEMINI_IMAGE_RESPONSE),
        ) as post, patch("app.core.image.httpx.get") as get:
            result = generate_image("A final frame", quality_tier="premium")

        self.assertEqual(result, f"data:image/png;base64,{GEMINI_IMAGE_B64}")
        self.assertEqual(post.call_count, 1)
        self.assertEqual(post.call_args.args[0], "https://generativelanguage.googleapis.com/v1beta/interactions")
        self.assertEqual(post.call_args.kwargs["headers"]["x-goog-api-key"], "mock-gemini-key")
        request = post.call_args.kwargs["json"]
        self.assertEqual(request["model"], "gemini-nano-banana-2.1")
        self.assertEqual(request["input"], [{"type": "text", "text": "A final frame"}])
        self.assertEqual(request["response_format"]["mime_type"], "image/jpeg")
        self.assertEqual(request["response_format"]["aspect_ratio"], "16:9")
        self.assertEqual(request["response_format"]["image_size"], "1K")
        self.assertFalse(request["store"])
        get.assert_not_called()

    def test_premium_400_logs_safe_provider_error_detail(self) -> None:
        settings.GEMINI_API_KEY = "mock-gemini-key"
        response = httpx.Response(
            400,
            json={"error": {"status": "INVALID_ARGUMENT", "message": "Unsupported image MIME type"}},
        )
        with patch("app.core.image.httpx.post", return_value=response) as post, patch(
            "app.core.image.httpx.get"
        ) as get, self.assertLogs("app.core.image", level="WARNING") as captured:
            self.assertIsNone(generate_image("A final frame", quality_tier="premium"))

        self.assertEqual(post.call_count, 1)
        get.assert_not_called()
        log_text = "\n".join(captured.output)
        self.assertIn("HTTP 400", log_text)
        self.assertIn("INVALID_ARGUMENT", log_text)
        self.assertIn("Unsupported image MIME type", log_text)
        self.assertNotIn("mock-gemini-key", log_text)

    def test_premium_reference_edit_sends_frame_image_to_gemini(self) -> None:
        settings.GEMINI_API_KEY = "mock-gemini-key"
        settings.POLLINATIONS_API_KEY = ""
        frame = SimpleNamespace(frame_number=2)
        scene = object()
        response_with_output_step = {
            "steps": [{
                "type": "model_output",
                "content": [{"type": "image", "data": GEMINI_IMAGE_B64, "mime_type": "image/png"}],
            }],
        }
        with patch("app.core.image._build_image_prompt", return_value="Preserve this selected frame"), patch(
            "app.core.image.httpx.post",
            return_value=httpx.Response(200, json=response_with_output_step),
        ) as post:
            result = generate_frame_image(
                frame,
                scene,
                reference_style_image="data:image/jpeg;base64,reference-image-base64",
                quality_tier="premium",
            )

        self.assertEqual(result, f"data:image/png;base64,{GEMINI_IMAGE_B64}")
        request = post.call_args.kwargs["json"]
        self.assertEqual(request["input"], [
            {"type": "text", "text": "Preserve this selected frame"},
            {"type": "image", "data": "reference-image-base64", "mime_type": "image/jpeg"},
        ])
        post.assert_called_once()

    def test_premium_generation_without_gemini_key_makes_no_request(self) -> None:
        settings.GEMINI_API_KEY = ""
        settings.POLLINATIONS_API_KEY = "mock-pollinations-key"
        with patch("app.core.image.httpx.post") as post, patch("app.core.image.httpx.get") as get:
            self.assertIsNone(generate_image("A final frame", quality_tier="premium"))
        post.assert_not_called()
        get.assert_not_called()

    def test_premium_gemini_failure_does_not_fall_back_to_draft_provider(self) -> None:
        settings.IMAGE_PROVIDER = "pollinations"
        settings.GEMINI_API_KEY = "mock-gemini-key"
        settings.POLLINATIONS_API_KEY = "mock-pollinations-key"
        with patch("app.core.image.httpx.post", return_value=httpx.Response(503)) as post, patch(
            "app.core.image.httpx.get"
        ) as get:
            self.assertIsNone(generate_image("A final frame", quality_tier="premium"))
        post.assert_called_once()
        get.assert_not_called()

    def test_reference_generation_uses_edit_api_and_model_fallback(self) -> None:
        settings.POLLINATIONS_API_KEY = "mock-key"
        settings.POLLINATIONS_EDIT_MODELS = "edit/primary,edit/fallback"
        output_b64 = base64.b64encode(PNG_FIXTURE).decode("ascii")
        responses = [
            httpx.Response(422),
            httpx.Response(200, json={"data": [{"b64_json": output_b64, "media_type": "image/png"}]}),
        ]
        with patch("app.core.image.httpx.post", side_effect=responses) as post:
            result = _generate_pollinations_img2img("Keep the character", "reference-base64")
        self.assertEqual(result, f"data:image/png;base64,{output_b64}")
        self.assertEqual(post.call_count, 2)
        request = post.call_args_list[0].kwargs["json"]
        self.assertEqual(request["image"][0]["image_url"], "data:image/png;base64,reference-base64")
        self.assertEqual(post.call_args_list[1].kwargs["json"]["model"], "edit/fallback")

    def test_draft_reference_edit_preserves_jpeg_mime(self) -> None:
        settings.IMAGE_PROVIDER = "pollinations"
        settings.POLLINATIONS_API_KEY = "mock-key"
        settings.POLLINATIONS_EDIT_MODELS = "microsoft/mai-image-2.5-flash"
        output_b64 = base64.b64encode(PNG_FIXTURE).decode("ascii")
        response = httpx.Response(
            200,
            json={"data": [{"b64_json": output_b64, "media_type": "image/png"}]},
        )
        with patch("app.core.image._build_image_prompt", return_value="Retain the subject"), patch(
            "app.core.image.httpx.post", return_value=response,
        ) as post:
            result = generate_frame_image(
                SimpleNamespace(frame_number=1),
                object(),
                reference_style_image="data:image/jpeg;base64,jpeg-reference",
            )

        self.assertEqual(result, f"data:image/png;base64,{output_b64}")
        request = post.call_args.kwargs["json"]
        self.assertEqual(request["model"], "microsoft/mai-image-2.5-flash")
        self.assertEqual(
            request["image"][0]["image_url"],
            "data:image/jpeg;base64,jpeg-reference",
        )

    def test_keyed_edit_failure_does_not_start_a_second_text_generation(self) -> None:
        settings.POLLINATIONS_API_KEY = "mock-key"
        with patch("app.core.image._generate_pollinations_edit_api", return_value=None) as edit, patch(
            "app.core.image._generate_pollinations"
        ) as text_fallback:
            result = _generate_pollinations_img2img("Keep the reference", "reference-base64")

        self.assertIsNone(result)
        edit.assert_called_once()
        text_fallback.assert_not_called()

    def test_huggingface_failure_does_not_fall_back_to_pollinations(self) -> None:
        settings.IMAGE_PROVIDER = "huggingface"
        with patch("app.core.image.httpx.post", return_value=httpx.Response(503)), patch(
            "app.core.image._generate_pollinations", return_value="data:image/png;base64,fallback"
        ) as fallback:
            result = generate_image("A test image")
        self.assertIsNone(result)
        fallback.assert_not_called()

    def test_storyboard_frame_huggingface_failure_does_not_fall_back_to_pollinations(self) -> None:
        settings.IMAGE_PROVIDER = "huggingface"
        frame = type("Frame", (), {"frame_number": 1})()
        scene = object()
        with patch("app.core.image._build_image_prompt", return_value="A test frame"), patch(
            "app.core.image._generate_huggingface", return_value=None
        ), patch("app.core.image._generate_pollinations", return_value="data:image/png;base64,fallback") as fallback:
            result = generate_frame_image(frame, scene)
        self.assertIsNone(result)
        fallback.assert_not_called()

    def test_huggingface_img2img_failure_does_not_start_text_generation(self) -> None:
        settings.HF_API_TOKEN = "mock-hf-token"
        with patch("app.core.image.httpx.post", return_value=httpx.Response(503)) as post:
            result = _generate_huggingface_img2img("A referenced image", "reference-base64")
        self.assertIsNone(result)
        self.assertEqual(post.call_count, 1)

    def test_legacy_network_errors_are_retried_without_escaping(self) -> None:
        settings.IMAGE_PROVIDER = "pollinations"
        settings.POLLINATIONS_API_KEY = ""
        error = httpx.ConnectError("mock connection failure")
        with patch("app.core.image.httpx.get", side_effect=error) as get, patch(
            "app.core.image.time.sleep"
        ):
            self.assertIsNone(generate_image("A test image"))
        self.assertEqual(get.call_count, 3)

    def test_single_image_route_uses_provider_dispatch(self) -> None:
        expected = "data:image/png;base64,mock"
        with patch("app.routers.storyboard.generate_image", return_value=expected) as generate:
            response = generate_single_image("A keyframe", "bw_sketch")
        self.assertEqual(response, {"image_url": expected})
        generate.assert_called_once()
        self.assertIn("A keyframe", generate.call_args.args[0])

    def test_single_image_route_returns_gateway_error_on_no_image(self) -> None:
        with patch("app.routers.storyboard.generate_image", return_value=None):
            with self.assertRaises(HTTPException) as raised:
                generate_single_image("A keyframe", "bw_sketch")
        self.assertEqual(raised.exception.status_code, 502)
        self.assertIn("Image provider returned no result", raised.exception.detail)

    def test_premium_frame_route_is_disabled_without_server_opt_in(self) -> None:
        settings.ENABLE_PREMIUM_IMAGE_GENERATION = False
        payload = SimpleNamespace(quality_tier="premium")
        with patch("app.routers.storyboard.generate_frame_image") as generate:
            with self.assertRaises(HTTPException) as raised:
                render_frame(payload)
        self.assertEqual(raised.exception.status_code, 403)
        self.assertIn("disabled", raised.exception.detail)
        generate.assert_not_called()

    def test_premium_character_pack_is_disabled_without_server_opt_in(self) -> None:
        settings.ENABLE_PREMIUM_IMAGE_GENERATION = False
        with patch("app.core.image.generate_sheet_image") as generate:
            with self.assertRaises(HTTPException) as raised:
                generate_full_character_pack({"name": "Mara"})
        self.assertEqual(raised.exception.status_code, 403)
        generate.assert_not_called()

    def test_premium_frame_route_requires_gemini_key_before_generation(self) -> None:
        settings.ENABLE_PREMIUM_IMAGE_GENERATION = True
        settings.GEMINI_API_KEY = ""
        payload = SimpleNamespace(quality_tier="premium")
        with patch("app.routers.storyboard.generate_frame_image") as generate:
            with self.assertRaises(HTTPException) as raised:
                render_frame(payload)
        self.assertEqual(raised.exception.status_code, 503)
        self.assertIn("GEMINI_API_KEY", raised.exception.detail)
        generate.assert_not_called()

    def test_premium_frame_route_calls_only_the_selected_frame_generator(self) -> None:
        settings.ENABLE_PREMIUM_IMAGE_GENERATION = True
        settings.GEMINI_API_KEY = "mock-gemini-key"
        frame = SimpleNamespace(frame_number=7)
        scene = object()
        payload = SimpleNamespace(
            frame=frame,
            scene=scene,
            render_style="bw_sketch",
            quality_tier="premium",
            reference_style_image="data:image/png;base64,reference",
        )
        with patch(
            "app.routers.storyboard.generate_frame_image",
            return_value="data:image/png;base64,frame",
        ) as generate:
            response = render_frame(payload)
        self.assertEqual(response, {"frame_number": 7, "generated_image_url": "data:image/png;base64,frame"})
        self.assertEqual(generate.call_args.kwargs["quality_tier"], "premium")

    def test_frame_render_route_does_not_require_gemini_or_change_frame_metadata(self) -> None:
        settings.GEMINI_API_KEY = ""
        frame = SimpleNamespace(frame_number=7)
        scene = object()
        payload = SimpleNamespace(
            frame=frame,
            scene=scene,
            render_style="bw_sketch",
            quality_tier="draft",
            reference_style_image=None,
        )
        with patch("app.routers.storyboard.generate_frame_image", return_value="data:image/png;base64,frame") as generate:
            response = render_frame(payload)
        self.assertEqual(response, {"frame_number": 7, "generated_image_url": "data:image/png;base64,frame"})
        self.assertEqual(generate.call_args.kwargs["quality_tier"], "draft")


if __name__ == "__main__":
    unittest.main()
