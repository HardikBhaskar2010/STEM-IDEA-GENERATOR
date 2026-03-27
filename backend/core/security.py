"""
API key security validation utilities.

Ensures that sensitive credentials are never exposed in logs, error messages,
or API responses.  All sanitization helpers are pure static methods so they
can be used anywhere without importing a heavy singleton.

Requirements: 2, 33
"""

import logging
from typing import Any, Dict, List, Union


class APIKeySecurityValidator:
    """
    Comprehensive API-key security validation.

    Provides sanitization helpers that recursively redact API keys from
    strings, dictionaries, and log records.  Also creates loggers whose
    handlers transparently sanitize every emitted record.

    Requirements: 7.1, 7.4
    """

    # ------------------------------------------------------------------
    # String sanitization
    # ------------------------------------------------------------------

    @staticmethod
    def sanitize_log_message(message: str, api_key: str) -> str:
        """Remove API key from a log message.

        Args:
            message: The log message that might contain the API key.
            api_key: The credential to redact.

        Returns:
            Sanitized message with the key replaced by ``[API_KEY_REDACTED]``.
        """
        if not api_key or not message:
            return message

        sanitized = message.replace(api_key, "[API_KEY_REDACTED]")

        if len(api_key) > 10:
            prefix = api_key[:4]
            suffix = api_key[-4:]
            partial = f"{prefix}...{suffix}"
            sanitized = sanitized.replace(partial, "[API_KEY_REDACTED]")
            sanitized = sanitized.replace(prefix, "[REDACTED]")
            sanitized = sanitized.replace(suffix, "[REDACTED]")

        return sanitized

    @staticmethod
    def sanitize_error_message(error_message: str, api_key: str) -> str:
        """Remove API key from an error message (delegates to sanitize_log_message)."""
        return APIKeySecurityValidator.sanitize_log_message(error_message, api_key)

    # ------------------------------------------------------------------
    # Dict / collection sanitization
    # ------------------------------------------------------------------

    @staticmethod
    def sanitize_dict_values(data: Dict[str, Any], api_key: str) -> Dict[str, Any]:
        """Recursively sanitize dictionary values.

        Args:
            data: Dictionary that might contain the API key in any value.
            api_key: The credential to redact.

        Returns:
            A new dictionary with all string values sanitized.
        """
        if not api_key or not isinstance(data, dict):
            return data

        sanitized: Dict[str, Any] = {}
        for key, value in data.items():
            if isinstance(value, str):
                sanitized[key] = APIKeySecurityValidator.sanitize_log_message(value, api_key)
            elif isinstance(value, dict):
                sanitized[key] = APIKeySecurityValidator.sanitize_dict_values(value, api_key)
            elif isinstance(value, list):
                sanitized[key] = [
                    APIKeySecurityValidator.sanitize_log_message(item, api_key)
                    if isinstance(item, str)
                    else APIKeySecurityValidator.sanitize_dict_values(item, api_key)
                    if isinstance(item, dict)
                    else item
                    for item in value
                ]
            else:
                sanitized[key] = value

        return sanitized

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    @staticmethod
    def validate_no_key_exposure(text: str, api_key: str) -> bool:
        """Return True if *text* does not contain *api_key* or a significant substring.

        Args:
            text: Text to inspect.
            api_key: The credential to check for.

        Returns:
            ``True`` if the key is not exposed, ``False`` if exposure detected.
        """
        if not api_key or not text:
            return True

        if api_key in text:
            return False

        if len(api_key) > 20:
            for i in range(len(api_key) - 11):
                substring = api_key[i : i + 12]
                if len(set(substring)) > 2 and substring in text:
                    return False

        return True

    # ------------------------------------------------------------------
    # Secure logger factory
    # ------------------------------------------------------------------

    @staticmethod
    def create_secure_logger(name: str, api_key: str) -> logging.Logger:
        """Return a logger whose every emitted record is sanitized.

        Args:
            name: Logger name (e.g. ``"openrouter-operations"``).
            api_key: Credential to redact from all records.

        Returns:
            A configured :class:`logging.Logger` instance.

        Requirements: 2, 33
        """
        _logger = logging.getLogger(name)

        class _SecureHandler(logging.StreamHandler):
            def __init__(self, _api_key: str) -> None:
                super().__init__()
                self._api_key = _api_key

            def emit(self, record: logging.LogRecord) -> None:  # type: ignore[override]
                if hasattr(record, "msg") and isinstance(record.msg, str):
                    record.msg = APIKeySecurityValidator.sanitize_log_message(
                        record.msg, self._api_key
                    )
                if hasattr(record, "args") and record.args:
                    record.args = tuple(
                        APIKeySecurityValidator.sanitize_log_message(a, self._api_key)
                        if isinstance(a, str)
                        else a
                        for a in record.args
                    )
                try:
                    formatted = record.getMessage()
                    record.msg = APIKeySecurityValidator.sanitize_log_message(
                        formatted, self._api_key
                    )
                    record.args = ()
                except Exception:
                    pass
                super().emit(record)

        _logger.handlers.clear()
        handler = _SecureHandler(api_key)
        handler.setLevel(logging.DEBUG)
        formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        handler.setFormatter(formatter)
        _logger.addHandler(handler)
        _logger.setLevel(logging.DEBUG)

        return _logger
