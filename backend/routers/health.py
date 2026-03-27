"""
Health check router.

Thin HTTP handler that delegates all health logic to OpenRouterHealthCheck.
Provides basic liveness, detailed readiness, and a test-status endpoint.

Requirements: 5, 5.4, 5.5, 5.6
"""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from backend.core.dependencies import get_openrouter_health
from backend.core.exceptions import AppError
from backend.integrations.openrouter.health import OpenRouterHealthCheck

logger = logging.getLogger(__name__)

health_router = APIRouter(prefix="/api", tags=["health"])


@health_router.get("/health")
async def health() -> Dict[str, Any]:
    """Basic liveness endpoint.

    Returns:
        ``{"status": "ok"}`` when the application is running.

    Requirements: 5.4
    """
    return {"status": "ok"}


@health_router.get("/health/detailed")
async def health_detailed(
    health_check: OpenRouterHealthCheck = Depends(get_openrouter_health),
) -> Dict[str, Any]:
    """Detailed readiness endpoint including upstream connectivity.

    Requirements: 5.5
    """
    try:
        openrouter_status = await health_check.check_health()
        overall = "healthy" if openrouter_status.get("status") == "healthy" else "degraded"
        return {
            "status": overall,
            "services": {
                "openrouter": openrouter_status,
            },
        }
    except Exception as exc:
        logger.error("Health check failed: %s", exc)
        return {
            "status": "degraded",
            "error": str(exc),
        }


@health_router.get("/test-status")
async def test_status() -> Dict[str, Any]:
    """Simple test-status endpoint for smoke-testing deployments.

    Requirements: 5.6
    """
    return {"status": "running", "message": "STEM Idea Generator API is operational"}
