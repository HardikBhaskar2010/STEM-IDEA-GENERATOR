# ErrorHandler - Standardized Error Handling

## Overview

The ErrorHandler module provides centralized, standardized error handling across all API endpoints. It ensures consistent error responses, proper logging, request tracking, and sensitive data sanitization.

**Validates Requirements:** 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8

## Features

- **Standardized Error Codes**: Enumeration of all error types with consistent naming
- **Consistent Response Format**: All errors return the same JSON structure
- **Request ID Tracking**: Every error includes a unique request ID for tracing
- **Context-Aware Logging**: Errors are logged with full context (user, endpoint, method, etc.)
- **Sensitive Data Sanitization**: Automatic removal of passwords, tokens, and API keys from error messages
- **HTTP Status Code Mapping**: Automatic mapping of error codes to appropriate HTTP status codes

## Components

### ErrorCode Enum

Defines all standardized error codes:

**Client Errors (4xx):**
- `VALIDATION_ERROR` - Request validation failed (400)
- `AUTHENTICATION_ERROR` - Authentication failed (401)
- `AUTHORIZATION_ERROR` - Authorization failed (403)
- `NOT_FOUND` - Resource not found (404)
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded (429)
- `INVALID_REQUEST` - Invalid request format (400)

**Server Errors (5xx):**
- `INTERNAL_ERROR` - Internal server error (500)
- `SERVICE_UNAVAILABLE` - Service unavailable (503)
- `DATABASE_ERROR` - Database operation failed (500)
- `EXTERNAL_API_ERROR` - External API call failed (502)
- `CACHE_ERROR` - Cache operation failed (500)

### APIError Exception

Custom exception class for raising API errors:

```python
from backend.infrastructure.error_handler import APIError, ErrorCode

# Raise a validation error
raise APIError(
    code=ErrorCode.VALIDATION_ERROR,
    message="Invalid email format",
    details={"field": "email", "value": "invalid@"},
    status_code=400  # Optional, defaults to code mapping
)

# Raise a not found error
raise APIError(
    code=ErrorCode.NOT_FOUND,
    message="User not found",
    details={"user_id": "123"}
)
```

### ErrorResponse Model

Pydantic model defining the standard error response format:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid email format",
  "details": {
    "field": "email",
    "value": "invalid@"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "path": "/api/users"
}
```

### ErrorHandler Class

Main class providing error handling methods:

#### Methods

**`handle_exception(request, exc)`**
- Handles any exception and returns standardized JSONResponse
- Automatically detects exception type and maps to appropriate error code
- Logs error with full context
- Sanitizes sensitive data

**`create_error_response(code, message, details, status_code, request_id, path)`**
- Creates standardized error response
- Sanitizes message and details
- Includes timestamp and request tracking

**`log_error(error, context)`**
- Logs error with context information
- Includes stack trace for non-API errors
- Uses structured logging

## Usage

### Basic Usage in FastAPI

```python
from fastapi import FastAPI, Request
from backend.infrastructure.error_handler import ErrorHandler, APIError, ErrorCode

app = FastAPI()

# Add exception handler middleware
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return ErrorHandler.handle_exception(request, exc)

# Use in endpoints
@app.get("/users/{user_id}")
async def get_user(user_id: str):
    user = await db.get_user(user_id)
    if not user:
        raise APIError(
            code=ErrorCode.NOT_FOUND,
            message="User not found",
            details={"user_id": user_id}
        )
    return user
```

### Validation Errors

```python
from pydantic import BaseModel, validator
from backend.infrastructure.error_handler import APIError, ErrorCode

class UserCreate(BaseModel):
    email: str
    password: str
    
    @validator('email')
    def validate_email(cls, v):
        if '@' not in v:
            raise APIError(
                code=ErrorCode.VALIDATION_ERROR,
                message="Invalid email format",
                details={"field": "email"}
            )
        return v
```

### Database Errors

```python
from backend.infrastructure.error_handler import APIError, ErrorCode

async def create_user(user_data):
    try:
        result = await db.insert_user(user_data)
        return result
    except DatabaseException as e:
        raise APIError(
            code=ErrorCode.DATABASE_ERROR,
            message="Failed to create user",
            details={"error": str(e)}
        )
```

### External API Errors

```python
from backend.infrastructure.error_handler import APIError, ErrorCode

async def fetch_external_data(api_url):
    try:
        response = await http_client.get(api_url)
        return response.json()
    except HTTPException as e:
        raise APIError(
            code=ErrorCode.EXTERNAL_API_ERROR,
            message="External API call failed",
            details={"url": api_url, "status": e.status_code}
        )
```

## Sensitive Data Sanitization

The ErrorHandler automatically sanitizes sensitive data from error messages and details:

**Sanitized Patterns:**
- Passwords: `password="secret"` → `password=***REDACTED***`
- Tokens: `token=abc123` → `token=***REDACTED***`
- API Keys: `api_key=sk-123` → `api_key=***REDACTED***`
- Secrets: `secret="value"` → `secret=***REDACTED***`
- Authorization Headers: `Authorization: Bearer token` → `auth_token=***REDACTED***`

**Example:**

```python
# Original error message
message = 'Authentication failed: password="secret123" is invalid'

# Sanitized message
# 'Authentication failed: password=***REDACTED*** is invalid'
```

## Request ID Tracking

Every error response includes a unique request ID for tracing:

1. If the request has a `request_id` in `request.state`, it will be used
2. Otherwise, a new UUID will be generated

**Setting Request ID in Middleware:**

```python
from fastapi import Request
import uuid

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request.state.request_id = str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response
```

## Error Logging

All errors are logged with full context:

```python
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "path": "/api/users/123",
  "method": "GET",
  "error_code": "NOT_FOUND",
  "status_code": 404,
  "error_type": "APIError",
  "error_message": "User not found",
  "user_id": "user-123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Testing

Comprehensive unit tests are provided in `backend/tests/test_error_handler.py`:

```bash
# Run all error handler tests
pytest backend/tests/test_error_handler.py -v

# Run specific test class
pytest backend/tests/test_error_handler.py::TestErrorHandler -v

# Run with coverage
pytest backend/tests/test_error_handler.py --cov=backend.infrastructure.error_handler
```

## Integration with Other Components

### With Rate Limiter

```python
from backend.infrastructure.error_handler import APIError, ErrorCode
from backend.infrastructure.rate_limiter import RateLimiter

rate_limiter = RateLimiter(redis_client)

@app.post("/api/endpoint")
async def endpoint(request: Request):
    result = await rate_limiter.check_rate_limit(
        identifier=request.client.host,
        limit=100,
        window=timedelta(minutes=1)
    )
    
    if not result.allowed:
        raise APIError(
            code=ErrorCode.RATE_LIMIT_EXCEEDED,
            message="Rate limit exceeded",
            details={
                "limit": 100,
                "reset_at": result.reset_at.isoformat()
            },
            status_code=429
        )
```

### With Request Validator

```python
from backend.infrastructure.error_handler import APIError, ErrorCode
from backend.infrastructure.request_validator import RequestValidator

@app.post("/api/users")
async def create_user(data: dict):
    try:
        validated_data = RequestValidator.validate(data, UserCreateRequest)
        return await create_user_service(validated_data)
    except ValidationError as e:
        raise APIError(
            code=ErrorCode.VALIDATION_ERROR,
            message="Request validation failed",
            details={"errors": e.errors}
        )
```

### With Circuit Breaker

```python
from backend.infrastructure.error_handler import APIError, ErrorCode
from backend.infrastructure.circuit_breaker import CircuitBreaker

circuit_breaker = CircuitBreaker()

@app.get("/api/external-data")
async def get_external_data():
    try:
        data = await circuit_breaker.call(fetch_external_api)
        return data
    except CircuitOpenError:
        raise APIError(
            code=ErrorCode.SERVICE_UNAVAILABLE,
            message="External service is currently unavailable",
            details={"retry_after": 60}
        )
```

## Best Practices

1. **Always use ErrorCode enum**: Don't create custom error codes
2. **Provide meaningful messages**: Error messages should be clear and actionable
3. **Include relevant details**: Add context that helps debugging
4. **Don't expose sensitive data**: Let sanitization handle it, but avoid including sensitive data in the first place
5. **Use appropriate error codes**: Match the error code to the actual error type
6. **Log errors with context**: Include user_id, request_id, and other relevant context
7. **Handle errors at the right level**: Catch specific exceptions and convert to APIError

## Error Response Examples

### Validation Error (400)

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": {
    "field": "email",
    "error": "Invalid email format"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "path": "/api/users"
}
```

### Authentication Error (401)

```json
{
  "error": "AUTHENTICATION_ERROR",
  "message": "Invalid or expired token",
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "path": "/api/protected"
}
```

### Not Found Error (404)

```json
{
  "error": "NOT_FOUND",
  "message": "User not found",
  "details": {
    "user_id": "123"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "path": "/api/users/123"
}
```

### Rate Limit Error (429)

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests",
  "details": {
    "limit": 100,
    "reset_at": "2024-01-15T10:31:00Z"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "path": "/api/endpoint"
}
```

### Internal Error (500)

```json
{
  "error": "INTERNAL_ERROR",
  "message": "An internal error occurred",
  "details": {
    "error_type": "ValueError"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "path": "/api/endpoint"
}
```

## Requirements Validation

This implementation validates the following requirements:

- **7.1**: Error responses include error code, message, details, timestamp, and request ID ✓
- **7.2**: Validation errors return HTTP 400 with VALIDATION_ERROR code ✓
- **7.3**: Authentication failures return HTTP 401 with AUTHENTICATION_ERROR code ✓
- **7.4**: Authorization failures return HTTP 403 with AUTHORIZATION_ERROR code ✓
- **7.5**: Not found errors return HTTP 404 with NOT_FOUND code ✓
- **7.6**: Rate limit errors return HTTP 429 with RATE_LIMIT_EXCEEDED code ✓
- **7.7**: Internal errors return HTTP 500 with INTERNAL_ERROR and sanitized messages ✓
- **7.8**: All errors are logged with context including request ID, user ID, endpoint, and timestamp ✓

## Future Enhancements

- Add support for internationalization (i18n) of error messages
- Implement error aggregation for monitoring dashboards
- Add error recovery suggestions in error responses
- Support for custom error handlers per endpoint
- Integration with error tracking services (Sentry, Rollbar)
