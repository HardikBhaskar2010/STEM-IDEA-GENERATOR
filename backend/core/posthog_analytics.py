"""
backend/core/posthog_analytics.py — PostHog analytics integration for FastAPI backend.
"""

import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

POSTHOG_API_KEY = os.getenv("POSTHOG_API_KEY", "")
POSTHOG_HOST = os.getenv("POSTHOG_HOST", "https://us.i.posthog.com")

_posthog_client = None
_initialized = False


def init_backend_posthog() -> None:
    """Initialize PostHog Python SDK client."""
    global _posthog_client, _initialized
    if _initialized:
        return

    if not POSTHOG_API_KEY:
        logger.info("💡 PostHog: POSTHOG_API_KEY not set. Backend analytics running in dry-run mode.")
        _initialized = True
        return

    try:
        import posthog

        posthog.api_key = POSTHOG_API_KEY
        posthog.host = POSTHOG_HOST
        _posthog_client = posthog
        _initialized = True
        logger.info("🚀 PostHog backend analytics initialized successfully")
    except Exception as exc:
        logger.warning("⚠️ Failed to initialize PostHog backend SDK: %s", exc)


def capture_backend_event(
    distinct_id: str,
    event_name: str,
    properties: Optional[Dict[str, Any]] = None,
) -> None:
    """Capture a backend server-side event."""
    if not _initialized:
        init_backend_posthog()

    if _posthog_client and POSTHOG_API_KEY:
        try:
            _posthog_client.capture(
                distinct_id=distinct_id or "anonymous_backend_user",
                event=event_name,
                properties=properties or {},
            )
        except Exception as exc:
            logger.debug("PostHog capture error: %s", exc)
    else:
        logger.debug("[PostHog Dry-Run Backend Event] %s -> %s %s", distinct_id, event_name, properties)


def capture_api_metric(
    path: str,
    method: str,
    status_code: int,
    duration_ms: float,
    user_id: Optional[str] = None,
) -> None:
    """Capture FastAPI endpoint execution metrics."""
    capture_backend_event(
        distinct_id=user_id or "anonymous",
        event_name="backend_api_called",
        properties={
            "path": path,
            "method": method,
            "status_code": status_code,
            "duration_ms": round(duration_ms, 2),
            "is_success": 200 <= status_code < 400,
        },
    )
