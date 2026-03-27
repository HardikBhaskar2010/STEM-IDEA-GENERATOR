"""
Core module for configuration, security, logging, and exception handling.

This module provides foundational components used across the application:
- Exception hierarchy for consistent error handling
- Configuration management (future)
- Security utilities (future)
- Logging infrastructure (future)
"""

from backend.core.exceptions import (
    AppError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    UpstreamError,
    ValidationError,
)

__all__ = [
    "AppError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "RateLimitError",
    "UpstreamError",
    "ValidationError",
]
