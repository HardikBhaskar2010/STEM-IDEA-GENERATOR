"""
OpenTelemetry distributed tracing configuration.

This module configures OpenTelemetry for:
- Distributed tracing across services
- Automatic instrumentation for FastAPI, Redis, and AsyncPG
- Trace context propagation
- Span creation and management
- OTLP export to collectors
"""

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.asyncpg import AsyncPGInstrumentor
from opentelemetry.trace import Status, StatusCode
from typing import Optional, Dict, Any
from contextlib import contextmanager
import os


def init_tracing(
    service_name: str = "stem-project-generator",
    service_version: str = "1.0.0",
    otlp_endpoint: Optional[str] = None,
    enable_console_export: bool = False,
    sample_rate: float = 1.0
):
    """
    Initialize OpenTelemetry tracing.
    
    Args:
        service_name: Name of the service
        service_version: Version of the service
        otlp_endpoint: OTLP collector endpoint (e.g., "http://localhost:4317")
        enable_console_export: Whether to export traces to console (for debugging)
        sample_rate: Sampling rate (0.0 to 1.0)
    """
    # Create resource with service information
    resource = Resource.create({
        SERVICE_NAME: service_name,
        SERVICE_VERSION: service_version,
        "deployment.environment": os.getenv("ENVIRONMENT", "development")
    })
    
    # Create tracer provider
    tracer_provider = TracerProvider(resource=resource)
    
    # Add OTLP exporter if endpoint is configured
    otlp_endpoint = otlp_endpoint or os.getenv("OTLP_ENDPOINT")
    if otlp_endpoint:
        otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
        tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
        print(f"OpenTelemetry OTLP exporter configured: {otlp_endpoint}")
    
    # Add console exporter for debugging
    if enable_console_export:
        console_exporter = ConsoleSpanExporter()
        tracer_provider.add_span_processor(BatchSpanProcessor(console_exporter))
        print("OpenTelemetry console exporter enabled")
    
    # Set global tracer provider
    trace.set_tracer_provider(tracer_provider)
    
    # Instrument libraries
    FastAPIInstrumentor().instrument()
    RedisInstrumentor().instrument()
    AsyncPGInstrumentor().instrument()
    
    print(f"OpenTelemetry tracing initialized for service: {service_name}")


def get_tracer(name: str = __name__) -> trace.Tracer:
    """
    Get a tracer instance.
    
    Args:
        name: Tracer name (usually module name)
    
    Returns:
        Tracer instance
    """
    return trace.get_tracer(name)


@contextmanager
def create_span(
    name: str,
    attributes: Optional[Dict[str, Any]] = None,
    tracer: Optional[trace.Tracer] = None
):
    """
    Context manager for creating spans.
    
    Args:
        name: Span name
        attributes: Span attributes
        tracer: Tracer instance (uses default if None)
    
    Example:
        with create_span("database_query", {"query": "SELECT * FROM users"}):
            result = await db.execute(query)
    """
    if tracer is None:
        tracer = get_tracer()
    
    with tracer.start_as_current_span(name) as span:
        if attributes:
            for key, value in attributes.items():
                span.set_attribute(key, value)
        
        try:
            yield span
        except Exception as e:
            span.set_status(Status(StatusCode.ERROR, str(e)))
            span.record_exception(e)
            raise


def add_span_attributes(attributes: Dict[str, Any]):
    """
    Add attributes to the current span.
    
    Args:
        attributes: Dictionary of attributes to add
    """
    span = trace.get_current_span()
    if span:
        for key, value in attributes.items():
            span.set_attribute(key, value)


def add_span_event(name: str, attributes: Optional[Dict[str, Any]] = None):
    """
    Add an event to the current span.
    
    Args:
        name: Event name
        attributes: Event attributes
    """
    span = trace.get_current_span()
    if span:
        span.add_event(name, attributes=attributes or {})


def set_span_status(status_code: StatusCode, description: Optional[str] = None):
    """
    Set the status of the current span.
    
    Args:
        status_code: Status code (OK, ERROR, UNSET)
        description: Optional status description
    """
    span = trace.get_current_span()
    if span:
        span.set_status(Status(status_code, description))


def record_exception(exception: Exception):
    """
    Record an exception in the current span.
    
    Args:
        exception: Exception to record
    """
    span = trace.get_current_span()
    if span:
        span.record_exception(exception)
        span.set_status(Status(StatusCode.ERROR, str(exception)))


class TracingMiddleware:
    """
    Middleware for adding custom tracing to requests.
    """
    
    def __init__(self, app):
        self.app = app
        self.tracer = get_tracer(__name__)
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        
        # Extract request information
        method = scope.get("method", "")
        path = scope.get("path", "")
        
        # Create span for request
        with self.tracer.start_as_current_span(
            f"{method} {path}",
            attributes={
                "http.method": method,
                "http.url": path,
                "http.scheme": scope.get("scheme", ""),
            }
        ) as span:
            # Add request headers as attributes (filtered)
            headers = dict(scope.get("headers", []))
            span.set_attribute("http.user_agent", headers.get(b"user-agent", b"").decode())
            
            try:
                await self.app(scope, receive, send)
                span.set_status(Status(StatusCode.OK))
            except Exception as e:
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.record_exception(e)
                raise


# Decorator for tracing functions
def trace_function(name: Optional[str] = None, attributes: Optional[Dict[str, Any]] = None):
    """
    Decorator for tracing functions.
    
    Args:
        name: Span name (uses function name if None)
        attributes: Span attributes
    
    Example:
        @trace_function(attributes={"operation": "user_lookup"})
        async def get_user(user_id: str):
            return await db.get_user(user_id)
    """
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            span_name = name or f"{func.__module__}.{func.__name__}"
            with create_span(span_name, attributes):
                return await func(*args, **kwargs)
        
        def sync_wrapper(*args, **kwargs):
            span_name = name or f"{func.__module__}.{func.__name__}"
            with create_span(span_name, attributes):
                return func(*args, **kwargs)
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
