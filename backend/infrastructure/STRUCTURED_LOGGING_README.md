# Structured Logging System

## Overview

The STEM Project Generator backend uses a comprehensive structured logging system with JSON formatting, automatic request/response tracking, and sensitive data sanitization. This system provides production-ready logging with support for log aggregation services like CloudWatch and Datadog.

**Requirements:** 14.1, 14.2, 14.3, 14.7

## Features

- **JSON-formatted logs** for easy parsing and analysis
- **Automatic request/response logging** with timing metrics
- **Request ID tracking** for distributed tracing
- **User ID tracking** for authenticated requests
- **Sensitive data sanitization** (passwords, tokens, PII)
- **Environment-based configuration** (development vs production)
- **Log aggregation support** (CloudWatch, Datadog)
- **Structured context binding** for rich log metadata

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Application                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   LoggingMiddleware                          │
│  • Generates/extracts request ID                            │
│  • Logs request start                                       │
│  • Measures response time                                   │
│  • Logs response/errors                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   StructuredLogger                           │
│  • JSON formatting (production)                             │
│  • Console formatting (development)                         │
│  • Sensitive data sanitization                              │
│  • Context binding                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Log Aggregation (Optional)                      │
│  • CloudWatch Logs                                          │
│  • Datadog                                                  │
│  • Other services                                           │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Installation

The structured logging system is already integrated into the application. Dependencies are in `requirements.txt`:

```bash
pip install -r requirements.txt
```

Key dependency: `structlog==23.2.0`

### 2. Configuration

Configure logging via environment variables:

```bash
# Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
LOG_LEVEL=INFO

# Environment (affects log formatting)
ENVIRONMENT=production  # or development

# Log aggregation service (optional)
LOG_AGGREGATION_SERVICE=none  # or cloudwatch, datadog

# CloudWatch configuration (if using CloudWatch)
AWS_REGION=us-east-1
CLOUDWATCH_LOG_GROUP=/stem-backend/application
CLOUDWATCH_LOG_STREAM=backend-logs

# Datadog configuration (if using Datadog)
DATADOG_API_KEY=your-api-key
DATADOG_APP_KEY=your-app-key
```

### 3. Usage in Application

The logging middleware is automatically added to the FastAPI application in `server.py`:

```python
from backend.infrastructure.logging_middleware import LoggingMiddleware
from backend.infrastructure.structured_logger import configure_log_aggregation

# Configure log aggregation
configure_log_aggregation()

# Add logging middleware
app.add_middleware(LoggingMiddleware)
```

This automatically logs all HTTP requests and responses with:
- Request ID
- User ID (if authenticated)
- Endpoint path and method
- Response status code
- Response time in milliseconds
- Timestamp

## Using the Logger

### Basic Logging

```python
from backend.infrastructure.structured_logger import get_logger

logger = get_logger()

# Simple logging
logger.info("User logged in")
logger.warning("Cache miss for key: user_123")
logger.error("Failed to connect to database")
```

### Logging with Context

```python
# Bind context for all subsequent logs
bound_logger = logger.bind_context(
    request_id="req-abc123",
    user_id="user-456",
    endpoint="/api/projects"
)

bound_logger.info("Processing request")
bound_logger.info("Request completed")
```

### Logging HTTP Requests

```python
# Log request (automatically done by middleware)
logger.log_request(
    request_id="req-abc123",
    method="POST",
    endpoint="/api/projects",
    user_id="user-456",
    query_params={"limit": 10}
)
```

### Logging HTTP Responses

```python
# Log response (automatically done by middleware)
logger.log_response(
    request_id="req-abc123",
    status_code=200,
    response_time_ms=45.5,
    endpoint="/api/projects",
    user_id="user-456"
)
```

### Logging Errors with Context

```python
try:
    # Some operation
    result = await some_operation()
except Exception as e:
    logger.log_error_with_context(
        error=e,
        request_id="req-abc123",
        user_id="user-456",
        endpoint="/api/projects",
        operation="create_project"
    )
    raise
```

## Sensitive Data Sanitization

The logger automatically sanitizes sensitive data to prevent leaking credentials or PII:

### Sensitive Fields (Redacted)

- `password`, `passwd`, `pwd`
- `token`, `access_token`, `refresh_token`
- `api_key`, `apikey`, `secret`
- `authorization`, `auth`
- `credit_card`, `card_number`, `cvv`, `ssn`
- `private_key`, `encryption_key`

### PII Fields (Redacted)

- `email`, `phone`, `phone_number`
- `address`, `first_name`, `last_name`
- `full_name`, `date_of_birth`, `dob`

### Example

```python
data = {
    "username": "john",
    "password": "secret123",
    "email": "john@example.com",
    "api_key": "sk-abc123"
}

logger.info("User data", **data)

# Output (sanitized):
# {
#   "event": "User data",
#   "username": "john",
#   "password": "[REDACTED]",
#   "email": "[PII_REDACTED]",
#   "api_key": "[REDACTED]",
#   "timestamp": "2024-01-15T10:30:00.000Z"
# }
```

## Log Output Formats

### Development Environment

Console-friendly output with colors:

```
2024-01-15 10:30:00 [info     ] HTTP request               endpoint=/api/projects method=POST request_id=req-abc123 user_id=user-456
2024-01-15 10:30:00 [info     ] HTTP response              endpoint=/api/projects request_id=req-abc123 response_time_ms=45.5 status_code=200
```

### Production Environment

JSON-formatted output for log aggregation:

```json
{
  "event": "HTTP request",
  "level": "info",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "request_id": "req-abc123",
  "user_id": "user-456",
  "method": "POST",
  "endpoint": "/api/projects",
  "query_params": {"limit": 10}
}
```

```json
{
  "event": "HTTP response",
  "level": "info",
  "timestamp": "2024-01-15T10:30:00.500Z",
  "request_id": "req-abc123",
  "user_id": "user-456",
  "status_code": 200,
  "response_time_ms": 45.5,
  "endpoint": "/api/projects"
}
```

## Log Aggregation

### CloudWatch Logs

1. Install watchtower:
```bash
pip install watchtower
```

2. Configure environment:
```bash
LOG_AGGREGATION_SERVICE=cloudwatch
AWS_REGION=us-east-1
CLOUDWATCH_LOG_GROUP=/stem-backend/application
CLOUDWATCH_LOG_STREAM=backend-logs
```

3. Ensure AWS credentials are configured (IAM role or environment variables)

### Datadog

1. Install datadog:
```bash
pip install datadog
```

2. Configure environment:
```bash
LOG_AGGREGATION_SERVICE=datadog
DATADOG_API_KEY=your-api-key
DATADOG_APP_KEY=your-app-key
```

## Request ID Tracking

Request IDs enable distributed tracing across services:

### Automatic Generation

The logging middleware automatically generates a unique request ID for each request if not provided.

### Client-Provided Request ID

Clients can provide their own request ID via header:

```bash
curl -H "X-Request-ID: my-custom-id" https://api.example.com/projects
```

### Accessing Request ID in Handlers

```python
from fastapi import Request
from backend.infrastructure.logging_middleware import get_request_id

@app.get("/api/projects")
async def get_projects(request: Request):
    request_id = get_request_id(request)
    logger.info(f"Processing request {request_id}")
    # ...
```

### Response Headers

The request ID is automatically added to response headers:

```
X-Request-ID: req-abc123
```

## Best Practices

### 1. Use Structured Context

Instead of string formatting, use structured context:

```python
# ❌ Bad
logger.info(f"User {user_id} created project {project_id}")

# ✅ Good
logger.info("User created project", user_id=user_id, project_id=project_id)
```

### 2. Bind Context for Related Operations

```python
# Bind context once for multiple related logs
bound_logger = logger.bind_context(
    request_id=request_id,
    user_id=user_id,
    operation="create_project"
)

bound_logger.info("Validating input")
bound_logger.info("Creating project in database")
bound_logger.info("Sending notification")
```

### 3. Log at Appropriate Levels

- **DEBUG**: Detailed diagnostic information
- **INFO**: General informational messages
- **WARNING**: Warning messages for potentially harmful situations
- **ERROR**: Error messages for failures
- **CRITICAL**: Critical messages for severe failures

### 4. Include Context in Error Logs

```python
try:
    result = await operation()
except Exception as e:
    logger.log_error_with_context(
        error=e,
        request_id=request_id,
        user_id=user_id,
        endpoint=endpoint,
        operation="operation_name",
        input_data=sanitized_input  # Already sanitized by logger
    )
    raise
```

### 5. Don't Log Sensitive Data Directly

The logger sanitizes known sensitive fields, but be cautious:

```python
# ❌ Risky - might contain sensitive data
logger.info("Request body", body=request_body)

# ✅ Safe - logger sanitizes automatically
logger.info("User data", **user_data)  # password, email, etc. will be redacted
```

## Performance Considerations

### Async Logging

The logger uses async-safe operations and doesn't block request processing.

### Log Levels in Production

Set `LOG_LEVEL=INFO` or `LOG_LEVEL=WARNING` in production to reduce log volume:

```bash
# Development
LOG_LEVEL=DEBUG

# Production
LOG_LEVEL=INFO
```

### Log Sampling (Future Enhancement)

For very high-traffic endpoints, consider implementing log sampling to reduce volume while maintaining visibility.

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Error Rate**: Count of ERROR and CRITICAL logs
2. **Response Time**: `response_time_ms` field in response logs
3. **Request Volume**: Count of request logs per endpoint
4. **Status Codes**: Distribution of HTTP status codes

### Example CloudWatch Insights Queries

```sql
-- Error rate by endpoint
fields @timestamp, endpoint, error_type
| filter level = "error"
| stats count() by endpoint
| sort count desc

-- Average response time by endpoint
fields @timestamp, endpoint, response_time_ms
| filter response_time_ms > 0
| stats avg(response_time_ms) as avg_time by endpoint
| sort avg_time desc

-- Requests by user
fields @timestamp, user_id, endpoint
| filter user_id != null
| stats count() by user_id
| sort count desc
```

## Testing

Run the test suite:

```bash
pytest backend/tests/test_structured_logger.py -v
pytest backend/tests/test_logging_middleware.py -v
```

## Troubleshooting

### Logs Not Appearing

1. Check `LOG_LEVEL` environment variable
2. Verify `ENVIRONMENT` is set correctly
3. Check that middleware is added to FastAPI app

### Sensitive Data Not Sanitized

1. Verify field names match patterns in `SENSITIVE_FIELDS` or `PII_FIELDS`
2. Add custom patterns if needed in `structured_logger.py`

### CloudWatch/Datadog Not Working

1. Verify credentials are configured
2. Check `LOG_AGGREGATION_SERVICE` environment variable
3. Verify required packages are installed (`watchtower` or `datadog`)
4. Check application logs for configuration errors

## Related Documentation

- [Base Service README](./BASE_SERVICE_README.md) - Service layer integration
- [FastAPI Integration](./fastapi_integration.py) - Application lifecycle
- [Requirements Document](../../.kiro/specs/backend-services-improvement/requirements.md) - Requirement 14

## Requirements Mapping

- **14.1**: JSON-formatted structured logging with structlog
- **14.2**: Request ID, user ID, endpoint, and timestamp in log context
- **14.3**: Error logging with stack trace and context
- **14.7**: Sensitive data sanitization (passwords, tokens, PII)
