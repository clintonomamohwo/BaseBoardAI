from __future__ import annotations

import unittest

from fastapi import HTTPException, Request

from app.core.config import settings
from app.core import generation_security


def make_request(token: str | None = None, client_host: str = "127.0.0.1") -> Request:
    headers = []
    if token is not None:
        headers.append((b"authorization", f"Bearer {token}".encode()))
    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/storyboard/frame/render",
        "raw_path": b"/storyboard/frame/render",
        "query_string": b"",
        "headers": headers,
        "client": (client_host, 12345),
        "server": ("localhost", 8000),
    }
    return Request(scope)


class GenerationSecurityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original = {
            "APP_ENV": settings.APP_ENV,
            "GENERATION_ENABLED": settings.GENERATION_ENABLED,
            "GENERATION_API_TOKEN": settings.GENERATION_API_TOKEN,
            "GENERATION_REQUESTS_PER_MINUTE": settings.GENERATION_REQUESTS_PER_MINUTE,
            "GENERATION_REQUESTS_PER_DAY": settings.GENERATION_REQUESTS_PER_DAY,
        }
        generation_security._events.clear()

    def tearDown(self) -> None:
        for name, value in self.original.items():
            setattr(settings, name, value)
        generation_security._events.clear()

    def test_production_without_token_fails_closed(self) -> None:
        settings.APP_ENV = "production"
        settings.GENERATION_ENABLED = True
        settings.GENERATION_API_TOKEN = ""
        with self.assertRaises(HTTPException) as caught:
            generation_security.require_generation_access(make_request())
        self.assertEqual(caught.exception.status_code, 503)

    def test_configured_token_is_required_and_accepted(self) -> None:
        settings.APP_ENV = "production"
        settings.GENERATION_ENABLED = True
        settings.GENERATION_API_TOKEN = "test-secret-token"
        with self.assertRaises(HTTPException) as caught:
            generation_security.require_generation_access(make_request())
        self.assertEqual(caught.exception.status_code, 401)
        generation_security.require_generation_access(make_request("test-secret-token"))

    def test_minute_quota_limits_requests_per_principal(self) -> None:
        settings.APP_ENV = "development"
        settings.GENERATION_API_TOKEN = ""
        settings.GENERATION_REQUESTS_PER_MINUTE = 1
        settings.GENERATION_REQUESTS_PER_DAY = 10
        request = make_request(client_host="192.0.2.10")
        generation_security.require_generation_access(request)
        with self.assertRaises(HTTPException) as caught:
            generation_security.require_generation_access(request)
        self.assertEqual(caught.exception.status_code, 429)
        self.assertIn("rate limit", caught.exception.detail.lower())

    def test_daily_quota_limits_requests_per_principal(self) -> None:
        settings.APP_ENV = "development"
        settings.GENERATION_API_TOKEN = ""
        settings.GENERATION_REQUESTS_PER_MINUTE = 10
        settings.GENERATION_REQUESTS_PER_DAY = 1
        request = make_request(client_host="192.0.2.11")
        generation_security.require_generation_access(request)
        with self.assertRaises(HTTPException) as caught:
            generation_security.require_generation_access(request)
        self.assertEqual(caught.exception.status_code, 429)
        self.assertIn("daily", caught.exception.detail.lower())


if __name__ == "__main__":
    unittest.main()
