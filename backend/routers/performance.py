"""
Performance monitoring router.

Thin HTTP handler for database performance metrics endpoints.
Delegates to PerformanceService.

Requirements: 14, 14.4, 14.5, 14.6
"""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from backend.core.exceptions import AppError
from backend.services.performance_service import PerformanceService

logger = logging.getLogger(__name__)

performance_router = APIRouter(prefix="/api", tags=["performance"])


def get_performance_service() -> PerformanceService:
    return PerformanceService()


def _http_from_app_error(exc: AppError) -> HTTPException:
    return HTTPException(status_code=exc.to_http_status(), detail=exc.to_response_dict())


@performance_router.get("/performance/database")
async def get_database_metrics(
    service: PerformanceService = Depends(get_performance_service),
) -> Dict[str, Any]:
    """Get database performance metrics.

    Requirements: 14, 14.4
    """
    try:
        return await service.get_database_metrics()
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Failed to get database metrics")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Metrics unavailable"})


@performance_router.post("/performance/database/reset")
async def reset_database_metrics(
    service: PerformanceService = Depends(get_performance_service),
) -> Dict[str, Any]:
    """Reset database performance counters.

    Requirements: 14, 14.5
    """
    try:
        return await service.reset_database_metrics()
    except AppError as exc:
        raise _http_from_app_error(exc)
    except Exception:
        logger.exception("Failed to reset database metrics")
        raise HTTPException(status_code=500, detail={"error": "InternalServerError", "message": "Reset failed"})
