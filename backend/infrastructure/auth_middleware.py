"""
Authentication Middleware for FastAPI

This module provides middleware to validate JWT tokens and enforce authentication with:
- JWT token validation
- User ID extraction from tokens
- 401 responses for invalid/expired tokens
- User context added to request state
- Role-based access control (RBAC) support

Requirements: 13.1, 13.2, 13.4
"""

import logging
import os
from typing import Callable, Optional, Dict, Any, List
from datetime import datetime
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import jwt
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError

from backend.infrastructure.error_handler import ErrorCode, ErrorHandler

logger = logging.getLogger(__name__)


# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

# Paths that don't require authentication
PUBLIC_PATHS = {
    "/health",
    "/health/ready",
    "/health/live",
    "/metrics",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh"
}

# Paths that require specific roles
ROLE_PROTECTED_PATHS: Dict[str, List[str]] = {
    "/api/admin": ["admin"],
    "/api/monitoring": ["admin", "operator"]
}


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate JWT tokens and enforce authentication.
    
    Features:
    - Validates JWT token signature and expiration
    - Extracts user ID and roles from token
    - Returns 401 for invalid/expired tokens
    - Adds user context to request state
    - Supports role-based access control
    
    Requirements:
    - 13.1: Validate JWT tokens on all protected endpoints
    - 13.2: Return HTTP 401 for invalid or expired tokens
    - 13.4: Implement role-based access control for admin operations
    """
    
    def __init__(
        self,
        app: ASGIApp,
        jwt_secret: Optional[str] = None,
        jwt_algorithm: str = JWT_ALGORITHM
    ):
        """
        Initialize authentication middleware.
        
        Args:
            app: ASGI application
            jwt_secret: JWT secret key (uses env var if None)
            jwt_algorithm: JWT algorithm (default: HS256)
        """
        super().__init__(app)
        self.jwt_secret = jwt_secret or JWT_SECRET
        self.jwt_algorithm = jwt_algorithm
        
        if self.jwt_secret == "your-secret-key-change-in-production":
            logger.warning(
                "Using default JWT secret! Change JWT_SECRET in production!"
            )
    
    def _extract_token(self, request: Request) -> Optional[str]:
        """
        Extract JWT token from request.
        
        Checks:
        1. Authorization header (Bearer token)
        2. X-API-Token header
        3. Cookie (token)
        
        Args:
            request: FastAPI request object
            
        Returns:
            JWT token string or None if not found
        """
        # Check Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            return auth_header[7:]  # Remove "Bearer " prefix
        
        # Check X-API-Token header
        api_token = request.headers.get("X-API-Token")
        if api_token:
            return api_token
        
        # Check cookie
        token_cookie = request.cookies.get("token")
        if token_cookie:
            return token_cookie
            
        # Check query string (required for native browser EventSource connections)
        query_token = request.query_params.get("token")
        if query_token:
            return query_token
        
        return None
    
    def _validate_token(self, token: str) -> Dict[str, Any]:
        """
        Validate JWT token and extract payload.
        
        Args:
            token: JWT token string
            
        Returns:
            Token payload dictionary
            
        Raises:
            InvalidTokenError: If token is invalid
            ExpiredSignatureError: If token is expired
        """
        try:
            # Decode and validate token
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=[self.jwt_algorithm]
            )
            
            # Validate required fields
            if "user_id" not in payload:
                raise InvalidTokenError("Token missing user_id")
            
            # Validate expiration (jwt.decode already checks exp, but we can add custom logic)
            if "exp" in payload:
                exp_timestamp = payload["exp"]
                if datetime.utcnow().timestamp() > exp_timestamp:
                    raise ExpiredSignatureError("Token has expired")
            
            return payload
        
        except ExpiredSignatureError:
            logger.warning("Token expired")
            raise
        
        except InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            raise
    
    def _is_public_path(self, path: str) -> bool:
        """
        Check if path is public (doesn't require authentication).
        
        Args:
            path: Request path
            
        Returns:
            True if path is public, False otherwise
        """
        # Exact match
        if path in PUBLIC_PATHS:
            return True
        
        # Prefix match for public path patterns
        for public_path in PUBLIC_PATHS:
            if path.startswith(public_path):
                return True
        
        return False
    
    def _check_role_access(
        self,
        path: str,
        user_roles: List[str]
    ) -> bool:
        """
        Check if user has required role for path.
        
        Args:
            path: Request path
            user_roles: List of user roles
            
        Returns:
            True if user has access, False otherwise
        """
        # Check if path requires specific roles
        for protected_path, required_roles in ROLE_PROTECTED_PATHS.items():
            if path.startswith(protected_path):
                # Check if user has any of the required roles
                return any(role in user_roles for role in required_roles)
        
        # Path doesn't require specific roles
        return True
    
    async def dispatch(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """
        Process request with authentication.
        
        Args:
            request: FastAPI request object
            call_next: Next middleware/handler in chain
            
        Returns:
            Response object
        """
        # Skip authentication for public paths
        if self._is_public_path(request.url.path):
            return await call_next(request)
        
        # Extract token
        token = self._extract_token(request)
        
        if not token:
            logger.warning(
                f"No authentication token provided for {request.url.path}"
            )
            
            return ErrorHandler.create_error_response(
                code=ErrorCode.AUTHENTICATION_ERROR,
                message="Authentication required. Please provide a valid token.",
                status_code=401,
                request_id=getattr(request.state, "request_id", None),
                path=request.url.path
            )
        
        # Validate token
        try:
            payload = self._validate_token(token)
            
            # Extract user information
            user_id = payload.get("user_id")
            user_email = payload.get("email")
            user_roles = payload.get("roles", ["user"])
            
            # Check role-based access
            if not self._check_role_access(request.url.path, user_roles):
                logger.warning(
                    f"User {user_id} lacks required role for {request.url.path}"
                )
                
                return ErrorHandler.create_error_response(
                    code=ErrorCode.AUTHORIZATION_ERROR,
                    message="You don't have permission to access this resource.",
                    details={"required_roles": ROLE_PROTECTED_PATHS.get(request.url.path)},
                    status_code=403,
                    request_id=getattr(request.state, "request_id", None),
                    path=request.url.path
                )
            
            # Add user context to request state
            request.state.user_id = user_id
            request.state.user_email = user_email
            request.state.user_roles = user_roles
            request.state.user_role = user_roles[0] if user_roles else "user"
            request.state.authenticated = True
            
            logger.debug(f"Authenticated user {user_id} for {request.url.path}")
            
            # Continue processing request
            return await call_next(request)
        
        except ExpiredSignatureError:
            return ErrorHandler.create_error_response(
                code=ErrorCode.AUTHENTICATION_ERROR,
                message="Token has expired. Please login again.",
                status_code=401,
                request_id=getattr(request.state, "request_id", None),
                path=request.url.path
            )
        
        except InvalidTokenError as e:
            return ErrorHandler.create_error_response(
                code=ErrorCode.AUTHENTICATION_ERROR,
                message=f"Invalid authentication token: {str(e)}",
                status_code=401,
                request_id=getattr(request.state, "request_id", None),
                path=request.url.path
            )
        
        except Exception as e:
            logger.error(f"Error in auth middleware: {e}", exc_info=True)
            
            return ErrorHandler.create_error_response(
                code=ErrorCode.INTERNAL_ERROR,
                message="Authentication error occurred",
                status_code=500,
                request_id=getattr(request.state, "request_id", None),
                path=request.url.path
            )


def add_public_path(path: str) -> None:
    """
    Add path to public paths (no authentication required).
    
    Args:
        path: Path to make public
    """
    global PUBLIC_PATHS
    PUBLIC_PATHS.add(path)
    logger.info(f"Added public path: {path}")


def add_role_protected_path(
    path: str,
    required_roles: List[str]
) -> None:
    """
    Add role-protected path.
    
    Args:
        path: Path to protect
        required_roles: List of roles that can access this path
    """
    global ROLE_PROTECTED_PATHS
    ROLE_PROTECTED_PATHS[path] = required_roles
    logger.info(f"Added role-protected path {path}: {required_roles}")


def get_current_user_id(request: Request) -> Optional[str]:
    """
    Get current user ID from request state.
    
    Args:
        request: FastAPI request object
        
    Returns:
        User ID string or None if not authenticated
    """
    return getattr(request.state, "user_id", None)


def get_current_user_roles(request: Request) -> List[str]:
    """
    Get current user roles from request state.
    
    Args:
        request: FastAPI request object
        
    Returns:
        List of user roles
    """
    return getattr(request.state, "user_roles", [])


def is_authenticated(request: Request) -> bool:
    """
    Check if request is authenticated.
    
    Args:
        request: FastAPI request object
        
    Returns:
        True if authenticated, False otherwise
    """
    return getattr(request.state, "authenticated", False)


def has_role(request: Request, role: str) -> bool:
    """
    Check if user has specific role.
    
    Args:
        request: FastAPI request object
        role: Role to check
        
    Returns:
        True if user has role, False otherwise
    """
    user_roles = get_current_user_roles(request)
    return role in user_roles
