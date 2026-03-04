"""
Error Handler Module

Provides standardized error handling across all API endpoints with:
- Consistent error response format
- Error code enumeration
- Request ID tracking
- Context-aware error logging
- Sensitive data sanitization

Validates Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8
"""

from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
import traceback
import re

from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .structured_logger import get_logger


class ErrorCode(Enum):
    """Standardized error codes for API responses"""
    
    # Client errors (4xx)
    VALIDATION_ERROR = "VALIDATION_ERROR"
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR"
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    INVALID_REQUEST = "INVALID_REQUEST"
    
    # Server errors (5xx)
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    DATABASE_ERROR = "DATABASE_ERROR"
    EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR"
    CACHE_ERROR = "CACHE_ERROR"


# Error code to HTTP status code mapping
ERROR_CODE_TO_STATUS = {
    ErrorCode.VALIDATION_ERROR: 400,
    ErrorCode.INVALID_REQUEST: 400,
    ErrorCode.AUTHENTICATION_ERROR: 401,
    ErrorCode.AUTHORIZATION_ERROR: 403,
    ErrorCode.NOT_FOUND: 404,
    ErrorCode.RATE_LIMIT_EXCEEDED: 429,
    ErrorCode.INTERNAL_ERROR: 500,
    ErrorCode.SERVICE_UNAVAILABLE: 503,
    ErrorCode.DATABASE_ERROR: 500,
    ErrorCode.EXTERNAL_API_ERROR: 502,
    ErrorCode.CACHE_ERROR: 500,
}


class APIError(Exception):
    """
    Base API error exception
    
    All custom API errors should inherit from this class to ensure
    consistent error handling across the application.
    """
    
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        status_code: Optional[int] = None
    ):
        """
        Initialize API error
        
        Args:
            code: Error code from ErrorCode enum
            message: Human-readable error message
            details: Additional error details (optional)
            status_code: HTTP status code (optional, defaults to code mapping)
        """
        self.code = code
        self.message = message
        self.details = details or {}
        self.status_code = status_code or ERROR_CODE_TO_STATUS.get(code, 500)
        super().__init__(self.message)


class ErrorResponse(BaseModel):
    """Standard error response format"""
    
    error: str  # Error code
    message: str  # Human-readable message
    details: Optional[Dict[str, Any]] = None  # Additional details
    timestamp: str  # ISO 8601 timestamp
    request_id: Optional[str] = None  # Request tracking ID
    path: Optional[str] = None  # Request path


class ErrorHandler:
    """
    Centralized error handling for the application
    
    Provides methods to:
    - Handle exceptions and convert to standardized responses
    - Create error responses with consistent format
    - Log errors with context
    - Sanitize error messages to prevent data leaks
    """
    
    # Patterns for sensitive data that should be sanitized
    SENSITIVE_PATTERNS = [
        (re.compile(r'password["\']?\s*[:=]\s*["\']?([^"\'}\s,]+)', re.IGNORECASE), 'password'),
        (re.compile(r'token["\']?\s*[:=]\s*["\']?([^"\'}\s,]+)', re.IGNORECASE), 'token'),
        (re.compile(r'api[_-]?key["\']?\s*[:=]\s*["\']?([^"\'}\s,]+)', re.IGNORECASE), 'api_key'),
        (re.compile(r'secret["\']?\s*[:=]\s*["\']?([^"\'}\s,]+)', re.IGNORECASE), 'secret'),
        (re.compile(r'authorization:\s*bearer\s+([^\s]+)', re.IGNORECASE), 'auth_token'),
    ]
    
    @staticmethod
    def _get_request_id(request: Optional[Request] = None) -> str:
        """
        Get or generate request ID for tracking
        
        Args:
            request: FastAPI request object
            
        Returns:
            Request ID string
        """
        if request and hasattr(request.state, 'request_id'):
            return request.state.request_id
        return str(uuid.uuid4())
    
    @staticmethod
    def _sanitize_message(message: str) -> str:
        """
        Sanitize error message to prevent sensitive data leaks
        
        Args:
            message: Original error message
            
        Returns:
            Sanitized error message
        """
        sanitized = message
        for pattern, replacement in ErrorHandler.SENSITIVE_PATTERNS:
            sanitized = pattern.sub(f'{replacement}=***REDACTED***', sanitized)
        return sanitized
    
    @staticmethod
    def _sanitize_details(details: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Sanitize error details to prevent sensitive data leaks
        
        Args:
            details: Original error details
            
        Returns:
            Sanitized error details
        """
        if not details:
            return None
        
        sanitized = {}
        sensitive_keys = {'password', 'token', 'api_key', 'secret', 'authorization'}
        
        for key, value in details.items():
            if key.lower() in sensitive_keys:
                sanitized[key] = '***REDACTED***'
            elif isinstance(value, str):
                sanitized[key] = ErrorHandler._sanitize_message(value)
            elif isinstance(value, dict):
                sanitized[key] = ErrorHandler._sanitize_details(value)
            else:
                sanitized[key] = value
        
        return sanitized
    
    @staticmethod
    def handle_exception(
        request: Request,
        exc: Exception
    ) -> JSONResponse:
        """
        Handle any exception and return standardized response
        
        Args:
            request: FastAPI request object
            exc: Exception to handle
            
        Returns:
            JSONResponse with standardized error format
        """
        logger = get_logger()
        request_id = ErrorHandler._get_request_id(request)
        
        # Handle APIError exceptions
        if isinstance(exc, APIError):
            error_code = exc.code
            message = exc.message
            details = exc.details
            status_code = exc.status_code
        
        # Handle validation errors (Pydantic)
        elif hasattr(exc, '__class__') and exc.__class__.__name__ == 'ValidationError':
            error_code = ErrorCode.VALIDATION_ERROR
            message = "Request validation failed"
            details = {"validation_errors": str(exc)}
            status_code = 400
        
        # Handle HTTP exceptions
        elif hasattr(exc, 'status_code') and hasattr(exc, 'detail'):
            status_code = exc.status_code
            if status_code == 401:
                error_code = ErrorCode.AUTHENTICATION_ERROR
            elif status_code == 403:
                error_code = ErrorCode.AUTHORIZATION_ERROR
            elif status_code == 404:
                error_code = ErrorCode.NOT_FOUND
            elif status_code == 429:
                error_code = ErrorCode.RATE_LIMIT_EXCEEDED
            else:
                error_code = ErrorCode.INTERNAL_ERROR
            message = str(exc.detail) if hasattr(exc, 'detail') else str(exc)
            details = None
        
        # Handle all other exceptions
        else:
            error_code = ErrorCode.INTERNAL_ERROR
            message = "An internal error occurred"
            details = {"error_type": exc.__class__.__name__}
            status_code = 500
        
        # Log error with context
        ErrorHandler.log_error(
            error=exc,
            context={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "error_code": error_code.value,
                "status_code": status_code,
            }
        )
        
        # Create and return error response
        return ErrorHandler.create_error_response(
            code=error_code,
            message=message,
            details=details,
            status_code=status_code,
            request_id=request_id,
            path=request.url.path
        )
    
    @staticmethod
    def create_error_response(
        code: ErrorCode,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        status_code: Optional[int] = None,
        request_id: Optional[str] = None,
        path: Optional[str] = None
    ) -> JSONResponse:
        """
        Create standardized error response
        
        Args:
            code: Error code from ErrorCode enum
            message: Human-readable error message
            details: Additional error details (optional)
            status_code: HTTP status code (optional)
            request_id: Request tracking ID (optional)
            path: Request path (optional)
            
        Returns:
            JSONResponse with standardized error format
        """
        # Determine status code
        if status_code is None:
            status_code = ERROR_CODE_TO_STATUS.get(code, 500)
        
        # Sanitize message and details
        sanitized_message = ErrorHandler._sanitize_message(message)
        sanitized_details = ErrorHandler._sanitize_details(details)
        
        # Create error response
        error_response = ErrorResponse(
            error=code.value,
            message=sanitized_message,
            details=sanitized_details,
            timestamp=datetime.utcnow().isoformat() + 'Z',
            request_id=request_id or str(uuid.uuid4()),
            path=path
        )
        
        return JSONResponse(
            status_code=status_code,
            content=error_response.model_dump(exclude_none=True)
        )
    
    @staticmethod
    def log_error(
        error: Exception,
        context: Dict[str, Any]
    ) -> None:
        """
        Log error with context
        
        Args:
            error: Exception to log
            context: Additional context information
        """
        logger = get_logger()
        
        # Extract user_id if available in context
        user_id = context.get('user_id')
        
        # Get stack trace for internal errors
        stack_trace = None
        if not isinstance(error, APIError):
            stack_trace = ''.join(traceback.format_exception(
                type(error), error, error.__traceback__
            ))
        
        # Log error with full context
        logger.log_error_with_context(
            error=error,
            context={
                **context,
                "error_type": error.__class__.__name__,
                "error_message": str(error),
                "stack_trace": stack_trace,
                "user_id": user_id,
            }
        )
