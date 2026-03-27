# Exception Hierarchy Usage Guide

This document provides examples of how to use the domain exception hierarchy across different layers of the application.

## Overview

The exception hierarchy provides consistent error handling across all layers:
- **Services** throw domain exceptions for business rule violations
- **Orchestrators** catch service exceptions and may add context or perform recovery
- **Routers** catch domain exceptions and convert them to HTTP responses

## Exception Classes

| Exception | HTTP Status | Use Case |
|-----------|-------------|----------|
| `AppError` | 500 | Base class for all application errors |
| `ValidationError` | 400 | Invalid input, missing required fields |
| `NotFoundError` | 404 | Resource doesn't exist |
| `AuthenticationError` | 401 | Invalid credentials, expired tokens |
| `AuthorizationError` | 403 | User lacks permission |
| `RateLimitError` | 429 | Rate limit exceeded |
| `UpstreamError` | 429/502/503 | External service failure |

## Usage Examples

### In Services

Services throw domain exceptions for business rule violations:

```python
# backend/services/sandbox_service.py
from backend.core.exceptions import NotFoundError, ValidationError

class SandboxService:
    async def get_logs(self, project_id: str, run_id: str) -> Dict[str, Any]:
        # Validate inputs
        if not project_id or not run_id:
            raise ValidationError(
                "project_id and run_id are required",
                details={"project_id": project_id, "run_id": run_id}
            )
        
        # Check if run exists
        run = await self.sandbox_manager.get_run(run_id)
        if not run:
            raise NotFoundError(
                f"Run {run_id} not found for project {project_id}",
                details={"project_id": project_id, "run_id": run_id}
            )
        
        return run.logs
```

### In Orchestrators

Orchestrators catch service exceptions and may add context or perform recovery:

```python
# backend/orchestration/project_orchestrator.py
from backend.core.exceptions import UpstreamError, ValidationError

class ProjectOrchestrator:
    async def generate_project(self, params: ProjectParams) -> GeneratedProject:
        # Validate inputs
        if not params.topic or not params.topic.strip():
            raise ValidationError(
                "Project topic cannot be empty",
                details={"topic": params.topic}
            )
        
        try:
            # Try OpenRouter first
            result = await self.openrouter_client.chat_completion(prompt)
            return self._parse_response(result)
        except Exception as e:
            # Wrap upstream errors with context
            raise UpstreamError(
                message=f"OpenRouter API failed: {str(e)}",
                service="OpenRouter",
                details={"original_error": str(e), "params": params.dict()}
            )
```

### In Routers

Routers catch domain exceptions and convert them to HTTP responses:

```python
# backend/routers/projects.py
from fastapi import APIRouter, Depends, HTTPException
from backend.core.exceptions import AppError
from backend.orchestration.project_orchestrator import ProjectOrchestrator

router = APIRouter(prefix="/api", tags=["projects"])

@router.post("/generate-project")
async def generate_project(
    params: ProjectParams,
    orchestrator: ProjectOrchestrator = Depends(get_project_orchestrator)
):
    """Generate a STEM project based on parameters"""
    try:
        return await orchestrator.generate_project(params)
    except AppError as e:
        # Domain exceptions map to HTTP status codes
        raise HTTPException(
            status_code=e.to_http_status(),
            detail=e.to_response_dict()
        )
    except Exception as e:
        # Unexpected errors
        logger.exception("Unexpected error in generate_project")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "InternalServerError",
                "message": "An unexpected error occurred"
            }
        )
```

## Error Response Format

All domain exceptions return a consistent JSON response format:

```json
{
  "error": "ValidationError",
  "message": "Project topic cannot be empty",
  "details": {
    "topic": ""
  }
}
```

## UpstreamError Status Mapping

The `UpstreamError` class intelligently maps upstream status codes:

| Upstream Status | Client Status | Reason |
|----------------|---------------|---------|
| 429 | 429 | Rate limit from upstream |
| 400-499 | 502 | Bad gateway (upstream client error) |
| 500-599 | 503 | Service unavailable (upstream server error) |
| None | 503 | Service unavailable (unknown error) |

Example:

```python
# OpenRouter returns 503
raise UpstreamError(
    message="OpenRouter is temporarily unavailable",
    service="OpenRouter",
    upstream_status=503
)
# Client receives: 503 Service Unavailable

# OpenRouter returns 400
raise UpstreamError(
    message="Invalid request to OpenRouter",
    service="OpenRouter",
    upstream_status=400
)
# Client receives: 502 Bad Gateway
```

## Best Practices

1. **Always include context**: Use the `details` parameter to provide additional information
2. **Be specific**: Use the most specific exception class (e.g., `NotFoundError` instead of `AppError`)
3. **Don't expose internals**: Sanitize error messages to avoid leaking sensitive information
4. **Log before throwing**: Log detailed error information before throwing exceptions
5. **Catch at the right level**: Services throw, orchestrators may catch and add context, routers always catch

## Testing

Test exception handling in unit tests:

```python
import pytest
from backend.core.exceptions import ValidationError, NotFoundError

def test_service_validation():
    service = SandboxService()
    
    with pytest.raises(ValidationError) as exc_info:
        await service.get_logs("", "")
    
    assert exc_info.value.to_http_status() == 400
    assert "required" in exc_info.value.message

def test_service_not_found():
    service = SandboxService()
    
    with pytest.raises(NotFoundError) as exc_info:
        await service.get_logs("project123", "nonexistent")
    
    assert exc_info.value.to_http_status() == 404
    assert "not found" in exc_info.value.message
```
