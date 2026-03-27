"""
Domain exception hierarchy for consistent error handling across all layers.

This module provides a structured exception hierarchy that decouples business logic
from HTTP concerns. Services and orchestrators throw domain-specific exceptions,
which routers catch and map to appropriate HTTP status codes.

Usage:
    # In services/orchestrators:
    raise ValidationError("Invalid input", details={"field": "email"})
    
    # In routers:
    try:
        result = await orchestrator.process()
    except AppError as e:
        raise HTTPException(
            status_code=e.to_http_status(),
            detail=e.to_response_dict()
        )
"""

from typing import Any, Dict, Optional


class AppError(Exception):
    """Base exception for all application errors.
    
    All domain exceptions inherit from this class, providing consistent
    error handling and HTTP status code mapping.
    
    Attributes:
        message: Human-readable error message
        details: Additional context about the error
    """
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        """Initialize application error.
        
        Args:
            message: Human-readable error message
            details: Optional dictionary with additional error context
        """
        self.message = message
        self.details = details or {}
        super().__init__(self.message)
    
    def to_http_status(self) -> int:
        """Map exception to HTTP status code.
        
        Returns:
            HTTP status code (default: 500 Internal Server Error)
        """
        return 500  # Default to internal server error
    
    def to_response_dict(self) -> Dict[str, Any]:
        """Convert exception to API response format.
        
        Returns:
            Dictionary with error, message, and details fields
        """
        return {
            "error": self.__class__.__name__,
            "message": self.message,
            "details": self.details
        }


class ValidationError(AppError):
    """Raised when input validation fails.
    
    Use this exception for invalid request parameters, missing required fields,
    or data that doesn't meet business rules.
    
    Example:
        raise ValidationError("Email is required", details={"field": "email"})
    """
    
    def to_http_status(self) -> int:
        """Return 400 Bad Request status code."""
        return 400


class NotFoundError(AppError):
    """Raised when a requested resource is not found.
    
    Use this exception when a resource ID doesn't exist in the database
    or when a file/entity cannot be located.
    
    Example:
        raise NotFoundError(f"Project {project_id} not found")
    """
    
    def to_http_status(self) -> int:
        """Return 404 Not Found status code."""
        return 404


class AuthenticationError(AppError):
    """Raised when authentication fails.
    
    Use this exception for invalid credentials, expired tokens,
    or missing authentication headers.
    
    Example:
        raise AuthenticationError("Invalid API key")
    """
    
    def to_http_status(self) -> int:
        """Return 401 Unauthorized status code."""
        return 401


class AuthorizationError(AppError):
    """Raised when user lacks permission for an action.
    
    Use this exception when a user is authenticated but doesn't have
    the required permissions to perform an operation.
    
    Example:
        raise AuthorizationError("User cannot delete this project")
    """
    
    def to_http_status(self) -> int:
        """Return 403 Forbidden status code."""
        return 403


class RateLimitError(AppError):
    """Raised when rate limit is exceeded.
    
    Use this exception when a client exceeds the allowed request rate
    for an endpoint category.
    
    Example:
        raise RateLimitError(
            "Rate limit exceeded for veronica_ai",
            details={"limit": 10, "window": "1 minute"}
        )
    """
    
    def to_http_status(self) -> int:
        """Return 429 Too Many Requests status code."""
        return 429


class UpstreamError(AppError):
    """Raised when an external service (OpenRouter, E2B) fails.
    
    Use this exception to wrap errors from external APIs, providing
    context about which service failed and the upstream status code.
    
    Attributes:
        service: Name of the external service that failed
        upstream_status: HTTP status code from the upstream service
    
    Example:
        raise UpstreamError(
            message="OpenRouter API failed",
            service="OpenRouter",
            upstream_status=503,
            details={"error": "Service unavailable"}
        )
    """
    
    def __init__(
        self,
        message: str,
        service: str,
        upstream_status: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """Initialize upstream error.
        
        Args:
            message: Human-readable error message
            service: Name of the external service (e.g., "OpenRouter", "E2B")
            upstream_status: HTTP status code from upstream service
            details: Optional dictionary with additional error context
        """
        self.service = service
        self.upstream_status = upstream_status
        super().__init__(message, details)
    
    def to_http_status(self) -> int:
        """Map upstream status to appropriate client status code.
        
        Returns:
            HTTP status code based on upstream failure:
            - 429: Rate limit from upstream
            - 502: Bad gateway for upstream client errors (4xx)
            - 503: Service unavailable for upstream server errors (5xx)
            - 503: Default when upstream status is unknown
        """
        # Map upstream status to appropriate client status
        if self.upstream_status:
            if self.upstream_status == 429:
                return 429  # Rate limit
            elif 400 <= self.upstream_status < 500:
                return 502  # Bad gateway for upstream client errors
            elif self.upstream_status >= 500:
                return 503  # Service unavailable for upstream server errors
        return 503  # Default to service unavailable
