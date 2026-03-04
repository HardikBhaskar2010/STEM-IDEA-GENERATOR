"""
Monitoring Service for comprehensive health checks and metrics.

This module provides:
- Health check endpoint with database, Redis, and service checks
- Prometheus metrics endpoint
- Integration with Sentry and OpenTelemetry
- Service health monitoring

Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 14.4, 14.5, 14.6, 19.7
"""

import logging
import time
from datetime import datetime
from typing import Dict, Any, Optional, List
from enum import Enum

from backend.infrastructure.metrics import metrics, MetricsCollector
from backend.infrastructure.redis_client import RedisClient
from backend.infrastructure.db_pool import DatabaseConnectionPool
from backend.infrastructure.base_service import ServiceRegistry

logger = logging.getLogger(__name__)


class HealthStatus(str, Enum):
    """Health status enumeration."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class ComponentHealth:
    """Health status for a single component."""
    
    def __init__(
        self,
        name: str,
        status: HealthStatus,
        response_time_ms: Optional[float] = None,
        error: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.name = name
        self.status = status
        self.response_time_ms = response_time_ms
        self.error = error
        self.details = details or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        result = {
            "name": self.name,
            "status": self.status.value,
        }
        
        if self.response_time_ms is not None:
            result["response_time_ms"] = round(self.response_time_ms, 2)
        
        if self.error:
            result["error"] = self.error
        
        if self.details:
            result["details"] = self.details
        
        return result


class MonitoringService:
    """
    Comprehensive monitoring service for health checks and metrics.
    
    Provides:
    - Database connectivity checks
    - Redis connectivity checks
    - Service health checks
    - Prometheus metrics
    - Overall system health status
    
    Requirements:
    - 10.1: Health check endpoint at /health
    - 10.2: Database connectivity check
    - 10.3: Redis connectivity check
    - 10.4: All registered services check
    - 10.5: HTTP 200 when healthy
    - 10.6: HTTP 503 when unhealthy with details
    - 10.7: Detailed health information including response time and error count
    """
    
    def __init__(
        self,
        db_pool: Optional[DatabaseConnectionPool] = None,
        redis_client: Optional[RedisClient] = None,
        service_registry: Optional[ServiceRegistry] = None,
        metrics_collector: Optional[MetricsCollector] = None
    ):
        """
        Initialize monitoring service.
        
        Args:
            db_pool: Database connection pool
            redis_client: Redis client
            service_registry: Service registry
            metrics_collector: Metrics collector
        """
        self.db_pool = db_pool
        self.redis_client = redis_client
        self.service_registry = service_registry
        self.metrics = metrics_collector or metrics
        
        logger.info("Monitoring service initialized")
    
    async def check_database_health(self) -> ComponentHealth:
        """
        Check database connectivity and health.
        
        Requirements: 10.2
        
        Returns:
            ComponentHealth with database status
        """
        if not self.db_pool:
            return ComponentHealth(
                name="database",
                status=HealthStatus.UNHEALTHY,
                error="Database pool not configured"
            )
        
        start_time = time.time()
        
        try:
            # Perform health check
            is_healthy = await self.db_pool.health_check()
            response_time_ms = (time.time() - start_time) * 1000
            
            if is_healthy:
                # Get pool statistics
                stats = self.db_pool.get_pool_stats()
                
                return ComponentHealth(
                    name="database",
                    status=HealthStatus.HEALTHY,
                    response_time_ms=response_time_ms,
                    details={
                        "pool_size": stats["size"],
                        "free_connections": stats["freesize"],
                        "max_size": stats.get("maxsize", "N/A")
                    }
                )
            else:
                return ComponentHealth(
                    name="database",
                    status=HealthStatus.UNHEALTHY,
                    response_time_ms=response_time_ms,
                    error="Health check failed"
                )
        
        except Exception as e:
            response_time_ms = (time.time() - start_time) * 1000
            logger.error(f"Database health check failed: {e}")
            
            return ComponentHealth(
                name="database",
                status=HealthStatus.UNHEALTHY,
                response_time_ms=response_time_ms,
                error=str(e)
            )
    
    async def check_redis_health(self) -> ComponentHealth:
        """
        Check Redis connectivity and health.
        
        Requirements: 10.3
        
        Returns:
            ComponentHealth with Redis status
        """
        if not self.redis_client:
            return ComponentHealth(
                name="redis",
                status=HealthStatus.DEGRADED,
                error="Redis not configured (optional)"
            )
        
        start_time = time.time()
        
        try:
            # Perform ping check
            await self.redis_client.ping()
            response_time_ms = (time.time() - start_time) * 1000
            
            # Get Redis info
            info = await self.redis_client.info()
            
            return ComponentHealth(
                name="redis",
                status=HealthStatus.HEALTHY,
                response_time_ms=response_time_ms,
                details={
                    "connected_clients": info.get("connected_clients", "N/A"),
                    "used_memory_human": info.get("used_memory_human", "N/A"),
                    "uptime_in_seconds": info.get("uptime_in_seconds", "N/A")
                }
            )
        
        except Exception as e:
            response_time_ms = (time.time() - start_time) * 1000
            logger.error(f"Redis health check failed: {e}")
            
            return ComponentHealth(
                name="redis",
                status=HealthStatus.UNHEALTHY,
                response_time_ms=response_time_ms,
                error=str(e)
            )
    
    async def check_services_health(self) -> List[ComponentHealth]:
        """
        Check health of all registered services.
        
        Requirements: 10.4, 10.7
        
        Returns:
            List of ComponentHealth for each service
        """
        if not self.service_registry:
            return [ComponentHealth(
                name="services",
                status=HealthStatus.DEGRADED,
                error="Service registry not configured"
            )]
        
        service_healths = []
        
        try:
            services = self.service_registry.get_all_services()
            
            for service_name, service in services.items():
                start_time = time.time()
                
                try:
                    # Call service health check
                    health_result = await service.health_check()
                    response_time_ms = (time.time() - start_time) * 1000
                    
                    # Determine status from health result
                    if health_result.get("status") == "healthy":
                        status = HealthStatus.HEALTHY
                    elif health_result.get("status") == "degraded":
                        status = HealthStatus.DEGRADED
                    else:
                        status = HealthStatus.UNHEALTHY
                    
                    service_healths.append(ComponentHealth(
                        name=f"service:{service_name}",
                        status=status,
                        response_time_ms=response_time_ms,
                        details=health_result.get("details", {})
                    ))
                
                except Exception as e:
                    response_time_ms = (time.time() - start_time) * 1000
                    logger.error(f"Service {service_name} health check failed: {e}")
                    
                    service_healths.append(ComponentHealth(
                        name=f"service:{service_name}",
                        status=HealthStatus.UNHEALTHY,
                        response_time_ms=response_time_ms,
                        error=str(e)
                    ))
        
        except Exception as e:
            logger.error(f"Failed to check services health: {e}")
            service_healths.append(ComponentHealth(
                name="services",
                status=HealthStatus.UNHEALTHY,
                error=str(e)
            ))
        
        return service_healths
    
    async def get_health_status(self) -> Dict[str, Any]:
        """
        Get comprehensive health status of all components.
        
        Requirements: 10.1, 10.5, 10.6, 10.7
        
        Returns:
            Dictionary with health status and component details
        """
        start_time = time.time()
        
        # Check all components
        db_health = await self.check_database_health()
        redis_health = await self.check_redis_health()
        service_healths = await self.check_services_health()
        
        # Collect all component healths
        all_components = [db_health, redis_health] + service_healths
        
        # Determine overall status
        overall_status = self._determine_overall_status(all_components)
        
        # Calculate total response time
        total_response_time_ms = (time.time() - start_time) * 1000
        
        # Build response
        response = {
            "status": overall_status.value,
            "timestamp": datetime.utcnow().isoformat(),
            "response_time_ms": round(total_response_time_ms, 2),
            "components": {
                "database": db_health.to_dict(),
                "redis": redis_health.to_dict(),
                "services": [s.to_dict() for s in service_healths]
            }
        }
        
        return response
    
    def _determine_overall_status(self, components: List[ComponentHealth]) -> HealthStatus:
        """
        Determine overall health status from component statuses.
        
        Rules:
        - If any critical component (database) is unhealthy -> UNHEALTHY
        - If any component is unhealthy -> DEGRADED
        - If any component is degraded -> DEGRADED
        - Otherwise -> HEALTHY
        
        Args:
            components: List of component health statuses
        
        Returns:
            Overall health status
        """
        # Check for critical component failures (database)
        for component in components:
            if component.name == "database" and component.status == HealthStatus.UNHEALTHY:
                return HealthStatus.UNHEALTHY
        
        # Check for any unhealthy components
        if any(c.status == HealthStatus.UNHEALTHY for c in components):
            return HealthStatus.DEGRADED
        
        # Check for any degraded components
        if any(c.status == HealthStatus.DEGRADED for c in components):
            return HealthStatus.DEGRADED
        
        return HealthStatus.HEALTHY
    
    def get_metrics(self) -> bytes:
        """
        Get Prometheus metrics.
        
        Requirements: 14.4
        
        Returns:
            Prometheus metrics in text format
        """
        return self.metrics.get_metrics()
    
    def get_metrics_content_type(self) -> str:
        """
        Get Prometheus metrics content type.
        
        Returns:
            Content type for Prometheus metrics
        """
        return self.metrics.get_content_type()


# Global monitoring service instance
_monitoring_service: Optional[MonitoringService] = None


def get_monitoring_service() -> Optional[MonitoringService]:
    """
    Get the global monitoring service instance.
    
    Returns:
        MonitoringService instance or None if not initialized
    """
    return _monitoring_service


def initialize_monitoring_service(
    db_pool: Optional[DatabaseConnectionPool] = None,
    redis_client: Optional[RedisClient] = None,
    service_registry: Optional[ServiceRegistry] = None,
    metrics_collector: Optional[MetricsCollector] = None
) -> MonitoringService:
    """
    Initialize the global monitoring service.
    
    Args:
        db_pool: Database connection pool
        redis_client: Redis client
        service_registry: Service registry
        metrics_collector: Metrics collector
    
    Returns:
        Initialized MonitoringService instance
    """
    global _monitoring_service
    
    _monitoring_service = MonitoringService(
        db_pool=db_pool,
        redis_client=redis_client,
        service_registry=service_registry,
        metrics_collector=metrics_collector
    )
    
    return _monitoring_service
