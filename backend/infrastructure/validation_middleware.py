"""
Request Validation Middleware for FastAPI

This module provides middleware to validate and sanitize incoming requests with:
- Automatic validation against Pydantic models
- Input sanitization to prevent injection attacks
- Detailed validation error responses
- Request body size limits

Requirements: 6.1, 6.2, 6.3, 6.5, 6.6
"""

import logging
import json
from typing import Callable, Optional, Dict, Any, Type
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from pydantic import BaseModel

from backend.infrastructure.request_validator import (
    RequestValidator,
    ValidationError
)
from backend.infrastructure.error_handler import ErrorCode, ErrorHandler

logger = logging.getLogger(__name__)


# Maximum request body size (10 MB)
MAX_REQUEST_BODY_SIZE = 10 * 1024 * 1024

# Endpoint to validation model mapping
VALIDATION_MODELS: Dict[str, Type[BaseModel]] = {}


class ValidationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate and sanitize incoming requests.
    
    Features:
    - Validates request body against Pydantic models
    - Sanitizes all user input
    - Returns 400 with detailed errors on validation failure
    - Logs validation failures
    - Enforces request body size limits
    
    Requirements:
    - 6.1: Validate all incoming requests against Pydantic models
    - 6.2: Return HTTP 400 with detailed error messages on validation failure
    - 6.3: Sanitize user input to prevent injection attacks
    - 6.5: Include field names in error response when required fields are missing
    - 6.6: Include expected and actual types in error response when field types are incorrect
    """
    
    def __init__(
        self,
        app: ASGIApp,
        max_body_size: int = MAX_REQUEST_BODY_SIZE
    ):
        """
        Initialize validation middleware.
        
        Args:
            app: ASGI application
            max_body_size: Maximum request body size in bytes
        """
        super().__init__(app)
        self.max_body_size = max_body_size
        self.validator = RequestValidator()
    
    async def _read_body(self, request: Request) -> Optional[Dict[str, Any]]:
        """
        Read and parse request body.
        
        Args:
            request: FastAPI request object
            
        Returns:
            Parsed JSON body or None if no body
            
        Raises:
            ValueError: If body is too large or invalid JSON
        """
        # Check content length
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_body_size:
            raise ValueError(
                f"Request body too large. Maximum size: {self.max_body_size} bytes"
            )
        
        # Read body
        body = await request.body()
        
        # Check actual body size
        if len(body) > self.max_body_size:
            raise ValueError(
                f"Request body too large. Maximum size: {self.max_body_size} bytes"
            )
        
        # Parse JSON if body is not empty
        if body:
            try:
                return json.loads(body)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON: {str(e)}")
        
        return None
    
    def _sanitize_body(self, body: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recursively sanitize all string values in request body.
        
        Args:
            body: Request body dictionary
            
        Returns:
            Sanitized body dictionary
        """
        if not isinstance(body, dict):
            return body
        
        sanitized = {}
        for key, value in body.items():
            if isinstance(value, str):
                sanitized[key] = self.validator.sanitize_input(value)
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_body(value)
            elif isinstance(value, list):
                sanitized[key] = [
                    self._sanitize_body(item) if isinstance(item, dict)
                    else self.validator.sanitize_input(item) if isinstance(item, str)
                    else item
                    for item in value
                ]
            else:
                sanitized[key] = value
        
        return sanitized
    
    def _get_validation_model(
        self,
        endpoint: str,
        method: str
    ) -> Optional[Type[BaseModel]]:
        """
        Get validation model for endpoint and method.
        
        Args:
            endpoint: Request endpoint path
            method: HTTP method
            
        Returns:
            Pydantic model class or None if no validation configured
        """
        # Look up validation model by endpoint and method
        key = f"{method}:{endpoint}"
        return VALIDATION_MODELS.get(key)
    
    async def dispatch(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """
        Process request with validation.
        
        Args:
            request: FastAPI request object
            call_next: Next middleware/handler in chain
            
        Returns:
            Response object
        """
        # Only validate requests with bodies (POST, PUT, PATCH)
        if request.method not in ["POST", "PUT", "PATCH"]:
            return await call_next(request)
        
        try:
            # Read and parse body
            body = await self._read_body(request)
            
            # If no body, continue
            if body is None:
                return await call_next(request)
            
            # Sanitize input
            sanitized_body = self._sanitize_body(body)
            
            # Get validation model for this endpoint
            validation_model = self._get_validation_model(
                request.url.path,
                request.method
            )
            
            # Validate if model is configured
            if validation_model:
                try:
                    # Validate against Pydantic model
                    validated_data = self.validator.validate(
                        sanitized_body,
                        validation_model
                    )
                    
                    # Store validated data in request state
                    request.state.validated_data = validated_data
                    
                except ValidationError as e:
                    # Log validation failure
                    logger.warning(
                        f"Validation failed for {request.method} {request.url.path}: "
                        f"{len(e.errors)} error(s)"
                    )
                    
                    # Create detailed error response
                    error_response = ErrorHandler.create_error_response(
                        code=ErrorCode.VALIDATION_ERROR,
                        message="Request validation failed",
                        details={
                            "errors": e.errors,
                            "error_count": len(e.errors)
                        },
                        status_code=400,
                        request_id=getattr(request.state, "request_id", None),
                        path=request.url.path
                    )
                    
                    return error_response
            else:
                # No validation model configured, just store sanitized body
                request.state.sanitized_body = sanitized_body
            
            # Continue processing request
            # Note: We need to make the body available again for the route handler
            # Store sanitized body for route handlers to access
            async def receive():
                return {
                    "type": "http.request",
                    "body": json.dumps(sanitized_body).encode(),
                }
            
            request._receive = receive
            
            return await call_next(request)
        
        except ValueError as e:
            # Handle body reading errors
            logger.warning(f"Request body error: {str(e)}")
            
            error_response = ErrorHandler.create_error_response(
                code=ErrorCode.INVALID_REQUEST,
                message=str(e),
                status_code=400,
                request_id=getattr(request.state, "request_id", None),
                path=request.url.path
            )
            
            return error_response
        
        except Exception as e:
            # Log unexpected errors
            logger.error(f"Error in validation middleware: {e}", exc_info=True)
            
            # Continue processing request if validation fails unexpectedly
            return await call_next(request)


def register_validation_model(
    endpoint: str,
    method: str,
    model: Type[BaseModel]
) -> None:
    """
    Register a validation model for an endpoint.
    
    Args:
        endpoint: Endpoint path (e.g., "/api/chat/message")
        method: HTTP method (e.g., "POST")
        model: Pydantic model class for validation
    """
    key = f"{method}:{endpoint}"
    VALIDATION_MODELS[key] = model
    logger.info(f"Registered validation model for {key}: {model.__name__}")


def register_validation_models(
    models: Dict[str, Type[BaseModel]]
) -> None:
    """
    Register multiple validation models at once.
    
    Args:
        models: Dict mapping "METHOD:endpoint" to Pydantic models
    """
    global VALIDATION_MODELS
    VALIDATION_MODELS.update(models)
    logger.info(f"Registered {len(models)} validation models")


def get_validated_data(request: Request) -> Optional[BaseModel]:
    """
    Get validated data from request state.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Validated Pydantic model instance or None
    """
    return getattr(request.state, "validated_data", None)


def get_sanitized_body(request: Request) -> Optional[Dict[str, Any]]:
    """
    Get sanitized body from request state.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Sanitized body dictionary or None
    """
    return getattr(request.state, "sanitized_body", None)
