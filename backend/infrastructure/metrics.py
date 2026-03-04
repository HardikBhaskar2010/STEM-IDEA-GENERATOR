"""
Prometheus metrics collection for monitoring.

This module provides Prometheus metrics for tracking:
- Request counts by endpoint and status
- Response time histograms
- Error rates
- Cache hit/miss rates
- Circuit breaker states
- Connection pool statistics
"""

from prometheus_client import Counter, Histogram, Gauge, Info, generate_latest, CONTENT_TYPE_LATEST
from typing import Optional
import time


class MetricsCollector:
    """Centralized metrics collection using Prometheus client."""
    
    def __init__(self):
        # Request metrics
        self.request_count = Counter(
            'http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status']
        )
        
        self.request_duration = Histogram(
            'http_request_duration_seconds',
            'HTTP request duration in seconds',
            ['method', 'endpoint'],
            buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)
        )
        
        # Error metrics
        self.error_count = Counter(
            'errors_total',
            'Total errors',
            ['error_type', 'endpoint']
        )
        
        # Cache metrics
        self.cache_hits = Counter(
            'cache_hits_total',
            'Total cache hits',
            ['cache_key_pattern']
        )
        
        self.cache_misses = Counter(
            'cache_misses_total',
            'Total cache misses',
            ['cache_key_pattern']
        )
        
        self.cache_size = Gauge(
            'cache_entries_total',
            'Total number of cache entries'
        )
        
        # Circuit breaker metrics
        self.circuit_breaker_state = Gauge(
            'circuit_breaker_state',
            'Circuit breaker state (0=closed, 1=open, 2=half_open)',
            ['service_name']
        )
        
        self.circuit_breaker_failures = Counter(
            'circuit_breaker_failures_total',
            'Total circuit breaker failures',
            ['service_name']
        )
        
        self.circuit_breaker_successes = Counter(
            'circuit_breaker_successes_total',
            'Total circuit breaker successes',
            ['service_name']
        )
        
        # Connection pool metrics
        self.db_pool_size = Gauge(
            'db_pool_connections_total',
            'Total database connections in pool'
        )
        
        self.db_pool_active = Gauge(
            'db_pool_connections_active',
            'Active database connections'
        )
        
        self.db_pool_idle = Gauge(
            'db_pool_connections_idle',
            'Idle database connections'
        )
        
        self.redis_pool_size = Gauge(
            'redis_pool_connections_total',
            'Total Redis connections in pool'
        )
        
        # Rate limiting metrics
        self.rate_limit_exceeded = Counter(
            'rate_limit_exceeded_total',
            'Total rate limit exceeded events',
            ['identifier_type', 'endpoint']
        )
        
        # Application info
        self.app_info = Info(
            'app_info',
            'Application information'
        )
    
    def record_request(self, method: str, endpoint: str, status: int, duration: float):
        """Record HTTP request metrics."""
        self.request_count.labels(method=method, endpoint=endpoint, status=status).inc()
        self.request_duration.labels(method=method, endpoint=endpoint).observe(duration)
    
    def record_error(self, error_type: str, endpoint: str):
        """Record error occurrence."""
        self.error_count.labels(error_type=error_type, endpoint=endpoint).inc()
    
    def record_cache_hit(self, cache_key_pattern: str):
        """Record cache hit."""
        self.cache_hits.labels(cache_key_pattern=cache_key_pattern).inc()
    
    def record_cache_miss(self, cache_key_pattern: str):
        """Record cache miss."""
        self.cache_misses.labels(cache_key_pattern=cache_key_pattern).inc()
    
    def update_cache_size(self, size: int):
        """Update cache size gauge."""
        self.cache_size.set(size)
    
    def update_circuit_breaker_state(self, service_name: str, state: int):
        """Update circuit breaker state (0=closed, 1=open, 2=half_open)."""
        self.circuit_breaker_state.labels(service_name=service_name).set(state)
    
    def record_circuit_breaker_failure(self, service_name: str):
        """Record circuit breaker failure."""
        self.circuit_breaker_failures.labels(service_name=service_name).inc()
    
    def record_circuit_breaker_success(self, service_name: str):
        """Record circuit breaker success."""
        self.circuit_breaker_successes.labels(service_name=service_name).inc()
    
    def update_db_pool_stats(self, total: int, active: int, idle: int):
        """Update database pool statistics."""
        self.db_pool_size.set(total)
        self.db_pool_active.set(active)
        self.db_pool_idle.set(idle)
    
    def update_redis_pool_size(self, size: int):
        """Update Redis pool size."""
        self.redis_pool_size.set(size)
    
    def record_rate_limit_exceeded(self, identifier_type: str, endpoint: str):
        """Record rate limit exceeded event."""
        self.rate_limit_exceeded.labels(identifier_type=identifier_type, endpoint=endpoint).inc()
    
    def set_app_info(self, version: str, environment: str):
        """Set application information."""
        self.app_info.info({
            'version': version,
            'environment': environment
        })
    
    def get_metrics(self) -> bytes:
        """Get metrics in Prometheus format."""
        return generate_latest()
    
    def get_content_type(self) -> str:
        """Get Prometheus content type."""
        return CONTENT_TYPE_LATEST


# Global metrics collector instance
metrics = MetricsCollector()


class RequestTimer:
    """Context manager for timing requests."""
    
    def __init__(self, method: str, endpoint: str, metrics_collector: Optional[MetricsCollector] = None):
        self.method = method
        self.endpoint = endpoint
        self.metrics = metrics_collector or metrics
        self.start_time = None
        self.status = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        if self.status:
            self.metrics.record_request(self.method, self.endpoint, self.status, duration)
    
    def set_status(self, status: int):
        """Set response status code."""
        self.status = status
