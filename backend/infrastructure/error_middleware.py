"""
Error Handling Middleware for FastAPI

This module provides middleware to catch and handle all exceptions with:
- Standardized error responses
- Request ID tracking
- Error logging with context
- Sensitive data sanitization

Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
"""

import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from backend.infrastructure.error_handler import ErrorHandler
from backend.infrastructure.structured_logger import get_logger

logger = get_logger()


class ErrorMiddleware(BaseHTTPMiddleware):
    """
    Middleware to catch and handle all exceptions.
    
    Features:
    - Catches all unhandled exceptions
    - Returns standardized error responses
    - Adds request ID to all error responses
    - Logs errors with full context
    - Sanitizes error messages for production
    
    Requirements:
    - 7.1: Return errors in consistent format
    - 7.2: Return HTTP 400 with VALIDATION_ERROR code
    - 7.3: Return HTTP 401 with AUTHENTICATION_ERROR code
    - 7.4: Return HTTP 403 with AUTHORIZATION_ERROR code
    - 7.5: Return HTTP 404 with NOT_FOUND code
    - 7.6: Return HTTP 429 with RATE_LIMIT_EXCEEDED code
    - 7.7: Return HTTP 500 with INTERNAL_ERROR and sanitized messages
    - 7.8: Log all errors with context
    """
    
    def __init__(self, app: ASGIApp):
        """
        Initialize error handling middleware.
        
        Args:
            app: ASGI application
        """
        super().__init__(app)
    
    async def dispatch(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """
        Process request with error handling.
        
        Args:
            request: FastAPI request object
            call_next: Next middleware/handler in chain
            
        Returns:
            Response object
        """
        try:
            # Process request
            response = await call_next(request)
            return response
        
        except Exception as exc:
            # Handle exception using ErrorHandler
            error_response = ErrorHandler.handle_exception(
                request=request,
                exc=exc
            )
            
            return error_response


def setup_exception_handlers(app):
    """
    Set up FastAPI exception handlers.
    
    This function registers exception handlers for common exception types
    to ensure consistent error responses across the application.
    
    Args:
        app: FastAPI application instance
    """
    from fastapi import HTTPException
    from fastapi.exceptions import RequestValidationError
    from starlette.exceptions import HTTPException as StarletteHTTPException
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """Handle FastAPI HTTP exceptions"""
        return ErrorHandler.handle_exception(request, exc)
    
    @app.exception_handler(StarletteHTTPException)
    async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
        """Handle Starlette HTTP exceptions"""
        return ErrorHandler.handle_exception(request, exc)
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Handle Pydantic validation errors"""
        return ErrorHandler.handle_exception(request, exc)
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handle all other exceptions"""
        return ErrorHandler.handle_exception(request, exc)
    
    logger.info("Exception handlers registered")
