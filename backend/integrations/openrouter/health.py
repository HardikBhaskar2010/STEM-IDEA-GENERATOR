"""
OpenRouter connectivity health check.

Provides basic and detailed health-check operations that routers can expose
on the ``/api/health`` family of endpoints.

Requirements: 4, 39
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from backend.integrations.openrouter.client import OpenRouterClient

logger = logging.getLogger(__name__)

# Simple probe message to test connectivity
_PROBE_MESSAGES = [{"role": "user", "content": "Hello"}]


class OpenRouterHealthCheck:
    """
    Manages periodic and on-demand health checks for OpenRouter connectivity.

    Caches the result of the last check to avoid hammering the API on every
    ``/health`` request.

    Requirements: 4, 39
    """

    def __init__(self, client: OpenRouterClient) -> None:
        self.client = client
        self.last_check_time: Optional[datetime] = None
        self.last_check_status: bool = False
        self._last_error: Optional[str] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def check_health(self) -> Dict[str, Any]:
        """Perform a live health check against OpenRouter.

        Returns:
            Dict with ``status`` (``"healthy"`` / ``"unhealthy"``),
            ``last_checked``, and optional ``error`` fields.

        Requirements: 39
        """
        try:
            await self.client.chat_completion(
                messages=_PROBE_MESSAGES,
                max_tokens=5,
                temperature=0.0,
            )
            self.last_check_status = True
            self._last_error = None
        except Exception as exc:
            self.last_check_status = False
            self._last_error = str(exc)
            logger.warning("OpenRouter health check failed: %s", exc)

        self.last_check_time = datetime.utcnow()
        return self.get_health_status()

    async def check_connectivity(self) -> bool:
        """Lightweight connectivity probe (returns bool, swallows errors).

        Requirements: 39
        """
        try:
            await self.client.chat_completion(
                messages=_PROBE_MESSAGES,
                max_tokens=1,
                temperature=0.0,
            )
            return True
        except Exception:
            return False

    def get_health_status(self) -> Dict[str, Any]:
        """Return the cached health status without making a new API call.

        Returns:
            Dict with ``status``, ``last_checked``, and optional ``error``.
        """
        status: Dict[str, Any] = {
            "status": "healthy" if self.last_check_status else "unhealthy",
            "last_checked": (
                self.last_check_time.isoformat() if self.last_check_time else None
            ),
        }
        if self._last_error:
            status["error"] = self._last_error
        return status
