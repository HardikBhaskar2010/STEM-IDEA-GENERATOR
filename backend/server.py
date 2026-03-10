# server.py — clean, stable, Vercel + Render friendly

import sys
import os

# Ensure the project root is on sys.path so `from backend.xyz import ...` works
# regardless of which directory uvicorn is started from (e.g. backend/ on Render)
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)


import json
import uuid
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware

# ───────────────── ENV + LOGGING ─────────────────
load_dotenv()

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger("stem-backend")

# ───────────────── STRUCTURED LOGGING FOR OPENROUTER ─────────────────
import time
from contextlib import contextmanager

class OpenRouterMetrics:
    """
    Performance metrics and error tracking for OpenRouter operations.
    Provides structured logging with performance data and error analytics.
    
    Requirements: 5.4
    """
    
    def __init__(self):
        self.request_count = 0
        self.success_count = 0
        self.error_count = 0
        self.total_response_time = 0.0
        self.error_types = {}
        self.model_usage = {}
        self.token_usage = {
            'total_prompt_tokens': 0,
            'total_completion_tokens': 0,
            'total_tokens': 0
        }
    
    def record_request_start(self) -> float:
        """Record the start of a request and return start time"""
        self.request_count += 1
        return time.time()
    
    def record_success(self, start_time: float, model: str, token_usage: Dict[str, int] = None):
        """Record a successful request with performance metrics"""
        response_time = time.time() - start_time
        self.success_count += 1
        self.total_response_time += response_time
        
        # Track model usage
        if model:
            self.model_usage[model] = self.model_usage.get(model, 0) + 1
        
        # Track token usage
        if token_usage:
            self.token_usage['total_prompt_tokens'] += token_usage.get('prompt_tokens', 0)
            self.token_usage['total_completion_tokens'] += token_usage.get('completion_tokens', 0)
            self.token_usage['total_tokens'] += token_usage.get('total_tokens', 0)
        
        return response_time
    
    def record_error(self, start_time: float, error_type: str, error_code: str = None):
        """Record an error with timing and categorization"""
        response_time = time.time() - start_time
        self.error_count += 1
        self.total_response_time += response_time
        
        # Track error types
        error_key = f"{error_type}:{error_code}" if error_code else error_type
        self.error_types[error_key] = self.error_types.get(error_key, 0) + 1
        
        return response_time
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get comprehensive metrics summary for logging"""
        avg_response_time = (self.total_response_time / self.request_count) if self.request_count > 0 else 0
        success_rate = (self.success_count / self.request_count * 100) if self.request_count > 0 else 0
        
        return {
            'requests': {
                'total': self.request_count,
                'successful': self.success_count,
                'failed': self.error_count,
                'success_rate_percent': round(success_rate, 2)
            },
            'performance': {
                'average_response_time_seconds': round(avg_response_time, 3),
                'total_response_time_seconds': round(self.total_response_time, 3)
            },
            'errors': {
                'total_count': self.error_count,
                'error_types': dict(self.error_types)
            },
            'models': {
                'usage_by_model': dict(self.model_usage)
            },
            'tokens': dict(self.token_usage)
        }
    
    def reset_metrics(self):
        """Reset all metrics counters"""
        self.__init__()

class StructuredLogger:
    """
    Structured logging system for OpenRouter operations with performance metrics and error tracking.
    Provides comprehensive logging without exposing API keys or sensitive information.
    
    Requirements: 5.4
    """
    
    def __init__(self, name: str, api_key: str):
        self.api_key = api_key
        self.logger = APIKeySecurityValidator.create_secure_logger(name, api_key)
        self.metrics = OpenRouterMetrics()
    
    @contextmanager
    def log_api_request(self, operation: str, **context):
        """
        Context manager for logging API requests with automatic timing and error handling.
        
        Args:
            operation: Name of the operation being performed
            **context: Additional context information for logging
        """
        # Sanitize context to prevent API key exposure
        sanitized_context = APIKeySecurityValidator.sanitize_dict_values(context, self.api_key)
        
        # Start timing and log request initiation
        start_time = self.metrics.record_request_start()
        request_id = str(uuid.uuid4())[:8]
        
        self.logger.info(f"[{request_id}] Starting {operation}", extra={
            'operation': operation,
            'request_id': request_id,
            'timestamp': datetime.utcnow().isoformat(),
            'context': sanitized_context
        })
        
        try:
            yield {
                'request_id': request_id,
                'start_time': start_time,
                'logger': self.logger,
                'metrics': self.metrics
            }
            
        except Exception as e:
            # Record error metrics and log structured error information
            error_type = type(e).__name__
            error_message = str(e)
            
            # Sanitize error message to prevent API key exposure
            sanitized_error = APIKeySecurityValidator.sanitize_error_message(error_message, self.api_key)
            
            # Extract error code if available
            error_code = None
            if "OpenRouter API error" in error_message and "(" in error_message and ")" in error_message:
                try:
                    start = error_message.find("(") + 1
                    end = error_message.find(")")
                    error_code = error_message[start:end]
                except Exception:
                    pass
            
            response_time = self.metrics.record_error(start_time, error_type, error_code)
            
            self.logger.error(f"[{request_id}] {operation} failed", extra={
                'operation': operation,
                'request_id': request_id,
                'timestamp': datetime.utcnow().isoformat(),
                'error': {
                    'type': error_type,
                    'message': sanitized_error,
                    'code': error_code
                },
                'performance': {
                    'response_time_seconds': round(response_time, 3)
                },
                'context': sanitized_context
            })
            
            # Re-raise the exception to maintain normal error handling flow
            raise
    
    def log_api_success(self, request_id: str, operation: str, start_time: float, 
                       response_metadata: Dict[str, Any] = None, **context):
        """
        Log successful API operation with performance metrics and response metadata.
        
        Args:
            request_id: Unique identifier for the request
            operation: Name of the operation that succeeded
            start_time: Start time of the operation
            response_metadata: Metadata from the API response
            **context: Additional context information
        """
        # Sanitize all inputs to prevent API key exposure
        sanitized_context = APIKeySecurityValidator.sanitize_dict_values(context, self.api_key)
        sanitized_metadata = APIKeySecurityValidator.sanitize_dict_values(response_metadata or {}, self.api_key)
        
        # Record success metrics
        model = sanitized_metadata.get('model')
        token_usage = sanitized_metadata.get('usage', {})
        response_time = self.metrics.record_success(start_time, model, token_usage)
        
        self.logger.info(f"[{request_id}] {operation} completed successfully", extra={
            'operation': operation,
            'request_id': request_id,
            'timestamp': datetime.utcnow().isoformat(),
            'performance': {
                'response_time_seconds': round(response_time, 3)
            },
            'response': {
                'model': model,
                'finish_reason': sanitized_metadata.get('finish_reason'),
                'token_usage': token_usage
            },
            'context': sanitized_context
        })
    
    def log_metrics_summary(self, interval_minutes: int = 60):
        """
        Log comprehensive metrics summary for monitoring and analytics.
        
        Args:
            interval_minutes: Time interval for the metrics summary
        """
        metrics_summary = self.metrics.get_metrics_summary()
        
        self.logger.info(f"OpenRouter metrics summary ({interval_minutes}min interval)", extra={
            'timestamp': datetime.utcnow().isoformat(),
            'interval_minutes': interval_minutes,
            'metrics': metrics_summary
        })
    
    def log_configuration_info(self, config_info: Dict[str, Any]):
        """
        Log configuration information at startup (with API key sanitized).
        
        Args:
            config_info: Configuration information to log
        """
        # Sanitize configuration info to prevent API key exposure
        sanitized_config = APIKeySecurityValidator.sanitize_dict_values(config_info, self.api_key)
        
        self.logger.info("OpenRouter configuration loaded", extra={
            'timestamp': datetime.utcnow().isoformat(),
            'configuration': sanitized_config
        })
    
    def log_health_check(self, status: str, details: Dict[str, Any] = None):
        """
        Log health check results for monitoring.
        
        Args:
            status: Health check status ('healthy', 'unhealthy', 'degraded')
            details: Additional health check details
        """
        # Sanitize details to prevent API key exposure
        sanitized_details = APIKeySecurityValidator.sanitize_dict_values(details or {}, self.api_key)
        
        log_level = logging.INFO if status == 'healthy' else logging.WARNING
        
        self.logger.log(log_level, f"OpenRouter health check: {status}", extra={
            'timestamp': datetime.utcnow().isoformat(),
            'health_status': status,
            'details': sanitized_details
        })

# Initialize global structured logger for OpenRouter operations
openrouter_structured_logger = None

# OpenRouter Configuration
ENABLE_OPENROUTER = os.getenv("ENABLE_OPENROUTER", "true").lower() in ("1", "true", "yes")

# ───────────────── API KEY SECURITY VALIDATOR ─────────────────
class APIKeySecurityValidator:
    """
    Comprehensive API key security validation to ensure credentials are never exposed.
    
    This class implements security measures to protect the OpenRouter API key from being
    exposed in logs, error messages, or any other outputs throughout the system.
    
    Requirements: 7.1, 7.4
    """
    
    @staticmethod
    def sanitize_log_message(message: str, api_key: str) -> str:
        """
        Remove API key from log messages to prevent credential exposure.
        
        Args:
            message: The log message that might contain the API key
            api_key: The API key to remove from the message
            
        Returns:
            Sanitized message with API key replaced by placeholder
        """
        if not api_key or not message:
            return message
        
        # Replace full API key with placeholder
        sanitized = message.replace(api_key, "[API_KEY_REDACTED]")
        
        # Also handle partial key exposure (first/last few characters)
        if len(api_key) > 10:
            # Replace patterns like showing first 4 and last 4 characters
            prefix = api_key[:4]
            suffix = api_key[-4:]
            partial_pattern = f"{prefix}...{suffix}"
            sanitized = sanitized.replace(partial_pattern, "[API_KEY_REDACTED]")
            
            # Replace just the prefix or suffix if they appear
            sanitized = sanitized.replace(prefix, "[REDACTED]")
            sanitized = sanitized.replace(suffix, "[REDACTED]")
        
        return sanitized
    
    @staticmethod
    def sanitize_error_message(error_message: str, api_key: str) -> str:
        """
        Remove API key from error messages to prevent credential exposure.
        
        Args:
            error_message: The error message that might contain the API key
            api_key: The API key to remove from the message
            
        Returns:
            Sanitized error message with API key replaced by placeholder
        """
        if not api_key or not error_message:
            return error_message
        
        # Use the same sanitization logic as log messages
        return APIKeySecurityValidator.sanitize_log_message(error_message, api_key)
    
    @staticmethod
    def sanitize_dict_values(data: Dict[str, Any], api_key: str) -> Dict[str, Any]:
        """
        Recursively sanitize dictionary values to remove API key exposure.
        
        Args:
            data: Dictionary that might contain the API key in values
            api_key: The API key to remove from values
            
        Returns:
            Dictionary with API key values replaced by placeholder
        """
        if not api_key or not isinstance(data, dict):
            return data
        
        sanitized = {}
        for key, value in data.items():
            if isinstance(value, str):
                sanitized[key] = APIKeySecurityValidator.sanitize_log_message(value, api_key)
            elif isinstance(value, dict):
                sanitized[key] = APIKeySecurityValidator.sanitize_dict_values(value, api_key)
            elif isinstance(value, list):
                sanitized[key] = [
                    APIKeySecurityValidator.sanitize_log_message(item, api_key) if isinstance(item, str)
                    else APIKeySecurityValidator.sanitize_dict_values(item, api_key) if isinstance(item, dict)
                    else item
                    for item in value
                ]
            else:
                sanitized[key] = value
        
        return sanitized
    
    @staticmethod
    def validate_no_key_exposure(text: str, api_key: str) -> bool:
        """
        Validate that a text string does not contain the API key.
        
        Args:
            text: Text to check for API key exposure
            api_key: The API key to check for
            
        Returns:
            True if no API key is found, False if API key is exposed
        """
        if not api_key or not text:
            return True
        
        # Check for full API key
        if api_key in text:
            return False
        
        # Check for significant partial key exposure (at least 12 consecutive characters)
        # This focuses on meaningful exposure while avoiding false positives
        if len(api_key) > 20:
            for i in range(len(api_key) - 11):
                substring = api_key[i:i+12]  # 12 consecutive characters
                # Only flag if it's a meaningful substring (not all same character)
                if len(set(substring)) > 2 and substring in text:
                    return False
        
        return True
    
    @staticmethod
    def create_secure_logger(name: str, api_key: str) -> logging.Logger:
        """
        Create a logger that automatically sanitizes API key from all log messages.
        
        Args:
            name: Logger name
            api_key: API key to sanitize from log messages
            
        Returns:
            Logger instance with API key sanitization
        """
        logger = logging.getLogger(name)
        
        # Create a custom handler that sanitizes messages
        class SecureHandler(logging.StreamHandler):
            def __init__(self, api_key: str):
                super().__init__()
                self.api_key = api_key
            
            def emit(self, record):
                # Sanitize the log message before emitting
                if hasattr(record, 'msg') and isinstance(record.msg, str):
                    record.msg = APIKeySecurityValidator.sanitize_log_message(record.msg, self.api_key)
                
                # Sanitize arguments if present
                if hasattr(record, 'args') and record.args:
                    sanitized_args = []
                    for arg in record.args:
                        if isinstance(arg, str):
                            sanitized_args.append(APIKeySecurityValidator.sanitize_log_message(arg, self.api_key))
                        else:
                            sanitized_args.append(arg)
                    record.args = tuple(sanitized_args)
                
                # Also sanitize the formatted message
                try:
                    formatted_msg = record.getMessage()
                    sanitized_formatted = APIKeySecurityValidator.sanitize_log_message(formatted_msg, self.api_key)
                    # Override the message formatting
                    record.msg = sanitized_formatted
                    record.args = ()
                except Exception:
                    # If formatting fails, just sanitize the original message
                    pass
                
                super().emit(record)
        
        # Remove existing handlers and add secure handler
        logger.handlers.clear()
        secure_handler = SecureHandler(api_key)
        secure_handler.setLevel(logging.DEBUG)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        secure_handler.setFormatter(formatter)
        logger.addHandler(secure_handler)
        logger.setLevel(logging.DEBUG)
        
        return logger

class OpenRouterConfig:
    def __init__(self, api_key_override: Optional[str] = None):
        self.api_key = self._load_api_key(api_key_override)
        self.base_url = "https://openrouter.ai/api/v1"
        self.model = "qwen/qwen3-vl-235b-a22b-thinking"  # Upstage Solar Pro 3 Free model - optimized for STEM education
        self.timeout = 60
        self.max_retries = 3
        
        # Create secure logger that sanitizes API key from all messages
        self.secure_logger = APIKeySecurityValidator.create_secure_logger(
            "openrouter-config", self.api_key
        )
    
    def _load_api_key(self, override: Optional[str] = None) -> str:
        """Load and validate OpenRouter API key from environment or override"""
        if override:
            api_key = override
        else:
            api_key = os.getenv("OPENROUTER_API_KEY")
            if not api_key:
                # Use the provided key as fallback if no environment variable is set
                api_key = "REDACTED_SECRET"
        
        if not api_key:
            # Use secure error message that doesn't expose any credential information
            error_msg = "OPENROUTER_API_KEY environment variable is required"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        if not api_key.startswith("sk-or-v1-"):
            # Sanitize the error message to prevent API key exposure
            sanitized_key = f"{api_key[:8]}..." if len(api_key) > 8 else "[INVALID_KEY]"
            error_msg = f"Invalid OpenRouter API key format. Must start with 'sk-or-v1-'. Received: {sanitized_key}"
            # Log the error without exposing the actual key
            secure_error_msg = "Invalid OpenRouter API key format. Must start with 'sk-or-v1-'"
            logger.error(secure_error_msg)
            raise ValueError(secure_error_msg)
        
        return api_key
    
    def validate(self) -> bool:
        """Validate configuration is complete and valid"""
        try:
            self._load_api_key()
            return True
        except ValueError as e:
            # Ensure error message doesn't expose API key
            sanitized_error = APIKeySecurityValidator.sanitize_error_message(str(e), self.api_key)
            logger.error(f"OpenRouter configuration validation failed: {sanitized_error}")
            return False
    
    def get_sanitized_config_info(self) -> Dict[str, Any]:
        """
        Get configuration information with API key sanitized for logging/debugging.
        
        Returns:
            Dictionary with configuration info and sanitized API key
        """
        return {
            "base_url": self.base_url,
            "model": self.model,
            "timeout": self.timeout,
            "max_retries": self.max_retries,
            "api_key_configured": bool(self.api_key),
            "api_key_prefix": self.api_key[:8] + "..." if self.api_key and len(self.api_key) > 8 else "[NOT_SET]"
        }

# Initialize OpenRouter configuration
try:
    openrouter_config = OpenRouterConfig()
    logger.info("OpenRouter configuration initialized successfully")
    
    # Initialize structured logger for OpenRouter operations
    openrouter_structured_logger = StructuredLogger("openrouter-operations", openrouter_config.api_key)
    
    # Log configuration information at startup
    config_info = openrouter_config.get_sanitized_config_info()
    openrouter_structured_logger.log_configuration_info(config_info)
    
except ValueError as e:
    logger.error(f"Failed to initialize OpenRouter configuration: {e}")
    openrouter_config = None
    openrouter_structured_logger = None

# ───────────────── APP INIT ─────────────────
app = FastAPI(title="STEM Idea Generator API")
api = APIRouter(prefix="/api")

# ───────────────── STRUCTURED LOGGING MIDDLEWARE ─────────────────
from backend.infrastructure.logging_middleware import LoggingMiddleware
from backend.infrastructure.structured_logger import configure_log_aggregation

# Configure log aggregation (CloudWatch, Datadog, etc.)
configure_log_aggregation()

# Add logging middleware to automatically log all requests/responses
app.add_middleware(LoggingMiddleware)

# ───────────────── MONITORING INFRASTRUCTURE ─────────────────
# Initialize Sentry for error tracking
from backend.infrastructure.sentry_config import init_sentry

try:
    init_sentry(
        environment=os.getenv("ENVIRONMENT", "development"),
        release="1.0.0",
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
        enable_tracing=os.getenv("ENABLE_TRACING", "true").lower() in ("1", "true", "yes")
    )
    logger.info("Sentry error tracking initialized")
except Exception as e:
    logger.warning(f"Sentry initialization skipped: {e}")

# Initialize OpenTelemetry for distributed tracing
try:
    from backend.infrastructure.tracing import init_tracing
    init_tracing(
        service_name="stem-project-generator",
        service_version="1.0.0",
        otlp_endpoint=os.getenv("OTLP_ENDPOINT"),
        enable_console_export=os.getenv("ENABLE_CONSOLE_TRACING", "false").lower() in ("1", "true", "yes"),
        sample_rate=float(os.getenv("TRACING_SAMPLE_RATE", "1.0"))
    )
    logger.info("OpenTelemetry distributed tracing initialized")
except Exception as e:
    logger.warning(f"OpenTelemetry initialization skipped: {e}")

# Initialize monitoring service
from backend.infrastructure.monitoring_service import initialize_monitoring_service
from backend.infrastructure.monitoring_endpoints import monitoring_router
from backend.infrastructure.metrics import metrics

try:
    # Note: db_pool and redis_client will be initialized later in the application lifecycle
    # The monitoring service will be updated with these dependencies when they become available
    monitoring_service = initialize_monitoring_service(
        db_pool=None,  # Will be set later via dependency injection
        redis_client=None,  # Will be set later via dependency injection
        service_registry=None,  # Will be set later via dependency injection
        metrics_collector=metrics
    )
    
    # Register monitoring endpoints
    app.include_router(monitoring_router)
    logger.info("Monitoring infrastructure initialized - endpoints: /health, /health/detailed, /metrics")
except Exception as e:
    logger.error(f"Failed to initialize monitoring infrastructure: {e}")

# ───────────────── MODELS ─────────────────
class ProjectParams(BaseModel):
    projectType: str
    skillLevel: str
    interests: Optional[str] = ""
    budget: Optional[str] = ""
    duration: Optional[str] = ""

class GeneratedProject(BaseModel):
    title: str
    description: str
    difficulty: str
    estimatedTime: str
    estimatedCost: str
    components: List[str]
    skills: List[str]
    steps: List[str]

# ───────────────── OPENROUTER CLIENT ─────────────────
import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type, before_sleep_log
from typing import Dict, Any

# ───────────────── ERROR RESPONSE MAPPING ─────────────────
class OpenRouterErrorMapper:
    """
    Maps OpenRouter error codes to appropriate HTTP status codes and meaningful error messages.
    Ensures error responses are properly formatted for frontend consumption.
    
    Requirements: 5.3, 5.4
    """
    
    # OpenRouter error code to HTTP status code mapping
    ERROR_CODE_MAPPING = {
        # Authentication errors
        'invalid_api_key': 401,
        'authentication_error': 401,
        'invalid_request_error': 400,
        'permission_denied': 403,
        'insufficient_quota': 402,  # Payment required
        'quota_exceeded': 429,      # Too many requests
        
        # Request validation errors
        'invalid_request': 400,
        'validation_error': 422,
        'unsupported_model': 400,
        'model_not_found': 404,
        'context_length_exceeded': 413,  # Payload too large
        'max_tokens_exceeded': 413,
        
        # Rate limiting
        'rate_limit_exceeded': 429,
        'requests_per_minute_limit_exceeded': 429,
        'tokens_per_minute_limit_exceeded': 429,
        
        # Service errors
        'internal_server_error': 500,
        'service_unavailable': 503,
        'model_overloaded': 503,
        'timeout': 504,
        'bad_gateway': 502,
        
        # Network and connection errors
        'network_error': 502,
        'connection_error': 502,
        'upstream_error': 502,
        
        # Default fallback
        'unknown_error': 500
    }
    
    # User-friendly error messages for frontend consumption
    ERROR_MESSAGE_MAPPING = {
        # Authentication errors
        'invalid_api_key': 'Invalid authentication key. Please check your configuration.',
        'authentication_error': 'Authentication failed. Please verify your credentials.',
        'permission_denied': 'Access denied. Your account does not have permission for this operation.',
        'insufficient_quota': 'Insufficient account quota. Please check your account balance.',
        'quota_exceeded': 'Account quota exceeded. Please try again later or upgrade your plan.',
        
        # Request validation errors
        'invalid_request': 'Invalid request format. Please check your input parameters.',
        'validation_error': 'Request validation failed. Please verify your input data.',
        'unsupported_model': 'The requested model is not supported. Please try a different model.',
        'model_not_found': 'The specified model was not found. Please check the model name.',
        'context_length_exceeded': 'Input text is too long. Please reduce the length of your request.',
        'max_tokens_exceeded': 'Maximum token limit exceeded. Please reduce your input or token limit.',
        
        # Rate limiting
        'rate_limit_exceeded': 'Rate limit exceeded. Please wait a moment before making another request.',
        'requests_per_minute_limit_exceeded': 'Too many requests per minute. Please slow down your request rate.',
        'tokens_per_minute_limit_exceeded': 'Token rate limit exceeded. Please reduce your usage rate.',
        
        # Service errors
        'internal_server_error': 'Internal server error occurred. Please try again in a few moments.',
        'service_unavailable': 'Service is temporarily unavailable. Please try again later.',
        'model_overloaded': 'The model is currently overloaded. Please try again in a few minutes.',
        'timeout': 'Request timed out. Please try again with a shorter input or try again later.',
        'bad_gateway': 'Service gateway error. Please try again in a few moments.',
        
        # Network and connection errors
        'network_error': 'Network connection error. Please check your internet connection and try again.',
        'connection_error': 'Failed to connect to service. Please try again in a few moments.',
        'upstream_error': 'Upstream service error. Please try again later.',
        
        # Default fallback
        'unknown_error': 'An unexpected error occurred. Please try again or contact support if the problem persists.'
    }
    
    @classmethod
    def map_error_response(cls, error_code: str, error_message: str = None, http_status: int = None) -> Dict[str, Any]:
        """
        Map OpenRouter error to appropriate HTTP status code and user-friendly message.
        
        Args:
            error_code: OpenRouter error code from the API response
            error_message: Original error message from OpenRouter (optional)
            http_status: HTTP status code from the response (optional)
            
        Returns:
            Dictionary containing mapped HTTP status code and user-friendly error message
        """
        # Normalize error code to lowercase for consistent mapping
        # Handle case where error_code might be an integer (HTTP status code)
        if isinstance(error_code, int):
            normalized_code = str(error_code)
        else:
            normalized_code = error_code.lower() if error_code else 'unknown_error'
        
        # Get mapped HTTP status code
        mapped_status = cls.ERROR_CODE_MAPPING.get(normalized_code)
        
        # If no mapping found, try to infer from HTTP status or use default
        if mapped_status is None:
            if http_status:
                mapped_status = http_status
            else:
                mapped_status = 500  # Default to internal server error
        
        # Get user-friendly error message
        user_message = cls.ERROR_MESSAGE_MAPPING.get(normalized_code)
        
        # If no user-friendly message found, create a generic one
        if user_message is None:
            if error_message:
                user_message = f"API error: {error_message}"
            else:
                user_message = cls.ERROR_MESSAGE_MAPPING['unknown_error']
        
        return {
            'status_code': mapped_status,
            'error_code': normalized_code,
            'message': user_message,
            'original_message': error_message,
            'retryable': cls._is_retryable_error(normalized_code, mapped_status)
        }
    
    @classmethod
    def _is_retryable_error(cls, error_code: str, status_code: int) -> bool:
        """
        Determine if an error is retryable based on error code and status.
        
        Args:
            error_code: Normalized error code
            status_code: HTTP status code
            
        Returns:
            True if the error is retryable, False otherwise
        """
        # Retryable error codes
        retryable_codes = {
            'rate_limit_exceeded',
            'requests_per_minute_limit_exceeded', 
            'tokens_per_minute_limit_exceeded',
            'service_unavailable',
            'model_overloaded',
            'timeout',
            'network_error',
            'connection_error',
            'upstream_error',
            'internal_server_error'
        }
        
        # Retryable HTTP status codes
        retryable_statuses = {429, 500, 502, 503, 504}
        
        return error_code in retryable_codes or status_code in retryable_statuses
    
    @classmethod
    def create_error_response(cls, error_code: str, error_message: str = None, http_status: int = None) -> JSONResponse:
        """
        Create a properly formatted JSONResponse for OpenRouter errors.
        
        Args:
            error_code: OpenRouter error code
            error_message: Original error message (optional)
            http_status: HTTP status code (optional)
            
        Returns:
            JSONResponse with appropriate status code and error details
        """
        error_info = cls.map_error_response(error_code, error_message, http_status)
        
        response_content = {
            'error': {
                'code': error_info['error_code'],
                'message': error_info['message'],
                'retryable': error_info['retryable']
            },
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'error'
        }
        
        # Include original message for debugging if available
        if error_info['original_message'] and error_info['original_message'] != error_info['message']:
            response_content['error']['details'] = error_info['original_message']
        
        return JSONResponse(
            status_code=error_info['status_code'],
            content=response_content
        )
    
    @classmethod
    def extract_openrouter_error(cls, response_data: Dict[str, Any]) -> tuple[str, str]:
        """
        Extract error code and message from OpenRouter API response.
        
        Args:
            response_data: Raw response data from OpenRouter API
            
        Returns:
            Tuple of (error_code, error_message)
        """
        if not isinstance(response_data, dict) or 'error' not in response_data:
            return 'unknown_error', 'Unknown error occurred'
        
        error_info = response_data['error']
        if not isinstance(error_info, dict):
            return 'unknown_error', str(error_info)
        
        error_code = error_info.get('code', 'unknown_error')
        error_message = error_info.get('message', 'No error message provided')
        
        return error_code, error_message

# ───────────────── RESPONSE ADAPTER ─────────────────
class ResponseAdapter:
    """
    Convert OpenRouter response format to match existing Gemini response structure.
    Ensures all existing response fields are preserved or mapped appropriately.
    
    Requirements: 3.3, 3.4
    """
    
    @staticmethod
    def adapt_openrouter_response(openrouter_response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert OpenRouter response format to match Gemini response format.
        
        The existing system expects the AI response to be a simple text string that contains
        JSON data for the GeneratedProject model. This adapter extracts the content from
        OpenRouter's structured response and formats it to maintain compatibility.
        
        Args:
            openrouter_response: Raw response dictionary from OpenRouter API
            
        Returns:
            Dictionary containing adapted response that matches expected format
            
        Raises:
            ValueError: If response format is invalid or cannot be adapted
        """
        if not isinstance(openrouter_response, dict):
            raise ValueError("OpenRouter response must be a dictionary")
        
        # Handle error responses
        if 'error' in openrouter_response:
            error_info = openrouter_response['error']
            error_message = error_info.get('message', 'Unknown error')
            error_code = error_info.get('code', 'unknown_error')
            raise ValueError(f"OpenRouter API error ({error_code}): {error_message}")
        
        # Validate required fields for successful response
        required_fields = ['choices']
        for field in required_fields:
            if field not in openrouter_response:
                raise ValueError(f"OpenRouter response missing required field: {field}")
        
        choices = openrouter_response['choices']
        if not isinstance(choices, list) or len(choices) == 0:
            raise ValueError("OpenRouter response must contain at least one choice")
        
        # Extract the content from the first choice
        first_choice = choices[0]
        if 'message' not in first_choice:
            raise ValueError("OpenRouter choice missing message field")
        
        message = first_choice['message']
        if 'content' not in message:
            raise ValueError("OpenRouter message missing content field")
        
        content = message['content']
        if not isinstance(content, str):
            raise ValueError("OpenRouter message content must be a string")
        
        # Create adapted response that maintains compatibility with existing system
        # The existing system expects a simple structure that can be processed by call_openrouter()
        adapted_response = {
            'text': content,  # Main content that will be processed
            'metadata': {
                'id': openrouter_response.get('id'),
                'model': openrouter_response.get('model'),
                'created': openrouter_response.get('created'),
                'finish_reason': first_choice.get('finish_reason'),
                'usage': openrouter_response.get('usage', {})
            }
        }
        
        # Preserve additional fields that might be present
        for field in ['object', 'system_fingerprint']:
            if field in openrouter_response:
                adapted_response['metadata'][field] = openrouter_response[field]
        
        return adapted_response
    
    @staticmethod
    def extract_generated_text(response: Dict[str, Any]) -> str:
        """
        Extract the generated text from adapted response.
        
        This method provides a clean interface for extracting the main content
        from an adapted response, maintaining compatibility with existing code.
        
        Args:
            response: Adapted response dictionary from adapt_openrouter_response()
            
        Returns:
            The generated text content as a string
            
        Raises:
            ValueError: If response format is invalid or text cannot be extracted
        """
        if not isinstance(response, dict):
            raise ValueError("Response must be a dictionary")
        
        if 'text' not in response:
            raise ValueError("Adapted response missing text field")
        
        text = response['text']
        if not isinstance(text, str):
            raise ValueError("Response text must be a string")
        
        return text
    
    @staticmethod
    def get_response_metadata(response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract metadata from adapted response.
        
        Args:
            response: Adapted response dictionary from adapt_openrouter_response()
            
        Returns:
            Dictionary containing response metadata
            
        Raises:
            ValueError: If response format is invalid
        """
        if not isinstance(response, dict):
            raise ValueError("Response must be a dictionary")
        
        if 'metadata' not in response:
            raise ValueError("Adapted response missing metadata field")
        
        return response['metadata']
    
    @staticmethod
    def validate_adapted_response(response: Dict[str, Any]) -> bool:
        """
        Validate that an adapted response has the correct structure.
        
        Args:
            response: Response dictionary to validate
            
        Returns:
            True if response is valid, False otherwise
        """
        try:
            # Check basic structure
            if not isinstance(response, dict):
                return False
            
            # Check required fields
            if 'text' not in response or 'metadata' not in response:
                return False
            
            # Validate text field
            if not isinstance(response['text'], str):
                return False
            
            # Validate metadata field
            if not isinstance(response['metadata'], dict):
                return False
            
            return True
            
        except Exception:
            return False

class OpenRouterClient:
    """
    HTTP client for OpenRouter API with session management, connection pooling, and timeout configuration.
    Implements proper authentication header handling and request/response management with API key security.
    """
    
    def __init__(self, config: OpenRouterConfig):
        """
        Initialize OpenRouter client with configuration.
        
        Args:
            config: OpenRouterConfig instance with API key and settings
        """
        self.config = config
        self.session = requests.Session()
        
        # Create secure logger that sanitizes API key from all messages
        self.secure_logger = APIKeySecurityValidator.create_secure_logger(
            "openrouter-client", config.api_key
        )
        
        # Configure connection pooling and timeout
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=10,  # Number of connection pools to cache
            pool_maxsize=20,      # Maximum number of connections to save in the pool
            max_retries=0         # We handle retries at a higher level
        )
        self.session.mount('https://', adapter)
        self.session.mount('http://', adapter)
        
        # Set default timeout for all requests
        self.session.timeout = config.timeout
        
        # Log initialization without exposing API key
        sanitized_config = config.get_sanitized_config_info()
        self.secure_logger.info(f"OpenRouterClient initialized with model: {sanitized_config['model']}, "
                               f"API key configured: {sanitized_config['api_key_configured']}")
    
    def _build_headers(self) -> Dict[str, str]:
        """
        Build authentication and content headers for OpenRouter API requests.
        
        Returns:
            Dictionary containing required headers with proper authentication
        """
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://stem-idea-generator.com",  # Optional for OpenRouter rankings
            "X-Title": "STEM Idea Generator"  # Optional for OpenRouter rankings
        }
        
        # Log header creation without exposing API key
        self.secure_logger.debug("Built authentication headers for OpenRouter API request")
        return headers
    
    def _build_request_body(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """
        Build OpenRouter-compatible request body from input parameters.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content' keys
            **kwargs: Additional parameters like temperature, max_tokens, etc.
            
        Returns:
            Dictionary containing the complete request body for OpenRouter API
            
        Raises:
            ValueError: If messages format is invalid or required parameters are missing
        """
        # Validate messages format
        if not messages or not isinstance(messages, list):
            raise ValueError("Messages must be a non-empty list")
        
        for i, message in enumerate(messages):
            if not isinstance(message, dict):
                raise ValueError(f"Message {i} must be a dictionary")
            if 'role' not in message or 'content' not in message:
                raise ValueError(f"Message {i} must have 'role' and 'content' fields")
            if message['role'] not in ['user', 'assistant', 'system']:
                raise ValueError(f"Message {i} has invalid role: {message['role']}")
            if not isinstance(message['content'], str) or not message['content'].strip():
                raise ValueError(f"Message {i} content must be a non-empty string")
        
        # Build the base request body with validated parameters
        request_body = {
            "model": kwargs.get("model", self.config.model),  # Allow model override via kwargs
            "messages": messages,
            "temperature": self._validate_temperature(kwargs.get("temperature", 0.7)),
            "max_tokens": self._validate_max_tokens(kwargs.get("max_tokens", 8000)),
            "stream": kwargs.get("stream", False)
        }
        
        # Add optional parameters with validation
        optional_params = {
            'top_p': self._validate_top_p,
            'frequency_penalty': self._validate_frequency_penalty,
            'presence_penalty': self._validate_presence_penalty,
            'stop': self._validate_stop_sequences,
            'seed': self._validate_seed
        }
        
        for param_name, validator in optional_params.items():
            if param_name in kwargs and kwargs[param_name] is not None:
                request_body[param_name] = validator(kwargs[param_name])
        
        # Log request details without exposing sensitive information
        self.secure_logger.debug(f"Built request body with {len(messages)} messages and {len(request_body)} parameters")
        return request_body
    
    def _validate_temperature(self, temperature: float) -> float:
        """Validate temperature parameter (0.0 to 2.0)"""
        if not isinstance(temperature, (int, float)):
            raise ValueError("Temperature must be a number")
        if not 0.0 <= temperature <= 2.0:
            raise ValueError("Temperature must be between 0.0 and 2.0")
        return float(temperature)
    
    def _validate_max_tokens(self, max_tokens: int) -> int:
        """Validate max_tokens parameter (1 to 16000 for Upstage Solar Pro)"""
        if not isinstance(max_tokens, int):
            raise ValueError("max_tokens must be an integer")
        if not 1 <= max_tokens <= 16000:
            raise ValueError("max_tokens must be between 1 and 16000")
        return max_tokens
    
    def _validate_top_p(self, top_p: float) -> float:
        """Validate top_p parameter (0.0 to 1.0)"""
        if not isinstance(top_p, (int, float)):
            raise ValueError("top_p must be a number")
        if not 0.0 <= top_p <= 1.0:
            raise ValueError("top_p must be between 0.0 and 1.0")
        return float(top_p)
    
    def _validate_frequency_penalty(self, penalty: float) -> float:
        """Validate frequency_penalty parameter (-2.0 to 2.0)"""
        if not isinstance(penalty, (int, float)):
            raise ValueError("frequency_penalty must be a number")
        if not -2.0 <= penalty <= 2.0:
            raise ValueError("frequency_penalty must be between -2.0 and 2.0")
        return float(penalty)
    
    def _validate_presence_penalty(self, penalty: float) -> float:
        """Validate presence_penalty parameter (-2.0 to 2.0)"""
        if not isinstance(penalty, (int, float)):
            raise ValueError("presence_penalty must be a number")
        if not -2.0 <= penalty <= 2.0:
            raise ValueError("presence_penalty must be between -2.0 and 2.0")
        return float(penalty)
    
    def _validate_stop_sequences(self, stop: Any) -> Any:
        """Validate stop sequences parameter"""
        if isinstance(stop, str):
            return stop
        elif isinstance(stop, list):
            if len(stop) > 4:
                raise ValueError("Maximum 4 stop sequences allowed")
            for seq in stop:
                if not isinstance(seq, str):
                    raise ValueError("Stop sequences must be strings")
            return stop
        else:
            raise ValueError("Stop must be a string or list of strings")
    
    def _validate_seed(self, seed: int) -> int:
        """Validate seed parameter"""
        if not isinstance(seed, int):
            raise ValueError("Seed must be an integer")
        return seed
    
    def _parse_response(self, response_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse and validate OpenRouter API response.
        
        Args:
            response_data: Raw response dictionary from OpenRouter API
            
        Returns:
            Validated and structured response data
            
        Raises:
            ValueError: If response format is invalid or missing required fields
        """
        # Validate basic response structure
        if not isinstance(response_data, dict):
            raise ValueError("Response must be a dictionary")
        
        # Check for error responses first
        if 'error' in response_data:
            error_info = response_data['error']
            error_message = error_info.get('message', 'Unknown error')
            error_code = error_info.get('code', 'unknown_error')
            error_type = error_info.get('type', 'api_error')
            raise ValueError(f"OpenRouter API error ({error_code}): {error_message} (type: {error_type})")
        
        # Validate successful response structure
        required_fields = ['id', 'object', 'created', 'model', 'choices']
        for field in required_fields:
            if field not in response_data:
                raise ValueError(f"Response missing required field: {field}")
        
        # Validate response object type
        if response_data['object'] != 'chat.completion':
            raise ValueError(f"Unexpected response object type: {response_data['object']}")
        
        # Validate choices array
        choices = response_data['choices']
        if not isinstance(choices, list) or len(choices) == 0:
            raise ValueError("Response must contain at least one choice")
        
        # Validate first choice structure
        first_choice = choices[0]
        choice_required_fields = ['index', 'message', 'finish_reason']
        for field in choice_required_fields:
            if field not in first_choice:
                raise ValueError(f"Choice missing required field: {field}")
        
        # Validate message structure
        message = first_choice['message']
        message_required_fields = ['role', 'content']
        for field in message_required_fields:
            if field not in message:
                raise ValueError(f"Message missing required field: {field}")
        
        # Validate message role
        if message['role'] != 'assistant':
            raise ValueError(f"Unexpected message role: {message['role']}")
        
        # Validate content is not empty
        content = message['content']
        if not isinstance(content, str):
            raise ValueError("Message content must be a string")
        
        # Log successful parsing without exposing sensitive content
        self.secure_logger.debug(f"Successfully parsed response with {len(choices)} choices, "
                    f"content length: {len(content)} characters")
        
        return response_data
    
    def _extract_content(self, parsed_response: Dict[str, Any]) -> str:
        """
        Extract the generated content from a parsed response.
        
        Args:
            parsed_response: Validated response data from _parse_response
            
        Returns:
            The generated text content
        """
        try:
            content = parsed_response['choices'][0]['message']['content']
            # Log content extraction without exposing the actual content
            self.secure_logger.debug(f"Extracted content: {len(content)} characters")
            return content
        except (KeyError, IndexError) as e:
            raise ValueError(f"Failed to extract content from response: {e}")
    
    def _extract_metadata(self, parsed_response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract metadata from a parsed response.
        
        Args:
            parsed_response: Validated response data from _parse_response
            
        Returns:
            Dictionary containing response metadata
        """
        metadata = {
            'id': parsed_response.get('id'),
            'model': parsed_response.get('model'),
            'created': parsed_response.get('created'),
            'finish_reason': parsed_response['choices'][0].get('finish_reason'),
            'usage': parsed_response.get('usage', {})
        }
        
        # Add token usage information if available
        usage = parsed_response.get('usage', {})
        metadata['token_usage'] = {
            'prompt_tokens': usage.get('prompt_tokens', 0),
            'completion_tokens': usage.get('completion_tokens', 0),
            'total_tokens': usage.get('total_tokens', 0)
        }
        
        # Log metadata extraction without exposing sensitive information
        self.secure_logger.debug(f"Extracted metadata with {len(metadata)} fields")
        return metadata
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=4, min=4, max=10),
        retry=retry_if_exception_type((
            requests.exceptions.RequestException,
            requests.exceptions.Timeout,
            requests.exceptions.ConnectionError,
            requests.exceptions.HTTPError
        )),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True
    )
    async def generate_completion(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """
        Make HTTP request to OpenRouter chat completions endpoint with retry logic.
        
        Implements 3-attempt retry with exponential backoff (4s, 8s, 10s) to handle:
        - Rate limiting from OpenRouter API
        - Network timeouts and connection errors
        - Temporary service unavailability
        
        Args:
            messages: List of message dictionaries for the conversation
            **kwargs: Additional parameters for the API request
            
        Returns:
            Dictionary containing the parsed and validated API response
            
        Raises:
            requests.RequestException: For HTTP-related errors after all retries exhausted
            ValueError: For invalid response format or API errors
            
        Requirements: 5.1, 5.2, 5.5
        """
        # Use structured logging for comprehensive API request tracking
        global openrouter_structured_logger
        if openrouter_structured_logger:
            with openrouter_structured_logger.log_api_request(
                "openrouter_chat_completion",
                message_count=len(messages),
                model=self.config.model,
                parameters=list(kwargs.keys())
            ) as log_context:
                return await self._execute_request_with_logging(messages, log_context, **kwargs)
        else:
            # Fallback to basic logging if structured logger not available
            return await self._execute_request_basic(messages, **kwargs)
    
    async def _execute_request_with_logging(self, messages: List[Dict[str, str]], 
                                          log_context: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Execute request with structured logging context"""
        headers = self._build_headers()
        request_body = self._build_request_body(messages, **kwargs)
        
        request_id = log_context['request_id']
        start_time = log_context['start_time']
        structured_logger = log_context['logger']
        
        # Log detailed request information
        structured_logger.debug(f"[{request_id}] Sending request to OpenRouter", extra={
            'request_id': request_id,
            'endpoint': f"{self.config.base_url}/chat/completions",
            'method': 'POST',
            'headers': {k: v for k, v in headers.items() if k != 'Authorization'},  # Exclude auth header
            'body_keys': list(request_body.keys()),
            'message_count': len(messages),
            'model': request_body.get('model')
        })
        
        try:
            response = self.session.post(
                f"{self.config.base_url}/chat/completions",
                headers=headers,
                json=request_body,
                timeout=self.config.timeout
            )
            
            # Log response status
            structured_logger.debug(f"[{request_id}] Received response", extra={
                'request_id': request_id,
                'status_code': response.status_code,
                'response_headers': dict(response.headers),
                'response_size_bytes': len(response.content) if response.content else 0
            })
            
            if response.status_code == 200:
                raw_response = response.json()
                
                # Parse and validate the response
                parsed_response = self._parse_response(raw_response)
                
                # Extract metadata for logging
                metadata = self._extract_metadata(parsed_response)
                
                # Log successful completion with structured logging
                global openrouter_structured_logger
                if openrouter_structured_logger:
                    openrouter_structured_logger.log_api_success(
                        request_id, "openrouter_chat_completion", start_time, metadata,
                        content_length=len(self._extract_content(parsed_response))
                    )
                
                return parsed_response
                
            elif response.status_code == 429:
                # Rate limiting - this will trigger retry with exponential backoff
                structured_logger.warning(f"[{request_id}] Rate limit exceeded, will retry", extra={
                    'request_id': request_id,
                    'status_code': response.status_code,
                    'retry_after': response.headers.get('Retry-After'),
                    'rate_limit_info': {
                        'limit': response.headers.get('X-RateLimit-Limit'),
                        'remaining': response.headers.get('X-RateLimit-Remaining'),
                        'reset': response.headers.get('X-RateLimit-Reset')
                    }
                })
                response.raise_for_status()
                
            elif response.status_code in [502, 503, 504]:
                # Service unavailable - this will trigger retry
                structured_logger.warning(f"[{request_id}] Service unavailable, will retry", extra={
                    'request_id': request_id,
                    'status_code': response.status_code,
                    'service_status': 'unavailable'
                })
                response.raise_for_status()
                
            elif response.status_code in [400, 401, 403, 422]:
                # Client errors - these should not trigger retry
                # Parse and log error details
                try:
                    error_data = response.json()
                    sanitized_error_data = APIKeySecurityValidator.sanitize_dict_values(error_data, self.config.api_key)
                    error_code, error_message = OpenRouterErrorMapper.extract_openrouter_error(sanitized_error_data)
                    
                    structured_logger.error(f"[{request_id}] Client error from OpenRouter", extra={
                        'request_id': request_id,
                        'status_code': response.status_code,
                        'error_code': error_code,
                        'error_message': error_message,
                        'error_type': 'client_error'
                    })
                    
                    # Create mapped error info for consistent handling
                    error_info = OpenRouterErrorMapper.map_error_response(error_code, error_message, response.status_code)
                    raise ValueError(f"OpenRouter API error ({error_info['error_code']}): {error_info['message']}")
                    
                except (ValueError, KeyError, json.JSONDecodeError) as parse_error:
                    sanitized_response_text = APIKeySecurityValidator.sanitize_error_message(response.text, self.config.api_key)
                    
                    structured_logger.error(f"[{request_id}] Failed to parse error response", extra={
                        'request_id': request_id,
                        'status_code': response.status_code,
                        'parse_error': str(parse_error),
                        'response_preview': sanitized_response_text[:200]
                    })
                    
                    error_info = OpenRouterErrorMapper.map_error_response('unknown_error', sanitized_response_text, response.status_code)
                    raise ValueError(f"OpenRouter API error ({response.status_code}): {error_info['message']}")
            else:
                # Handle other HTTP error responses with retry
                sanitized_error_text = APIKeySecurityValidator.sanitize_error_message(response.text, self.config.api_key)
                
                structured_logger.error(f"[{request_id}] HTTP error from OpenRouter", extra={
                    'request_id': request_id,
                    'status_code': response.status_code,
                    'error_type': 'http_error',
                    'response_preview': sanitized_error_text[:200]
                })
                
                response.raise_for_status()
                
        except requests.exceptions.Timeout as e:
            structured_logger.warning(f"[{request_id}] Request timeout", extra={
                'request_id': request_id,
                'timeout_seconds': self.config.timeout,
                'error_type': 'timeout'
            })
            raise
            
        except requests.exceptions.ConnectionError as e:
            structured_logger.warning(f"[{request_id}] Connection error", extra={
                'request_id': request_id,
                'error_type': 'connection_error',
                'error_details': str(e)
            })
            raise
            
        except requests.exceptions.RequestException as e:
            structured_logger.error(f"[{request_id}] Request exception", extra={
                'request_id': request_id,
                'error_type': 'request_exception',
                'error_details': str(e)
            })
            raise
    
    async def _execute_request_basic(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """Fallback method with basic logging when structured logger is not available"""
        headers = self._build_headers()
        request_body = self._build_request_body(messages, **kwargs)
        
        # Log API call without exposing sensitive information
        self.secure_logger.info(f"Making OpenRouter API call to: {self.config.base_url}/chat/completions")
        
        # Create sanitized request body for logging (remove any potential API key exposure)
        sanitized_request_body = APIKeySecurityValidator.sanitize_dict_values(request_body, self.config.api_key)
        self.secure_logger.debug(f"Request body parameters: {list(sanitized_request_body.keys())}")
        
        try:
            response = self.session.post(
                f"{self.config.base_url}/chat/completions",
                headers=headers,
                json=request_body,
                timeout=self.config.timeout
            )
            
            self.secure_logger.info(f"OpenRouter response status: {response.status_code}")
            
            if response.status_code == 200:
                raw_response = response.json()
                
                # Sanitize response for logging to prevent any API key exposure
                sanitized_response = APIKeySecurityValidator.sanitize_dict_values(raw_response, self.config.api_key)
                self.secure_logger.debug(f"Raw OpenRouter response keys: {list(sanitized_response.keys())}")
                
                # Parse and validate the response
                parsed_response = self._parse_response(raw_response)
                
                # Return the validated response
                return parsed_response
            elif response.status_code == 429:
                # Rate limiting - this will trigger retry with exponential backoff
                self.secure_logger.warning(f"OpenRouter API rate limit exceeded (429), will retry with backoff")
                response.raise_for_status()
            elif response.status_code in [502, 503, 504]:
                # Service unavailable - this will trigger retry
                self.secure_logger.warning(f"OpenRouter API service unavailable ({response.status_code}), will retry")
                response.raise_for_status()
            elif response.status_code in [400, 401, 403, 422]:
                # Client errors - these should not trigger retry
                # Sanitize error response to prevent API key exposure
                sanitized_error_text = APIKeySecurityValidator.sanitize_error_message(response.text, self.config.api_key)
                self.secure_logger.error(f"OpenRouter API client error: {response.status_code} - {sanitized_error_text}")
                
                # Try to parse error response and map it appropriately
                try:
                    error_data = response.json()
                    # Sanitize error data before processing
                    sanitized_error_data = APIKeySecurityValidator.sanitize_dict_values(error_data, self.config.api_key)
                    error_code, error_message = OpenRouterErrorMapper.extract_openrouter_error(sanitized_error_data)
                    
                    # Create mapped error info for consistent handling
                    error_info = OpenRouterErrorMapper.map_error_response(error_code, error_message, response.status_code)
                    
                    # Log the mapped error for debugging (already sanitized)
                    self.secure_logger.error(f"Mapped OpenRouter error - Code: {error_info['error_code']}, "
                               f"Status: {error_info['status_code']}, Message: {error_info['message']}")
                    
                    # Raise ValueError with mapped message for consistent error handling
                    raise ValueError(f"OpenRouter API error ({error_info['error_code']}): {error_info['message']}")
                    
                except (ValueError, KeyError, json.JSONDecodeError) as parse_error:
                    # If we can't parse the error response, create a generic mapped error
                    self.secure_logger.warning(f"Failed to parse OpenRouter error response: {parse_error}")
                    sanitized_response_text = APIKeySecurityValidator.sanitize_error_message(response.text, self.config.api_key)
                    error_info = OpenRouterErrorMapper.map_error_response('unknown_error', sanitized_response_text, response.status_code)
                    raise ValueError(f"OpenRouter API error ({response.status_code}): {error_info['message']}")
            else:
                # Handle other HTTP error responses with retry
                sanitized_error_text = APIKeySecurityValidator.sanitize_error_message(response.text, self.config.api_key)
                self.secure_logger.error(f"OpenRouter API HTTP error: {response.status_code} - {sanitized_error_text}")
                
                # Map the error for consistent handling even for retryable errors
                try:
                    error_data = response.json()
                    sanitized_error_data = APIKeySecurityValidator.sanitize_dict_values(error_data, self.config.api_key)
                    error_code, error_message = OpenRouterErrorMapper.extract_openrouter_error(sanitized_error_data)
                    error_info = OpenRouterErrorMapper.map_error_response(error_code, error_message, response.status_code)
                    
                    self.secure_logger.warning(f"Retryable OpenRouter error - Code: {error_info['error_code']}, "
                                 f"Retryable: {error_info['retryable']}")
                except:
                    # If parsing fails, still attempt retry for server errors
                    pass
                
                response.raise_for_status()
                
        except requests.exceptions.Timeout:
            self.secure_logger.error(f"OpenRouter API request timed out after {self.config.timeout} seconds")
            raise
        except requests.exceptions.ConnectionError:
            self.secure_logger.error("Failed to connect to OpenRouter API")
            raise
        except requests.exceptions.RequestException as e:
            # Sanitize exception message to prevent API key exposure
            sanitized_error = APIKeySecurityValidator.sanitize_error_message(str(e), self.config.api_key)
            self.secure_logger.error(f"OpenRouter API request failed: {sanitized_error}")
            raise
    
    def close(self):
        """Close the HTTP session and clean up resources."""
        if self.session:
            self.session.close()
            self.secure_logger.info("OpenRouter client session closed")

# ───────────────── OPENROUTER HEALTH CHECK ─────────────────
class OpenRouterHealthCheck:
    """
    Health check system for OpenRouter connectivity and service availability.
    Implements startup validation and periodic health monitoring.
    
    Requirements: 2.2
    """
    
    def __init__(self, config: OpenRouterConfig, client: OpenRouterClient):
        self.config = config
        self.client = client
        self.last_health_check = None
        self.health_status = "unknown"
        self.health_details = {}
        
        # Create secure logger for health checks
        self.secure_logger = APIKeySecurityValidator.create_secure_logger(
            "openrouter-health", config.api_key
        )
    
    async def perform_startup_validation(self) -> Dict[str, Any]:
        """
        Perform comprehensive startup validation to ensure OpenRouter API is accessible.
        
        Returns:
            Dictionary containing health check results and details
        """
        health_result = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'checks': {},
            'details': {}
        }
        
        try:
            # Check 1: Configuration validation
            config_check = await self._check_configuration()
            health_result['checks']['configuration'] = config_check
            
            # Check 2: Network connectivity
            connectivity_check = await self._check_connectivity()
            health_result['checks']['connectivity'] = connectivity_check
            
            # Check 3: API authentication
            auth_check = await self._check_authentication()
            health_result['checks']['authentication'] = auth_check
            
            # Check 4: Basic API functionality
            api_check = await self._check_api_functionality()
            health_result['checks']['api_functionality'] = api_check
            
            # Determine overall health status
            failed_checks = [name for name, check in health_result['checks'].items() if not check['healthy']]
            
            if failed_checks:
                health_result['status'] = 'unhealthy'
                health_result['details']['failed_checks'] = failed_checks
                health_result['details']['error_summary'] = self._summarize_errors(health_result['checks'])
            else:
                health_result['status'] = 'healthy'
                health_result['details']['all_checks_passed'] = True
            
            # Update internal state
            self.health_status = health_result['status']
            self.health_details = health_result['details']
            self.last_health_check = datetime.utcnow()
            
            # Log health check results
            global openrouter_structured_logger
            if openrouter_structured_logger:
                openrouter_structured_logger.log_health_check(
                    health_result['status'], 
                    health_result['details']
                )
            
            return health_result
            
        except Exception as e:
            # Handle unexpected errors during health check
            sanitized_error = APIKeySecurityValidator.sanitize_error_message(str(e), self.config.api_key)
            
            health_result['status'] = 'unhealthy'
            health_result['details']['health_check_error'] = sanitized_error
            health_result['details']['error_type'] = type(e).__name__
            
            self.secure_logger.error(f"Health check failed with exception: {sanitized_error}")
            
            # Update internal state
            self.health_status = 'unhealthy'
            self.health_details = health_result['details']
            self.last_health_check = datetime.utcnow()
            
            return health_result
    
    async def _check_configuration(self) -> Dict[str, Any]:
        """Check OpenRouter configuration validity"""
        try:
            # Validate configuration
            is_valid = self.config.validate()
            
            config_info = self.config.get_sanitized_config_info()
            
            return {
                'healthy': is_valid,
                'details': {
                    'api_key_configured': config_info['api_key_configured'],
                    'base_url': config_info['base_url'],
                    'model': config_info['model'],
                    'timeout': config_info['timeout']
                },
                'message': 'Configuration valid' if is_valid else 'Configuration invalid'
            }
            
        except Exception as e:
            sanitized_error = APIKeySecurityValidator.sanitize_error_message(str(e), self.config.api_key)
            return {
                'healthy': False,
                'details': {'error': sanitized_error},
                'message': 'Configuration check failed'
            }
    
    async def _check_connectivity(self) -> Dict[str, Any]:
        """Check network connectivity to OpenRouter API"""
        try:
            import requests
            
            # Test basic connectivity to OpenRouter
            response = requests.get(
                "https://openrouter.ai/api/v1/models",
                timeout=10,
                headers={"User-Agent": "STEM-Idea-Generator-Health-Check"}
            )
            
            connectivity_healthy = response.status_code in [200, 401, 403]  # 401/403 means we can reach the API
            
            return {
                'healthy': connectivity_healthy,
                'details': {
                    'status_code': response.status_code,
                    'response_time_ms': response.elapsed.total_seconds() * 1000,
                    'endpoint': "https://openrouter.ai/api/v1/models"
                },
                'message': 'Network connectivity OK' if connectivity_healthy else f'Network connectivity failed (HTTP {response.status_code})'
            }
            
        except requests.exceptions.Timeout:
            return {
                'healthy': False,
                'details': {'error': 'Connection timeout'},
                'message': 'Network connectivity timeout'
            }
        except requests.exceptions.ConnectionError:
            return {
                'healthy': False,
                'details': {'error': 'Connection failed'},
                'message': 'Network connectivity failed'
            }
        except Exception as e:
            sanitized_error = APIKeySecurityValidator.sanitize_error_message(str(e), self.config.api_key)
            return {
                'healthy': False,
                'details': {'error': sanitized_error},
                'message': 'Network connectivity check failed'
            }
    
    async def _check_authentication(self) -> Dict[str, Any]:
        """Check API key authentication with OpenRouter"""
        try:
            import requests
            
            # Test authentication with a simple API call
            headers = {
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(
                "https://openrouter.ai/api/v1/models",
                headers=headers,
                timeout=10
            )
            
            auth_healthy = response.status_code == 200
            
            if auth_healthy:
                return {
                    'healthy': True,
                    'details': {
                        'status_code': response.status_code,
                        'authenticated': True
                    },
                    'message': 'API authentication successful'
                }
            elif response.status_code == 401:
                return {
                    'healthy': False,
                    'details': {
                        'status_code': response.status_code,
                        'authenticated': False
                    },
                    'message': 'API authentication failed - invalid API key'
                }
            elif response.status_code == 403:
                return {
                    'healthy': False,
                    'details': {
                        'status_code': response.status_code,
                        'authenticated': False
                    },
                    'message': 'API authentication failed - access forbidden'
                }
            else:
                return {
                    'healthy': False,
                    'details': {
                        'status_code': response.status_code,
                        'authenticated': False
                    },
                    'message': f'API authentication check failed (HTTP {response.status_code})'
                }
                
        except Exception as e:
            sanitized_error = APIKeySecurityValidator.sanitize_error_message(str(e), self.config.api_key)
            return {
                'healthy': False,
                'details': {'error': sanitized_error},
                'message': 'Authentication check failed'
            }
    
    async def _check_api_functionality(self) -> Dict[str, Any]:
        """Check basic API functionality with a minimal test request"""
        try:
            # Create a minimal test message
            test_messages = [{"role": "user", "content": "Hello"}]
            
            # Use the client to make a test request with minimal parameters
            start_time = time.time()
            
            response = await self.client.generate_completion(
                test_messages,
                max_tokens=5,  # Minimal token usage
                temperature=0.1
            )
            
            response_time = time.time() - start_time
            
            # Validate response structure
            if response and 'choices' in response and len(response['choices']) > 0:
                choice = response['choices'][0]
                if 'message' in choice and 'content' in choice['message']:
                    return {
                        'healthy': True,
                        'details': {
                            'response_time_seconds': round(response_time, 3),
                            'model': response.get('model'),
                            'tokens_used': response.get('usage', {}).get('total_tokens', 0),
                            'test_successful': True
                        },
                        'message': 'API functionality test successful'
                    }
            
            return {
                'healthy': False,
                'details': {
                    'response_time_seconds': round(response_time, 3),
                    'test_successful': False,
                    'response_structure_invalid': True
                },
                'message': 'API functionality test failed - invalid response structure'
            }
            
        except ValueError as e:
            # Handle API errors
            error_str = str(e)
            sanitized_error = APIKeySecurityValidator.sanitize_error_message(error_str, self.config.api_key)
            
            # Check if this is a quota/billing issue
            if any(keyword in error_str.lower() for keyword in ['quota', 'billing', 'insufficient']):
                return {
                    'healthy': False,
                    'details': {
                        'error': sanitized_error,
                        'error_type': 'quota_or_billing'
                    },
                    'message': 'API functionality test failed - quota or billing issue'
                }
            
            return {
                'healthy': False,
                'details': {
                    'error': sanitized_error,
                    'error_type': 'api_error'
                },
                'message': 'API functionality test failed - API error'
            }
            
        except Exception as e:
            sanitized_error = APIKeySecurityValidator.sanitize_error_message(str(e), self.config.api_key)
            return {
                'healthy': False,
                'details': {
                    'error': sanitized_error,
                    'error_type': type(e).__name__
                },
                'message': 'API functionality test failed'
            }
    
    def _summarize_errors(self, checks: Dict[str, Dict[str, Any]]) -> str:
        """Summarize errors from failed health checks"""
        error_messages = []
        
        for check_name, check_result in checks.items():
            if not check_result['healthy']:
                message = check_result.get('message', f'{check_name} failed')
                error_messages.append(f"{check_name}: {message}")
        
        return "; ".join(error_messages)
    
    def get_current_health_status(self) -> Dict[str, Any]:
        """Get the current health status without performing new checks"""
        return {
            'status': self.health_status,
            'last_check': self.last_health_check.isoformat() if self.last_health_check else None,
            'details': self.health_details
        }
    
    async def perform_periodic_health_check(self) -> Dict[str, Any]:
        """
        Perform a lightweight periodic health check.
        Less comprehensive than startup validation but faster.
        """
        try:
            # Quick connectivity and authentication check
            import requests
            
            headers = {
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/json"
            }
            
            start_time = time.time()
            response = requests.get(
                "https://openrouter.ai/api/v1/models",
                headers=headers,
                timeout=5  # Shorter timeout for periodic checks
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                health_result = {
                    'status': 'healthy',
                    'timestamp': datetime.utcnow().isoformat(),
                    'response_time_seconds': round(response_time, 3),
                    'details': {
                        'periodic_check': True,
                        'api_accessible': True,
                        'authenticated': True
                    }
                }
            else:
                health_result = {
                    'status': 'degraded',
                    'timestamp': datetime.utcnow().isoformat(),
                    'response_time_seconds': round(response_time, 3),
                    'details': {
                        'periodic_check': True,
                        'api_accessible': True,
                        'authenticated': False,
                        'status_code': response.status_code
                    }
                }
            
            # Update internal state
            self.health_status = health_result['status']
            self.health_details = health_result['details']
            self.last_health_check = datetime.utcnow()
            
            return health_result
            
        except Exception as e:
            sanitized_error = APIKeySecurityValidator.sanitize_error_message(str(e), self.config.api_key)
            
            health_result = {
                'status': 'unhealthy',
                'timestamp': datetime.utcnow().isoformat(),
                'details': {
                    'periodic_check': True,
                    'api_accessible': False,
                    'error': sanitized_error
                }
            }
            
            # Update internal state
            self.health_status = 'unhealthy'
            self.health_details = health_result['details']
            self.last_health_check = datetime.utcnow()
            
            return health_result

# Initialize OpenRouter client
openrouter_client = None
if openrouter_config:
    try:
        openrouter_client = OpenRouterClient(openrouter_config)
        logger.info("OpenRouter client initialized successfully")
        
        # Initialize health check system
        openrouter_health_check = OpenRouterHealthCheck(openrouter_config, openrouter_client)
        logger.info("OpenRouter health check system initialized")
        
    except Exception as e:
        logger.error(f"Failed to initialize OpenRouter client: {e}")
        openrouter_client = None
        openrouter_health_check = None

# Perform startup health validation (async function, will be called during first request)
async def perform_startup_health_validation():
    """Perform startup health validation when the service starts"""
    if openrouter_health_check:
        try:
            logger.info("Performing OpenRouter startup health validation...")
            health_result = await openrouter_health_check.perform_startup_validation()
            
            if health_result['status'] == 'healthy':
                logger.info("OpenRouter startup health validation passed - all systems operational")
            else:
                logger.warning(f"OpenRouter startup health validation failed: {health_result['status']}")
                if 'failed_checks' in health_result.get('details', {}):
                    logger.warning(f"Failed checks: {health_result['details']['failed_checks']}")
                    
        except Exception as e:
            sanitized_error = APIKeySecurityValidator.sanitize_error_message(str(e), openrouter_config.api_key)
            logger.error(f"Startup health validation failed with exception: {sanitized_error}")

# Flag to track if startup validation has been performed
_startup_validation_performed = False

async def call_openrouter(prompt: str, model: str = None, **kwargs) -> str:
    """
    Call OpenRouter API for AI text generation with multi-model support.
    
    This function provides AI text generation using OpenRouter API with support for
    different models for different tasks. Uses the ResponseAdapter to ensure response compatibility.
    
    Args:
        prompt: The text prompt to send to the AI model
        model: Optional model to use (defaults to Solar Pro 3 for idea generation)
        **kwargs: Additional parameters for the API request (temperature, max_tokens, etc.)
        
    Returns:
        Generated text content as a string
        
    Raises:
        Exception: Re-raises exceptions for proper error handling
        
    Requirements: 1.1, 4.2, 4.4
    """
    if not ENABLE_OPENROUTER or not openrouter_client:
        error_msg = "OpenRouter disabled or not configured"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    # Use structured logging for comprehensive function call tracking
    global openrouter_structured_logger
    if openrouter_structured_logger:
        with openrouter_structured_logger.log_api_request(
            "call_openrouter",
            prompt_length=len(prompt),
            model=model,
            parameters=list(kwargs.keys())
        ) as log_context:
            return await _execute_call_openrouter_with_logging(prompt, log_context, model=model, **kwargs)
    else:
        # Fallback to basic logging if structured logger not available
        return await _execute_call_openrouter_basic(prompt, model=model, **kwargs)

async def _execute_call_openrouter_with_logging(prompt: str, log_context: Dict[str, Any], model: str = None, **kwargs) -> str:
    """Execute call_openrouter with structured logging context and multi-model support"""
    request_id = log_context['request_id']
    start_time = log_context['start_time']
    structured_logger = log_context['logger']
    
    # Use Solar Pro 3 as default for idea generation if no model specified
    selected_model = model or "upstage/solar-pro-3:free"
    
    try:
        messages = [{"role": "user", "content": prompt}]
        
        # Log function call details
        structured_logger.debug(f"[{request_id}] Processing OpenRouter request", extra={
            'request_id': request_id,
            'prompt_length': len(prompt),
            'message_count': len(messages),
            'model': selected_model,
            'parameters': list(kwargs.keys())
        })
        
        # Generate completion with enhanced serialization, passing through all kwargs and model
        openrouter_response = await openrouter_client.generate_completion(
            messages, model=selected_model, **kwargs
        )
        
        # Use ResponseAdapter to convert OpenRouter response to compatible format
        adapted_response = ResponseAdapter.adapt_openrouter_response(openrouter_response)
        
        # Extract the generated text using the adapter
        content = ResponseAdapter.extract_generated_text(adapted_response)
        
        # Extract and log metadata for monitoring (without exposing sensitive content)
        metadata = ResponseAdapter.get_response_metadata(adapted_response)
        
        # Log successful completion with structured logging
        global openrouter_structured_logger
        if openrouter_structured_logger:
            openrouter_structured_logger.log_api_success(
                request_id, "call_openrouter", start_time, metadata,
                content_length=len(content),
                prompt_length=len(prompt)
            )
        
        return content
            
    except ValueError as e:
        # Handle API errors and validation errors with proper error mapping
        error_str = str(e)
        # Sanitize error message to prevent API key exposure
        sanitized_error = APIKeySecurityValidator.sanitize_error_message(error_str, openrouter_config.api_key)
        
        structured_logger.error(f"[{request_id}] OpenRouter validation error", extra={
            'request_id': request_id,
            'error_type': 'validation_error',
            'error_message': sanitized_error
        })
        
        # Extract error information for better error handling
        if "OpenRouter API error" in error_str and ":" in error_str:
            # Parse the error to extract code and message
            try:
                # Format: "OpenRouter API error (error_code): message"
                parts = error_str.split(":", 1)
                if len(parts) == 2:
                    code_part = parts[0].strip()
                    message_part = parts[1].strip()
                    
                    # Extract error code from parentheses
                    if "(" in code_part and ")" in code_part:
                        start = code_part.find("(") + 1
                        end = code_part.find(")")
                        error_code = code_part[start:end]
                        
                        # Sanitize message part before creating error info
                        sanitized_message = APIKeySecurityValidator.sanitize_error_message(message_part, openrouter_config.api_key)
                        
                        # Create a properly mapped error
                        error_info = OpenRouterErrorMapper.map_error_response(error_code, sanitized_message)
                        raise RuntimeError(f"OpenRouter API failed: {error_info['message']}") from e
            except Exception:
                # If parsing fails, fall back to generic error
                pass
        
        # Generic fallback for validation errors (already sanitized)
        raise RuntimeError(f"OpenRouter API validation failed: {sanitized_error}") from e
        
    except Exception as e:
        # Handle all other errors with proper mapping
        error_str = str(e)
        # Sanitize error message to prevent API key exposure
        sanitized_error = APIKeySecurityValidator.sanitize_error_message(error_str, openrouter_config.api_key)
        
        structured_logger.error(f"[{request_id}] OpenRouter call failed", extra={
            'request_id': request_id,
            'error_type': type(e).__name__,
            'error_message': sanitized_error
        })
        
        # Try to map network and connection errors
        if any(keyword in error_str.lower() for keyword in ['timeout', 'connection', 'network']):
            if 'timeout' in error_str.lower():
                error_info = OpenRouterErrorMapper.map_error_response('timeout', sanitized_error)
            elif 'connection' in error_str.lower():
                error_info = OpenRouterErrorMapper.map_error_response('connection_error', sanitized_error)
            else:
                error_info = OpenRouterErrorMapper.map_error_response('network_error', sanitized_error)
            
            raise RuntimeError(f"OpenRouter API failed: {error_info['message']}") from e
        
        # Generic error mapping for unknown errors (already sanitized)
        error_info = OpenRouterErrorMapper.map_error_response('unknown_error', sanitized_error)
        raise RuntimeError(f"OpenRouter API failed: {error_info['message']}") from e

async def _execute_call_openrouter_basic(prompt: str, model: str = None, **kwargs) -> str:
    """Fallback method with basic logging when structured logger is not available"""
    # Create secure logger for this function
    secure_logger = APIKeySecurityValidator.create_secure_logger(
        "call-openrouter", openrouter_config.api_key
    )

    # Use Solar Pro 3 as default for idea generation if no model specified
    selected_model = model or "upstage/solar-pro-3:free"

    try:
        messages = [{"role": "user", "content": prompt}]
        
        # Log function call without exposing sensitive information
        secure_logger.info(f"Calling OpenRouter API with {len(messages)} messages using model: {selected_model}")
        
        # Generate completion with enhanced serialization, passing through all kwargs and model
        openrouter_response = await openrouter_client.generate_completion(
            messages, model=selected_model, **kwargs
        )
        
        # Use ResponseAdapter to convert OpenRouter response to compatible format
        adapted_response = ResponseAdapter.adapt_openrouter_response(openrouter_response)
        
        # Extract the generated text using the adapter
        content = ResponseAdapter.extract_generated_text(adapted_response)
        
        # Extract and log metadata for monitoring (without exposing sensitive content)
        metadata = ResponseAdapter.get_response_metadata(adapted_response)
        secure_logger.info(f"OpenRouter call successful - Model: {metadata.get('model')}, "
                   f"Tokens: {metadata.get('usage', {}).get('total_tokens', 'unknown')}, "
                   f"Finish reason: {metadata.get('finish_reason')}")
        
        # Log content length without exposing actual content
        secure_logger.debug(f"Generated content length: {len(content)} characters")
        return content
            
    except ValueError as e:
        # Handle API errors and validation errors with proper error mapping
        error_str = str(e)
        # Sanitize error message to prevent API key exposure
        sanitized_error = APIKeySecurityValidator.sanitize_error_message(error_str, openrouter_config.api_key)
        secure_logger.error(f"OpenRouter API validation error: {sanitized_error}")
        
        # Extract error information for better error handling
        if "OpenRouter API error" in error_str and ":" in error_str:
            # Parse the error to extract code and message
            try:
                # Format: "OpenRouter API error (error_code): message"
                parts = error_str.split(":", 1)
                if len(parts) == 2:
                    code_part = parts[0].strip()
                    message_part = parts[1].strip()
                    
                    # Extract error code from parentheses
                    if "(" in code_part and ")" in code_part:
                        start = code_part.find("(") + 1
                        end = code_part.find(")")
                        error_code = code_part[start:end]
                        
                        # Sanitize message part before creating error info
                        sanitized_message = APIKeySecurityValidator.sanitize_error_message(message_part, openrouter_config.api_key)
                        
                        # Create a properly mapped error
                        error_info = OpenRouterErrorMapper.map_error_response(error_code, sanitized_message)
                        raise RuntimeError(f"OpenRouter API failed: {error_info['message']}") from e
            except Exception:
                # If parsing fails, fall back to generic error
                pass
        
        # Generic fallback for validation errors (already sanitized)
        raise RuntimeError(f"OpenRouter API validation failed: {sanitized_error}") from e
        
    except Exception as e:
        # Handle all other errors with proper mapping
        error_str = str(e)
        # Sanitize error message to prevent API key exposure
        sanitized_error = APIKeySecurityValidator.sanitize_error_message(error_str, openrouter_config.api_key)
        secure_logger.exception(f"OpenRouter API call failed: {sanitized_error}")
        
        # Try to map network and connection errors
        if any(keyword in error_str.lower() for keyword in ['timeout', 'connection', 'network']):
            if 'timeout' in error_str.lower():
                error_info = OpenRouterErrorMapper.map_error_response('timeout', sanitized_error)
            elif 'connection' in error_str.lower():
                error_info = OpenRouterErrorMapper.map_error_response('connection_error', sanitized_error)
            else:
                error_info = OpenRouterErrorMapper.map_error_response('network_error', sanitized_error)
            
            raise RuntimeError(f"OpenRouter API failed: {error_info['message']}") from e
        
        # Generic error mapping for unknown errors (already sanitized)
        error_info = OpenRouterErrorMapper.map_error_response('unknown_error', sanitized_error)
        raise RuntimeError(f"OpenRouter API failed: {error_info['message']}") from e

# ───────────────── FALLBACK GENERATOR ─────────────────
def local_generator(p: ProjectParams) -> GeneratedProject:
    base = p.projectType or "STEM"
    level = p.skillLevel or "Beginner"
    project_type = base.lower()
    
    # Project-specific component mappings (same as in main generator)
    component_mappings = {
        'robotics': {
            'Beginner': ['Arduino Uno', 'DC Motors (2x)', 'Motor Driver L298N', 'Ultrasonic Sensor HC-SR04', 'Chassis Kit', 'Wheels (4x)', 'Battery Pack 9V', 'Jumper Wires'],
            'Intermediate': ['Arduino Mega', 'Servo Motors (2x)', 'Stepper Motors', 'IMU Sensor MPU6050', 'Camera Module', 'Bluetooth Module HC-05', 'Custom Chassis', 'LiPo Battery'],
            'Advanced': ['Raspberry Pi 4', 'LIDAR Sensor', 'Encoders', 'ROS Compatible Hardware', 'AI Processing Unit', 'Advanced Sensors Suite', 'Custom PCB', 'High-Capacity Battery'],
            'Expert': ['NVIDIA Jetson', 'Computer Vision Cameras', 'Advanced SLAM Sensors', 'Custom Actuators', 'Machine Learning Hardware', 'Professional Grade Components', 'Custom Manufacturing']
        },
        'iot': {
            'Beginner': ['ESP32 Development Board', 'DHT22 Temperature Sensor', 'LED Indicators', 'Breadboard', 'Resistors Kit', 'WiFi Router', 'Mobile App Platform', 'Cloud Service Account'],
            'Intermediate': ['NodeMCU ESP8266', 'Multiple Sensors Suite', 'OLED Display', 'Relay Modules', 'MQTT Broker', 'Database Service', 'Custom Enclosure', 'Power Management'],
            'Advanced': ['ESP32-CAM', 'LoRaWAN Modules', 'Edge Computing Unit', 'Industrial Sensors', 'Mesh Network Hardware', 'Advanced Analytics Platform', 'Solar Power System'],
            'Expert': ['Custom IoT Gateway', 'AI Edge Processors', 'Industrial IoT Protocols', 'Enterprise Cloud Platform', 'Advanced Security Hardware', 'Scalable Infrastructure']
        },
        'electronics': {
            'Beginner': ['Arduino Nano', 'LED Matrix 8x8', 'Resistors (220Ω, 1kΩ)', 'Capacitors (100µF)', 'Breadboard', 'LCD Display 16x2', 'Push Buttons', 'Battery Holder'],
            'Intermediate': ['Microcontroller ATmega328P', 'Op-Amps LM358', 'Transistors (NPN, PNP)', 'Voltage Regulators', 'PCB Board', 'Oscilloscope Probes', 'Function Generator'],
            'Advanced': ['FPGA Development Board', 'High-Speed ADC/DAC', 'RF Modules', 'Custom IC Design Tools', 'Professional PCB Fabrication', 'Signal Analyzers'],
            'Expert': ['Custom ASIC Design', 'High-Frequency Components', 'Professional Test Equipment', 'Advanced Simulation Software', 'Cleanroom Fabrication Access']
        },
        'automation': {
            'Beginner': ['Arduino Uno', 'Relay Modules (4-channel)', 'PIR Motion Sensor', 'Light Dependent Resistor', 'Solenoid Valve', 'Timer Modules', 'Power Supply 12V', 'Control Panel'],
            'Intermediate': ['PLC Controller', 'Industrial Relays', 'Proximity Sensors', 'Pneumatic Actuators', 'HMI Touch Screen', 'Variable Frequency Drive', 'Industrial Enclosure'],
            'Advanced': ['SCADA System', 'Industrial IoT Gateway', 'Advanced PLC', 'Servo Control Systems', 'Vision Inspection System', 'Robotic Arms', 'Safety Systems'],
            'Expert': ['Distributed Control System', 'AI-Powered Automation', 'Industrial Robotics', 'Advanced Process Control', 'Enterprise Integration', 'Custom Automation Solutions']
        },
        'sensors': {
            'Beginner': ['Arduino Uno', 'Temperature Sensor DS18B20', 'Humidity Sensor DHT11', 'Light Sensor LDR', 'SD Card Module', 'RTC Module', 'LCD Display', 'Data Logger Shield'],
            'Intermediate': ['Data Acquisition System', 'Pressure Sensors', 'Gas Sensors MQ Series', 'Accelerometer ADXL345', 'Wireless Transmission', 'Database Storage', 'Calibration Standards'],
            'Advanced': ['High-Precision Sensors', 'Multi-Channel DAQ', 'Industrial Protocols', 'Edge Computing', 'Machine Learning Processing', 'Professional Calibration Equipment'],
            'Expert': ['Research-Grade Instruments', 'Custom Sensor Development', 'Advanced Signal Processing', 'Metrology Standards', 'Publication-Quality Data Systems']
        }
    }
    
    # Project-specific skills
    skill_mappings = {
        'robotics': ['Robot mechanics', 'Motor control', 'Sensor integration', 'Path planning', 'Programming in C++/Python'],
        'iot': ['IoT protocols (MQTT/HTTP)', 'WiFi connectivity', 'Cloud integration', 'Data visualization', 'Mobile app development'],
        'electronics': ['Circuit design', 'Component selection', 'PCB layout', 'Signal analysis', 'Embedded programming'],
        'automation': ['Control systems', 'PLC programming', 'Industrial protocols', 'Safety systems', 'Process optimization'],
        'sensors': ['Sensor calibration', 'Data acquisition', 'Signal processing', 'Statistical analysis', 'Measurement uncertainty']
    }
    
    # Get project-specific components and skills
    project_components = component_mappings.get(project_type, component_mappings['electronics'])
    components = project_components.get(level, project_components['Beginner'])
    
    project_skills = skill_mappings.get(project_type, skill_mappings['electronics'])
    skills = project_skills + ['Problem solving', 'Project documentation']
    
    # Generate hands-on, practical steps based on project type and level
    steps = generate_practical_steps(project_type, level, base, components)

    # Build a meaningful title from the user's interests if provided
    interests = (p.interests or '').strip()
    if interests:
        # Capitalize first letter of interests for use as project name
        project_idea = interests[:60].rstrip('.,!?')
        # Capitalize properly
        project_idea = project_idea[0].upper() + project_idea[1:] if project_idea else project_idea
        title = f"{project_idea} ({level})"
        description = f"A {level.lower()}-level {project_type} project focused on: {interests}. Designed for hands-on learning and practical skill development."
    else:
        # Fallback project names per type
        fallback_titles = {
            'robotics': f"Autonomous Navigation Robot ({level})",
            'iot': f"Smart Home Monitor with ESP32 ({level})",
            'electronics': f"Digital Signal Processing Circuit ({level})",
            'automation': f"Smart Automation Controller ({level})",
            'sensors': f"Environmental Data Logger ({level})",
            'web-development': f"Full-Stack Web Application ({level})",
            'mobile-apps': f"Cross-Platform Mobile App ({level})",
            'desktop-software': f"Desktop Productivity Tool ({level})",
            'game-development': f"2D Platformer Game ({level})",
            'ai-ml': f"Machine Learning Classifier ({level})",
        }
        title = fallback_titles.get(project_type, f"{base} Project ({level})")
        description = f"A {level.lower()}-level {project_type} project designed for hands-on learning and practical skill development."

    return GeneratedProject(
        title=title,
        description=description,
        difficulty=level,
        estimatedTime=p.duration or "3–6 weeks",
        estimatedCost=p.budget or "$50–150",
        components=components,
        skills=skills,
        steps=steps,
    )

def generate_practical_steps(project_type: str, level: str, project_name: str, components: List[str]) -> List[str]:
    """
    Generate practical, hands-on learning steps that students can actually follow.
    Each step is specific, actionable, and includes what to do and what to expect.
    """
    
    # Common beginner-friendly steps for all projects
    common_setup_steps = [
        "📦 **Unbox and inventory components** - Lay out all parts, check against the component list, and familiarize yourself with each piece",
        "📚 **Read component datasheets** - Spend 30 minutes understanding what each component does and its key specifications",
        "🔧 **Set up your workspace** - Organize tools, prepare breadboard, ensure good lighting and ventilation"
    ]
    
    # Project-type specific step templates
    if project_type == 'robotics':
        if level == 'Beginner':
            return common_setup_steps + [
                "🤖 **Build the basic chassis** - Assemble the robot frame, attach wheels, and mount the main board securely",
                "🔌 **Wire the motor connections** - Connect motors to the motor driver, double-check polarity, test basic movement",
                "📡 **Connect sensors step-by-step** - Wire one sensor at a time, test each connection before adding the next",
                "💻 **Upload basic movement code** - Start with simple forward/backward movement, verify motors respond correctly",
                "🎯 **Test sensor readings** - Print sensor values to serial monitor, wave your hand to see changes",
                "🧠 **Program basic behaviors** - Add obstacle avoidance or line following, test in small increments",
                "🏁 **Create a test course** - Build a simple track or obstacle course to test your robot's abilities",
                "📹 **Record and analyze performance** - Film your robot in action, note what works and what needs improvement",
                "🔧 **Troubleshoot and refine** - Fix any issues, adjust sensor positions, fine-tune code parameters",
                "🎉 **Demonstrate and document** - Show off your robot to friends, write about what you learned"
            ]
        elif level == 'Intermediate':
            return common_setup_steps + [
                "🏗️ **Design and 3D print custom parts** - Create mounting brackets or sensor housings using CAD software",
                "⚡ **Build power management system** - Wire battery pack, voltage regulators, and power switches safely",
                "🧭 **Integrate multiple sensors** - Combine ultrasonic, IMU, and camera sensors with proper data fusion",
                "🎮 **Implement remote control** - Add Bluetooth or WiFi control via smartphone app or computer",
                "🤖 **Program autonomous behaviors** - Create state machines for complex decision-making and navigation",
                "📊 **Add data logging** - Record sensor data to SD card or cloud for performance analysis",
                "🎯 **Build advanced test scenarios** - Create maze navigation, object tracking, or collaborative robot tasks",
                "⚙️ **Optimize performance** - Profile code execution, reduce power consumption, improve response times",
                "🔄 **Implement feedback control** - Add PID controllers for precise movement and positioning",
                "📱 **Create user interface** - Build a mobile app or web dashboard to monitor and control your robot"
            ]
        else:  # Advanced/Expert
            return common_setup_steps + [
                "🏭 **Design custom PCB** - Create professional circuit board with integrated sensors and microcontroller",
                "🧠 **Implement machine learning** - Train neural networks for object recognition or behavior learning",
                "🌐 **Build distributed system** - Create multi-robot coordination with mesh networking",
                "📡 **Integrate advanced sensors** - Add LIDAR, stereo cameras, or industrial-grade IMUs",
                "⚡ **Design power electronics** - Create efficient motor drivers and battery management systems",
                "🎯 **Implement SLAM navigation** - Build simultaneous localization and mapping capabilities",
                "🤖 **Program complex AI behaviors** - Implement reinforcement learning or swarm intelligence",
                "📊 **Build real-time monitoring** - Create professional telemetry and diagnostic systems",
                "🔧 **Optimize for production** - Design for manufacturability, reliability, and cost-effectiveness",
                "🏆 **Compete or commercialize** - Enter robotics competitions or develop market-ready product"
            ]
    
    elif project_type == 'iot':
        if level == 'Beginner':
            return common_setup_steps + [
                "🌐 **Set up WiFi connection** - Connect your microcontroller to home network, test internet connectivity",
                "📱 **Install mobile apps** - Download Blynk, Arduino IoT Cloud, or similar app for device control",
                "🔌 **Wire first sensor** - Connect temperature sensor, verify readings in serial monitor",
                "☁️ **Send data to cloud** - Upload sensor readings to ThingSpeak or similar IoT platform",
                "📊 **Create simple dashboard** - Build basic charts and gauges to visualize your sensor data",
                "💡 **Add remote control** - Control an LED or relay from your phone over the internet",
                "⏰ **Implement scheduling** - Add timer-based automation (turn lights on/off at specific times)",
                "📧 **Set up notifications** - Send email or push notifications when sensor values exceed thresholds",
                "🏠 **Expand to multiple sensors** - Add humidity, light, or motion sensors to your system",
                "🎯 **Create practical application** - Build plant watering system, security monitor, or weather station"
            ]
        elif level == 'Intermediate':
            return common_setup_steps + [
                "🏗️ **Design device enclosure** - Create weatherproof housing using 3D printing or project boxes",
                "🔋 **Implement battery power** - Add rechargeable batteries with solar charging or low-power modes",
                "📡 **Set up local network** - Create mesh network with multiple IoT devices communicating",
                "🤖 **Add edge computing** - Implement local AI processing for faster response times",
                "📱 **Build custom mobile app** - Create professional app with user accounts and device management",
                "🔐 **Implement security** - Add encryption, secure authentication, and over-the-air updates",
                "📊 **Advanced data analytics** - Implement trend analysis, predictive algorithms, and anomaly detection",
                "🌐 **Create web interface** - Build responsive web dashboard with real-time data visualization",
                "⚡ **Optimize power consumption** - Implement deep sleep modes and efficient communication protocols",
                "🏭 **Scale to production** - Design for mass deployment with device provisioning and management"
            ]
        else:  # Advanced/Expert
            return common_setup_steps + [
                "🏭 **Design industrial IoT system** - Create robust, scalable architecture for enterprise deployment",
                "🧠 **Implement edge AI** - Deploy machine learning models directly on IoT devices",
                "🔐 **Build security framework** - Implement end-to-end encryption, secure boot, and threat detection",
                "📡 **Design custom protocols** - Create efficient communication protocols for specific use cases",
                "☁️ **Build cloud infrastructure** - Deploy scalable backend with microservices architecture",
                "📊 **Implement big data analytics** - Process millions of data points with real-time insights",
                "🤖 **Add autonomous decision making** - Create AI systems that adapt and optimize without human input",
                "🌐 **Build digital twin** - Create virtual representation of physical systems for simulation",
                "⚡ **Optimize for efficiency** - Minimize bandwidth, power, and computational requirements",
                "🏆 **Commercialize solution** - Develop market-ready IoT product with business model"
            ]
    
    elif project_type == 'electronics':
        if level == 'Beginner':
            return common_setup_steps + [
                "🔌 **Build basic circuits on breadboard** - Start with LED circuits, learn about current limiting resistors",
                "⚡ **Measure voltage and current** - Use multimeter to verify circuit behavior, understand Ohm's law",
                "🔧 **Learn soldering basics** - Practice on perfboard with simple circuits, focus on clean joints",
                "📡 **Test with oscilloscope** - Observe waveforms, understand AC vs DC signals, measure frequency",
                "💡 **Build LED matrix display** - Wire 8x8 LED grid, learn about multiplexing and current control",
                "🎵 **Add sound generation** - Create simple tones with buzzers, understand PWM and frequency",
                "🎮 **Build input controls** - Add buttons, potentiometers, and switches for user interaction",
                "📊 **Create simple instruments** - Build voltmeter, frequency counter, or signal generator",
                "🔄 **Learn about feedback** - Build op-amp circuits, understand amplification and filtering",
                "🎯 **Design practical device** - Create digital clock, temperature monitor, or audio amplifier"
            ]
        elif level == 'Intermediate':
            return common_setup_steps + [
                "🖥️ **Design custom PCB** - Learn KiCad or Altium, create professional circuit boards",
                "⚡ **Build power supply circuits** - Design regulated power supplies with proper filtering",
                "📡 **Implement communication protocols** - Add SPI, I2C, UART interfaces between components",
                "🔧 **Learn surface mount soldering** - Work with smaller components, use reflow oven or hot air",
                "📊 **Add microcontroller integration** - Combine analog circuits with digital control systems",
                "🎯 **Implement signal processing** - Build filters, amplifiers, and signal conditioning circuits",
                "⚙️ **Design for EMC compliance** - Learn about electromagnetic interference and mitigation",
                "🔄 **Add closed-loop control** - Implement feedback systems for motor control or regulation",
                "📱 **Create test equipment** - Build function generator, spectrum analyzer, or logic analyzer",
                "🏭 **Prepare for manufacturing** - Design for assembly, create test procedures and documentation"
            ]
        else:  # Advanced/Expert
            return common_setup_steps + [
                "🏭 **Design high-speed digital circuits** - Work with GHz signals, understand transmission lines",
                "⚡ **Implement switch-mode power supplies** - Design efficient power conversion systems",
                "📡 **Build RF and microwave circuits** - Design antennas, filters, and amplifiers for wireless",
                "🧠 **Add FPGA or DSP processing** - Implement real-time signal processing algorithms",
                "🔬 **Design precision analog circuits** - Create low-noise, high-accuracy measurement systems",
                "⚡ **Implement power electronics** - Design motor drives, inverters, and power management",
                "📊 **Build mixed-signal systems** - Integrate high-performance ADCs, DACs, and processors",
                "🎯 **Design for harsh environments** - Create circuits for automotive, aerospace, or industrial use",
                "🔧 **Implement advanced packaging** - Use BGA, chip-scale packages, and advanced assembly",
                "🏆 **Commercialize design** - Navigate regulatory approval, manufacturing, and market launch"
            ]
    
    elif project_type == 'automation':
        if level == 'Beginner':
            return common_setup_steps + [
                "🏠 **Set up basic home automation** - Control lights and outlets with smart switches and timers",
                "📱 **Install automation app** - Set up Home Assistant, SmartThings, or similar platform",
                "💡 **Create lighting scenes** - Program different lighting moods for various activities",
                "🌡️ **Add temperature control** - Automate heating/cooling based on schedule and occupancy",
                "🔐 **Implement basic security** - Add door/window sensors with automated alerts",
                "📊 **Monitor energy usage** - Track power consumption and identify energy-saving opportunities",
                "⏰ **Set up scheduling** - Create daily/weekly routines for various home systems",
                "📧 **Add notifications** - Get alerts for important events like security breaches or system failures",
                "🎵 **Integrate entertainment** - Automate music and TV based on presence and time of day",
                "🎯 **Create practical scenarios** - Build 'away mode', 'bedtime routine', or 'morning startup' automation"
            ]
        elif level == 'Intermediate':
            return common_setup_steps + [
                "🏭 **Design industrial control system** - Build PLC-based automation for manufacturing processes",
                "🤖 **Implement robotic automation** - Add robotic arms or conveyor systems for material handling",
                "📊 **Create SCADA interface** - Build supervisory control and data acquisition system",
                "🔐 **Add safety systems** - Implement emergency stops, safety interlocks, and fail-safe operations",
                "📡 **Build communication networks** - Connect multiple automation devices with industrial protocols",
                "⚡ **Design motor control systems** - Implement variable frequency drives and servo control",
                "📱 **Create operator interfaces** - Build HMI (Human Machine Interface) for system control",
                "🔄 **Implement feedback control** - Add PID controllers for precise process control",
                "📊 **Add data logging and analytics** - Track performance metrics and optimize operations",
                "🎯 **Integrate with enterprise systems** - Connect automation to ERP, MES, or cloud platforms"
            ]
        else:  # Advanced/Expert
            return common_setup_steps + [
                "🏭 **Design Industry 4.0 system** - Implement smart factory with IoT, AI, and digital twins",
                "🧠 **Add machine learning** - Implement predictive maintenance and adaptive control algorithms",
                "🌐 **Build cyber-physical systems** - Create seamless integration of physical and digital worlds",
                "🔐 **Implement cybersecurity** - Design secure automation systems resistant to cyber attacks",
                "📊 **Create digital twin** - Build virtual representation of physical automation systems",
                "⚡ **Optimize energy efficiency** - Implement smart grid integration and demand response",
                "🤖 **Design autonomous systems** - Create self-optimizing automation that adapts to conditions",
                "📡 **Implement edge computing** - Add local AI processing for real-time decision making",
                "🔄 **Build resilient systems** - Design fault-tolerant automation with graceful degradation",
                "🏆 **Scale to enterprise** - Deploy automation solutions across multiple facilities or industries"
            ]
    
    else:  # sensors or default
        if level == 'Beginner':
            return common_setup_steps + [
                "🌡️ **Connect temperature sensor** - Wire DS18B20 or DHT22, read values in serial monitor",
                "💧 **Add humidity monitoring** - Combine with temperature for complete environmental sensing",
                "💡 **Implement light sensing** - Use photoresistor or light sensor to detect ambient conditions",
                "📏 **Measure distance** - Connect ultrasonic sensor, create simple proximity detector",
                "🎯 **Detect motion** - Add PIR sensor for occupancy detection and security applications",
                "📊 **Log data to SD card** - Store sensor readings with timestamps for later analysis",
                "📱 **Send data to smartphone** - Use Bluetooth to transmit readings to mobile app",
                "⏰ **Add real-time clock** - Timestamp your data accurately for trend analysis",
                "🔔 **Create alert system** - Send notifications when sensor values exceed thresholds",
                "🎯 **Build practical monitor** - Create weather station, security system, or plant monitor"
            ]
        elif level == 'Intermediate':
            return common_setup_steps + [
                "🔬 **Calibrate sensors precisely** - Learn calibration techniques for accurate measurements",
                "📡 **Implement wireless networks** - Create mesh sensor networks with multiple nodes",
                "🧠 **Add signal processing** - Filter noise, implement moving averages and trend detection",
                "⚡ **Optimize power consumption** - Implement sleep modes and efficient sampling strategies",
                "📊 **Build data analytics** - Create algorithms for pattern recognition and anomaly detection",
                "🌐 **Connect to cloud platforms** - Stream data to AWS IoT, Google Cloud, or Azure",
                "📱 **Create professional interface** - Build web dashboard with real-time visualization",
                "🔄 **Implement closed-loop control** - Use sensor feedback to control actuators automatically",
                "🎯 **Add machine learning** - Train models to predict trends or classify sensor patterns",
                "🏭 **Scale to production** - Design robust sensor networks for commercial deployment"
            ]
        else:  # Advanced/Expert
            return common_setup_steps + [
                "🔬 **Design custom sensors** - Create specialized sensors for unique measurement requirements",
                "🧠 **Implement sensor fusion** - Combine multiple sensors with Kalman filters or AI algorithms",
                "📡 **Build industrial monitoring** - Create systems for harsh environments with high reliability",
                "⚡ **Design ultra-low power systems** - Create battery-powered sensors lasting years",
                "📊 **Implement edge AI** - Process sensor data locally with machine learning algorithms",
                "🌐 **Build massive sensor networks** - Deploy thousands of sensors with efficient management",
                "🔐 **Add security and encryption** - Protect sensor data from tampering and eavesdropping",
                "🎯 **Create predictive systems** - Use sensor data to predict failures or optimize performance",
                "🏭 **Design for manufacturing** - Create cost-effective sensors for mass production",
                "🏆 **Commercialize technology** - Develop sensor products for specific market applications"
            ]
    
    # Fallback to generic steps if no specific type matches
    return common_setup_steps + [
        "🔧 **Build core functionality** - Implement the main features of your project step by step",
        "🧪 **Test each component** - Verify each part works correctly before integration",
        "🔄 **Integrate and debug** - Combine all components and fix any compatibility issues",
        "📊 **Add monitoring and logging** - Track performance and identify areas for improvement",
        "🎯 **Create user interface** - Build controls and displays for easy project interaction",
        "📱 **Add connectivity features** - Enable remote monitoring or control capabilities",
        "⚡ **Optimize performance** - Improve speed, efficiency, and reliability",
        "📚 **Document your work** - Create clear instructions and explanations for others",
        "🎉 **Demonstrate and share** - Show your project to others and share your learning experience"
    ]

# ───────────────── ROUTES ─────────────────
@api.get("/")
async def api_root():
    return {
        "status": "ok",
        "message": "STEM Idea Generator API is alive 🚀",
        "time": datetime.utcnow().isoformat(),
    }

@api.get("/components/{component_id}/details")
async def get_component_details(component_id: str):
    """
    Get detailed component information including reviews, projects, and alternatives.
    
    This endpoint fetches comprehensive component data from Supabase using the
    get_component_details function defined in the database schema.
    
    Args:
        component_id: UUID of the component to fetch details for
        
    Returns:
        Detailed component information with related data
        
    Raises:
        HTTPException: If component not found or database error occurs
    """
    try:
        # For now, return mock data since we don't have Supabase connection in backend
        # In a real implementation, this would call the Supabase function
        
        # Mock detailed component data based on the schema
        mock_component_details = {
            "id": component_id,
            "name": "Arduino Uno R3",
            "description": "Popular microcontroller board based on ATmega328P, perfect for beginners and prototyping projects",
            "category": "Microcontrollers",
            "price": "$25.00",
            "manufacturer": "Arduino",
            "model_number": "A000066",
            "specifications": {
                "clock_speed": "16 MHz",
                "flash_memory": "32 KB",
                "sram": "2 KB",
                "eeprom": "1 KB",
                "digital_io_pins": "14",
                "analog_input_pins": "6",
                "pwm_pins": "6"
            },
            "tags": ["arduino", "microcontroller", "beginner", "popular", "atmega328p"],
            "dimensions": {
                "width": 68.6,
                "height": 53.4,
                "depth": 15,
                "unit": "mm"
            },
            "operating_voltage_min": 7.0,
            "operating_voltage_max": 12.0,
            "operating_current": 50.0,
            "interface_type": "USB/Serial",
            "pin_count": 30,
            "package_type": "DIP",
            "datasheet_url": "https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf",
            "reviews": [
                {
                    "id": "review-1",
                    "user_name": "MakerMike",
                    "rating": 5,
                    "review_text": "Perfect board for beginners! Great documentation and community support.",
                    "pros": ["Beginner-friendly", "Excellent documentation", "Large community", "Stable and reliable"],
                    "cons": ["Limited memory for complex projects", "No built-in WiFi"],
                    "use_case": "Learning electronics and programming basics",
                    "difficulty_level": "Beginner",
                    "created_at": "2024-01-15T10:30:00Z"
                },
                {
                    "id": "review-2",
                    "user_name": "TechEnthusiast",
                    "rating": 4,
                    "review_text": "Solid choice for most projects. Easy to work with and plenty of shields available.",
                    "pros": ["Wide shield compatibility", "Stable platform", "Good for prototyping"],
                    "cons": ["Limited processing power", "5V logic can be limiting"],
                    "use_case": "Home automation prototypes",
                    "difficulty_level": "Intermediate",
                    "created_at": "2024-01-10T14:20:00Z"
                }
            ],
            "projects": [
                {
                    "id": "project-1",
                    "project_name": "LED Blink Tutorial",
                    "project_description": "Learn the basics of Arduino programming by making an LED blink",
                    "difficulty_level": "Beginner",
                    "estimated_time": "30 minutes",
                    "project_url": "https://docs.arduino.cc/built-in-examples/basics/Blink"
                },
                {
                    "id": "project-2",
                    "project_name": "Temperature Monitor",
                    "project_description": "Build a temperature monitoring system with LCD display",
                    "difficulty_level": "Intermediate",
                    "estimated_time": "2 hours"
                },
                {
                    "id": "project-3",
                    "project_name": "Smart Home Controller",
                    "project_description": "Create a basic smart home controller with sensor integration",
                    "difficulty_level": "Advanced",
                    "estimated_time": "1 week"
                }
            ],
            "alternatives": [
                {
                    "id": "alt-1",
                    "name": "Arduino Nano",
                    "reason": "Smaller form factor, same functionality",
                    "compatibility_score": 9
                },
                {
                    "id": "alt-2",
                    "name": "ESP32 DevKit V1",
                    "reason": "More powerful with built-in WiFi and Bluetooth",
                    "compatibility_score": 7
                }
            ],
            "stats": {
                "average_rating": 4.5,
                "review_count": 2,
                "project_count": 3,
                "alternative_count": 2
            }
        }
        
        # Return different mock data based on component_id for variety
        if "esp32" in component_id.lower():
            mock_component_details.update({
                "name": "ESP32 DevKit V1",
                "description": "Powerful WiFi and Bluetooth enabled microcontroller for IoT projects",
                "price": "$12.00",
                "manufacturer": "Espressif",
                "model_number": "ESP32-WROOM-32",
                "specifications": {
                    "clock_speed": "240 MHz",
                    "flash_memory": "4 MB",
                    "sram": "520 KB",
                    "wifi": "802.11 b/g/n",
                    "bluetooth": "4.2",
                    "digital_io_pins": "34",
                    "analog_input_pins": "18",
                    "pwm_pins": "16"
                },
                "tags": ["esp32", "wifi", "bluetooth", "iot", "wireless", "dual-core"],
                "operating_voltage_min": 3.0,
                "operating_voltage_max": 3.6,
                "operating_current": 160.0,
                "interface_type": "WiFi/Bluetooth/SPI/I2C",
                "pin_count": 38,
                "package_type": "Module"
            })
        elif "dht22" in component_id.lower():
            mock_component_details.update({
                "name": "DHT22 Temperature Humidity Sensor",
                "description": "Digital temperature and humidity sensor with high accuracy and reliability",
                "category": "Sensors",
                "price": "$8.50",
                "manufacturer": "Aosong",
                "model_number": "AM2302",
                "specifications": {
                    "temperature_range": "-40 to 80°C",
                    "humidity_range": "0 to 100% RH",
                    "temperature_accuracy": "±0.5°C",
                    "humidity_accuracy": "±2% RH",
                    "resolution": "0.1°C, 0.1% RH",
                    "response_time": "2s"
                },
                "tags": ["dht22", "temperature", "humidity", "digital", "environmental"],
                "operating_voltage_min": 3.3,
                "operating_voltage_max": 6.0,
                "operating_current": 2.5,
                "interface_type": "Digital (One-Wire)",
                "pin_count": 4,
                "package_type": "Module"
            })
        
        logger.info(f"Fetched component details for ID: {component_id}")
        return mock_component_details
        
    except Exception as e:
        logger.error(f"Error fetching component details for {component_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch component details: {str(e)}"
        )

@api.get("/test-status")
async def test_status():
    """
    Simple test endpoint to verify backend deployment status and latest fixes
    """
    return {
        "status": "ok",
        "message": "Backend is running with latest fixes",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0-with-ai-fixes",
        "features": [
            "automatic_project_messaging",
            "enhanced_ai_guidance", 
            "stateless_service",
            "improved_error_handling",
            "fixed_indentation_errors",
            "enhanced_fallback_responses"
        ]
    }

@api.get("/health")
async def health():
    """
    Enhanced health check endpoint with comprehensive OpenRouter connectivity validation.
    
    Returns detailed health information including:
    - Basic service status
    - OpenRouter configuration status
    - OpenRouter API connectivity and authentication
    - Performance metrics from recent operations
    
    Requirements: 2.2
    """
    health_response = {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "service": {
            "name": "STEM Idea Generator API",
            "version": "1.0.0",
            "uptime": "running"
        },
        "openrouter": {
            "enabled": ENABLE_OPENROUTER,
            "configured": openrouter_config is not None,
            "client_initialized": openrouter_client is not None,
            "health_check_available": openrouter_health_check is not None
        }
    }
    
    # If OpenRouter is enabled and configured, perform health checks
    if openrouter_health_check:
        try:
            # Get current health status (from last check)
            current_health = openrouter_health_check.get_current_health_status()
            
            # Perform a quick periodic health check
            periodic_health = await openrouter_health_check.perform_periodic_health_check()
            
            health_response["openrouter"].update({
                "status": periodic_health["status"],
                "last_check": periodic_health["timestamp"],
                "response_time_seconds": periodic_health.get("response_time_seconds"),
                "details": periodic_health.get("details", {})
            })
            
            # Include metrics summary if structured logger is available
            if openrouter_structured_logger:
                metrics_summary = openrouter_structured_logger.metrics.get_metrics_summary()
                health_response["openrouter"]["metrics"] = {
                    "requests_total": metrics_summary["requests"]["total"],
                    "success_rate_percent": metrics_summary["requests"]["success_rate_percent"],
                    "average_response_time_seconds": metrics_summary["performance"]["average_response_time_seconds"],
                    "error_count": metrics_summary["errors"]["total_count"]
                }
            
            # Determine overall service status based on OpenRouter health
            if periodic_health["status"] == "unhealthy":
                health_response["status"] = "degraded"
                health_response["message"] = "OpenRouter API is unhealthy"
            elif periodic_health["status"] == "degraded":
                health_response["status"] = "degraded"
                health_response["message"] = "OpenRouter API is degraded"
            else:
                health_response["message"] = "All systems operational"
                
        except Exception as e:
            # Handle health check failures gracefully
            sanitized_error = APIKeySecurityValidator.sanitize_error_message(str(e), openrouter_config.api_key) if openrouter_config else str(e)
            
            health_response["status"] = "degraded"
            health_response["message"] = "Health check failed"
            health_response["openrouter"]["status"] = "unknown"
            health_response["openrouter"]["error"] = sanitized_error
            
            logger.warning(f"Health check failed: {sanitized_error}")
    
    elif ENABLE_OPENROUTER and openrouter_config:
        # OpenRouter is enabled but health check is not available
        health_response["openrouter"]["status"] = "unknown"
        health_response["openrouter"]["validation"] = openrouter_config.validate()
        health_response["message"] = "OpenRouter enabled but health check unavailable"
    
    else:
        # OpenRouter is disabled or not configured
        health_response["openrouter"]["status"] = "disabled"
        health_response["message"] = "OpenRouter disabled or not configured"
    
    return health_response

@api.get("/health/detailed")
async def detailed_health():
    """
    Detailed health check endpoint that performs comprehensive startup validation.
    
    This endpoint performs more thorough checks including:
    - Configuration validation
    - Network connectivity tests
    - API authentication verification
    - Basic API functionality testing
    
    Note: This endpoint may take longer to respond due to comprehensive testing.
    
    Requirements: 2.2
    """
    if not openrouter_health_check:
        return {
            "status": "unavailable",
            "timestamp": datetime.utcnow().isoformat(),
            "message": "Detailed health check not available - OpenRouter not configured",
            "openrouter": {
                "enabled": ENABLE_OPENROUTER,
                "configured": openrouter_config is not None
            }
        }
    
    try:
        # Perform comprehensive startup validation
        detailed_health_result = await openrouter_health_check.perform_startup_validation()
        
        # Add service information
        detailed_health_result["service"] = {
            "name": "STEM Idea Generator API",
            "version": "1.0.0",
            "timestamp": detailed_health_result["timestamp"]
        }
        
        # Include metrics if available
        if openrouter_structured_logger:
            metrics_summary = openrouter_structured_logger.metrics.get_metrics_summary()
            detailed_health_result["metrics"] = metrics_summary
        
        return detailed_health_result
        
    except Exception as e:
        # Handle detailed health check failures
        sanitized_error = APIKeySecurityValidator.sanitize_error_message(str(e), openrouter_config.api_key)
        
        return {
            "status": "error",
            "timestamp": datetime.utcnow().isoformat(),
            "message": "Detailed health check failed",
            "error": sanitized_error,
            "service": {
                "name": "STEM Idea Generator API",
                "version": "1.0.0"
            }
        }

@api.post("/generate-project", response_model=GeneratedProject)
async def generate_project(params: ProjectParams):
    # Perform startup health validation on first request
    global _startup_validation_performed
    if not _startup_validation_performed and openrouter_health_check:
        await perform_startup_health_validation()
        _startup_validation_performed = True
    
    interests_context = f"The user's specific idea/interest is: {params.interests}" if params.interests and params.interests.strip() else "No specific idea provided — create a creative and practical project."
    budget_context = f"Budget constraint: {params.budget}." if params.budget and params.budget.strip() else ""
    duration_context = f"Target duration: {params.duration}." if params.duration and params.duration.strip() else ""
    
    prompt = f"""
You are a STEM project idea generator. Create a SPECIFIC, CREATIVE, and REALISTIC project idea.

Project Requirements:
- Domain: {params.projectType}
- Skill Level: {params.skillLevel}
- {interests_context}
- {budget_context}
- {duration_context}

IMPORTANT RULES:
1. The title MUST be a SPECIFIC project name (e.g. "Solar-Powered Plant Watering Bot" not "robotics Project")
2. The description MUST describe THIS SPECIFIC project, not a generic one
3. The steps MUST be specific to building this exact project
4. If the user gave a specific idea/interest, build the project around THAT idea

Return a valid JSON object with EXACTLY these fields:
{{
  "title": "[Specific creative project name]",
  "description": "[2-3 sentences describing this specific project and what it does]",
  "difficulty": "{params.skillLevel}",
  "estimatedTime": "[realistic time like '3-6 weeks']",
  "estimatedCost": "[cost range like '$50-150']",
  "components": ["[specific component 1]", "[specific component 2]", ...],
  "skills": ["[specific skill 1]", "[specific skill 2]", ...],
  "steps": ["[detailed step 1]", "[detailed step 2]", ...]
}}

Return ONLY the JSON object, no markdown, no extra text."""

    try:
        # Use gemini-2.5-flash-free specifically for project idea generation as it's better at JSON
        ai_text = await call_openrouter(prompt, model="google/gemini-2.5-flash:free")
        
        # Enhanced JSON parsing to handle various response formats
        json_data = None
        
        # Try to extract JSON from markdown code blocks first
        if "```json" in ai_text:
            start = ai_text.find("```json") + 7
            end = ai_text.find("```", start)
            if end != -1:
                json_text = ai_text[start:end].strip()
                try:
                    json_data = json.loads(json_text)
                except json.JSONDecodeError:
                    logger.warning("Failed to parse JSON from markdown code block")
        
        # If no markdown code block, try to find JSON object
        if json_data is None:
            start = ai_text.find("{")
            end = ai_text.rfind("}")
            if start != -1 and end != -1:
                json_text = ai_text[start:end + 1]
                try:
                    json_data = json.loads(json_text)
                except json.JSONDecodeError:
                    logger.warning("Failed to parse JSON from extracted text")
        
        # If we successfully parsed JSON, validate and return it
        if json_data:
            # Create project-specific defaults based on project type
            project_type = (params.projectType or 'electronics').lower()
            skill_level = params.skillLevel or 'Beginner'
            
            # Project-specific component mappings
            component_mappings = {
                'robotics': {
                    'Beginner': ['Arduino Uno', 'DC Motors (2x)', 'Motor Driver L298N', 'Ultrasonic Sensor HC-SR04', 'Chassis Kit', 'Wheels (4x)', 'Battery Pack 9V', 'Jumper Wires'],
                    'Intermediate': ['Arduino Mega', 'Servo Motors (2x)', 'Stepper Motors', 'IMU Sensor MPU6050', 'Camera Module', 'Bluetooth Module HC-05', 'Custom Chassis', 'LiPo Battery'],
                    'Advanced': ['Raspberry Pi 4', 'LIDAR Sensor', 'Encoders', 'ROS Compatible Hardware', 'AI Processing Unit', 'Advanced Sensors Suite', 'Custom PCB', 'High-Capacity Battery'],
                    'Expert': ['NVIDIA Jetson', 'Computer Vision Cameras', 'Advanced SLAM Sensors', 'Custom Actuators', 'Machine Learning Hardware', 'Professional Grade Components', 'Custom Manufacturing']
                },
                'iot': {
                    'Beginner': ['ESP32 Development Board', 'DHT22 Temperature Sensor', 'LED Indicators', 'Breadboard', 'Resistors Kit', 'WiFi Router', 'Mobile App Platform', 'Cloud Service Account'],
                    'Intermediate': ['NodeMCU ESP8266', 'Multiple Sensors Suite', 'OLED Display', 'Relay Modules', 'MQTT Broker', 'Database Service', 'Custom Enclosure', 'Power Management'],
                    'Advanced': ['ESP32-CAM', 'LoRaWAN Modules', 'Edge Computing Unit', 'Industrial Sensors', 'Mesh Network Hardware', 'Advanced Analytics Platform', 'Solar Power System'],
                    'Expert': ['Custom IoT Gateway', 'AI Edge Processors', 'Industrial IoT Protocols', 'Enterprise Cloud Platform', 'Advanced Security Hardware', 'Scalable Infrastructure']
                },
                'electronics': {
                    'Beginner': ['Arduino Nano', 'LED Matrix 8x8', 'Resistors (220Ω, 1kΩ)', 'Capacitors (100µF)', 'Breadboard', 'LCD Display 16x2', 'Push Buttons', 'Battery Holder'],
                    'Intermediate': ['Microcontroller ATmega328P', 'Op-Amps LM358', 'Transistors (NPN, PNP)', 'Voltage Regulators', 'PCB Board', 'Oscilloscope Probes', 'Function Generator'],
                    'Advanced': ['FPGA Development Board', 'High-Speed ADC/DAC', 'RF Modules', 'Custom IC Design Tools', 'Professional PCB Fabrication', 'Signal Analyzers'],
                    'Expert': ['Custom ASIC Design', 'High-Frequency Components', 'Professional Test Equipment', 'Advanced Simulation Software', 'Cleanroom Fabrication Access']
                },
                'automation': {
                    'Beginner': ['Arduino Uno', 'Relay Modules (4-channel)', 'PIR Motion Sensor', 'Light Dependent Resistor', 'Solenoid Valve', 'Timer Modules', 'Power Supply 12V', 'Control Panel'],
                    'Intermediate': ['PLC Controller', 'Industrial Relays', 'Proximity Sensors', 'Pneumatic Actuators', 'HMI Touch Screen', 'Variable Frequency Drive', 'Industrial Enclosure'],
                    'Advanced': ['SCADA System', 'Industrial IoT Gateway', 'Advanced PLC', 'Servo Control Systems', 'Vision Inspection System', 'Robotic Arms', 'Safety Systems'],
                    'Expert': ['Distributed Control System', 'AI-Powered Automation', 'Industrial Robotics', 'Advanced Process Control', 'Enterprise Integration', 'Custom Automation Solutions']
                },
                'sensors': {
                    'Beginner': ['Arduino Uno', 'Temperature Sensor DS18B20', 'Humidity Sensor DHT11', 'Light Sensor LDR', 'SD Card Module', 'RTC Module', 'LCD Display', 'Data Logger Shield'],
                    'Intermediate': ['Data Acquisition System', 'Pressure Sensors', 'Gas Sensors MQ Series', 'Accelerometer ADXL345', 'Wireless Transmission', 'Database Storage', 'Calibration Standards'],
                    'Advanced': ['High-Precision Sensors', 'Multi-Channel DAQ', 'Industrial Protocols', 'Edge Computing', 'Machine Learning Processing', 'Professional Calibration Equipment'],
                    'Expert': ['Research-Grade Instruments', 'Custom Sensor Development', 'Advanced Signal Processing', 'Metrology Standards', 'Publication-Quality Data Systems']
                },
                'web-development': {
                    'Beginner': ['HTML5', 'CSS3', 'JavaScript (ES6+)', 'Visual Studio Code', 'Git & GitHub', 'Chrome DevTools', 'Responsive Design Framework', 'Web Hosting Service'],
                    'Intermediate': ['React.js or Vue.js', 'Node.js & Express', 'MongoDB or PostgreSQL', 'REST API Design', 'Authentication System', 'CSS Preprocessor (Sass/Less)', 'Build Tools (Webpack/Vite)', 'Domain & SSL Certificate'],
                    'Advanced': ['TypeScript', 'Next.js or Nuxt.js', 'GraphQL', 'Docker & Containerization', 'CI/CD Pipeline', 'Cloud Services (AWS/Vercel)', 'Performance Optimization', 'SEO & Analytics'],
                    'Expert': ['Microservices Architecture', 'Kubernetes', 'Advanced Security Implementation', 'Custom Framework Development', 'Enterprise Scalability', 'Advanced DevOps', 'Performance Monitoring', 'Multi-region Deployment']
                },
                'mobile-apps': {
                    'Beginner': ['React Native or Flutter', 'Android Studio/Xcode', 'JavaScript/Dart', 'Mobile UI Components', 'Device Testing Setup', 'App Store Accounts', 'Basic State Management', 'Push Notification Service'],
                    'Intermediate': ['Native Development (Swift/Kotlin)', 'Advanced State Management', 'API Integration', 'Local Database (SQLite)', 'Camera & GPS Integration', 'App Analytics', 'In-App Purchases', 'Beta Testing Platform'],
                    'Advanced': ['Cross-Platform Architecture', 'Offline Data Sync', 'Advanced Animations', 'Custom Native Modules', 'Performance Optimization', 'Advanced Security', 'CI/CD for Mobile', 'App Store Optimization'],
                    'Expert': ['Enterprise Mobile Solutions', 'Custom Framework Development', 'Advanced Native Integration', 'Scalable Backend Architecture', 'Advanced Analytics & ML', 'Multi-platform Distribution', 'Enterprise Security', 'Custom Development Tools']
                },
                'desktop-software': {
                    'Beginner': ['Python (Tkinter/PyQt)', 'Visual Studio Code', 'Git Version Control', 'Basic GUI Framework', 'File System Operations', 'User Input Handling', 'Error Handling', 'Application Packaging'],
                    'Intermediate': ['Electron.js or Tauri', 'Database Integration', 'Multi-threading', 'File Processing', 'System Integration', 'Auto-updater', 'Installer Creation', 'Cross-platform Compatibility'],
                    'Advanced': ['Native Development (C++/C#)', 'Advanced UI Frameworks', 'Performance Optimization', 'System-level Integration', 'Plugin Architecture', 'Advanced Security', 'Memory Management', 'Professional Distribution'],
                    'Expert': ['Custom Framework Development', 'System Driver Integration', 'Enterprise Architecture', 'Advanced Performance Tuning', 'Custom Compiler/Interpreter', 'Advanced Security Implementation', 'Large-scale Distribution', 'Professional Support Systems']
                },
                'game-development': {
                    'Beginner': ['Unity 3D or Godot', 'C# or GDScript', 'Basic 3D Modeling (Blender)', 'Sprite Creation Tools', 'Audio Editing Software', 'Version Control (Git)', 'Game Assets Library', 'Platform SDK'],
                    'Intermediate': ['Advanced Game Engine Features', 'Physics Systems', 'AI & Pathfinding', 'Multiplayer Networking', 'Advanced Graphics', 'Sound Design Tools', 'Performance Profiling', 'Platform-specific Optimization'],
                    'Advanced': ['Custom Engine Development', 'Advanced Rendering Techniques', 'VR/AR Integration', 'Advanced AI Systems', 'Custom Shaders', 'Advanced Networking', 'Performance Optimization', 'Multi-platform Publishing'],
                    'Expert': ['AAA Game Engine Architecture', 'Advanced Graphics Programming', 'Custom Tool Development', 'Enterprise Game Systems', 'Advanced Performance Engineering', 'Custom Platform Integration', 'Advanced Analytics', 'Professional Game Distribution']
                },
                'ai-ml': {
                    'Beginner': ['Python', 'Jupyter Notebook', 'Pandas & NumPy', 'Scikit-learn', 'Matplotlib/Seaborn', 'Dataset Sources', 'Google Colab', 'Basic ML Algorithms'],
                    'Intermediate': ['TensorFlow or PyTorch', 'Deep Learning Frameworks', 'GPU Computing (CUDA)', 'Advanced Data Processing', 'Model Deployment Tools', 'MLOps Basics', 'Cloud ML Services', 'Advanced Visualization'],
                    'Advanced': ['Custom Neural Networks', 'Advanced Deep Learning', 'Distributed Training', 'Model Optimization', 'Production ML Systems', 'Advanced MLOps', 'Edge AI Deployment', 'Research-level Implementation'],
                    'Expert': ['Custom Framework Development', 'Advanced Research Implementation', 'Large-scale ML Systems', 'Custom Hardware Integration', 'Advanced Optimization Techniques', 'Enterprise ML Architecture', 'Custom AI Chips', 'Research Publication Systems']
                }
            }
            
            # Get project-specific components or fallback to electronics
            project_components = component_mappings.get(project_type, component_mappings['electronics'])
            default_components = project_components.get(skill_level, project_components['Beginner'])
            
            # Project-specific skills
            skill_mappings = {
                'robotics': ['Robot mechanics', 'Motor control', 'Sensor integration', 'Path planning', 'Programming in C++/Python'],
                'iot': ['IoT protocols (MQTT/HTTP)', 'WiFi connectivity', 'Cloud integration', 'Data visualization', 'Mobile app development'],
                'electronics': ['Circuit design', 'Component selection', 'PCB layout', 'Signal analysis', 'Embedded programming'],
                'automation': ['Control systems', 'PLC programming', 'Industrial protocols', 'Safety systems', 'Process optimization'],
                'sensors': ['Sensor calibration', 'Data acquisition', 'Signal processing', 'Statistical analysis', 'Measurement uncertainty'],
                'web-development': ['HTML/CSS/JavaScript', 'Frontend frameworks', 'Backend development', 'Database design', 'API development', 'Responsive design'],
                'mobile-apps': ['Mobile UI/UX design', 'Cross-platform development', 'API integration', 'App store deployment', 'Mobile performance optimization'],
                'desktop-software': ['GUI development', 'System integration', 'File management', 'Cross-platform compatibility', 'Software architecture'],
                'game-development': ['Game design principles', '3D modeling & animation', 'Physics simulation', 'Game engine programming', 'User experience design'],
                'ai-ml': ['Machine learning algorithms', 'Data preprocessing', 'Model training & evaluation', 'Deep learning', 'AI deployment & optimization']
            }
            
            default_skills = skill_mappings.get(project_type, skill_mappings['electronics'])
            
            # Enhanced defaults with project-specific values
            required_fields = {
                'title': f"{params.projectType or 'STEM'} Project",
                'description': f"A {skill_level.lower()}-level {project_type} project",
                'difficulty': skill_level,
                'estimatedTime': params.duration or '3-6 weeks',
                'estimatedCost': params.budget or '$50-150',
                'components': default_components,
                'skills': default_skills + ['Problem solving', 'Project documentation'],
                'steps': [
                    'Research project requirements and gather information',
                    'Create detailed project plan and timeline',
                    'Order required components and materials',
                    'Set up development environment and tools',
                    'Build and test individual components',
                    'Integrate components into complete system',
                    'Test functionality and debug issues',
                    'Optimize performance and add features',
                    'Create project documentation',
                    'Present and demonstrate final project'
                ]
            }
            
            # Fill in missing fields with defaults
            for field, default_value in required_fields.items():
                if field not in json_data or not json_data[field]:
                    json_data[field] = default_value
            
            # Ensure lists are actually lists
            for list_field in ['components', 'skills', 'steps']:
                if not isinstance(json_data.get(list_field), list):
                    json_data[list_field] = required_fields[list_field]
            
            logger.info(f"Successfully parsed AI response: {json_data.get('title', 'Unknown')}")
            return GeneratedProject(**json_data)
        else:
            logger.warning("AI response does not contain valid JSON, falling back to local generator")
            
    except RuntimeError as e:
        # Handle OpenRouter API errors by falling back to local generator
        error_str = str(e)
        logger.warning(f"AI generation failed with error: {error_str}, falling back to local generator")
    except Exception as e:
        # Handle unexpected errors by falling back to local generator
        logger.warning(f"Unexpected error during AI generation: {e}, falling back to local generator")

    # Fallback to local generator for any errors
    logger.info("Using local fallback generator for project creation")
    return local_generator(params)

# ───────────────── AI GUIDANCE ENDPOINTS ─────────────────

# Import AI guidance models and services
from models.ai_guidance import ChatRequest, ChatResponse, ContextResponse, HistoryResponse
from services.stateless_ai_guidance_service import StatelessAIGuidanceService

# Project sync models
class ProjectSyncRequest(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    estimatedTime: str
    estimatedCost: str
    components: List[str]
    skills: List[str]
    steps: List[str]
    status: str = "planning"
    progress: int = 0
    notes: str = ""
    starred: bool = False
    tags: List[str] = []
    completed_steps: List[int] = []
    generated_from_params: Dict[str, Any] = {}
    created_at: str
    updated_at: str

class ProjectSyncResponse(BaseModel):
    success: bool
    project_id: str
    message: str

# Initialize stateless AI guidance service (no database persistence)
# Pass the OpenRouter client to the service to avoid circular import issues
ai_guidance_service = StatelessAIGuidanceService()
# Set the OpenRouter client after initialization to avoid circular imports
if openrouter_client:
    ai_guidance_service.openrouter_client = openrouter_client
    ai_guidance_service.openrouter_config = openrouter_config
    logger.info("OpenRouter client connected to AI guidance service")
else:
    logger.warning("AI guidance service will use fallback responses - OpenRouter client not available")

# ───────────────── STREAMING ENDPOINT ─────────────────
from fastapi.responses import StreamingResponse
import asyncio

@api.post("/generate-project-stream")
async def generate_project_stream(params: ProjectParams):
    """
    Streaming endpoint for real-time AI project generation.
    Returns Server-Sent Events (SSE) with project data as it's generated.
    """
    async def generate_stream():
        try:
            interests_context = f"The user's specific idea/interest is: {params.interests}" if params.interests and params.interests.strip() else "No specific idea provided — create a creative and practical project."
            budget_context = f"Budget constraint: {params.budget}." if params.budget and params.budget.strip() else ""
            duration_context = f"Target duration: {params.duration}." if params.duration and params.duration.strip() else ""

            prompt = f"""You are a STEM project idea generator. Create a SPECIFIC, CREATIVE, and REALISTIC project idea.

Project Requirements:
- Domain: {params.projectType}
- Skill Level: {params.skillLevel}
- {interests_context}
- {budget_context}
- {duration_context}

IMPORTANT RULES:
1. The title MUST be a SPECIFIC project name (e.g. "Solar-Powered Plant Watering Bot" not "robotics Project")
2. The description MUST describe THIS SPECIFIC project, not a generic one
3. The steps MUST be specific to building this exact project
4. If the user gave a specific idea/interest, build the project around THAT idea

Return a valid JSON object with EXACTLY these fields:
{{"title": "[Specific creative project name]", "description": "[2-3 sentences]", "difficulty": "{params.skillLevel}", "estimatedTime": "[e.g. 3-6 weeks]", "estimatedCost": "[e.g. $50-150]", "components": ["item1", "item2"], "skills": ["skill1", "skill2"], "steps": ["step1", "step2"]}}

Return ONLY the JSON object, no markdown, no extra text."""
            
            # Build real streaming request to OpenRouter
            import requests
            
            if not openrouter_client:
                raise RuntimeError("OpenRouter client is not initialized.")
                
            config = openrouter_client.config
            headers = {
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://stemidea.vercel.app",
                "X-Title": "STEM Idea Generator"
            }
            body = {
                "model": "google/gemini-2.5-flash:free",
                "messages": [{"role": "user", "content": prompt}],
                "stream": True,
                "include_reasoning": False
            }
            
            response = requests.post(
                f"{config.base_url}/chat/completions",
                headers=headers,
                json=body,
                stream=True,
                timeout=120
            )
            response.raise_for_status()
            
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        data_str = line_str[6:]
                        if data_str == '[DONE]':
                            continue
                        try:
                            chunk_data = json.loads(data_str)
                            choice = chunk_data.get('choices', [{}])[0]
                            delta = choice.get('delta', {})
                            content = delta.get('content') or ''
                            reasoning = delta.get('reasoning') or ''
                            
                            if content or reasoning:
                                # Stream the chunk including thinking
                                yield f"data: {json.dumps({'content': content, 'reasoning': reasoning})}\n\n"
                                await asyncio.sleep(0.01) # Yield to event loop
                        except json.JSONDecodeError:
                            pass
                        except Exception as e:
                            logger.error(f"Error parsing chunk: {e}")
            
            # Send completion signal
            yield f"data: {json.dumps({'content': '', 'reasoning': '', 'complete': True})}\n\n"
            yield "data: [DONE]\n\n"
            
        except requests.exceptions.HTTPError as he:
            err_msg = f"API Error: {he}"
            if he.response:
                try:
                    err_msg += f" {he.response.json()}"
                except:
                    err_msg += f" {he.response.text}"
            logger.error(err_msg)
            yield f"data: {json.dumps({'error': str(err_msg)})}\n\n"
        except Exception as e:
            logger.error(f"Streaming error: {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Connection": "keep-alive",
        }
    )

@api.post("/projects/sync", response_model=ProjectSyncResponse)
async def sync_project(request: ProjectSyncRequest):
    """
    Sync a project from frontend to backend database (optional for AI context)
    This endpoint allows the frontend to sync localStorage projects to the backend
    If sync fails, it's not critical since projects are stored in localStorage
    
    Args:
        request: Project data from frontend
        
    Returns:
        ProjectSyncResponse with sync status
    """
    try:
        # Validate project ID format (must be UUID)
        try:
            import uuid
            uuid.UUID(request.id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid project ID format",
                    "code": "invalid_project_id",
                    "message": "Project ID must be a valid UUID"
                }
            )
        
        # Try to sync to database for AI context (optional)
        try:
            # Get database client
            from database.connection import get_db_client
            client = await get_db_client()
            
            # Prepare project data for database (only include columns that exist)
            project_data = {
                "id": request.id,
                "title": request.title,
                "description": request.description,
                "difficulty": request.difficulty,
                "estimated_time": request.estimatedTime,
                "estimated_cost": request.estimatedCost,
                "status": request.status,
                "progress": request.progress,
                "notes": request.notes,
                "starred": request.starred,
                "created_at": request.created_at,
                "updated_at": request.updated_at
            }
            
            # Add optional fields that might exist in the database
            if hasattr(request, 'project_type') or request.generated_from_params.get("projectType"):
                project_data["project_type"] = request.generated_from_params.get("projectType")
            
            # Handle array fields - convert to JSON strings if the database expects them
            try:
                project_data["components"] = request.components
                project_data["skills"] = request.skills  
                project_data["steps"] = request.steps
                project_data["tags"] = request.tags
            except:
                # If array fields fail, store as JSON
                project_data["components"] = json.dumps(request.components)
                project_data["skills"] = json.dumps(request.skills)
                project_data["steps"] = json.dumps(request.steps)
                project_data["tags"] = json.dumps(request.tags)
            
            # Handle JSONB fields
            project_data["generated_from_params"] = request.generated_from_params
            
            # Check if project exists
            existing_result = client.table('projects').select('id').eq('id', request.id).execute()
            
            if existing_result.data:
                # Update existing project
                result = client.table('projects').update(project_data).eq('id', request.id).execute()
                message = "Project updated successfully in database"
            else:
                # Insert new project
                result = client.table('projects').insert(project_data).execute()
                message = "Project created successfully in database"
            
            logger.info(f"Project {request.id} synced to database: {request.title}")
            
            return ProjectSyncResponse(
                success=True,
                project_id=request.id,
                message=message
            )
            
        except Exception as db_error:
            # Database sync failed, but that's OK since we use localStorage
            logger.warning(f"Database sync failed for project {request.id}, but continuing: {db_error}")
            
            return ProjectSyncResponse(
                success=True,  # Still success since localStorage is primary
                project_id=request.id,
                message="Project saved to localStorage (database sync optional)"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in project sync for {request.id}: {e}")
        # Return success anyway since localStorage is the primary storage
        return ProjectSyncResponse(
            success=True,
            project_id=request.id,
            message="Project saved to localStorage (sync completed)"
        )

@api.post("/projects/{project_id}/guidance/chat", response_model=ChatResponse)
async def chat_endpoint(project_id: str, request: ChatRequest):
    """
    Handle chat requests with message processing and AI response generation
    Uses stateless processing - no chat history is persisted to database
    Frontend manages chat history via localStorage
    
    Requirements: 2.2, 2.3, 5.1
    Task: 4.1 Implement chat endpoint (POST /api/projects/{projectId}/guidance/chat)
    
    Args:
        project_id: ID of the project
        request: Chat request with message and optional session ID
        
    Returns:
        AI-generated response with suggestions and next steps
        
    Raises:
        HTTPException: If validation fails or service errors occur
    """
    try:
        # Validate project_id format
        try:
            import uuid
            uuid.UUID(project_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid project ID format",
                    "code": "invalid_project_id",
                    "message": "Project ID must be a valid UUID"
                }
            )
        
        # Process the chat request using the stateless AI guidance service
        response = await ai_guidance_service.process_chat_request(
            project_id=project_id,
            request=request
        )
        
        logger.info(f"Processed stateless chat request for project {project_id}")
        return response
        
    except HTTPException as e:
        # Re-raise HTTP exceptions as-is
        raise e
    except ValueError as e:
        logger.error(f"Validation error in chat endpoint: {e}")
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Validation failed",
                "code": "validation_error",
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Error in chat endpoint for project {project_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "code": "server_error",
                "message": "An unexpected error occurred while processing your request"
            }
        )

@api.get("/projects/{project_id}/guidance/context", response_model=ContextResponse)
async def get_project_context(project_id: str):
    """
    Get project context and initial recommendations
    
    Requirements: 3.1, 7.3
    Task: 4.2 Implement context endpoint (GET /api/projects/{projectId}/guidance/context)
    
    Args:
        project_id: ID of the project
        
    Returns:
        Project context with recommendations
        
    Raises:
        HTTPException: If project not found or service errors occur
    """
    try:
        # Validate project_id format
        try:
            import uuid
            uuid.UUID(project_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid project ID format",
                    "code": "invalid_project_id",
                    "message": "Project ID must be a valid UUID"
                }
            )
        
        # Get project context from the stateless AI guidance service
        project_context = await ai_guidance_service.get_project_context(project_id)
        
        # Generate initial recommendations (always return something, even if no project found)
        recommendations = []
        
        if project_context:
            # Add progress-based recommendations
            if project_context.progress < 25:
                recommendations.append("Start by defining clear project goals and requirements")
                recommendations.append("Create a detailed project timeline with milestones")
            elif project_context.progress < 50:
                recommendations.append("Focus on completing your current active tasks")
                recommendations.append("Review your progress against planned milestones")
            elif project_context.progress < 75:
                recommendations.append("You're making great progress - focus on testing and refinement")
                recommendations.append("Consider documenting your work for future reference")
            else:
                recommendations.append("Excellent progress! Focus on final testing and documentation")
                recommendations.append("Consider sharing your project with others")
            
            # Add project-type specific recommendations
            if "robot" in project_context.title.lower():
                recommendations.append("Test individual components before full system integration")
            elif "iot" in project_context.title.lower() or "sensor" in project_context.description.lower():
                recommendations.append("Ensure reliable data collection and connectivity")
            elif "app" in project_context.title.lower():
                recommendations.append("Focus on user experience and interface design")
        else:
            # Default recommendations when no project context is found
            recommendations = [
                "Welcome to AI Project Guidance!",
                "Start by clearly defining your project goals",
                "Break down your project into manageable tasks",
                "Consider what resources and materials you'll need",
                "Set realistic timelines for each phase"
            ]
        
        # Create response
        response = ContextResponse(
            project=project_context,
            recommendations=recommendations[:5]  # Limit to 5 recommendations
        )
        
        logger.info(f"Retrieved project context for {project_id}")
        return response
        
    except HTTPException as e:
        # Re-raise HTTP exceptions as-is
        raise e
    except Exception as e:
        logger.error(f"Error getting project context for {project_id}: {e}")
        # Return a helpful response instead of 500 error
        return ContextResponse(
            project=None,
            recommendations=[
                "Welcome to AI Project Guidance!",
                "I'm here to help you with your project",
                "Feel free to ask me any questions",
                "Let's work together to make your project successful"
            ]
        )

@api.get("/projects/{project_id}/guidance/history", response_model=HistoryResponse)
async def get_chat_history(project_id: str, session_id: Optional[str] = None, limit: int = 100):
    """
    Get chat session history for a project
    
    Requirements: 2.3, 7.3
    Task: 4.3 Implement history endpoint (GET /api/projects/{projectId}/guidance/history)
    
    Args:
        project_id: ID of the project
        session_id: Optional specific session ID to retrieve
        limit: Maximum number of messages to retrieve (default: 100)
        
    Returns:
        Chat history with messages and session information
        
    Raises:
        HTTPException: If validation fails or service errors occur
    """
    try:
        # Validate project_id format
        try:
            import uuid
            uuid.UUID(project_id)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid project ID format",
                    "code": "invalid_project_id",
                    "message": "Project ID must be a valid UUID"
                }
            )
        
        # Validate session_id format if provided
        if session_id:
            try:
                uuid.UUID(session_id)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "Invalid session ID format",
                        "code": "invalid_session_id",
                        "message": "Session ID must be a valid UUID"
                    }
                )
        
        # Validate limit parameter
        if limit <= 0 or limit > 1000:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid limit parameter",
                    "code": "invalid_limit",
                    "message": "Limit must be between 1 and 1000"
                }
            )
        
        # If session_id is provided, get history for that specific session
        if session_id:
            messages = await ai_guidance_service.get_chat_history(session_id, limit=limit)
            response_session_id = session_id
        else:
            # If no session_id provided, get the most recent session for the project
            # For now, we'll return an empty history since we don't have a method to get
            # the most recent session by project. In a full implementation, you'd add
            # a method to get the most recent session for a project.
            messages = []
            response_session_id = ""
        
        response = HistoryResponse(
            messages=messages,
            session_id=response_session_id
        )
        
        logger.info(f"Retrieved chat history for project {project_id}, session {session_id}: {len(messages)} messages")
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error getting chat history for project {project_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "code": "internal_error",
                "message": "An error occurred while retrieving chat history. Please try again."
            }
        )


# Voice processing models
class VoiceProcessRequest(BaseModel):
    transcript: str
    timestamp: str
    context: Optional[Dict[str, Any]] = {}

class VoiceProcessResponse(BaseModel):
    text: str
    action: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    needs_more_info: bool = False
    conversation_context: Optional[Dict[str, Any]] = None


@api.post("/ai-guidance/process-voice", response_model=VoiceProcessResponse)
async def process_voice_command(request: VoiceProcessRequest):
    """
    Process voice commands and chat messages with AI.
    Provides intelligent responses, guides users, and handles multi-turn conversations.
    """
    try:
        # App knowledge base - comprehensive information about the app
        app_knowledge = """
        # STEM Idea Generator App - Complete Guide
        
        ## App Overview
        This is a STEM (Science, Technology, Engineering, Math) project idea generator and learning platform.
        It helps students, makers, and educators create, organize, and learn about STEM projects.
        
        ## Main Pages & Features:
        
        1. **Dashboard** (/dashboard)
           - Overview of all your projects
           - Quick access to saved projects
           - Project statistics and progress tracking
        
        2. **Project Lab / Generator** (/generator)
           - AI-powered project generation
           - Fill in: Domain (Robotics, IoT, Electronics, Automation, Sensors)
           - Set: Expertise level (Beginner, Intermediate, Advanced, Expert)
           - Describe: Your vision/goal for the project
           - Set: Budget and Timeline
           - Click "Generate Architecture" to create a custom project
           - Generated projects include: Title, Description, Difficulty, Timeline, Cost, Components (BOM), Learning Outcomes, and Implementation Roadmap
           - Save projects to your library
        
        3. **Components Catalog** (/components)
           - Browse electronic components and parts
           - Search for Arduino, Raspberry Pi, sensors, motors, etc.
           - View component details and specifications
           - Compare components
        
        4. **Library** (/library)
           - View all your saved projects
           - Organize and manage projects
           - Track project progress
           - Add notes and mark steps as complete
        
        5. **Learning Hub** (/learn)
           - Educational content about STEM topics
           - Tutorials and guides
           - Learn about electronics, programming, robotics
        
        6. **Profile** (/profile)
           - Manage your account settings
           - View your activity
           - Customize preferences
        
        ## How to Create a Project:
        1. Go to "Project Lab" (Generator page)
        2. Select your project domain (what type of project you want)
        3. Choose your skill level
        4. Describe what you want to build in "The Vision" field
        5. Set your budget and timeline (optional)
        6. Click "Generate Architecture"
        7. Review the generated project
        8. Click "Save Lab" to add it to your library
        
        ## Voice Commands Examples:
        - "Create a new project" → Redirects to Generator
        - "Show my projects" → Go to Library
        - "Open components" → Go to Components Catalog
        - "Go to dashboard" → Opens Dashboard
        - "Help me learn" → Opens Learning Hub
        
        ## Universal Chat:
        - Press Ctrl+K to open/close chat
        - Ask questions about the app, features, or STEM topics
        - Get guided help on creating projects
        - Voice input available (click microphone icon)
        """
        
        transcript = request.transcript.lower().strip()
        context = request.context or {}
        
        # Build system prompt with app knowledge
        system_prompt = f"""{app_knowledge}
        
        You are an intelligent AI assistant for the STEM Idea Generator app. Your role is to:
        1. Answer questions about the app and its features
        2. Guide users on how to use the app
        3. Help users create STEM projects
        4. Understand user intents and execute appropriate actions
        5. Engage in natural, helpful conversations
        
        IMPORTANT: When users want to create a project and you have enough information, you should:
        1. Extract the project details from their message:
           - Project type: robotics, iot, electronics, automation, sensors
           - Skill level: beginner, intermediate, advanced, expert
           - Vision/interests: what they want to build
           - Budget and timeline if mentioned
        2. Respond that you'll redirect them to the Generator page with pre-filled information
        
        When users want to create a project, gather necessary details in a conversational way:
        - What domain/type of project (Robotics, IoT, Electronics, Automation, Sensors)?
        - What skill level (Beginner, Intermediate, Advanced, Expert)?
        - What is their vision/goal?
        - Budget and timeline (optional)
        
        Be concise, friendly, and helpful. When you have enough information to create a project,
        indicate that you'll redirect them to the Generator page with pre-filled information.
        """
        
        # Detect user intent
        intent = None
        project_details = context.get('project_details', {})
        
        # Project creation intents
        if any(keyword in transcript for keyword in ['create', 'generate', 'make', 'build', 'new project', 'new idea']):
            intent = 'create_project'
            print(f"DEBUG: Set intent to 'create_project' based on keywords in transcript: {transcript}")
        # Navigation intents
        elif any(keyword in transcript for keyword in ['go to', 'open', 'show', 'navigate']):
            if 'dashboard' in transcript or 'home' in transcript:
                return VoiceProcessResponse(
                    text="Opening your dashboard where you can see all your projects.",
                    action='navigate',
                    parameters={'path': '/dashboard'}
                )
            elif 'generator' in transcript or 'project lab' in transcript or 'lab' in transcript:
                return VoiceProcessResponse(
                    text="Taking you to the Project Lab to create new ideas.",
                    action='navigate',
                    parameters={'path': '/generator'}
                )
            elif 'component' in transcript or 'parts' in transcript or 'catalog' in transcript:
                return VoiceProcessResponse(
                    text="Opening the Components Catalog for you.",
                    action='navigate',
                    parameters={'path': '/components'}
                )
            elif 'library' in transcript or 'saved' in transcript or 'my project' in transcript:
                return VoiceProcessResponse(
                    text="Opening your Library where you can view all saved projects.",
                    action='navigate',
                    parameters={'path': '/library'}
                )
            elif 'learn' in transcript or 'tutorial' in transcript or 'education' in transcript:
                return VoiceProcessResponse(
                    text="Opening the Learning Hub for you.",
                    action='navigate',
                    parameters={'path': '/learn'}
                )
            elif 'profile' in transcript or 'account' in transcript or 'settings' in transcript:
                return VoiceProcessResponse(
                    text="Opening your Profile page.",
                    action='navigate',
                    parameters={'path': '/profile'}
                )
        # Help intents
        elif any(keyword in transcript for keyword in ['help', 'how to', 'how do i', 'guide', 'tutorial']):
            intent = 'help'
        
        # Use AI to process the request
        if openrouter_client and openrouter_config:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": transcript}
            ]
            
            # Add conversation context if available
            if 'conversation_history' in context:
                for msg in context['conversation_history'][-5:]:  # Last 5 messages
                    messages.insert(-1, msg)
            
            try:
                response = await openrouter_client.generate_completion(messages, temperature=0.7, max_tokens=2000)
                ai_text = ResponseAdapter.extract_generated_text(
                    ResponseAdapter.adapt_openrouter_response(response)
                )
                
                # Check if we're in project creation flow
                if intent == 'create_project':
                    # Check if we have all required details
                    has_type = project_details.get('projectType') or any(t in transcript for t in ['robot', 'iot', 'electronic', 'automat', 'sensor'])
                    has_level = project_details.get('skillLevel') or any(l in transcript for l in ['beginner', 'intermediate', 'advanced', 'expert'])
                    has_vision = project_details.get('interests') or len(transcript.split()) > 5
                    
                    print(f"DEBUG: intent = {intent}")
                    print(f"DEBUG: has_type = {has_type}")
                    print(f"DEBUG: has_level = {has_level}")
                    print(f"DEBUG: has_vision = {has_vision}")
                    print(f"DEBUG: transcript = {repr(transcript)}")
                    print(f"DEBUG: project_details = {project_details}")
                    
                    if has_type and has_level and has_vision:
                        # Extract project details
                        project_type = project_details.get('projectType', 'robotics' if 'robot' in transcript else 'iot')
                        
                        # Extract skill level from transcript if not in project_details
                        skill_level = project_details.get('skillLevel')
                        print(f"DEBUG: project_details.get('skillLevel') = {repr(skill_level)}")
                        print(f"DEBUG: transcript = {repr(transcript)}")
                        if not skill_level or skill_level == '':
                            transcript_lower = transcript.lower()
                            print(f"DEBUG: Extracting skill level from transcript: {transcript_lower}")
                            if 'expert' in transcript_lower:
                                skill_level = 'expert'
                                print(f"DEBUG: Found 'expert', setting skill_level = {skill_level}")
                            elif 'advanced' in transcript_lower:
                                skill_level = 'advanced'
                                print(f"DEBUG: Found 'advanced', setting skill_level = {skill_level}")
                            elif 'beginner' in transcript_lower or 'start' in transcript_lower:
                                skill_level = 'beginner'
                                print(f"DEBUG: Found 'beginner', setting skill_level = {skill_level}")
                            elif 'intermediate' in transcript_lower or 'medium' in transcript_lower:
                                skill_level = 'intermediate'
                                print(f"DEBUG: Found 'intermediate', setting skill_level = {skill_level}")
                            else:
                                skill_level = 'intermediate'  # Default only if no level found
                                print(f"DEBUG: No level found, defaulting to skill_level = {skill_level}")
                        else:
                            print(f"DEBUG: Using existing skill_level from project_details = {skill_level}")
                        
                        interests = project_details.get('interests', transcript)
                        
                        # Redirect to generator with pre-filled data
                        return VoiceProcessResponse(
                            text=f"Great! I have all the details. Taking you to the Project Lab with your preferences. {ai_text}",
                            action='navigate',
                            parameters={
                                'path': '/generator',
                                'formData': {
                                    'projectType': project_type,
                                    'skillLevel': skill_level,
                                    'interests': interests,
                                    'budget': project_details.get('budget', ''),
                                    'duration': project_details.get('duration', '')
                                }
                            },
                            needs_more_info=False
                        )
                    else:
                        # Need more information
                        updated_context = context.copy()
                        updated_context['intent'] = 'create_project'
                        updated_context['project_details'] = project_details
                        
                        return VoiceProcessResponse(
                            text=ai_text,
                            action='collect_info',
                            needs_more_info=True,
                            conversation_context=updated_context
                        )
                
                # Regular response
                return VoiceProcessResponse(
                    text=ai_text,
                    action=None,
                    parameters=None
                )
                
            except Exception as e:
                logger.error(f"Error processing voice command with AI: {e}")
                # Fall through to fallback
        
        # Fallback responses when AI is not available
        if intent == 'create_project':
            return VoiceProcessResponse(
                text="I can help you create a project! What type of project are you interested in? For example: Robotics, IoT, Electronics, Automation, or Sensors?",
                action='collect_info',
                needs_more_info=True,
                conversation_context={'intent': 'create_project', 'project_details': {}}
            )
        elif intent == 'help':
            return VoiceProcessResponse(
                text="I can help you with:\n• Creating new STEM projects\n• Finding components\n• Navigating the app\n• Learning about STEM topics\n\nWhat would you like to know?",
                action=None
            )
        else:
            return VoiceProcessResponse(
                text="I'm here to help! You can ask me about creating projects, finding components, or how to use the app. What would you like to do?",
                action=None
            )
    
    except Exception as e:
        logger.error(f"Error in process_voice_command: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "code": "internal_error",
                "message": "Failed to process voice command. Please try again."
            }
        )


# ───────────────── UNIVERSAL CHAT ENDPOINTS ─────────────────

# Universal Chat models
class UniversalChatMessage(BaseModel):
    user_id: str
    session_id: str
    role: str  # 'user' or 'assistant'
    content: str
    message_type: Optional[str] = 'text'
    voice_transcript: Optional[str] = None
    voice_duration: Optional[float] = None
    voice_confidence: Optional[float] = None
    action_type: Optional[str] = None
    action_parameters: Optional[Dict[str, Any]] = None
    response_metadata: Optional[Dict[str, Any]] = None
    conversation_context: Optional[Dict[str, Any]] = None

class UniversalChatResponse(BaseModel):
    id: str
    user_id: str
    session_id: str
    role: str
    content: str
    message_type: str
    created_at: str
    action_type: Optional[str] = None
    action_parameters: Optional[Dict[str, Any]] = None

class ChatSessionRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    title: Optional[str] = None

class ChatSessionResponse(BaseModel):
    id: str
    session_id: str
    user_id: str
    title: str
    message_count: int
    is_active: bool
    created_at: str

@api.post("/universal-chat/save-message", response_model=UniversalChatResponse)
async def save_universal_chat_message(message: UniversalChatMessage):
    """
    Save a universal chat message to the database
    """
    try:
        from services.universal_chat_service import universal_chat_service
        
        result = await universal_chat_service.save_message(
            user_id=message.user_id,
            session_id=message.session_id,
            role=message.role,
            content=message.content,
            message_type=message.message_type,
            voice_transcript=message.voice_transcript,
            voice_duration=message.voice_duration,
            voice_confidence=message.voice_confidence,
            action_type=message.action_type,
            action_parameters=message.action_parameters,
            response_metadata=message.response_metadata,
            conversation_context=message.conversation_context
        )
        
        return UniversalChatResponse(**result)
        
    except Exception as e:
        logger.error(f"Error saving universal chat message: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to save message",
                "code": "save_message_error",
                "message": str(e)
            }
        )

@api.get("/universal-chat/sessions/{user_id}")
async def get_user_chat_sessions(user_id: str, limit: int = 20, offset: int = 0):
    """
    Get chat sessions for a user
    """
    try:
        from services.universal_chat_service import universal_chat_service
        
        sessions = await universal_chat_service.get_user_sessions(
            user_id=user_id,
            limit=limit,
            offset=offset
        )
        
        return {"sessions": sessions, "total": len(sessions)}
        
    except Exception as e:
        logger.error(f"Error getting user chat sessions: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to get sessions",
                "code": "get_sessions_error",
                "message": str(e)
            }
        )

@api.get("/universal-chat/messages/{user_id}/{session_id}")
async def get_session_messages(user_id: str, session_id: str, limit: int = 50, offset: int = 0):
    """
    Get messages for a specific chat session
    """
    try:
        from services.universal_chat_service import universal_chat_service
        
        messages = await universal_chat_service.get_session_messages(
            user_id=user_id,
            session_id=session_id,
            limit=limit,
            offset=offset
        )
        
        return {"messages": messages, "total": len(messages)}
        
    except Exception as e:
        logger.error(f"Error getting session messages: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to get messages",
                "code": "get_messages_error",
                "message": str(e)
            }
        )

@api.post("/universal-chat/create-session", response_model=ChatSessionResponse)
async def create_chat_session(request: ChatSessionRequest):
    """
    Create a new chat session
    """
    try:
        from services.universal_chat_service import universal_chat_service
        
        session = await universal_chat_service.create_session(
            user_id=request.user_id,
            session_id=request.session_id,
            title=request.title
        )
        
        return ChatSessionResponse(**session)
        
    except Exception as e:
        logger.error(f"Error creating chat session: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to create session",
                "code": "create_session_error",
                "message": str(e)
            }
        )

@api.delete("/universal-chat/session/{user_id}/{session_id}")
async def delete_chat_session(user_id: str, session_id: str):
    """
    Delete a chat session and all its messages
    """
    try:
        from services.universal_chat_service import universal_chat_service
        
        success = await universal_chat_service.delete_session(
            user_id=user_id,
            session_id=session_id
        )
        
        if success:
            return {"success": True, "message": "Session deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Session not found")
        
    except Exception as e:
        logger.error(f"Error deleting chat session: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to delete session",
                "code": "delete_session_error",
                "message": str(e)
            }
        )

@api.get("/universal-chat/context/{user_id}/{session_id}")
async def get_conversation_context(user_id: str, session_id: str, limit: int = 5):
    """
    Get conversation context for AI continuity
    """
    try:
        from services.universal_chat_service import universal_chat_service
        
        context = await universal_chat_service.get_conversation_context(
            user_id=user_id,
            session_id=session_id,
            limit=limit
        )
        
        return context
        
    except Exception as e:
        logger.error(f"Error getting conversation context: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to get context",
                "code": "get_context_error",
                "message": str(e)
            }
        )


@api.get("/performance/database")
async def get_database_performance():
    """
    Get database performance metrics and optimization status
    
    Returns:
        Database performance metrics including query statistics, connection info, and recommendations
    """
    try:
        from database.connection import get_db_performance_metrics, optimize_database_performance
        
        # Get current performance metrics
        performance_metrics = get_db_performance_metrics()
        
        # Run optimization check
        optimization_results = await optimize_database_performance()
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "performance_metrics": performance_metrics,
            "optimization_results": optimization_results,
            "recommendations": [
                "Monitor slow queries regularly",
                "Ensure database indexes are properly configured",
                "Consider connection pooling for high-traffic scenarios",
                "Clean up expired cache entries periodically",
                "Monitor database connection health"
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting database performance metrics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve database performance metrics: {str(e)}"
        )


@api.post("/performance/database/reset")
async def reset_database_performance_metrics():
    """
    Reset database performance metrics
    
    Returns:
        Confirmation of metrics reset
    """
    try:
        from database.connection import reset_db_performance_metrics
        
        reset_db_performance_metrics()
        
        return {
            "status": "success",
            "message": "Database performance metrics have been reset",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error resetting database performance metrics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset database performance metrics: {str(e)}"
        )

# ───────────────── CORS (VERCEL + EMERGENT SAFE) ─────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://perfection-v4.vercel.app",
        "https://perfection-v2.vercel.app", 
        "https://perfection-v3.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.emergentagent\.com",
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

# ───────────────── CODE GENERATION ENDPOINTS ─────────────────

from services.code_generation_service import (
    VeronicaAIService, GenerationParams, Platform, ComplexityLevel
)
from services.file_management_service import FileManagementService
from services.streaming_service import get_streaming_service
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Union

# Code Generation Models
class CodeGenerationRequest(BaseModel):
    platform: str  # arduino, raspberry_pi, web, mobile
    complexity_level: str = "intermediate"  # beginner, intermediate, advanced
    include_comments: bool = True
    include_tests: bool = False
    custom_requirements: Optional[str] = None

class CodeGenerationResponse(BaseModel):
    generation_id: str
    status: str
    message: str
    estimated_completion_time: Optional[int] = None

class GenerationStatusResponse(BaseModel):
    generation_id: str
    project_id: str
    status: str
    platform: str
    created_at: str
    completed_at: Optional[str] = None
    error_message: Optional[str] = None
    files_count: int = 0

class CodeFileResponse(BaseModel):
    id: str
    file_name: str
    file_path: str
    file_type: str
    content: str
    description: Optional[str] = None
    size_bytes: int
    is_main_file: bool

class GeneratedFilesResponse(BaseModel):
    generation_id: str
    files: List[CodeFileResponse]

class SelectedFilesDownloadRequest(BaseModel):
    file_ids: List[str]
    total_files: int

# Initialize services
veronica_ai_service = VeronicaAIService()
file_management_service = FileManagementService()

@api.post("/projects/{project_id}/generate-code", response_model=CodeGenerationResponse)
async def start_code_generation(project_id: str, request: CodeGenerationRequest):
    """
    Start code generation for a project
    
    Args:
        project_id: ID of the project to generate code for
        request: Code generation parameters
        
    Returns:
        Generation response with ID and status
    """
    try:
        # Validate platform
        try:
            platform = Platform(request.platform.lower())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid platform: {request.platform}. Must be one of: arduino, raspberry_pi, web, mobile"
            )
        
        # Validate complexity level
        try:
            complexity_level = ComplexityLevel(request.complexity_level.lower())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid complexity level: {request.complexity_level}. Must be one of: beginner, intermediate, advanced"
            )
        
        # Create generation parameters
        params = GenerationParams(
            platform=platform,
            complexity_level=complexity_level,
            include_comments=request.include_comments,
            include_tests=request.include_tests,
            custom_requirements=request.custom_requirements
        )
        
        # Get project context (with fallback for non-UUID project IDs)
        from services.project_context_service import ProjectContextService
        from models.ai_guidance import ProjectContext
        import uuid as uuid_lib
        
        project_context_service = ProjectContextService()
        project_context = None
        
        # Check if project_id is a valid UUID
        try:
            uuid_lib.UUID(project_id)
            # Try to get the project context from the database
            project_context = await project_context_service.getProjectContext(project_id)
        except (ValueError, Exception) as e:
            logger.warning(f"Could not retrieve project context for {project_id}: {e}")
        
        # Create a fallback context if no project context found
        if not project_context:
            logger.info(f"Creating fallback project context for {project_id}")
            # Generate a valid UUID for the fallback context
            fallback_project_id = str(uuid_lib.uuid4())
            project_context = ProjectContext(
                project_id=fallback_project_id,
                title=f"Code Generation Project - {platform.value}",
                description=f"Automated code generation for {platform.value} platform at {complexity_level.value} level",
                goals=["Generate functional code", "Follow best practices", "Include proper documentation"],
                current_phase="Code Generation",
                tasks=[],
                milestones=[],
                progress=0.0,
                deadlines=[]
            )
            # Use the fallback project_id for database operations
            project_id = fallback_project_id
        
        # Start code generation (this will create a database record)
        generation_id = await veronica_ai_service._create_generation_record(
            project_id, "user_id_placeholder", params  # TODO: Get actual user_id from auth
        )
        
        # Estimate completion time based on complexity
        estimated_time = {
            ComplexityLevel.BEGINNER: 30,
            ComplexityLevel.INTERMEDIATE: 60,
            ComplexityLevel.ADVANCED: 120
        }.get(complexity_level, 60)
        
        return CodeGenerationResponse(
            generation_id=generation_id,
            status="queued",
            message="Code generation has been queued. Connect to WebSocket for real-time updates.",
            estimated_completion_time=estimated_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting code generation: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start code generation: {str(e)}"
        )

@api.get("/projects/{project_id}/code-generation/{generation_id}", response_model=GenerationStatusResponse)
async def get_generation_status(project_id: str, generation_id: str):
    """
    Get the status of a code generation
    
    Args:
        project_id: ID of the project
        generation_id: ID of the generation
        
    Returns:
        Generation status and details
    """
    try:
        # Get generation status from service
        generation_data = await veronica_ai_service.get_generation_status(generation_id)
        
        if not generation_data:
            raise HTTPException(
                status_code=404,
                detail=f"Generation {generation_id} not found"
            )
        
        # Verify project ID matches
        if generation_data["project_id"] != project_id:
            raise HTTPException(
                status_code=404,
                detail=f"Generation {generation_id} not found for project {project_id}"
            )
        
        # Get file count
        files = await veronica_ai_service.get_generated_files(generation_id)
        
        return GenerationStatusResponse(
            generation_id=generation_id,
            project_id=generation_data["project_id"],
            status=generation_data["status"],
            platform=generation_data["platform"],
            created_at=generation_data["created_at"],
            completed_at=generation_data.get("completed_at"),
            error_message=generation_data.get("error_message"),
            files_count=len(files)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting generation status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get generation status: {str(e)}"
        )

@api.websocket("/projects/{project_id}/code-generation/{generation_id}/stream")
async def websocket_code_generation(websocket: WebSocket, project_id: str, generation_id: str):
    """
    WebSocket endpoint for real-time code generation streaming
    
    Args:
        websocket: WebSocket connection
        project_id: ID of the project
        generation_id: ID of the generation
    """
    streaming_service = await get_streaming_service()
    connection = None
    
    try:
        # Connect WebSocket
        connection = await streaming_service.connect_websocket(
            websocket=websocket,
            user_id="user_id_placeholder",  # TODO: Get from auth
            project_id=project_id,
            generation_id=generation_id
        )
        
        if not connection:
            await websocket.close(code=1008, reason="Connection failed")
            return
        
        # Listen for messages from client
        while True:
            try:
                # Wait for message from client
                message = await websocket.receive_text()
                data = json.loads(message)
                
                # Handle different message types
                if data.get("type") == "start_generation":
                    # Start code generation with parameters
                    generation_params = data.get("params", {})
                    await streaming_service.start_code_generation_stream(
                        connection.connection_id, generation_params
                    )
                elif data.get("type") == "cancel_generation":
                    # Cancel ongoing generation
                    await streaming_service.cancel_generation(connection.connection_id)
                elif data.get("type") == "ping":
                    # Respond to ping with pong
                    await connection.send_event("pong", {"timestamp": datetime.now().isoformat()})
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                await connection.send_event("error", {"message": "Invalid JSON message"})
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                await connection.send_event("error", {"message": f"Error processing message: {str(e)}"})
    
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        if connection:
            await connection.send_event("error", {"message": f"Connection error: {str(e)}"})
    
    finally:
        # Clean up connection
        if connection:
            await streaming_service.disconnect_websocket(connection.connection_id)

@api.get("/projects/{project_id}/generated-code", response_model=List[GenerationStatusResponse])
async def get_project_generations(project_id: str):
    """
    Get all code generations for a project
    
    Args:
        project_id: ID of the project
        
    Returns:
        List of generation status responses
    """
    try:
        # TODO: Implement method to get all generations for a project
        # For now, return empty list
        return []
        
    except Exception as e:
        logger.error(f"Error getting project generations: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get project generations: {str(e)}"
        )

@api.get("/generated-code/{generation_id}/files", response_model=GeneratedFilesResponse)
async def get_generated_files(generation_id: str):
    """
    Get all files for a generation
    
    Args:
        generation_id: ID of the generation
        
    Returns:
        List of generated files
    """
    try:
        # Get files from service
        files = await file_management_service.get_generation_files(
            generation_id, "user_id_placeholder"  # TODO: Get from auth
        )
        
        # Convert to response format
        file_responses = []
        for i, file in enumerate(files):
            file_responses.append(CodeFileResponse(
                id=f"{generation_id}_{i}",  # TODO: Use actual file ID from database
                file_name=file.file_name,
                file_path=file.file_path,
                file_type=file.file_type,
                content=file.content,
                description=file.description,
                size_bytes=file.size_bytes,
                is_main_file=file.is_main_file
            ))
        
        return GeneratedFilesResponse(
            generation_id=generation_id,
            files=file_responses,
            total_files=len(file_responses)
        )
        
    except Exception as e:
        logger.error(f"Error getting generated files: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get generated files: {str(e)}"
        )

@api.get("/generated-code/{generation_id}/files/{file_id}")
async def get_file_content(generation_id: str, file_id: str):
    """
    Get content of a specific file
    
    Args:
        generation_id: ID of the generation
        file_id: ID of the file
        
    Returns:
        File content as plain text
    """
    try:
        # Get file from service
        file = await file_management_service.get_file(
            file_id, "user_id_placeholder"  # TODO: Get from auth
        )
        
        if not file:
            raise HTTPException(
                status_code=404,
                detail=f"File {file_id} not found"
            )
        
        # Track download
        await file_management_service.track_file_download(
            file_id, "user_id_placeholder"  # TODO: Get from auth
        )
        
        return Response(
            content=file.content,
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename={file.file_name}",
                "Content-Length": str(file.size_bytes)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file content: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get file content: {str(e)}"
        )

@api.put("/generated-code/{generation_id}/files/{file_id}")
async def update_file_content(generation_id: str, file_id: str, content: str = None):
    """
    Update content of a specific file
    
    Args:
        generation_id: ID of the generation
        file_id: ID of the file
        content: New file content
        
    Returns:
        Success message
    """
    try:
        if not content:
            raise HTTPException(
                status_code=400,
                detail="File content is required"
            )
        
        # Update file content
        success = await file_management_service.update_file(
            file_id, content, "user_id_placeholder"  # TODO: Get from auth
        )
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"File {file_id} not found or update failed"
            )
        
        return {"message": "File updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating file content: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update file content: {str(e)}"
        )

@api.delete("/generated-code/{generation_id}/files/{file_id}")
async def delete_file(generation_id: str, file_id: str):
    """
    Delete a specific file
    
    Args:
        generation_id: ID of the generation
        file_id: ID of the file
        
    Returns:
        Success message
    """
    try:
        # Delete file
        success = await file_management_service.delete_file(
            file_id, "user_id_placeholder"  # TODO: Get from auth
        )
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"File {file_id} not found or deletion failed"
            )
        
        return {"message": "File deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete file: {str(e)}"
        )

@api.get("/generated-code/{generation_id}/files/{file_id}/download")
async def download_individual_file(generation_id: str, file_id: str):
    """
    Download an individual file
    
    Args:
        generation_id: ID of the generation
        file_id: ID of the specific file
        
    Returns:
        File content as downloadable attachment
    """
    try:
        # Get file content
        file = await file_management_service.get_file(
            file_id, "user_id_placeholder"  # TODO: Get from auth
        )
        
        if not file:
            raise HTTPException(
                status_code=404,
                detail=f"File {file_id} not found"
            )
        
        # Track download
        await file_management_service.track_file_download(
            file_id, "user_id_placeholder"  # TODO: Get from auth
        )
        
        # Determine content type based on file extension
        content_type_map = {
            'js': 'application/javascript',
            'ts': 'application/typescript',
            'py': 'text/x-python',
            'cpp': 'text/x-c++src',
            'c': 'text/x-csrc',
            'h': 'text/x-chdr',
            'html': 'text/html',
            'css': 'text/css',
            'json': 'application/json',
            'md': 'text/markdown',
            'txt': 'text/plain',
            'ino': 'text/x-arduino'
        }
        
        content_type = content_type_map.get(file.file_type.lower(), 'text/plain')
        
        # Return file content
        return Response(
            content=file.content.encode('utf-8'),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={file.file_name}",
                "Content-Length": str(len(file.content.encode('utf-8')))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading file {file_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download file: {str(e)}"
        )

@api.post("/generated-code/{generation_id}/download/selected")
async def download_selected_files(generation_id: str, request: SelectedFilesDownloadRequest):
    """
    Download selected files as a ZIP archive
    
    Args:
        generation_id: ID of the generation
        file_ids: List of file IDs to include in the ZIP
        
    Returns:
        ZIP file containing selected files
    """
    try:
        if not request.file_ids:
            raise HTTPException(
                status_code=400,
                detail="No files selected for download"
            )
        
        # Get selected files
        selected_files = []
        for file_id in request.file_ids:
            file = await file_management_service.get_file(
                file_id, "user_id_placeholder"  # TODO: Get from auth
            )
            if file:
                selected_files.append(file)
        
        if not selected_files:
            raise HTTPException(
                status_code=404,
                detail="No valid files found for download"
            )
        
        # Create ZIP with selected files
        import zipfile
        import io
        
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for file in selected_files:
                zip_file.writestr(file.file_path, file.content)
        
        zip_bytes = zip_buffer.getvalue()
        
        # Track downloads for all files
        for file_id in request.file_ids:
            await file_management_service.track_file_download(
                file_id, "user_id_placeholder"  # TODO: Get from auth
            )
        
        # Return ZIP file
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=selected_files_{generation_id}.zip",
                "Content-Length": str(len(zip_bytes))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating selected files ZIP: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create selected files ZIP: {str(e)}"
        )

@api.get("/generated-code/{generation_id}/download/zip")
async def download_project_zip(generation_id: str):
    """
    Download all files as a ZIP archive
    
    Args:
        generation_id: ID of the generation
        
    Returns:
        ZIP file containing all generated files
    """
    try:
        # Create ZIP archive
        zip_bytes = await file_management_service.create_zip_archive(
            generation_id, "user_id_placeholder"  # TODO: Get from auth
        )
        
        if not zip_bytes:
            raise HTTPException(
                status_code=404,
                detail=f"No files found for generation {generation_id}"
            )
        
        # Return ZIP file
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename=generated_code_{generation_id}.zip",
                "Content-Length": str(len(zip_bytes))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating ZIP download: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create ZIP download: {str(e)}"
        )

# ═══════════════════════════════════════════════════════════════════════════
# SOFTWARE PROJECT PLANNING & APPS DOMAIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════
# Requirements: 1.1 Apps & Websites Domain Implementation
# Endpoints for software project planning, technology stack recommendations,
# architecture design, database design, API planning, and deployment configs

from services.software_project_planning_service import software_planning_service
from services.technology_stack_service import technology_stack_service

# ───────────────── REQUEST/RESPONSE MODELS ─────────────────

class SoftwareProjectAnalysisRequest(BaseModel):
    """Request model for software project analysis"""
    description: str
    target_platforms: List[str]  # ['web', 'mobile', 'desktop']
    budget: Optional[str] = None
    timeline: Optional[str] = None
    team_size: Optional[int] = None
    team_expertise: Optional[str] = None  # 'beginner', 'intermediate', 'advanced', 'expert'


class TechnologyStackRecommendationRequest(BaseModel):
    """Request model for technology stack recommendations"""
    project_type: str  # 'web_app', 'mobile_app', 'desktop_app', etc.
    platforms: List[str]
    complexity: str  # 'simple', 'moderate', 'complex', 'enterprise'
    team_expertise: Optional[str] = None
    budget_conscious: bool = False


class TechnologyStackComparisonRequest(BaseModel):
    """Request model for comparing technology stacks"""
    stack_ids: List[str]


# ───────────────── API ENDPOINTS ─────────────────

@api.post("/software-planning/analyze")
async def analyze_software_project(request: SoftwareProjectAnalysisRequest):
    """
    Analyze software project requirements and generate comprehensive project plan.
    
    Returns:
        - Project type and classification
        - Extracted features with priorities
        - Generated user stories
        - Technology stack recommendations
        - Architecture recommendations
        - Database recommendations
        - Timeline and budget estimates
        - Team composition recommendations
        - Deployment platform recommendations
        - Non-functional requirements
    """
    try:
        logger.info(f"Analyzing software project: {request.description[:100]}...")
        
        # Analyze requirements
        project_plan = await software_planning_service.analyze_requirements(
            description=request.description,
            target_platforms=request.target_platforms,
            budget=request.budget,
            timeline=request.timeline,
            team_size=request.team_size,
            team_expertise=request.team_expertise
        )
        
        return JSONResponse(content=project_plan.to_dict())
        
    except Exception as e:
        logger.error(f"Error analyzing software project: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze project: {str(e)}"
        )


@api.post("/technology-stack/recommend")
async def recommend_technology_stacks(request: TechnologyStackRecommendationRequest):
    """
    Get technology stack recommendations based on project requirements.
    
    Returns list of recommended stacks with:
        - Stack details (frontend, backend, database)
        - Popularity score
        - Learning curve
        - Community size
        - Pros and cons
        - Best use cases
        - Documentation and tutorial links
        - Hosting cost estimates
    """
    try:
        logger.info(f"Recommending stacks for {request.project_type}")
        
        recommendations = technology_stack_service.recommend_stacks(
            project_type=request.project_type,
            platforms=request.platforms,
            complexity=request.complexity,
            team_expertise=request.team_expertise,
            budget_conscious=request.budget_conscious
        )
        
        return JSONResponse(content={
            "recommendations": [
                {
                    "id": stack.id,
                    "name": stack.name,
                    "description": stack.description,
                    "category": stack.category,
                    "frontend_framework": stack.frontend_framework,
                    "backend_framework": stack.backend_framework,
                    "database": stack.database,
                    "additional_technologies": stack.additional_technologies,
                    "popularity_score": stack.popularity_score,
                    "learning_curve": stack.learning_curve,
                    "community_size": stack.community_size,
                    "maturity": stack.maturity,
                    "pros": stack.pros,
                    "cons": stack.cons,
                    "best_for": stack.best_for,
                    "documentation_url": stack.documentation_url,
                    "tutorial_links": stack.tutorial_links,
                    "estimated_hosting_cost": stack.estimated_hosting_cost,
                    "requires_paid_services": stack.requires_paid_services
                }
                for stack in recommendations
            ]
        })
        
    except Exception as e:
        logger.error(f"Error recommending technology stacks: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to recommend stacks: {str(e)}"
        )


@api.post("/technology-stack/compare")
async def compare_technology_stacks(request: TechnologyStackComparisonRequest):
    """
    Compare multiple technology stacks side by side.
    
    Returns comparison data with:
        - Side-by-side comparison table
        - Detailed pros and cons
        - Recommendations based on comparison
    """
    try:
        logger.info(f"Comparing stacks: {request.stack_ids}")
        
        comparison = technology_stack_service.compare_stacks(request.stack_ids)
        
        return JSONResponse(content=comparison)
        
    except Exception as e:
        logger.error(f"Error comparing technology stacks: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compare stacks: {str(e)}"
        )


@api.get("/technology-stacks")
async def get_all_technology_stacks(category: Optional[str] = None):
    """
    Get all available technology stacks.
    
    Query Parameters:
        - category: Filter by category (web, mobile, desktop, full_stack, backend, frontend)
    
    Returns list of all technology stacks with full details.
    """
    try:
        stacks = technology_stack_service.get_all_stacks(category=category)
        
        return JSONResponse(content={
            "stacks": [
                {
                    "id": stack.id,
                    "name": stack.name,
                    "description": stack.description,
                    "category": stack.category,
                    "frontend_framework": stack.frontend_framework,
                    "backend_framework": stack.backend_framework,
                    "database": stack.database,
                    "popularity_score": stack.popularity_score,
                    "learning_curve": stack.learning_curve,
                    "community_size": stack.community_size,
                    "maturity": stack.maturity,
                    "estimated_hosting_cost": stack.estimated_hosting_cost
                }
                for stack in stacks
            ],
            "total": len(stacks)
        })
        
    except Exception as e:
        logger.error(f"Error fetching technology stacks: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch stacks: {str(e)}"
        )


@api.get("/technology-stacks/{stack_id}")
async def get_technology_stack(stack_id: str):
    """
    Get detailed information about a specific technology stack.
    
    Returns complete stack details including:
        - All frameworks and technologies
        - Popularity and metrics
        - Pros and cons
        - Best use cases
        - Learning resources
        - Prerequisites
    """
    try:
        stack = technology_stack_service.get_stack_by_id(stack_id)
        
        if not stack:
            raise HTTPException(status_code=404, detail="Technology stack not found")
        
        # Get learning resources
        learning_resources = technology_stack_service.get_learning_resources(stack_id)
        
        return JSONResponse(content={
            "id": stack.id,
            "name": stack.name,
            "description": stack.description,
            "category": stack.category,
            "frontend_framework": stack.frontend_framework,
            "backend_framework": stack.backend_framework,
            "database": stack.database,
            "additional_technologies": stack.additional_technologies,
            "popularity_score": stack.popularity_score,
            "learning_curve": stack.learning_curve,
            "community_size": stack.community_size,
            "maturity": stack.maturity,
            "pros": stack.pros,
            "cons": stack.cons,
            "best_for": stack.best_for,
            "documentation_url": stack.documentation_url,
            "tutorial_links": stack.tutorial_links,
            "estimated_hosting_cost": stack.estimated_hosting_cost,
            "requires_paid_services": stack.requires_paid_services,
            "learning_resources": learning_resources
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching technology stack: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch stack: {str(e)}"
        )


@api.get("/application-templates")
async def get_application_templates(category: Optional[str] = None):
    """
    Get all available application templates.
    
    Query Parameters:
        - category: Filter by category (ecommerce, social_media, productivity, etc.)
    
    Returns list of application templates with:
        - Template details
        - Features included
        - Technology stack
        - Complexity level
        - Preview images
        - Setup instructions
    
    Note: This endpoint returns mock data. In production, this would query the database.
    """
    try:
        # Mock templates data (in production, this would query the database)
        templates = [
            {
                "id": "ecommerce_starter",
                "name": "E-Commerce Starter",
                "description": "Full-featured e-commerce platform with cart, checkout, and admin panel",
                "category": "ecommerce",
                "features": [
                    "Product catalog",
                    "Shopping cart",
                    "Stripe payment integration",
                    "Order management",
                    "Admin dashboard",
                    "User authentication",
                    "Product reviews",
                    "Inventory tracking"
                ],
                "tech_stack": {
                    "frontend": "React",
                    "backend": "Node.js + Express",
                    "database": "PostgreSQL",
                    "payment": "Stripe"
                },
                "complexity_level": "moderate",
                "preview_images": [
                    "https://via.placeholder.com/800x600/6366f1/ffffff?text=E-Commerce+Preview"
                ],
                "setup_instructions": "1. Clone repository\\n2. Install dependencies: npm install\\n3. Configure Stripe API keys\\n4. Setup database: npm run db:setup\\n5. Run: npm run dev",
                "popularity_score": 95
            },
            {
                "id": "social_media_platform",
                "name": "Social Media Platform",
                "description": "Social networking platform with posts, messaging, and notifications",
                "category": "social_media",
                "features": [
                    "User profiles",
                    "News feed",
                    "Post creation",
                    "Like/Comment/Share",
                    "Real-time messaging",
                    "Push notifications",
                    "Friend/Follow system",
                    "Media uploads"
                ],
                "tech_stack": {
                    "frontend": "React",
                    "backend": "Node.js + Express",
                    "database": "MongoDB",
                    "realtime": "Socket.io"
                },
                "complexity_level": "complex",
                "preview_images": [
                    "https://via.placeholder.com/800x600/ec4899/ffffff?text=Social+Media+Preview"
                ],
                "setup_instructions": "1. Clone repository\\n2. Install dependencies\\n3. Setup MongoDB\\n4. Configure WebSocket server\\n5. Setup cloud storage for media\\n6. Run: npm start",
                "popularity_score": 88
            },
            {
                "id": "business_dashboard",
                "name": "Business Dashboard",
                "description": "Comprehensive business management system with CRM and analytics",
                "category": "business",
                "features": [
                    "Analytics dashboard",
                    "Customer management",
                    "Invoice generation",
                    "Reporting",
                    "Calendar integration",
                    "Email automation",
                    "Role-based access",
                    "PDF exports"
                ],
                "tech_stack": {
                    "frontend": "Vue",
                    "backend": "Python FastAPI",
                    "database": "PostgreSQL"
                },
                "complexity_level": "complex",
                "preview_images": [
                    "https://via.placeholder.com/800x600/10b981/ffffff?text=Business+Dashboard+Preview"
                ],
                "setup_instructions": "1. Clone repository\\n2. Install backend: pip install -r requirements.txt\\n3. Install frontend: npm install\\n4. Setup PostgreSQL\\n5. Run migrations\\n6. Start services",
                "popularity_score": 82
            },
            {
                "id": "learning_management_system",
                "name": "Learning Management System",
                "description": "Educational platform with courses, quizzes, and progress tracking",
                "category": "educational",
                "features": [
                    "Course catalog",
                    "Video player",
                    "Quiz system",
                    "Progress tracking",
                    "Discussion forums",
                    "Certificate generation",
                    "Student dashboard",
                    "Instructor portal"
                ],
                "tech_stack": {
                    "frontend": "React",
                    "backend": "Python FastAPI",
                    "database": "PostgreSQL",
                    "storage": "AWS S3"
                },
                "complexity_level": "complex",
                "preview_images": [
                    "https://via.placeholder.com/800x600/3b82f6/ffffff?text=LMS+Preview"
                ],
                "setup_instructions": "1. Clone repository\\n2. Install dependencies\\n3. Setup database and video storage\\n4. Configure authentication\\n5. Seed sample course data\\n6. Run: npm run dev",
                "popularity_score": 90
            }
        ]
        
        # Filter by category if provided
        if category:
            templates = [t for t in templates if t["category"] == category]
        
        return JSONResponse(content={
            "templates": templates,
            "total": len(templates)
        })
        
    except Exception as e:
        logger.error(f"Error fetching application templates: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch templates: {str(e)}"
        )


@api.get("/application-templates/{template_id}")
async def get_application_template(template_id: str):
    """
    Get detailed information about a specific application template.
    
    Returns complete template details including:
        - All features
        - Technology stack
        - Complexity level
        - Preview images
        - Setup instructions
        - Customization options
    """
    try:
        # Mock template data (in production, this would query the database)
        templates = {
            "ecommerce_starter": {
                "id": "ecommerce_starter",
                "name": "E-Commerce Starter",
                "description": "Full-featured e-commerce platform with cart, checkout, and admin panel",
                "category": "ecommerce",
                "features": [
                    "Product catalog",
                    "Shopping cart",
                    "Stripe payment integration",
                    "Order management",
                    "Admin dashboard",
                    "User authentication",
                    "Product reviews",
                    "Inventory tracking"
                ],
                "tech_stack": {
                    "frontend": "React",
                    "backend": "Node.js + Express",
                    "database": "PostgreSQL",
                    "payment": "Stripe"
                },
                "complexity_level": "moderate",
                "preview_images": [
                    "https://via.placeholder.com/800x600/6366f1/ffffff?text=E-Commerce+Preview"
                ],
                "setup_instructions": "1. Clone repository\\n2. Install dependencies: npm install\\n3. Configure Stripe API keys\\n4. Setup database: npm run db:setup\\n5. Run: npm run dev",
                "customization_options": {
                    "payment_gateways": ["Stripe", "PayPal", "Square"],
                    "themes": ["Light", "Dark", "Custom"],
                    "features": ["Wishlist", "Product Comparison", "Live Chat", "Multi-currency"]
                },
                "popularity_score": 95
            }
        }
        
        template = templates.get(template_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="Application template not found")
        
        return JSONResponse(content=template)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching application template: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch template: {str(e)}"
        )




# ═══════════════════════════════════════════════════════════════
# PHASE 1: VERONICA AI CODE - SOFTWARE PROJECT PLANNING
# ═══════════════════════════════════════════════════════════════

from models.software_project import (
    ProjectAnalysisRequest, ProjectAnalysisResponse,
    ArchitectureDiagramRequest, DatabaseSchemaRequest,
    APISpecificationRequest, SoftwareProject
)
from services.enhanced_software_planning_service import enhanced_planning_service
from database.software_project_crud import (
    SoftwareProjectCRUD, ArchitectureDiagramCRUD,
    DatabaseSchemaCRUD, APISpecificationCRUD
)


@api.post("/software-projects/analyze", response_model=Dict[str, Any])
async def analyze_project_requirements(request: ProjectAnalysisRequest):
    """
    Analyze project requirements and generate comprehensive software project plan.
    Uses AI-powered analysis with OpenRouter for intelligent recommendations.
    
    Requirements: Phase 1 - Backend Foundation
    """
    try:
        logger.info(f"Analyzing project requirements for platforms: {request.target_platforms}")
        
        # For demo, use a test user ID. In production, get from auth context
        user_id = "00000000-0000-0000-0000-000000000000"  # Test user
        
        # Analyze project with AI
        project = await enhanced_planning_service.analyze_project_requirements(
            description=request.description,
            target_platforms=request.target_platforms,
            user_id=user_id,
            budget=request.budget,
            timeline=request.timeline,
            team_size=request.team_size,
            team_expertise=request.team_expertise,
            custom_requirements=request.custom_requirements
        )
        
        logger.info(f"Project analysis completed: {project.id}")
        
        # Return comprehensive analysis
        response = {
            "project_id": project.id,
            "title": project.title,
            "project_type": project.project_type.value,
            "platforms": [p.value for p in project.platforms],
            "complexity_level": project.complexity_level.value,
            "features": [f.dict() for f in project.features],
            "user_stories": [us.dict() for us in project.user_stories],
            "tech_stack": project.recommended_tech_stack.dict() if project.recommended_tech_stack else None,
            "architecture_type": project.architecture_type.value if project.architecture_type else None,
            "database_recommendations": [db.dict() for db in project.database_recommendations],
            "estimated_timeline": project.estimated_timeline,
            "estimated_budget": project.estimated_budget,
            "team_recommendations": project.team_recommendations.dict() if project.team_recommendations else None,
            "deployment_recommendations": [dr.dict() for dr in project.deployment_recommendations],
            "non_functional_requirements": project.non_functional_requirements.dict() if project.non_functional_requirements else None,
            "ai_confidence_score": project.ai_confidence_score,
            "created_at": project.created_at.isoformat()
        }
        
        return JSONResponse(content=response, status_code=200)
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error analyzing project: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze project: {str(e)}"
        )


@api.get("/software-projects/{project_id}")
async def get_software_project(project_id: str):
    """
    Get software project details by ID.
    
    Requirements: Phase 1 - Backend Foundation
    """
    try:
        logger.info(f"Fetching project: {project_id}")
        
        project = await SoftwareProjectCRUD.get_project(project_id)
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Convert to dict for JSON response
        response = {
            "id": project.id,
            "title": project.title,
            "description": project.description,
            "project_type": project.project_type.value,
            "platforms": [p.value for p in project.platforms],
            "complexity_level": project.complexity_level.value,
            "features": [f.dict() for f in project.features],
            "user_stories": [us.dict() for us in project.user_stories],
            "tech_stack": project.recommended_tech_stack.dict() if project.recommended_tech_stack else None,
            "architecture_type": project.architecture_type.value if project.architecture_type else None,
            "estimated_timeline": project.estimated_timeline,
            "estimated_budget": project.estimated_budget,
            "status": project.status,
            "created_at": project.created_at.isoformat()
        }
        
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api.get("/software-projects/user/{user_id}")
async def get_user_projects(user_id: str, limit: int = 50):
    """
    Get all software projects for a user.
    
    Requirements: Phase 1 - Backend Foundation
    """
    try:
        logger.info(f"Fetching projects for user: {user_id}")
        
        projects = await SoftwareProjectCRUD.get_user_projects(user_id, limit)
        
        # Convert to list of dicts
        projects_data = []
        for project in projects:
            projects_data.append({
                "id": project.id,
                "title": project.title,
                "description": project.description[:200] + "..." if len(project.description) > 200 else project.description,
                "project_type": project.project_type.value,
                "platforms": [p.value for p in project.platforms],
                "complexity_level": project.complexity_level.value,
                "status": project.status,
                "created_at": project.created_at.isoformat()
            })
        
        return JSONResponse(content={"projects": projects_data, "total": len(projects_data)})
        
    except Exception as e:
        logger.error(f"Error fetching user projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api.post("/software-projects/{project_id}/architecture-diagram")
async def generate_architecture_diagram(project_id: str, request: ArchitectureDiagramRequest):
    """
    Generate Mermaid architecture diagram for a project.
    
    Requirements: Phase 1 - Backend Foundation
    """
    try:
        logger.info(f"Generating architecture diagram for project: {project_id}")
        
        # Generate diagram
        diagram = await enhanced_planning_service.generate_architecture_diagram(
            project_id=project_id,
            diagram_type=request.diagram_type,
            include_database=request.include_database,
            include_frontend=request.include_frontend,
            include_backend=request.include_backend
        )
        
        # Save to database
        diagram_id = await ArchitectureDiagramCRUD.create_diagram(diagram)
        diagram.id = diagram_id
        
        logger.info(f"Architecture diagram created: {diagram_id}")
        
        return JSONResponse(content={
            "id": diagram.id,
            "project_id": diagram.project_id,
            "diagram_type": diagram.diagram_type,
            "mermaid_code": diagram.mermaid_code,
            "description": diagram.description,
            "components": diagram.components,
            "created_at": diagram.created_at.isoformat()
        })
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating architecture diagram: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api.get("/software-projects/{project_id}/architecture-diagrams")
async def get_project_diagrams(project_id: str):
    """
    Get all architecture diagrams for a project.
    
    Requirements: Phase 1 - Backend Foundation
    """
    try:
        logger.info(f"Fetching diagrams for project: {project_id}")
        
        diagrams = await ArchitectureDiagramCRUD.get_project_diagrams(project_id)
        
        diagrams_data = []
        for diagram in diagrams:
            diagrams_data.append({
                "id": diagram.id,
                "diagram_type": diagram.diagram_type,
                "mermaid_code": diagram.mermaid_code,
                "description": diagram.description,
                "components": diagram.components,
                "created_at": diagram.created_at.isoformat()
            })
        
        return JSONResponse(content={"diagrams": diagrams_data, "total": len(diagrams_data)})
        
    except Exception as e:
        logger.error(f"Error fetching diagrams: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api.post("/software-projects/{project_id}/database-schema")
async def generate_database_schema(project_id: str, request: DatabaseSchemaRequest):
    """
    Generate database schema for a project.
    
    Requirements: Phase 1 - Backend Foundation
    """
    try:
        logger.info(f"Generating database schema for project: {project_id}")
        
        # Generate schema
        schema = await enhanced_planning_service.generate_database_schema(
            project_id=project_id,
            database_type=request.database_type
        )
        
        # Save to database
        schema_id = await DatabaseSchemaCRUD.create_schema(schema)
        schema.id = schema_id
        
        logger.info(f"Database schema created: {schema_id}")
        
        return JSONResponse(content={
            "id": schema.id,
            "project_id": schema.project_id,
            "database_type": schema.database_type,
            "tables": schema.tables,
            "relationships": schema.relationships,
            "indexes": schema.indexes,
            "schema_sql": schema.schema_sql,
            "schema_json": schema.schema_json,
            "created_at": schema.created_at.isoformat()
        })
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating database schema: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api.get("/software-projects/{project_id}/database-schema")
async def get_project_schema(project_id: str):
    """
    Get database schema for a project.
    
    Requirements: Phase 1 - Backend Foundation
    """
    try:
        logger.info(f"Fetching schema for project: {project_id}")
        
        schema = await DatabaseSchemaCRUD.get_project_schema(project_id)
        
        if not schema:
            raise HTTPException(status_code=404, detail="Schema not found")
        
        return JSONResponse(content={
            "id": schema.id,
            "project_id": schema.project_id,
            "database_type": schema.database_type,
            "tables": schema.tables,
            "relationships": schema.relationships,
            "indexes": schema.indexes,
            "schema_sql": schema.schema_sql,
            "schema_json": schema.schema_json,
            "created_at": schema.created_at.isoformat()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching schema: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api.post("/software-projects/{project_id}/api-specification")
async def generate_api_specification(project_id: str, request: APISpecificationRequest):
    """
    Generate OpenAPI specification for a project.
    
    Requirements: Phase 1 - Backend Foundation
    """
    try:
        logger.info(f"Generating API specification for project: {project_id}")
        
        # Generate specification
        spec = await enhanced_planning_service.generate_api_specification(
            project_id=project_id,
            include_authentication=request.include_authentication
        )
        
        # Save to database
        spec_id = await APISpecificationCRUD.create_specification(spec)
        spec.id = spec_id
        
        logger.info(f"API specification created: {spec_id}")
        
        return JSONResponse(content={
            "id": spec.id,
            "project_id": spec.project_id,
            "title": spec.title,
            "version": spec.version,
            "description": spec.description,
            "base_url": spec.base_url,
            "endpoints": [e.dict() for e in spec.endpoints],
            "authentication_scheme": spec.authentication_scheme,
            "openapi_spec": spec.openapi_spec,
            "created_at": spec.created_at.isoformat()
        })
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating API specification: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api.get("/software-projects/{project_id}/api-specification")
async def get_project_api_specification(project_id: str):
    """
    Get API specification for a project.
    
    Requirements: Phase 1 - Backend Foundation
    """
    try:
        logger.info(f"Fetching API spec for project: {project_id}")
        
        spec = await APISpecificationCRUD.get_project_specification(project_id)
        
        if not spec:
            raise HTTPException(status_code=404, detail="API specification not found")
        
        return JSONResponse(content={
            "id": spec.id,
            "project_id": spec.project_id,
            "title": spec.title,
            "version": spec.version,
            "description": spec.description,
            "base_url": spec.base_url,
            "endpoints": [e.dict() for e in spec.endpoints],
            "authentication_scheme": spec.authentication_scheme,
            "openapi_spec": spec.openapi_spec,
            "created_at": spec.created_at.isoformat()
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching API specification: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api.get("/technology-stacks")
async def get_technology_stacks(category: Optional[str] = None):
    """
    Get all available technology stacks with recommendations.
    
    Requirements: Phase 1 - Backend Foundation
    """
    try:
        from services.technology_stack_service import technology_stack_service
        
        logger.info(f"Fetching technology stacks, category: {category}")
        
        stacks = technology_stack_service.get_all_stacks(category)
        
        stacks_data = []
        for stack in stacks:
            stacks_data.append({
                "id": stack.id,
                "name": stack.name,
                "description": stack.description,
                "category": stack.category,
                "frontend_framework": stack.frontend_framework,
                "backend_framework": stack.backend_framework,
                "database": stack.database,
                "popularity_score": stack.popularity_score,
                "learning_curve": stack.learning_curve,
                "community_size": stack.community_size,
                "maturity": stack.maturity,
                "pros": stack.pros,
                "cons": stack.cons,
                "best_for": stack.best_for,
                "estimated_hosting_cost": stack.estimated_hosting_cost
            })
        
        return JSONResponse(content={"stacks": stacks_data, "total": len(stacks_data)})
        
    except Exception as e:
        logger.error(f"Error fetching technology stacks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api.get("/technology-stacks/{stack_id}")
async def get_technology_stack(stack_id: str):
    """
    Get detailed information about a specific technology stack.
    
    Requirements: Phase 1 - Backend Foundation
    """
    try:
        from services.technology_stack_service import technology_stack_service
        
        logger.info(f"Fetching technology stack: {stack_id}")
        
        stack = technology_stack_service.get_stack_by_id(stack_id)
        
        if not stack:
            raise HTTPException(status_code=404, detail="Technology stack not found")
        
        return JSONResponse(content={
            "id": stack.id,
            "name": stack.name,
            "description": stack.description,
            "category": stack.category,
            "frontend_framework": stack.frontend_framework,
            "backend_framework": stack.backend_framework,
            "database": stack.database,
            "additional_technologies": stack.additional_technologies,
            "popularity_score": stack.popularity_score,
            "learning_curve": stack.learning_curve,
            "community_size": stack.community_size,
            "maturity": stack.maturity,
            "pros": stack.pros,
            "cons": stack.cons,
            "best_for": stack.best_for,
            "documentation_url": stack.documentation_url,
            "tutorial_links": stack.tutorial_links,
            "estimated_hosting_cost": stack.estimated_hosting_cost,
            "requires_paid_services": stack.requires_paid_services
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching technology stack: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ───────────────── COMPETITION PLATFORM ─────────────────
# Import competition routes
try:
    from competition_routes import competition_router
    app.include_router(competition_router)
    logger.info("Competition platform routes registered successfully")
except Exception as e:
    logger.warning(f"Competition routes not loaded: {e}")

# ───────────────── ACHIEVEMENT SYSTEM ─────────────────
# Import achievement routes
try:
    from achievement_routes import achievement_router
    app.include_router(achievement_router)
    logger.info("Achievement system routes registered successfully")
except Exception as e:
    logger.warning(f"Achievement routes not loaded: {e}")

# ───────────────── REGISTER ROUTER ─────────────────
app.include_router(api)

# ───────────────── MAIN (LOCAL DEV) ─────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
