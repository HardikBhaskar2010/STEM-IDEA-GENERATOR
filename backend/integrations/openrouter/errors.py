"""
OpenRouter API error mapping.

Maps OpenRouter error codes to HTTP status codes and user-friendly messages,
decoupling error presentation from business logic.

Requirements: 4, 4.8, 33
"""

from typing import Any, Dict, Optional


class OpenRouterErrorMapper:
    """
    Maps OpenRouter error codes to HTTP status codes and user-friendly messages.

    Requirements: 5.3, 5.4
    """

    # ------------------------------------------------------------------
    # Mappings
    # ------------------------------------------------------------------

    ERROR_CODE_MAPPING: Dict[str, int] = {
        # Authentication
        "invalid_api_key": 401,
        "authentication_error": 401,
        "permission_denied": 403,
        "insufficient_quota": 402,
        "quota_exceeded": 429,
        # Request validation
        "invalid_request_error": 400,
        "invalid_request": 400,
        "validation_error": 422,
        "unsupported_model": 400,
        "model_not_found": 404,
        "context_length_exceeded": 413,
        "max_tokens_exceeded": 413,
        # Rate limiting
        "rate_limit_exceeded": 429,
        "requests_per_minute_limit_exceeded": 429,
        "tokens_per_minute_limit_exceeded": 429,
        # Service errors
        "internal_server_error": 500,
        "service_unavailable": 503,
        "model_overloaded": 503,
        "timeout": 504,
        "bad_gateway": 502,
        # Network
        "network_error": 502,
        "connection_error": 502,
        "upstream_error": 502,
        # Default
        "unknown_error": 500,
    }

    ERROR_MESSAGE_MAPPING: Dict[str, str] = {
        "invalid_api_key": "Invalid authentication key. Please check your configuration.",
        "authentication_error": "Authentication failed. Please verify your credentials.",
        "permission_denied": "Access denied. Your account does not have permission for this operation.",
        "insufficient_quota": "Insufficient account quota. Please check your account balance.",
        "quota_exceeded": "Account quota exceeded. Please try again later or upgrade your plan.",
        "invalid_request": "Invalid request format. Please check your input parameters.",
        "validation_error": "Request validation failed. Please verify your input data.",
        "unsupported_model": "The requested model is not supported. Please try a different model.",
        "model_not_found": "The specified model was not found. Please check the model name.",
        "context_length_exceeded": "Input text is too long. Please reduce the length of your request.",
        "max_tokens_exceeded": "Maximum token limit exceeded. Please reduce your input or token limit.",
        "rate_limit_exceeded": "Rate limit exceeded. Please wait a moment before making another request.",
        "requests_per_minute_limit_exceeded": "Too many requests per minute. Please slow down.",
        "tokens_per_minute_limit_exceeded": "Token rate limit exceeded. Please reduce your usage rate.",
        "internal_server_error": "Internal server error occurred. Please try again in a few moments.",
        "service_unavailable": "Service is temporarily unavailable. Please try again later.",
        "model_overloaded": "The model is currently overloaded. Please try again in a few minutes.",
        "timeout": "Request timed out. Please try again.",
        "bad_gateway": "Service gateway error. Please try again in a few moments.",
        "network_error": "Network connection error. Please check your internet connection.",
        "connection_error": "Failed to connect to service. Please try again.",
        "upstream_error": "Upstream service error. Please try again later.",
        "unknown_error": "An unexpected error occurred. Please try again or contact support.",
    }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @classmethod
    def map_error_to_http_status(cls, error_code: str) -> int:
        """Map an error code string to an HTTP status code.

        Args:
            error_code: OpenRouter error code (e.g. ``"rate_limit_exceeded"``).

        Returns:
            Corresponding HTTP status code.

        Requirements: 4.8
        """
        normalized = error_code.lower() if isinstance(error_code, str) else "unknown_error"
        return cls.ERROR_CODE_MAPPING.get(normalized, 500)

    @classmethod
    def get_user_friendly_message(cls, error_code: str) -> str:
        """Return a user-friendly error message for the given error code.

        Args:
            error_code: OpenRouter error code.

        Returns:
            Human-readable error message suitable for API responses.
        """
        normalized = error_code.lower() if isinstance(error_code, str) else "unknown_error"
        return cls.ERROR_MESSAGE_MAPPING.get(
            normalized,
            "An unexpected error occurred. Please try again or contact support.",
        )

    @classmethod
    def map_error_response(
        cls,
        error_code: str,
        error_message: Optional[str] = None,
        http_status: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Build a complete error response dict from an OpenRouter error.

        Args:
            error_code: OpenRouter error code.
            error_message: Raw error message from the API (optional).
            http_status: HTTP status from the API response (optional).

        Returns:
            Dict with ``http_status``, ``error_code``, and ``user_message``.
        """
        if isinstance(error_code, int):
            normalized = str(error_code)
        else:
            normalized = error_code.lower() if error_code else "unknown_error"

        mapped_status = cls.ERROR_CODE_MAPPING.get(normalized)
        if mapped_status is None:
            mapped_status = http_status or 500

        user_message = cls.ERROR_MESSAGE_MAPPING.get(normalized)
        if user_message is None:
            user_message = f"API error: {error_message}" if error_message else "An unexpected error occurred."

        return {
            "http_status": mapped_status,
            "error_code": normalized,
            "user_message": user_message,
            "raw_message": error_message,
        }
