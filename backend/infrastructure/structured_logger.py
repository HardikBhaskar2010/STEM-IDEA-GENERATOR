"""
Structured Logging System with JSON Format

This module provides a comprehensive structured logging system using structlog
with JSON formatting, request context tracking, and sensitive data sanitization.

Requirements: 14.1, 14.2, 14.3, 14.7
"""

import os
import sys
import logging
import structlog
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class LogLevel(str, Enum):
    """Log level enumeration"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class StructuredLogger:
    """
    Structured logging system with JSON format, context tracking, and sanitization.
    
    Features:
    - JSON-formatted logs for easy parsing
    - Request ID, user ID, endpoint, and timestamp tracking
    - Sensitive data sanitization (passwords, tokens, PII)
    - Environment-based log level configuration
    - Integration with log aggregation services (CloudWatch, Datadog, etc.)
    
    Requirements: 14.1, 14.2, 14.3, 14.7
    """
    
    # Sensitive field patterns to sanitize
    SENSITIVE_FIELDS = {
        'password', 'passwd', 'pwd',
        'token', 'access_token', 'refresh_token', 'api_key', 'apikey',
        'secret', 'api_secret', 'client_secret',
        'authorization', 'auth',
        'credit_card', 'card_number', 'cvv', 'ssn',
        'private_key', 'encryption_key'
    }
    
    # PII fields to sanitize
    PII_FIELDS = {
        'email', 'phone', 'phone_number', 'address',
        'first_name', 'last_name', 'full_name',
        'date_of_birth', 'dob', 'birth_date'
    }
    
    _instance: Optional['StructuredLogger'] = None
    _configured: bool = False
    
    def __new__(cls):
        """Singleton pattern to ensure single logger instance"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize structured logger (only once)"""
        if not self._configured:
            self._configure_structlog()
            self._configured = True
    
    def _configure_structlog(self) -> None:
        """Configure structlog with JSON formatting and processors"""
        
        # Get log level from environment
        log_level_str = os.getenv("LOG_LEVEL", "INFO").upper()
        log_level = getattr(logging, log_level_str, logging.INFO)
        
        # Get environment
        environment = os.getenv("ENVIRONMENT", "development")
        
        # Configure standard logging
        logging.basicConfig(
            format="%(message)s",
            stream=sys.stdout,
            level=log_level,
        )
        
        # Configure structlog processors
        processors = [
            # Add log level
            structlog.stdlib.add_log_level,
            # Add timestamp
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            # Add logger name
            structlog.stdlib.add_logger_name,
            # Stack info for exceptions
            structlog.processors.StackInfoRenderer(),
            # Format exceptions
            structlog.processors.format_exc_info,
            # Sanitize sensitive data
            self._sanitize_processor,
        ]
        
        # Add JSON renderer for production, console renderer for development
        if environment in ("production", "staging"):
            processors.append(structlog.processors.JSONRenderer())
        else:
            processors.append(structlog.dev.ConsoleRenderer())
        
        # Configure structlog
        structlog.configure(
            processors=processors,
            wrapper_class=structlog.stdlib.BoundLogger,
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            cache_logger_on_first_use=True,
        )
        
        self.logger = structlog.get_logger()
    
    def _sanitize_processor(
        self,
        logger: Any,
        method_name: str,
        event_dict: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Processor to sanitize sensitive data from logs.
        
        Requirements: 14.7
        """
        return self._sanitize_dict(event_dict)
    
    def _sanitize_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recursively sanitize sensitive data from dictionary.
        
        Args:
            data: Dictionary to sanitize
            
        Returns:
            Sanitized dictionary with sensitive values replaced
        """
        if not isinstance(data, dict):
            return data
        
        sanitized = {}
        for key, value in data.items():
            key_lower = key.lower()
            
            # Check if field is sensitive
            if any(sensitive in key_lower for sensitive in self.SENSITIVE_FIELDS):
                sanitized[key] = "[REDACTED]"
            # Check if field is PII
            elif any(pii in key_lower for pii in self.PII_FIELDS):
                sanitized[key] = "[PII_REDACTED]"
            # Recursively sanitize nested dictionaries
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_dict(value)
            # Sanitize lists
            elif isinstance(value, list):
                sanitized[key] = [
                    self._sanitize_dict(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                sanitized[key] = value
        
        return sanitized
    
    def bind_context(self, **kwargs) -> structlog.BoundLogger:
        """
        Bind context to logger for all subsequent log calls.
        
        Args:
            **kwargs: Context key-value pairs (request_id, user_id, endpoint, etc.)
            
        Returns:
            Bound logger with context
            
        Requirements: 14.2
        """
        return self.logger.bind(**kwargs)
    
    def debug(self, message: str, **kwargs) -> None:
        """Log debug message with context"""
        self.logger.debug(message, **kwargs)
    
    def info(self, message: str, **kwargs) -> None:
        """Log info message with context"""
        self.logger.info(message, **kwargs)
    
    def warning(self, message: str, **kwargs) -> None:
        """Log warning message with context"""
        self.logger.warning(message, **kwargs)
    
    def error(self, message: str, **kwargs) -> None:
        """Log error message with context"""
        self.logger.error(message, **kwargs)
    
    def critical(self, message: str, **kwargs) -> None:
        """Log critical message with context"""
        self.logger.critical(message, **kwargs)
    
    def log_request(
        self,
        request_id: str,
        method: str,
        endpoint: str,
        user_id: Optional[str] = None,
        **kwargs
    ) -> None:
        """
        Log HTTP request with standard context.
        
        Args:
            request_id: Unique request identifier
            method: HTTP method (GET, POST, etc.)
            endpoint: Request endpoint/path
            user_id: User ID if authenticated
            **kwargs: Additional context
            
        Requirements: 14.2
        """
        self.logger.info(
            "HTTP request",
            request_id=request_id,
            method=method,
            endpoint=endpoint,
            user_id=user_id,
            **kwargs
        )
    
    def log_response(
        self,
        request_id: str,
        status_code: int,
        response_time_ms: float,
        endpoint: str,
        user_id: Optional[str] = None,
        **kwargs
    ) -> None:
        """
        Log HTTP response with standard context.
        
        Args:
            request_id: Unique request identifier
            status_code: HTTP status code
            response_time_ms: Response time in milliseconds
            endpoint: Request endpoint/path
            user_id: User ID if authenticated
            **kwargs: Additional context
            
        Requirements: 14.2
        """
        self.logger.info(
            "HTTP response",
            request_id=request_id,
            status_code=status_code,
            response_time_ms=response_time_ms,
            endpoint=endpoint,
            user_id=user_id,
            **kwargs
        )
    
    def log_error_with_context(
        self,
        error: Exception,
        request_id: Optional[str] = None,
        user_id: Optional[str] = None,
        endpoint: Optional[str] = None,
        **kwargs
    ) -> None:
        """
        Log error with full context including stack trace.
        
        Args:
            error: Exception object
            request_id: Unique request identifier
            user_id: User ID if authenticated
            endpoint: Request endpoint/path
            **kwargs: Additional context
            
        Requirements: 14.3
        """
        self.logger.error(
            "Error occurred",
            error_type=type(error).__name__,
            error_message=str(error),
            request_id=request_id,
            user_id=user_id,
            endpoint=endpoint,
            exc_info=True,
            **kwargs
        )


# Global logger instance
_logger_instance: Optional[StructuredLogger] = None


def get_logger() -> StructuredLogger:
    """
    Get global structured logger instance.
    
    Returns:
        StructuredLogger instance
    """
    global _logger_instance
    if _logger_instance is None:
        _logger_instance = StructuredLogger()
    return _logger_instance


def configure_log_aggregation() -> None:
    """
    Configure log aggregation for CloudWatch, Datadog, or similar services.
    
    This function sets up handlers for external log aggregation services
    based on environment variables.
    
    Environment Variables:
        LOG_AGGREGATION_SERVICE: Service to use (cloudwatch, datadog, none)
        AWS_REGION: AWS region for CloudWatch (if using CloudWatch)
        DATADOG_API_KEY: Datadog API key (if using Datadog)
        DATADOG_APP_KEY: Datadog app key (if using Datadog)
    
    Requirements: 14.1, 14.2, 14.3
    """
    service = os.getenv("LOG_AGGREGATION_SERVICE", "none").lower()
    
    if service == "cloudwatch":
        _configure_cloudwatch()
    elif service == "datadog":
        _configure_datadog()
    elif service == "none":
        # No external aggregation, logs go to stdout
        pass
    else:
        logging.warning(f"Unknown log aggregation service: {service}")


def _configure_cloudwatch() -> None:
    """Configure CloudWatch Logs handler"""
    try:
        import watchtower
        
        aws_region = os.getenv("AWS_REGION", "us-east-1")
        log_group = os.getenv("CLOUDWATCH_LOG_GROUP", "/stem-backend/application")
        log_stream = os.getenv("CLOUDWATCH_LOG_STREAM", "backend-logs")
        
        # Add CloudWatch handler
        handler = watchtower.CloudWatchLogHandler(
            log_group=log_group,
            stream_name=log_stream,
            use_queues=True,
            send_interval=5,
            create_log_group=True
        )
        
        logging.getLogger().addHandler(handler)
        logging.info(f"CloudWatch logging configured: {log_group}/{log_stream}")
        
    except ImportError:
        logging.warning(
            "watchtower not installed. Install with: pip install watchtower"
        )
    except Exception as e:
        logging.error(f"Failed to configure CloudWatch logging: {e}")


def _configure_datadog() -> None:
    """Configure Datadog Logs handler"""
    try:
        from datadog import initialize, statsd
        
        api_key = os.getenv("DATADOG_API_KEY")
        app_key = os.getenv("DATADOG_APP_KEY")
        
        if not api_key:
            logging.warning("DATADOG_API_KEY not set, skipping Datadog configuration")
            return
        
        # Initialize Datadog
        options = {
            'api_key': api_key,
            'app_key': app_key
        }
        initialize(**options)
        
        logging.info("Datadog logging configured")
        
    except ImportError:
        logging.warning(
            "datadog not installed. Install with: pip install datadog"
        )
    except Exception as e:
        logging.error(f"Failed to configure Datadog logging: {e}")
