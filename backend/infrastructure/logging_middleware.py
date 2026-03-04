"""
Logging Middleware for FastAPI

This module provides middleware to automatically log HTTP requests and responses
with structured logging, including request ID, user ID, endpoint, and timing.

Requirements: 14.2
"""

import time
import uuid
from typing import Callable, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from backend.infrastructure.structured_logger import get_logger


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log HTTP requests and responses with structured logging.
    
    Automatically adds:
    - Request ID (generated or from X-Request-ID header)
    - User ID (from request state if authenticated)
    - Endpoint path and method
    - Response status code
    - Response time in milliseconds
    - Timestamp
    
    Requirements: 14.2
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.logger = get_logger()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and log request/response information.
        
        Args:
            request: FastAPI request object
            call_next: Next middleware/handler in chain
            
        Returns:
            Response object
        """
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        
        # Extract user ID if available (set by auth middleware)
        user_id = getattr(request.state, "user_id", None)
        
        # Get endpoint information
        endpoint = request.url.path
        method = request.method
        
        # Store request ID in request state for access in handlers
        request.state.request_id = request_id
        
        # Log request
        self.logger.log_request(
            request_id=request_id,
            method=method,
            endpoint=endpoint,
            user_id=user_id,
            query_params=dict(request.query_params),
            client_host=request.client.host if request.client else None
        )
        
        # Start timing
        start_time = time.time()
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate response time
            response_time_ms = (time.time() - start_time) * 1000
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            # Log response
            self.logger.log_response(
                request_id=request_id,
                status_code=response.status_code,
                response_time_ms=response_time_ms,
                endpoint=endpoint,
                user_id=user_id
            )
            
            return response
            
        except Exception as e:
            # Calculate response time
            response_time_ms = (time.time() - start_time) * 1000
            
            # Log error
            self.logger.log_error_with_context(
                error=e,
                request_id=request_id,
                user_id=user_id,
                endpoint=endpoint,
                method=method,
                response_time_ms=response_time_ms
            )
            
            # Re-raise exception to be handled by error handlers
            raise


def get_request_id(request: Request) -> str:
    """
    Get request ID from request state.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Request ID string
    """
    return getattr(request.state, "request_id", "unknown")


def get_user_id(request: Request) -> Optional[str]:
    """
    Get user ID from request state.
    
    Args:
        request: FastAPI request object
        
    Returns:
        User ID string or None if not authenticated
    """
    return getattr(request.state, "user_id", None)
