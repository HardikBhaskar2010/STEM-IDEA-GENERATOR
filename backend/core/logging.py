"""
Structured logging for OpenRouter API operations.

Provides performance-tracking metrics and a context-manager-based logger
that automatically correlates request IDs, timing, and sanitized metadata.

Requirements: 3, 36
"""

import logging
import time
import uuid
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, Generator, Optional

from backend.core.security import APIKeySecurityValidator


class OpenRouterMetrics:
    """
    In-memory performance metrics and error tracking for OpenRouter calls.

    Thread safety: metrics counters are updated in-place.  For high-concurrency
    production use, replace with an atomic counter or Prometheus gauge.

    Requirements: 5.4
    """

    def __init__(self) -> None:
        self.request_count = 0
        self.success_count = 0
        self.error_count = 0
        self.total_response_time = 0.0
        self.error_types: Dict[str, int] = {}
        self.model_usage: Dict[str, int] = {}
        self.token_usage: Dict[str, int] = {
            "total_prompt_tokens": 0,
            "total_completion_tokens": 0,
            "total_tokens": 0,
        }

    # ------------------------------------------------------------------
    # Recording helpers
    # ------------------------------------------------------------------

    def record_request_start(self) -> float:
        """Increment request counter and return the current monotonic time."""
        self.request_count += 1
        return time.time()

    def record_success(
        self, start_time: float, model: str, token_usage: Optional[Dict[str, int]] = None
    ) -> float:
        """Record a successful request.

        Args:
            start_time: Value returned by :meth:`record_request_start`.
            model: Model name reported by the API.
            token_usage: Dict with ``prompt_tokens``, ``completion_tokens``,
                and ``total_tokens`` keys.

        Returns:
            Elapsed response time in seconds.
        """
        elapsed = time.time() - start_time
        self.success_count += 1
        self.total_response_time += elapsed

        if model:
            self.model_usage[model] = self.model_usage.get(model, 0) + 1

        if token_usage:
            self.token_usage["total_prompt_tokens"] += token_usage.get("prompt_tokens", 0)
            self.token_usage["total_completion_tokens"] += token_usage.get(
                "completion_tokens", 0
            )
            self.token_usage["total_tokens"] += token_usage.get("total_tokens", 0)

        return elapsed

    def record_error(
        self, start_time: float, error_type: str, error_code: Optional[str] = None
    ) -> float:
        """Record a failed request.

        Args:
            start_time: Value returned by :meth:`record_request_start`.
            error_type: Exception class name.
            error_code: Optional structured error code from the upstream API.

        Returns:
            Elapsed response time in seconds.
        """
        elapsed = time.time() - start_time
        self.error_count += 1
        self.total_response_time += elapsed

        error_key = f"{error_type}:{error_code}" if error_code else error_type
        self.error_types[error_key] = self.error_types.get(error_key, 0) + 1

        return elapsed

    # ------------------------------------------------------------------
    # Summaries
    # ------------------------------------------------------------------

    def get_metrics_summary(self) -> Dict[str, Any]:
        """Return a comprehensive metrics snapshot for logging/monitoring."""
        avg = (
            self.total_response_time / self.request_count
            if self.request_count > 0
            else 0.0
        )
        rate = (
            self.success_count / self.request_count * 100
            if self.request_count > 0
            else 0.0
        )
        return {
            "requests": {
                "total": self.request_count,
                "successful": self.success_count,
                "failed": self.error_count,
                "success_rate_percent": round(rate, 2),
            },
            "performance": {
                "average_response_time_seconds": round(avg, 3),
                "total_response_time_seconds": round(self.total_response_time, 3),
            },
            "errors": {
                "total_count": self.error_count,
                "error_types": dict(self.error_types),
            },
            "models": {"usage_by_model": dict(self.model_usage)},
            "tokens": dict(self.token_usage),
        }

    def reset_metrics(self) -> None:
        """Reset all counters to zero."""
        self.__init__()  # type: ignore[misc]


class StructuredLogger:
    """
    Structured, security-aware logger for OpenRouter API operations.

    Integrates :class:`OpenRouterMetrics` for performance tracking and
    :class:`~backend.core.security.APIKeySecurityValidator` for automatic
    credential sanitization.

    Requirements: 3, 36
    """

    def __init__(self, name: str, api_key: str) -> None:
        self.api_key = api_key
        self.logger = APIKeySecurityValidator.create_secure_logger(name, api_key)
        self.metrics = OpenRouterMetrics()

    # ------------------------------------------------------------------
    # Context manager for request lifecycle
    # ------------------------------------------------------------------

    @contextmanager
    def log_api_request(
        self, operation: str, **context: Any
    ) -> Generator[Dict[str, Any], None, None]:
        """Context manager that logs request start, success, and failure.

        Usage::

            async with structured_logger.log_api_request("chat_completion", model="gpt-4") as ctx:
                result = await client.post(...)
                structured_logger.log_api_success(ctx["request_id"], ...)

        Args:
            operation: Human-readable name of the operation.
            **context: Additional key-value pairs to include in log records.

        Yields:
            Dict with ``request_id``, ``start_time``, ``logger``, and ``metrics``.
        """
        sanitized_context = APIKeySecurityValidator.sanitize_dict_values(context, self.api_key)
        start_time = self.metrics.record_request_start()
        request_id = str(uuid.uuid4())[:8]

        self.logger.info(
            "[%s] Starting %s",
            request_id,
            operation,
            extra={
                "operation": operation,
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat(),
                "context": sanitized_context,
            },
        )

        try:
            yield {
                "request_id": request_id,
                "start_time": start_time,
                "logger": self.logger,
                "metrics": self.metrics,
            }
        except Exception as exc:
            error_type = type(exc).__name__
            error_message = str(exc)
            sanitized_error = APIKeySecurityValidator.sanitize_error_message(
                error_message, self.api_key
            )

            # Try to extract numeric error code from messages like "OpenRouter API error (429)"
            error_code: Optional[str] = None
            if (
                "OpenRouter API error" in error_message
                and "(" in error_message
                and ")" in error_message
            ):
                try:
                    start = error_message.find("(") + 1
                    end = error_message.find(")")
                    error_code = error_message[start:end]
                except Exception:
                    pass

            response_time = self.metrics.record_error(start_time, error_type, error_code)

            self.logger.error(
                "[%s] %s failed",
                request_id,
                operation,
                extra={
                    "operation": operation,
                    "request_id": request_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "error": {
                        "type": error_type,
                        "message": sanitized_error,
                        "code": error_code,
                    },
                    "performance": {"response_time_seconds": round(response_time, 3)},
                    "context": sanitized_context,
                },
            )
            raise

    # ------------------------------------------------------------------
    # Individual log helpers
    # ------------------------------------------------------------------

    def log_api_success(
        self,
        request_id: str,
        operation: str,
        start_time: float,
        response_metadata: Optional[Dict[str, Any]] = None,
        **context: Any,
    ) -> None:
        """Log a successful API call with timing and token usage.

        Args:
            request_id: Identifier returned by :meth:`log_api_request`.
            operation: Name of the completed operation.
            start_time: Value from the yielded context dict.
            response_metadata: Raw response metadata (model, finish_reason, usage).
            **context: Additional key-value pairs for the log record.
        """
        sanitized_ctx = APIKeySecurityValidator.sanitize_dict_values(context, self.api_key)
        sanitized_meta = APIKeySecurityValidator.sanitize_dict_values(
            response_metadata or {}, self.api_key
        )

        model = sanitized_meta.get("model")
        token_usage = sanitized_meta.get("usage", {})
        response_time = self.metrics.record_success(start_time, model, token_usage)

        self.logger.info(
            "[%s] %s completed successfully",
            request_id,
            operation,
            extra={
                "operation": operation,
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat(),
                "performance": {"response_time_seconds": round(response_time, 3)},
                "response": {
                    "model": model,
                    "finish_reason": sanitized_meta.get("finish_reason"),
                    "token_usage": token_usage,
                },
                "context": sanitized_ctx,
            },
        )

    def log_metrics_summary(self, interval_minutes: int = 60) -> None:
        """Emit a structured metrics summary log record."""
        self.logger.info(
            "OpenRouter metrics summary (%dmin interval)",
            interval_minutes,
            extra={
                "timestamp": datetime.utcnow().isoformat(),
                "interval_minutes": interval_minutes,
                "metrics": self.metrics.get_metrics_summary(),
            },
        )

    def log_configuration_info(self, config_info: Dict[str, Any]) -> None:
        """Log sanitized configuration at startup."""
        sanitized = APIKeySecurityValidator.sanitize_dict_values(config_info, self.api_key)
        self.logger.info(
            "OpenRouter configuration loaded",
            extra={
                "timestamp": datetime.utcnow().isoformat(),
                "configuration": sanitized,
            },
        )

    def log_health_check(self, status: str, details: Optional[Dict[str, Any]] = None) -> None:
        """Log a health-check result.

        Args:
            status: ``'healthy'``, ``'unhealthy'``, or ``'degraded'``.
            details: Additional diagnostic data.
        """
        sanitized = APIKeySecurityValidator.sanitize_dict_values(details or {}, self.api_key)
        level = logging.INFO if status == "healthy" else logging.WARNING
        self.logger.log(
            level,
            "OpenRouter health check: %s",
            status,
            extra={
                "timestamp": datetime.utcnow().isoformat(),
                "health_status": status,
                "details": sanitized,
            },
        )
