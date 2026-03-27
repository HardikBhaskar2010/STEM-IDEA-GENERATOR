"""
OpenRouter API client with retry logic and streaming support.

Provides an async HTTP client that wraps the OpenRouter REST API with:
- Exponential-backoff retries (4 s → 8 s → 10 s, 3 attempts)
- Streaming support via server-sent events
- Automatic error mapping to domain exceptions

Requirements: 4, 4.5, 4.6
"""

import asyncio
import json
import logging
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx

from backend.core.config import OpenRouterConfig
from backend.core.exceptions import UpstreamError
from backend.core.logging import StructuredLogger
from backend.integrations.openrouter.adapter import ResponseAdapter
from backend.integrations.openrouter.errors import OpenRouterErrorMapper

logger = logging.getLogger(__name__)

# Retry delays in seconds (3 attempts: 4s, 8s, 10s)
_RETRY_DELAYS = [4, 8, 10]
# Status codes that should be retried
_RETRYABLE_STATUSES = {429, 500, 502, 503, 504}


class OpenRouterClient:
    """
    Async HTTP client for the OpenRouter AI API.

    Instantiate once at application startup and share via dependency injection.
    Call :meth:`close` during application shutdown to release resources.

    Requirements: 4, 4.5, 4.6
    """

    def __init__(
        self,
        config: OpenRouterConfig,
        structured_logger: Optional[StructuredLogger] = None,
    ) -> None:
        self.config = config
        self.structured_logger = structured_logger
        self._session: Optional[httpx.AsyncClient] = None

    # ------------------------------------------------------------------
    # Session management
    # ------------------------------------------------------------------

    def _get_session(self) -> httpx.AsyncClient:
        """Lazily create the shared httpx session."""
        if self._session is None or self._session.is_closed:
            self._session = httpx.AsyncClient(
                timeout=httpx.Timeout(self.config.timeout),
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "HTTP-Referer": "https://stem-idea-generator.render.com",
                    "X-Title": "STEM Idea Generator",
                    "Content-Type": "application/json",
                },
            )
        return self._session

    async def close(self) -> None:
        """Close the underlying HTTP session.  Call during app shutdown."""
        if self._session and not self._session.is_closed:
            await self._session.aclose()
            self._session = None

    # ------------------------------------------------------------------
    # Chat completion (non-streaming)
    # ------------------------------------------------------------------

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        **kwargs: Any,
    ) -> str:
        """Call OpenRouter chat completions and return the assistant text.

        Retries with exponential backoff on transient errors.

        Args:
            messages: List of ``{"role": ..., "content": ...}`` dicts.
            model: Model identifier (defaults to ``config.model``).
            max_tokens: Maximum tokens in the response.
            temperature: Sampling temperature.
            **kwargs: Extra parameters forwarded to the API.

        Returns:
            The assistant's text response.

        Raises:
            UpstreamError: On non-retryable or exhausted-retry errors.

        Requirements: 4.5
        """
        payload: Dict[str, Any] = {
            "model": model or self.config.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            **kwargs,
        }

        last_exc: Optional[Exception] = None

        for attempt, delay in enumerate([0] + _RETRY_DELAYS, start=1):
            if delay:
                await asyncio.sleep(delay)

            try:
                response = await self._get_session().post(
                    f"{self.config.base_url}/chat/completions",
                    json=payload,
                )

                if response.status_code == 200:
                    data = response.json()
                    return ResponseAdapter.extract_text_content(data)

                # Check if we should retry
                if response.status_code in _RETRYABLE_STATUSES and attempt <= len(_RETRY_DELAYS):
                    logger.warning(
                        "OpenRouter returned %d, attempt %d/%d — will retry",
                        response.status_code,
                        attempt,
                        len(_RETRY_DELAYS) + 1,
                    )
                    last_exc = UpstreamError(
                        f"OpenRouter API error ({response.status_code})",
                        service="OpenRouter",
                        upstream_status=response.status_code,
                    )
                    continue

                # Non-retryable HTTP error
                error_data = _safe_json(response)
                error_code = (
                    error_data.get("error", {}).get("code", "unknown_error")
                    if isinstance(error_data, dict)
                    else "unknown_error"
                )
                mapped = OpenRouterErrorMapper.map_error_response(
                    error_code, http_status=response.status_code
                )
                raise UpstreamError(
                    mapped["user_message"],
                    service="OpenRouter",
                    upstream_status=mapped["http_status"],
                    details={"error_code": error_code, "raw": error_data},
                )

            except UpstreamError:
                raise
            except httpx.TimeoutException as exc:
                last_exc = exc
                logger.warning("OpenRouter timeout, attempt %d/%d", attempt, len(_RETRY_DELAYS) + 1)
            except Exception as exc:
                last_exc = exc
                logger.error("Unexpected error calling OpenRouter: %s", exc)
                if attempt > len(_RETRY_DELAYS):
                    break

        raise UpstreamError(
            "OpenRouter API failed after retries.",
            service="OpenRouter",
            details={"last_error": str(last_exc)},
        )

    # ------------------------------------------------------------------
    # Streaming chat completion
    # ------------------------------------------------------------------

    async def chat_completion_stream(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Stream chat completion responses token-by-token.

        Yields text chunks as they arrive from the API via server-sent events.

        Args:
            messages: List of ``{"role": ..., "content": ...}`` dicts.
            model: Model identifier (defaults to ``config.model``).
            max_tokens: Maximum tokens in the response.
            temperature: Sampling temperature.
            **kwargs: Extra parameters forwarded to the API.

        Yields:
            Text chunks from the assistant response.

        Raises:
            UpstreamError: On API errors.

        Requirements: 4.6
        """
        payload: Dict[str, Any] = {
            "model": model or self.config.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True,
            **kwargs,
        }

        try:
            async with self._get_session().stream(
                "POST",
                f"{self.config.base_url}/chat/completions",
                json=payload,
            ) as response:
                if response.status_code != 200:
                    raise UpstreamError(
                        f"OpenRouter streaming error ({response.status_code})",
                        service="OpenRouter",
                        upstream_status=response.status_code,
                    )

                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[len("data: "):]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        text = ResponseAdapter.extract_text_content(chunk)
                        if text:
                            yield text
                    except json.JSONDecodeError:
                        continue

        except UpstreamError:
            raise
        except Exception as exc:
            raise UpstreamError(
                "OpenRouter streaming failed.",
                service="OpenRouter",
                details={"error": str(exc)},
            ) from exc


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_json(response: httpx.Response) -> Any:
    """Try to parse a response as JSON; return raw text on failure."""
    try:
        return response.json()
    except Exception:
        return response.text
