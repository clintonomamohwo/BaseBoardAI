from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from app.core import llm


class LLMProviderRoutingTests(unittest.TestCase):
    def test_gemini_error_surfaces_when_no_watsonx_fallback_is_configured(self) -> None:
        gemini_error = RuntimeError("mock Gemini request failed")

        with (
            patch.object(llm.settings, "TEXT_PROVIDER", "gemini"),
            patch.object(llm, "_watsonx_candidates", return_value=[]),
            patch("app.core.ai_factory.AIFactory.get_text_provider") as get_provider,
            patch.object(llm, "_build_llm") as build_watsonx,
        ):
            get_provider.return_value.generate.side_effect = gemini_error

            with self.assertRaises(RuntimeError) as raised:
                llm._invoke_with_fallback("mock prompt")

        self.assertIs(raised.exception, gemini_error)
        build_watsonx.assert_not_called()

    def test_gemini_error_uses_configured_watsonx_fallback(self) -> None:
        watsonx = Mock()
        watsonx.invoke.return_value = SimpleNamespace(content="mock WatsonX response")

        with (
            patch.object(llm.settings, "TEXT_PROVIDER", "gemini"),
            patch.object(llm, "_watsonx_candidates", return_value=["mock-model"]),
            patch("app.core.ai_factory.AIFactory.get_text_provider") as get_provider,
            patch.object(llm, "_build_llm", return_value=watsonx) as build_watsonx,
        ):
            get_provider.return_value.generate.side_effect = RuntimeError(
                "mock Gemini request failed"
            )

            response = llm._invoke_with_fallback("mock prompt")

        self.assertEqual(response, "mock WatsonX response")
        build_watsonx.assert_called_once_with("mock-model", max_new_tokens=4096)


if __name__ == "__main__":
    unittest.main()
