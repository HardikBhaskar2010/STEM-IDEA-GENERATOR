# API Middleware Stack Guide

This guide explains the complete API middleware stack implementation for the backend services improvement project.

## Overview

The middleware stack provides comprehensive request processing with:
- **Rate Limiting**: Protect endpoints from abuse
- **Request Validation**: Validate and sanitize all inputs
- **Authentication**: JWT token validation and RBAC
- **Error Handling**: Standardized error responses
- **Logging**: Structured request/response logging

## Middleware Components

### 1. Rate Limiting Middleware

**File**: `backend/infrastructure/rate_limit_middleware.py`

**Features**:
- Per-user, per-IP, and per-endpoint rate limiting
- Different rate limit tiers (anonymous, authenticated, premium, admin)
- Rate limit headers in all responses
- 429 responses when limits exceeded

**Configuration**:
```python
from backend.infrastructure.rate_limit_middleware import (
    RateLimitMiddleware,
    configure_rate_limit_tiers,
    configure_endpoint_limits
)

# Configure custom tiers
configure_rate_limit_tiers({
    "custom_tier": {
        "limit": 200,
        "window": timedelta(minutes=1)
    }
})

# Configure endpoint-specific limits
configure_endpoint_limits({
    "/api/custom/endpoint": {
        "authenticated": {"limit": 50, "window": timedelta(minutes=1)}
    }
})
```

**Requirements**: 4.2, 4.3, 4.5, 4.6

### 2. Request Validation Middleware

**File**: `backend/infrastructure/validation_middleware.py`

**Features**:
- Automatic validation against Pydantic models
- Input sanitization (XSS, SQL injection prevention)
- Detailed validation error responses
- Request body size limits

**Configuration**:
```python
from backend.infrastructure.validation_middleware import (
    ValidationMiddleware,
    register_validation_model
)
from pydantic import BaseModel

# Define validation model
class ChatMessageRequest(BaseModel):
    content: str
    user_id: str

# Register model for endpoint
register_validation_model(
    endpoint="/api/chat/message",
    method="POST",
    model=ChatMessageRequest
)
```

**Requirements**: 6.1, 6.2, 6.3, 6.5, 6.6

### 3. Authentication Middleware

**File**: `backend/infrastructure/auth_middleware.py`

**Features**:
- JWT token validation
- User ID and role extraction
- 401 responses for invalid/expired tokens
- Role-based access control (RBAC)

**Configuration**:
```python
from backend.infrastructure.auth_middleware import (
    AuthMiddleware,
    add_public_path,
    add_role_protected_path
)

# Add public paths (no auth required)
add_public_path("/api/public/endpoint")

# Add role-protected paths
add_role_protected_path(
    path="/api/admin",
    required_roles=["admin"]
)
```

**Environment Variables**:
- `JWT_SECRET`: Secret key for JWT validation
- `JWT_ALGORITHM`: Algorithm for JWT (default: HS256)

**Requirements**: 13.1, 13.2, 13.4

### 4. Error Handling Middleware

**File**: `backend/infrastructure/error_middleware.py`

**Features**:
- Catches all unhandled exceptions
- Standardized error response format
- Request ID tracking
- Error logging with context
- Sensitive data sanitization

**Configuration**:
```python
from backend.infrastructure.error_middleware import (
    ErrorMiddleware,
    setup_exception_handlers
)

# Add middleware
app.add_middleware(ErrorMiddleware)

# Setup exception handlers
setup_exception_handlers(app)
```

**Requirements**: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8

### 5. Logging Middleware

**File**: `backend/infrastructure/logging_middleware.py`

**Features**:
- Request/response logging
- Request ID generation/tracking
- User ID logging (if authenticated)
- Response time tracking
- Structured JSON logging

**Configuration**:
```python
from backend.infrastructure.logging_middleware import LoggingMiddleware

# Add middleware
app.add_middleware(LoggingMiddleware)
```

**Requirements**: 14.2

## Middleware Execution Order

Middleware executes in **reverse order** of how it's added to the app. The correct order is:

```python
# Add middleware in reverse order of execution
app.add_middleware(ValidationMiddleware)        # 5. Validate request
app.add_middleware(RateLimitMiddleware)         # 4. Check rate limits
app.add_middleware(AuthMiddleware)              # 3. Authenticate user
app.add_middleware(ErrorMiddleware)             # 2. Handle errors
app.add_middleware(LoggingMiddleware)           # 1. Log request (first)
```

**Execution Flow**:
1. **Logging**: Generates request ID, logs request
2. **Error Handling**: Catches any exceptions
3. **Authentication**: Validates JWT token, extracts user
4. **Rate Limiting**: Checks rate limits
5. **Validation**: Validates and sanitizes request body
6. **Route Handler**: Processes request
7. **Validation**: (response)
8. **Rate Limiting**: Adds rate limit headers
9. **Authentication**: (response)
10. **Error Handling**: (response)
11. **Logging**: Logs response, adds request ID header

## Complete Setup Example

```python
from fastapi import FastAPI
from backend.infrastructure.rate_limit_middleware import RateLimitMiddleware
from backend.infrastructure.validation_middleware import ValidationMiddleware
from backend.infrastructure.auth_middleware import AuthMiddleware
from backend.infrastructure.error_middleware import ErrorMiddleware, setup_exception_handlers
from backend.infrastructure.logging_middleware import LoggingMiddleware
from backend.infrastructure.rate_limiter import initialize_rate_limiter
from backend.infrastructure.redis_client import RedisClient

# Create FastAPI app
app = FastAPI()

# Initialize Redis client
redis_client = RedisClient(
    redis_url=os.getenv("REDIS_URL"),
    max_connections=50
)

# Initialize rate limiter
rate_limiter = await initialize_rate_limiter(redis_client)

# Add middleware in reverse order of execution
app.add_middleware(ValidationMiddleware)
app.add_middleware(RateLimitMiddleware, rate_limiter=rate_limiter)
app.add_middleware(AuthMiddleware)
app.add_middleware(ErrorMiddleware)
app.add_middleware(LoggingMiddleware)

# Setup exception handlers
setup_exception_handlers(app)
```

## Response Headers

All responses include these headers:

- `X-Request-ID`: Unique request identifier
- `X-RateLimit-Limit`: Rate limit for this endpoint/user
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Timestamp when limit resets

Error responses (429) also include:
- `Retry-After`: Seconds to wait before retrying

## Error Response Format

All errors follow this standardized format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "additional": "error details"
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "request_id": "uuid-here",
  "path": "/api/endpoint"
}
```

## Error Codes

- `VALIDATION_ERROR` (400): Request validation failed
- `AUTHENTICATION_ERROR` (401): Invalid or missing token
- `AUTHORIZATION_ERROR` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMIT_EXCEEDED` (429): Rate limit exceeded
- `INTERNAL_ERROR` (500): Internal server error
- `SERVICE_UNAVAILABLE` (503): Service unavailable
- `DATABASE_ERROR` (500): Database error
- `EXTERNAL_API_ERROR` (502): External API error
- `CACHE_ERROR` (500): Cache error

## Rate Limit Tiers

Default rate limit tiers:

| Tier | Limit | Window |
|------|-------|--------|
| Anonymous | 20 req | 1 min |
| Authenticated | 100 req | 1 min |
| Premium | 500 req | 1 min |
| Admin | 10,000 req | 1 min |

Endpoint-specific limits (override tier defaults):

| Endpoint | Anonymous | Authenticated | Premium |
|----------|-----------|---------------|---------|
| `/api/ai/generate` | 5/min | 20/min | 100/min |
| `/api/code/generate` | 3/min | 10/min | 50/min |
| `/api/chat/message` | 10/min | 60/min | 200/min |

## Public Paths

These paths don't require authentication:

- `/health`
- `/health/ready`
- `/health/live`
- `/metrics`
- `/docs`
- `/openapi.json`
- `/redoc`
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/refresh`

## Role-Protected Paths

These paths require specific roles:

- `/api/admin/*`: Requires `admin` role
- `/api/monitoring/*`: Requires `admin` or `operator` role

## Testing

Run integration tests:

```bash
pytest backend/tests/test_middleware_stack_integration.py -v
```

Test coverage includes:
- Middleware execution order
- Rate limiting enforcement
- Request validation
- Authentication flow
- Error handling
- Logging integration

## Monitoring

Monitor middleware performance:

```python
from backend.infrastructure.rate_limiter import get_rate_limiter

# Get rate limiter stats
rate_limiter = get_rate_limiter()
stats = rate_limiter.get_global_stats()

print(f"Allowed: {stats['allowed']}")
print(f"Denied: {stats['denied']}")
print(f"Allow rate: {stats['allow_rate']}")
```

## Troubleshooting

### Rate Limiting Not Working

1. Check Redis connection:
```python
redis_health = await redis_client.health_check()
print(redis_health)
```

2. Check rate limiter initialization:
```python
rate_limiter = get_rate_limiter()
if not rate_limiter:
    print("Rate limiter not initialized!")
```

### Authentication Failing

1. Check JWT secret configuration:
```bash
echo $JWT_SECRET
```

2. Verify token format:
```python
import jwt
token = "your-token-here"
payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
print(payload)
```

### Validation Not Working

1. Check if validation model is registered:
```python
from backend.infrastructure.validation_middleware import VALIDATION_MODELS
print(VALIDATION_MODELS)
```

2. Verify model registration:
```python
register_validation_model("/api/endpoint", "POST", YourModel)
```

## Best Practices

1. **Always use HTTPS in production** - JWT tokens should never be sent over HTTP
2. **Rotate JWT secrets regularly** - Use environment variables, never hardcode
3. **Set appropriate rate limits** - Balance security and user experience
4. **Monitor rate limit metrics** - Adjust limits based on actual usage
5. **Log all authentication failures** - Monitor for potential attacks
6. **Sanitize all user input** - Defense in depth against injection attacks
7. **Use request IDs for debugging** - Track requests across services
8. **Test middleware order** - Incorrect order can cause security issues

## Security Considerations

1. **JWT Secret**: Use strong, random secret keys (min 32 characters)
2. **Token Expiration**: Set reasonable expiration times (1-24 hours)
3. **Rate Limiting**: Prevent brute force and DoS attacks
4. **Input Sanitization**: Prevent XSS and SQL injection
5. **Error Messages**: Don't leak sensitive information in errors
6. **HTTPS Only**: Enforce HTTPS in production
7. **CORS**: Configure CORS appropriately for your frontend

## Performance Optimization

1. **Redis Connection Pooling**: Use connection pools for rate limiting
2. **Validation Caching**: Cache validation models
3. **Async Operations**: All middleware uses async/await
4. **Request Body Limits**: Prevent large payload attacks
5. **Logging Sampling**: Sample logs in high-traffic scenarios

## Future Enhancements

1. **API Key Authentication**: Support API keys in addition to JWT
2. **OAuth2 Integration**: Support OAuth2 providers
3. **Advanced Rate Limiting**: Token bucket, leaky bucket algorithms
4. **Request Throttling**: Slow down requests instead of rejecting
5. **Distributed Tracing**: OpenTelemetry integration
6. **Metrics Export**: Prometheus metrics for all middleware
7. **Circuit Breaker**: Protect against cascading failures

## References

- Requirements: 4.2, 4.3, 4.5, 4.6, 6.1, 6.2, 6.3, 6.5, 6.6, 7.1-7.8, 13.1, 13.2, 13.4, 14.2
- Design Document: `.kiro/specs/backend-services-improvement/design.md`
- Tasks: `.kiro/specs/backend-services-improvement/tasks.md`
