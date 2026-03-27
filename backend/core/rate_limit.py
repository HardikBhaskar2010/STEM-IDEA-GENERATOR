"""
Rate limiting for FastAPI endpoints.

Provides a per-category sliding-window rate limiter whose ``rate_limit()``
factory returns a FastAPI ``Depends``-compatible dependency so it can be
wired into router definitions via ``dependencies=[rate_limit("veronica_ai")]``.

For multi-worker / multi-process deployments, swap the in-memory ``_Store``
for the existing ``backend.infrastructure.rate_limiter`` (Redis-backed).

Requirements: 26, 9.11, 8.8, 9.7, 10.5
"""

import asyncio
import logging
import time
from collections import defaultdict, deque
from typing import Callable, Deque, Dict

from fastapi import Depends, Request
from fastapi.responses import JSONResponse

from backend.core.exceptions import RateLimitError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Per-category budgets (requests per 60-second sliding window, per client IP)
# ---------------------------------------------------------------------------
RATE_LIMITS: Dict[str, int] = {
    "veronica_ai": 10,
    "sandbox_execution": 5,
    "agent_jobs": 3,
    "default": 60,
}


# ---------------------------------------------------------------------------
# In-process sliding-window store
# ---------------------------------------------------------------------------
class RateLimitConfig:
    """
    Sliding-window rate limiter keyed by (category, client_ip).

    Accepted by routers via ``Depends(get_rate_limiter)``.

    Requirements: 26
    """

    def __init__(self) -> None:
        self._windows: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def check_rate_limit(self, request: Request, category: str = "default") -> None:
        """Check rate limit; raise :class:`RateLimitError` if exceeded.

        Args:
            request: Current FastAPI request (used to extract client IP).
            category: One of the keys in :data:`RATE_LIMITS`.

        Raises:
            RateLimitError: When the client has exceeded the allowed rate.
        """
        client_ip = _extract_client_ip(request)
        limit = RATE_LIMITS.get(category, RATE_LIMITS["default"])
        key = f"{category}:{client_ip}"
        now = time.time()
        window_start = now - 60.0

        async with self._lock:
            window = self._windows[key]
            while window and window[0] < window_start:
                window.popleft()

            if len(window) >= limit:
                logger.warning(
                    "Rate limit exceeded: category=%s ip=%s limit=%d/min",
                    category,
                    client_ip,
                    limit,
                )
                raise RateLimitError(
                    f"Rate limit exceeded for '{category}'. "
                    f"Maximum {limit} requests per minute.",
                    details={"category": category, "limit": limit, "window": "1 minute"},
                )

            window.append(now)


# Singleton — shared across all workers in the same process.
_rate_limit_store = RateLimitConfig()


def get_rate_limiter() -> RateLimitConfig:
    """FastAPI dependency that returns the shared :class:`RateLimitConfig`."""
    return _rate_limit_store


# ---------------------------------------------------------------------------
# IP extraction helper
# ---------------------------------------------------------------------------

def _extract_client_ip(request: Request) -> str:
    """Extract the real client IP, honoring common reverse-proxy headers.

    Requirements: 26
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    if request.client:
        return request.client.host

    return "unknown"


# ---------------------------------------------------------------------------
# Depends-based decorator factory
# ---------------------------------------------------------------------------

def rate_limit(category: str = "default") -> Depends:
    """Return a FastAPI ``Depends`` that enforces the named rate limit.

    Usage in routers::

        @router.post("/api/veronica-ai/chat",
                     dependencies=[rate_limit("veronica_ai")])
        async def veronica_chat(...):
            ...

    When the limit is exceeded the dependency raises :class:`RateLimitError`,
    which the router's exception handler maps to HTTP 429.

    Args:
        category: Key into :data:`RATE_LIMITS`.

    Returns:
        A :class:`fastapi.Depends` instance suitable for the ``dependencies``
        parameter of a route decorator.

    Requirements: 26, 9.11, 8.8, 9.7, 10.5
    """

    async def _dependency(
        request: Request,
        limiter: RateLimitConfig = Depends(get_rate_limiter),
    ) -> None:
        await limiter.check_rate_limit(request, category)

    return Depends(_dependency)
