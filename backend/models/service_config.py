# Service Configuration Models
# Requirements: 3.1, 4.1, 5.1

from datetime import timedelta
from typing import Dict, Optional
from enum import Enum
from pydantic import BaseModel, Field, validator, HttpUrl


class CacheStrategy(str, Enum):
    """Cache strategy types"""
    CACHE_ASIDE = "cache_aside"
    WRITE_THROUGH = "write_through"
    WRITE_BEHIND = "write_behind"


class RateLimitStrategy(str, Enum):
    """Rate limiting strategy types"""
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"
    LEAKY_BUCKET = "leaky_bucket"


class LogLevel(str, Enum):
    """Python logging levels"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class CacheConfig(BaseModel):
    """
    Configuration for Redis-based caching
    
    Attributes:
        enabled: Whether caching is enabled
        redis_url: Redis connection URL (redis://host:port/db)
        default_ttl: Default time-to-live for cache entries
        max_connections: Maximum number of Redis connections in pool
        strategy: Caching strategy to use
    """
    enabled: bool = True
    redis_url: str = Field(..., min_length=1)
    default_ttl: timedelta = Field(default=timedelta(hours=1))
    max_connections: int = Field(default=10, ge=1, le=100)
    strategy: CacheStrategy = CacheStrategy.CACHE_ASIDE

    @validator('redis_url')
    def validate_redis_url(cls, v):
        """Validate Redis URL format"""
        if not v:
            raise ValueError("Redis URL cannot be empty")
        
        # Basic validation for redis:// or rediss:// protocol
        if not (v.startswith('redis://') or v.startswith('rediss://')):
            raise ValueError("Redis URL must start with 'redis://' or 'rediss://'")
        
        return v

    @validator('default_ttl')
    def validate_default_ttl(cls, v):
        """Validate TTL is positive"""
        if v.total_seconds() <= 0:
            raise ValueError("default_ttl must be a positive duration")
        return v

    class Config:
        json_encoders = {
            timedelta: lambda v: int(v.total_seconds())
        }


class RateLimitConfig(BaseModel):
    """
    Configuration for rate limiting
    
    Attributes:
        enabled: Whether rate limiting is enabled
        strategy: Rate limiting algorithm to use
        default_limit: Default number of requests allowed
        default_window: Default time window for rate limiting
        per_endpoint_limits: Custom limits per endpoint (endpoint_path: limit)
    """
    enabled: bool = True
    strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW
    default_limit: int = Field(default=100, ge=1)
    default_window: timedelta = Field(default=timedelta(minutes=1))
    per_endpoint_limits: Dict[str, int] = Field(default_factory=dict)

    @validator('default_limit')
    def validate_default_limit(cls, v):
        """Validate limit is positive"""
        if v <= 0:
            raise ValueError("default_limit must be a positive integer")
        return v

    @validator('default_window')
    def validate_default_window(cls, v):
        """Validate window is positive"""
        if v.total_seconds() <= 0:
            raise ValueError("default_window must be a positive duration")
        return v

    @validator('per_endpoint_limits')
    def validate_per_endpoint_limits(cls, v):
        """Validate all endpoint limits are positive"""
        for endpoint, limit in v.items():
            if limit <= 0:
                raise ValueError(f"Limit for endpoint '{endpoint}' must be positive")
        return v

    class Config:
        json_encoders = {
            timedelta: lambda v: int(v.total_seconds())
        }


class CircuitBreakerConfig(BaseModel):
    """
    Configuration for circuit breaker pattern
    
    Attributes:
        enabled: Whether circuit breaker is enabled
        failure_threshold: Number of failures before opening circuit
        success_threshold: Number of successes to close circuit from half-open
        timeout: Time to wait before transitioning from open to half-open
        half_open_timeout: Time to wait in half-open state before retrying
    """
    enabled: bool = True
    failure_threshold: int = Field(default=5, ge=1)
    success_threshold: int = Field(default=2, ge=1)
    timeout: timedelta = Field(default=timedelta(seconds=60))
    half_open_timeout: timedelta = Field(default=timedelta(seconds=30))

    @validator('failure_threshold')
    def validate_failure_threshold(cls, v):
        """Validate failure threshold is positive"""
        if v <= 0:
            raise ValueError("failure_threshold must be a positive integer")
        return v

    @validator('success_threshold')
    def validate_success_threshold(cls, v):
        """Validate success threshold is positive"""
        if v <= 0:
            raise ValueError("success_threshold must be a positive integer")
        return v

    @validator('timeout')
    def validate_timeout(cls, v):
        """Validate timeout is positive"""
        if v.total_seconds() <= 0:
            raise ValueError("timeout must be a positive duration")
        return v

    @validator('half_open_timeout')
    def validate_half_open_timeout(cls, v):
        """Validate half-open timeout is positive"""
        if v.total_seconds() <= 0:
            raise ValueError("half_open_timeout must be a positive duration")
        return v

    class Config:
        json_encoders = {
            timedelta: lambda v: int(v.total_seconds())
        }


class ServiceConfig(BaseModel):
    """
    Complete service configuration combining all infrastructure components
    
    Attributes:
        cache: Redis cache configuration
        rate_limit: Rate limiting configuration
        circuit_breaker: Circuit breaker configuration
        database_url: PostgreSQL/Supabase connection URL
        log_level: Logging level for the application
        enable_metrics: Whether to enable Prometheus metrics
        enable_tracing: Whether to enable OpenTelemetry tracing
    """
    cache: CacheConfig
    rate_limit: RateLimitConfig
    circuit_breaker: CircuitBreakerConfig
    database_url: str = Field(..., min_length=1)
    log_level: LogLevel = LogLevel.INFO
    enable_metrics: bool = True
    enable_tracing: bool = True

    @validator('database_url')
    def validate_database_url(cls, v):
        """Validate database URL is not empty"""
        if not v or not v.strip():
            raise ValueError("database_url cannot be empty")
        
        # Basic validation for postgresql:// protocol
        if not v.startswith('postgresql://') and not v.startswith('postgres://'):
            raise ValueError("database_url must start with 'postgresql://' or 'postgres://'")
        
        return v

    class Config:
        json_encoders = {
            timedelta: lambda v: int(v.total_seconds())
        }


# Example configuration for development
def get_development_config() -> ServiceConfig:
    """
    Get default development configuration
    
    Returns:
        ServiceConfig with development-friendly settings
    """
    return ServiceConfig(
        cache=CacheConfig(
            enabled=True,
            redis_url="redis://localhost:6379/0",
            default_ttl=timedelta(minutes=30),
            max_connections=5,
            strategy=CacheStrategy.CACHE_ASIDE
        ),
        rate_limit=RateLimitConfig(
            enabled=True,
            strategy=RateLimitStrategy.SLIDING_WINDOW,
            default_limit=1000,
            default_window=timedelta(minutes=1),
            per_endpoint_limits={
                "/api/chat/message": 60,
                "/api/code/generate": 10,
                "/api/ai/guidance": 20
            }
        ),
        circuit_breaker=CircuitBreakerConfig(
            enabled=True,
            failure_threshold=5,
            success_threshold=2,
            timeout=timedelta(seconds=60),
            half_open_timeout=timedelta(seconds=30)
        ),
        database_url="postgresql://localhost:5432/stem_dev",
        log_level=LogLevel.DEBUG,
        enable_metrics=True,
        enable_tracing=False
    )


# Example configuration for production
def get_production_config() -> ServiceConfig:
    """
    Get default production configuration
    
    Returns:
        ServiceConfig with production-optimized settings
    """
    return ServiceConfig(
        cache=CacheConfig(
            enabled=True,
            redis_url="redis://production-redis:6379/0",
            default_ttl=timedelta(hours=1),
            max_connections=50,
            strategy=CacheStrategy.CACHE_ASIDE
        ),
        rate_limit=RateLimitConfig(
            enabled=True,
            strategy=RateLimitStrategy.SLIDING_WINDOW,
            default_limit=100,
            default_window=timedelta(minutes=1),
            per_endpoint_limits={
                "/api/chat/message": 60,
                "/api/code/generate": 10,
                "/api/ai/guidance": 20
            }
        ),
        circuit_breaker=CircuitBreakerConfig(
            enabled=True,
            failure_threshold=5,
            success_threshold=2,
            timeout=timedelta(seconds=60),
            half_open_timeout=timedelta(seconds=30)
        ),
        database_url="postgresql://production-db:5432/stem_prod",
        log_level=LogLevel.INFO,
        enable_metrics=True,
        enable_tracing=True
    )
