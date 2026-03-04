"""
Sentry SDK configuration for error tracking and monitoring.

This module configures Sentry for:
- Error tracking and reporting
- Performance monitoring
- User context tracking
- Request context tracking
- Sensitive data filtering
"""

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from typing import Optional, Dict, Any
import os


def init_sentry(
    dsn: Optional[str] = None,
    environment: str = "development",
    release: Optional[str] = None,
    traces_sample_rate: float = 0.1,
    profiles_sample_rate: float = 0.1,
    enable_tracing: bool = True
):
    """
    Initialize Sentry SDK with FastAPI integration.
    
    Args:
        dsn: Sentry DSN (Data Source Name). If None, reads from SENTRY_DSN env var
        environment: Environment name (development, staging, production)
        release: Release version (e.g., "1.0.0")
        traces_sample_rate: Percentage of transactions to trace (0.0 to 1.0)
        profiles_sample_rate: Percentage of transactions to profile (0.0 to 1.0)
        enable_tracing: Whether to enable performance tracing
    """
    dsn = dsn or os.getenv("SENTRY_DSN")
    
    if not dsn:
        print("Warning: SENTRY_DSN not configured. Sentry error tracking is disabled.")
        return
    
    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release,
        traces_sample_rate=traces_sample_rate if enable_tracing else 0.0,
        profiles_sample_rate=profiles_sample_rate if enable_tracing else 0.0,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            StarletteIntegration(transaction_style="endpoint"),
            RedisIntegration(),
        ],
        # Filter sensitive data
        before_send=filter_sensitive_data,
        # Ignore common errors
        ignore_errors=[
            KeyboardInterrupt,
            "ConnectionResetError",
            "BrokenPipeError",
        ],
        # Set max breadcrumbs
        max_breadcrumbs=50,
        # Attach stack traces
        attach_stacktrace=True,
        # Send default PII (set to False in production)
        send_default_pii=False,
    )
    
    print(f"Sentry initialized for environment: {environment}")


def filter_sensitive_data(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Filter sensitive data from Sentry events before sending.
    
    Removes:
    - Passwords
    - API keys
    - JWT tokens
    - Credit card numbers
    - Personal information
    """
    # Filter request data
    if "request" in event:
        request = event["request"]
        
        # Filter headers
        if "headers" in request:
            sensitive_headers = ["authorization", "cookie", "x-api-key", "x-auth-token"]
            for header in sensitive_headers:
                if header in request["headers"]:
                    request["headers"][header] = "[Filtered]"
        
        # Filter query parameters
        if "query_string" in request:
            sensitive_params = ["password", "token", "api_key", "secret"]
            for param in sensitive_params:
                if param in str(request.get("query_string", "")):
                    request["query_string"] = "[Filtered]"
        
        # Filter POST data
        if "data" in request:
            if isinstance(request["data"], dict):
                sensitive_fields = ["password", "token", "api_key", "secret", "credit_card"]
                for field in sensitive_fields:
                    if field in request["data"]:
                        request["data"][field] = "[Filtered]"
    
    # Filter user data
    if "user" in event:
        user = event["user"]
        # Keep user ID but filter email and other PII
        if "email" in user:
            user["email"] = "[Filtered]"
        if "ip_address" in user:
            user["ip_address"] = "[Filtered]"
    
    # Filter exception values
    if "exception" in event and "values" in event["exception"]:
        for exception in event["exception"]["values"]:
            if "value" in exception:
                # Filter common sensitive patterns
                value = exception["value"]
                if "password" in value.lower() or "token" in value.lower():
                    exception["value"] = "[Filtered sensitive data from exception message]"
    
    return event


def set_user_context(user_id: str, username: Optional[str] = None, email: Optional[str] = None):
    """
    Set user context for Sentry events.
    
    Args:
        user_id: User ID
        username: Username (optional)
        email: Email (optional, will be filtered in production)
    """
    sentry_sdk.set_user({
        "id": user_id,
        "username": username,
        "email": email
    })


def set_request_context(request_id: str, endpoint: str, method: str):
    """
    Set request context for Sentry events.
    
    Args:
        request_id: Unique request ID
        endpoint: API endpoint
        method: HTTP method
    """
    sentry_sdk.set_context("request", {
        "request_id": request_id,
        "endpoint": endpoint,
        "method": method
    })


def capture_exception(error: Exception, context: Optional[Dict[str, Any]] = None):
    """
    Capture exception and send to Sentry with optional context.
    
    Args:
        error: Exception to capture
        context: Additional context dictionary
    """
    if context:
        sentry_sdk.set_context("additional", context)
    
    sentry_sdk.capture_exception(error)


def capture_message(message: str, level: str = "info", context: Optional[Dict[str, Any]] = None):
    """
    Capture message and send to Sentry.
    
    Args:
        message: Message to capture
        level: Severity level (debug, info, warning, error, fatal)
        context: Additional context dictionary
    """
    if context:
        sentry_sdk.set_context("additional", context)
    
    sentry_sdk.capture_message(message, level=level)


def add_breadcrumb(message: str, category: str = "default", level: str = "info", data: Optional[Dict[str, Any]] = None):
    """
    Add breadcrumb for debugging context.
    
    Args:
        message: Breadcrumb message
        category: Category (e.g., "auth", "database", "cache")
        level: Severity level
        data: Additional data dictionary
    """
    sentry_sdk.add_breadcrumb(
        message=message,
        category=category,
        level=level,
        data=data or {}
    )
