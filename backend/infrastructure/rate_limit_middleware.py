"""
Rate Limiting Middleware for FastAPI

This module provides middleware to enforce rate limits on API endpoints with:
- Per-user, per-IP, and per-endpoint rate limiting
- Different rate limit tiers (anonymous, authenticated, premium, admin)
- Rate limit headers in responses
- 429 responses when limits are exceeded

Requirements: 4.2, 4.3, 4.5, 4.6
"""

import logging
from typing import Callable, Optional, Dict, Any
from datetime import timedelta
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from backend.infrastructure.rate_limiter import RateLimiter, get_rate_limiter
from backend.infrastructure.error_handler import ErrorCode, ErrorHandler

logger = logging.getLogger(__name__)


# Rate limit tiers configuration
RATE_LIMIT_TIERS = {
    "anonymous": {
        "limit": 20,
        "window": timedelta(minutes=1)
    },
    "authenticated": {
        "limit": 100,
        "window": timedelta(minutes=1)
    },
    "premium": {
        "limit": 500,
        "window": timedelta(minutes=1)
    },
    "admin": {
        "limit": 10000,
        "window": timedelta(minutes=1)
    }
}

# Per-endpoint rate limits (overrides tier defaults)
ENDPOINT_RATE_LIMITS = {
    "/api/ai/generate": {
        "anonymous": {"limit": 5, "window": timedelta(minutes=1)},
        "authenticated": {"limit": 20, "window": timedelta(minutes=1)},
        "premium": {"limit": 100, "window": timedelta(minutes=1)},
    },
    "/api/code/generate": {
        "anonymous": {"limit": 3, "window": timedelta(minutes=1)},
        "authenticated": {"limit": 10, "window": timedelta(minutes=1)},
        "premium": {"limit": 50, "window": timedelta(minutes=1)},
    },
    "/api/chat/message": {
        "anonymous": {"limit": 10, "window": timedelta(minutes=1)},
        "authenticated": {"limit": 60, "window": timedelta(minutes=1)},
        "premium": {"limit": 200, "window": timedelta(minutes=1)},
    }
}

# Endpoints that should skip rate limiting
RATE_LIMIT_EXEMPT_PATHS = {
    "/health",
    "/health/ready",
    "/health/live",
    "/metrics",
    "/docs",
    "/openapi.json",
    "/redoc"
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce rate limits on API endpoints.
    
    Features:
    - Extracts identifier from request (user ID, IP, API key)
    - Checks rate limit before processing request
    - Returns 429 with appropriate headers if exceeded
    - Adds rate limit headers to all responses
    - Supports different tiers (anonymous, authenticated, premium, admin)
    
    Requirements:
    - 4.2: Check rate limit before processing request
    - 4.3: Return 429 with appropriate headers if exceeded
    - 4.5: Support per-user, per-IP, and per-endpoint rate limiting
    - 4.6: Support different rate limit tiers
    """
    
    def __init__(
        self,
        app: ASGIApp,
        rate_limiter: Optional[RateLimiter] = None
    ):
        """
        Initialize rate limiting middleware.
        
        Args:
            app: ASGI application
            rate_limiter: RateLimiter instance (uses global if None)
        """
        super().__init__(app)
        self.rate_limiter = rate_limiter or get_rate_limiter()
        
        if not self.rate_limiter:
            logger.warning(
                "Rate limiter not initialized, rate limiting will be disabled"
            )
    
    def _extract_identifier(self, request: Request) -> str:
        """
        Extract unique identifier from request.
        
        Priority:
        1. User ID (from request state if authenticated)
        2. API key (from headers)
        3. IP address (from client)
        
        Args:
            request: FastAPI request object
            
        Returns:
            Unique identifier string
        """
        # Try to get user ID from request state (set by auth middleware)
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            return f"user:{user_id}"
        
        # Try to get API key from headers
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"apikey:{api_key}"
        
        # Fall back to IP address
        client_host = request.client.host if request.client else "unknown"
        return f"ip:{client_host}"
    
    def _get_user_tier(self, request: Request) -> str:
        """
        Determine user tier from request.
        
        Args:
            request: FastAPI request object
            
        Returns:
            Tier name (anonymous, authenticated, premium, admin)
        """
        # Check if user is authenticated
        user_id = getattr(request.state, "user_id", None)
        if not user_id:
            return "anonymous"
        
        # Check user role/tier from request state
        user_role = getattr(request.state, "user_role", None)
        if user_role == "admin":
            return "admin"
        elif user_role == "premium":
            return "premium"
        else:
            return "authenticated"
    
    def _get_rate_limit_config(
        self,
        endpoint: str,
        tier: str
    ) -> Dict[str, Any]:
        """
        Get rate limit configuration for endpoint and tier.
        
        Args:
            endpoint: Request endpoint path
            tier: User tier
            
        Returns:
            Dict with 'limit' and 'window' keys
        """
        # Check for endpoint-specific limits
        if endpoint in ENDPOINT_RATE_LIMITS:
            endpoint_limits = ENDPOINT_RATE_LIMITS[endpoint]
            if tier in endpoint_limits:
                return endpoint_limits[tier]
        
        # Fall back to tier defaults
        return RATE_LIMIT_TIERS.get(tier, RATE_LIMIT_TIERS["anonymous"])
    
    def _add_rate_limit_headers(
        self,
        response: Response,
        limit: int,
        remaining: int,
        reset_at: str
    ) -> None:
        """
        Add rate limit headers to response.
        
        Args:
            response: Response object
            limit: Rate limit value
            remaining: Remaining requests
            reset_at: Reset timestamp
        """
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = reset_at
    
    async def dispatch(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """
        Process request with rate limiting.
        
        Args:
            request: FastAPI request object
            call_next: Next middleware/handler in chain
            
        Returns:
            Response object
        """
        # Skip rate limiting if not initialized
        if not self.rate_limiter:
            return await call_next(request)
        
        # Skip rate limiting for exempt paths
        if request.url.path in RATE_LIMIT_EXEMPT_PATHS:
            return await call_next(request)
        
        # Extract identifier and tier
        identifier = self._extract_identifier(request)
        tier = self._get_user_tier(request)
        
        # Get rate limit configuration
        config = self._get_rate_limit_config(request.url.path, tier)
        limit = config["limit"]
        window = config["window"]
        
        # Check rate limit
        try:
            result = await self.rate_limiter.check_rate_limit(
                identifier=identifier,
                limit=limit,
                window=window,
                cost=1
            )
            
            # If rate limit exceeded, return 429
            if not result.allowed:
                logger.warning(
                    f"Rate limit exceeded for {identifier} on {request.url.path}"
                )
                
                # Create error response
                error_response = ErrorHandler.create_error_response(
                    code=ErrorCode.RATE_LIMIT_EXCEEDED,
                    message="Rate limit exceeded. Please try again later.",
                    details={
                        "limit": limit,
                        "window_seconds": int(window.total_seconds()),
                        "retry_after": result.retry_after
                    },
                    status_code=429,
                    request_id=getattr(request.state, "request_id", None),
                    path=request.url.path
                )
                
                # Add rate limit headers
                error_response.headers["X-RateLimit-Limit"] = str(limit)
                error_response.headers["X-RateLimit-Remaining"] = "0"
                error_response.headers["X-RateLimit-Reset"] = result.reset_at.isoformat()
                error_response.headers["Retry-After"] = str(result.retry_after)
                
                return error_response
            
            # Process request
            response = await call_next(request)
            
            # Add rate limit headers to successful response
            self._add_rate_limit_headers(
                response=response,
                limit=limit,
                remaining=result.remaining,
                reset_at=result.reset_at.isoformat()
            )
            
            return response
        
        except Exception as e:
            logger.error(f"Error in rate limit middleware: {e}")
            # Continue processing request if rate limiting fails
            return await call_next(request)


def configure_rate_limit_tiers(
    tiers: Dict[str, Dict[str, Any]]
) -> None:
    """
    Configure rate limit tiers.
    
    Args:
        tiers: Dict mapping tier names to limit/window configs
    """
    global RATE_LIMIT_TIERS
    RATE_LIMIT_TIERS.update(tiers)
    logger.info(f"Updated rate limit tiers: {list(tiers.keys())}")


def configure_endpoint_limits(
    endpoint_limits: Dict[str, Dict[str, Dict[str, Any]]]
) -> None:
    """
    Configure per-endpoint rate limits.
    
    Args:
        endpoint_limits: Dict mapping endpoints to tier-specific limits
    """
    global ENDPOINT_RATE_LIMITS
    ENDPOINT_RATE_LIMITS.update(endpoint_limits)
    logger.info(f"Updated endpoint rate limits for: {list(endpoint_limits.keys())}")


def add_exempt_path(path: str) -> None:
    """
    Add path to rate limit exemption list.
    
    Args:
        path: Path to exempt from rate limiting
    """
    global RATE_LIMIT_EXEMPT_PATHS
    RATE_LIMIT_EXEMPT_PATHS.add(path)
    logger.info(f"Added rate limit exempt path: {path}")
