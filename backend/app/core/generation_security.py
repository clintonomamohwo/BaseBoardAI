"""Access control and request quotas for AI-generation API endpoints.

The quota ledger is process-local. Run one API worker when relying on it; a
multi-worker or public multi-tenant deployment must move the same limits to a
shared store and use user-scoped authentication before enabling generation.
"""

from __future__ import annotations

from collections import deque
from hashlib import sha256
from hmac import compare_digest
from threading import Lock
from time import time

from fastapi import HTTPException, Request, status

from app.core.config import settings

_MINUTE_SECONDS = 60
_DAY_SECONDS = 24 * 60 * 60
_events: dict[str, deque[float]] = {}
_lock = Lock()


def require_generation_access(request: Request) -> None:
    """Authenticate a generation request and enforce short- and long-window quotas."""
    production = settings.APP_ENV.strip().lower() == "production"
    if not settings.GENERATION_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI generation is disabled by server configuration.",
        )

    configured_token = settings.GENERATION_API_TOKEN.strip()
    supplied_header = request.headers.get("authorization", "")
    supplied_token = supplied_header[7:].strip() if supplied_header.lower().startswith("bearer ") else ""
    if production and not configured_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI generation is unavailable until server authentication is configured.",
        )
    if configured_token and not compare_digest(supplied_token, configured_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A valid generation access token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if production and not supplied_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A valid generation access token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if configured_token:
        principal = "token:" + sha256(supplied_token.encode("utf-8")).hexdigest()
    else:
        principal = "ip:" + (request.client.host if request.client else "unknown")

    now = time()
    minute_limit = max(0, settings.GENERATION_REQUESTS_PER_MINUTE)
    day_limit = max(0, settings.GENERATION_REQUESTS_PER_DAY)
    with _lock:
        events = _events.setdefault(principal, deque())
        while events and events[0] <= now - _DAY_SECONDS:
            events.popleft()
        minute_count = sum(1 for timestamp in events if timestamp > now - _MINUTE_SECONDS)
        if minute_count >= minute_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Generation rate limit reached. Please wait before trying again.",
                headers={"Retry-After": str(_MINUTE_SECONDS)},
            )
        if len(events) >= day_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Daily generation quota reached.",
                headers={"Retry-After": str(_DAY_SECONDS)},
            )
        events.append(now)
        # Bound memory if development traffic arrives from many distinct addresses.
        if len(_events) > 10_000:
            cutoff = now - _DAY_SECONDS
            for key in list(_events):
                if not _events[key] or _events[key][-1] <= cutoff:
                    _events.pop(key, None)
