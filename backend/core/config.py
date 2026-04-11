"""
Configuration management for the STEM backend application.

Centralizes all environment variable loading and validation so the rest of
the codebase never calls os.getenv() directly.
"""

import os
import logging
from typing import Any, Dict, Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class OpenRouterConfig:
    """
    Configuration for the OpenRouter AI API integration.

    Loads and validates the API key and endpoint settings from environment
    variables.  Call validate() at startup to fail fast on missing config.

    Requirements: 1, 35
    """

    def __init__(self, api_key_override: Optional[str] = None):
        self.api_key = self._load_api_key(api_key_override)
        self.base_url = "https://openrouter.ai/api/v1"
        self.model = "stepfun/step-3.5-flash:free"
        # Increased timeout for heavy models that may take longer to respond
        self.timeout = int(os.getenv("OPENROUTER_TIMEOUT", "300"))  # Default 5 minutes
        self.max_retries = 3

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _load_api_key(self, override: Optional[str] = None) -> str:
        """Load and validate OpenRouter API key."""
        if override:
            api_key = override
        else:
            api_key = os.getenv("OPENROUTER_API_KEY")
            if not api_key:
                # Hardcoded fallback for local dev only; prefer env var in prod.
                api_key = "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"

        if not api_key:
            msg = "OPENROUTER_API_KEY environment variable is required"
            logger.error(msg)
            raise ValueError(msg)

        if not api_key.startswith("sk-or-v1-"):
            msg = "Invalid OpenRouter API key format. Must start with 'sk-or-v1-'"
            logger.error(msg)
            raise ValueError(msg)

        return api_key

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def validate(self) -> bool:
        """Validate configuration is complete and valid.

        Returns:
            True if configuration is valid, False otherwise.
        """
        try:
            self._load_api_key()
            return True
        except ValueError as exc:
            logger.error("OpenRouter configuration validation failed: %s", exc)
            return False

    def get_sanitized_config_info(self) -> Dict[str, Any]:
        """Return configuration info safe for logging (API key redacted).

        Requirements: 1, 35
        """
        return {
            "base_url": self.base_url,
            "model": self.model,
            "timeout": self.timeout,
            "max_retries": self.max_retries,
            "api_key_configured": bool(self.api_key),
            "api_key_prefix": (
                self.api_key[:8] + "..." if self.api_key and len(self.api_key) > 8 else "[NOT_SET]"
            ),
        }
