"""
Performance monitoring service.

Exposes database performance metrics through a focused service interface,
delegating to the existing infrastructure monitoring components.

Requirements: 23, 23.4, 23.5, 23.6, 40
"""

import logging
from datetime import datetime
from typing import Any, Dict

from backend.core.exceptions import UpstreamError

logger = logging.getLogger(__name__)


class PerformanceService:
    """
    Business-logic service for database performance monitoring.

    Delegates to the existing ``backend.infrastructure`` monitoring layer.
    Small, focused, and does not handle HTTP concerns.

    Requirements: 23, 23.4–23.6
    """

    def __init__(self) -> None:
        self._metrics = None

    def _get_metrics(self):
        """Lazy-load the metrics singleton."""
        if self._metrics is None:
            try:
                from backend.infrastructure.metrics import metrics  # noqa: PLC0415
                self._metrics = metrics
            except Exception:
                self._metrics = None
        return self._metrics

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get_database_metrics(self) -> Dict[str, Any]:
        """Return current database performance metrics.

        Returns:
            Dict with query performance, connection pool stats, and timestamp.

        Requirements: 23.4
        """
        try:
            metrics_obj = self._get_metrics()
            if metrics_obj and hasattr(metrics_obj, "get_metrics"):
                raw = metrics_obj.get_metrics()
                return {
                    "timestamp": datetime.utcnow().isoformat(),
                    "database": raw.get("database", {}),
                    "connection_pool": raw.get("connection_pool", {}),
                    "query_performance": raw.get("query_performance", {}),
                }

            # Fallback when metrics infrastructure is not available
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "status": "metrics_unavailable",
                "message": "Monitoring infrastructure not configured",
            }
        except Exception as exc:
            logger.error("Failed to retrieve database metrics: %s", exc)
            raise UpstreamError(
                "Performance metrics temporarily unavailable.",
                service="MonitoringInfrastructure",
                upstream_status=503,
            ) from exc

    async def reset_database_metrics(self) -> Dict[str, Any]:
        """Reset the in-memory performance counters.

        Returns:
            Dict confirming the reset with a timestamp.

        Requirements: 23.5
        """
        try:
            metrics_obj = self._get_metrics()
            if metrics_obj and hasattr(metrics_obj, "reset"):
                metrics_obj.reset()
            return {
                "status": "reset",
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as exc:
            logger.error("Failed to reset database metrics: %s", exc)
            raise UpstreamError(
                "Metrics reset temporarily unavailable.",
                service="MonitoringInfrastructure",
                upstream_status=503,
            ) from exc
