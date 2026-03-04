"""
FastAPI endpoints for monitoring and health checks.

This module provides:
- /health endpoint for basic health checks
- /health/detailed endpoint for comprehensive health checks
- /metrics endpoint for Prometheus metrics

Requirements: 10.1, 10.5, 10.6, 14.4, 19.7
"""

import logging
from fastapi import APIRouter, Response, status
from fastapi.responses import JSONResponse, PlainTextResponse

from backend.infrastructure.monitoring_service import (
    get_monitoring_service,
    HealthStatus
)

logger = logging.getLogger(__name__)

# Create router for monitoring endpoints
monitoring_router = APIRouter(tags=["monitoring"])


@monitoring_router.get("/health")
async def health_check():
    """
    Basic health check endpoint.
    
    Returns:
        - 200 OK if all critical components are healthy
        - 503 Service Unavailable if any critical component is unhealthy
    
    Requirements:
    - 10.1: Health check endpoint at /health
    - 10.5: HTTP 200 when healthy
    - 10.6: HTTP 503 when unhealthy with details
    """
    monitoring_service = get_monitoring_service()
    
    if not monitoring_service:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "error": "Monitoring service not initialized"
            }
        )
    
    try:
        health_status = await monitoring_service.get_health_status()
        
        # Determine HTTP status code based on health
        if health_status["status"] == HealthStatus.HEALTHY.value:
            status_code = status.HTTP_200_OK
        else:
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        
        return JSONResponse(
            status_code=status_code,
            content=health_status
        )
    
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "error": str(e)
            }
        )


@monitoring_router.get("/health/detailed")
async def detailed_health_check():
    """
    Detailed health check endpoint with comprehensive component information.
    
    Returns:
        - 200 OK if all critical components are healthy
        - 503 Service Unavailable if any critical component is unhealthy
    
    Includes:
    - Database connectivity and pool statistics
    - Redis connectivity and statistics
    - All registered services health
    - Response times for each component
    - Error details for failed components
    
    Requirements:
    - 10.2: Database connectivity check
    - 10.3: Redis connectivity check
    - 10.4: All registered services check
    - 10.7: Detailed health information including response time and error count
    """
    monitoring_service = get_monitoring_service()
    
    if not monitoring_service:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "error": "Monitoring service not initialized"
            }
        )
    
    try:
        # Get comprehensive health status
        health_status = await monitoring_service.get_health_status()
        
        # Add additional metadata
        health_status["service"] = {
            "name": "STEM Project Generator Backend",
            "version": "1.0.0"
        }
        
        # Determine HTTP status code based on health
        if health_status["status"] == HealthStatus.HEALTHY.value:
            status_code = status.HTTP_200_OK
        else:
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        
        return JSONResponse(
            status_code=status_code,
            content=health_status
        )
    
    except Exception as e:
        logger.error(f"Detailed health check failed: {e}")
        
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "error": str(e)
            }
        )


@monitoring_router.get("/metrics")
async def prometheus_metrics():
    """
    Prometheus metrics endpoint.
    
    Returns metrics in Prometheus text format including:
    - Request counts by endpoint and status
    - Response time histograms
    - Error rates
    - Cache hit/miss rates
    - Circuit breaker states
    - Connection pool statistics
    
    Requirements:
    - 14.4: Prometheus metrics for request count, response time, error rate, cache hit rate
    - 19.7: Dashboards showing key metrics
    """
    monitoring_service = get_monitoring_service()
    
    if not monitoring_service:
        return PlainTextResponse(
            content="# Monitoring service not initialized\n",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    try:
        metrics_data = monitoring_service.get_metrics()
        content_type = monitoring_service.get_metrics_content_type()
        
        return Response(
            content=metrics_data,
            media_type=content_type
        )
    
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        
        return PlainTextResponse(
            content=f"# Error getting metrics: {str(e)}\n",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@monitoring_router.get("/health/ready")
async def readiness_check():
    """
    Kubernetes readiness probe endpoint.
    
    Checks if the service is ready to accept traffic.
    Returns 200 if ready, 503 if not ready.
    """
    monitoring_service = get_monitoring_service()
    
    if not monitoring_service:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"ready": False, "reason": "Monitoring service not initialized"}
        )
    
    try:
        # Check database connectivity (critical for readiness)
        db_health = await monitoring_service.check_database_health()
        
        if db_health.status == HealthStatus.HEALTHY:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={"ready": True}
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "ready": False,
                    "reason": f"Database unhealthy: {db_health.error}"
                }
            )
    
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"ready": False, "reason": str(e)}
        )


@monitoring_router.get("/health/live")
async def liveness_check():
    """
    Kubernetes liveness probe endpoint.
    
    Checks if the service is alive and should not be restarted.
    Returns 200 if alive, 503 if dead.
    
    This is a lightweight check that only verifies the service is running.
    """
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"alive": True}
    )
