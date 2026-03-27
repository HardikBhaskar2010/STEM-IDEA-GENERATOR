"""
Snapshot management service.

Thin service wrapping the existing ``project_versioning`` module to create,
list, and restore project snapshots with proper validation and domain
exception mapping.

Requirements: 19, 19.5, 19.6, 19.7, 40
"""

import logging
from typing import Any, Dict, List

from backend.core.exceptions import NotFoundError, UpstreamError, ValidationError

logger = logging.getLogger(__name__)


class SnapshotService:
    """
    Business-logic service for project snapshot operations.

    Delegates to the existing :mod:`backend.services.project_versioning`
    module — does not re-implement its logic.

    Requirements: 19, 19.5–19.7
    """

    def __init__(self) -> None:
        self._versioning = None

    def _get_versioning(self):
        """Lazy-load the project versioning module."""
        if self._versioning is None:
            from backend.services.project_versioning import ProjectVersioning  # noqa: PLC0415
            self._versioning = ProjectVersioning()
        return self._versioning

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def create_snapshot(
        self, project_id: str, label: str = ""
    ) -> Dict[str, Any]:
        """Create a project snapshot.

        Args:
            project_id: Project to snapshot.
            label: Optional human-readable label for the snapshot.

        Returns:
            Dict with ``snapshot_id``, ``project_id``, ``label``, and ``created_at``.

        Raises:
            ValidationError: When ``project_id`` is empty.
            UpstreamError: On unexpected errors.

        Requirements: 19.5, 30.5
        """
        if not project_id:
            raise ValidationError(
                "project_id is required", details={"field": "project_id"}
            )
        try:
            versioning = self._get_versioning()
            snapshot = versioning.create_snapshot(project_id=project_id, label=label)
            return snapshot
        except Exception as exc:
            logger.error("Failed to create snapshot for project %s: %s", project_id, exc)
            raise UpstreamError(
                "Snapshot creation failed.",
                service="ProjectVersioning",
                upstream_status=500,
            ) from exc

    async def list_snapshots(self, project_id: str) -> List[Dict[str, Any]]:
        """List all snapshots for a project.

        Args:
            project_id: Project identifier.

        Returns:
            List of snapshot dicts (sorted newest-first).

        Raises:
            ValidationError: When ``project_id`` is empty.

        Requirements: 19.6, 30.5
        """
        if not project_id:
            raise ValidationError(
                "project_id is required", details={"field": "project_id"}
            )
        try:
            versioning = self._get_versioning()
            return versioning.list_snapshots(project_id=project_id)
        except Exception as exc:
            logger.error("Failed to list snapshots for project %s: %s", project_id, exc)
            raise UpstreamError(
                "Snapshot listing failed.",
                service="ProjectVersioning",
                upstream_status=500,
            ) from exc

    async def restore_snapshot(
        self, project_id: str, snapshot_id: str
    ) -> Dict[str, Any]:
        """Restore a project to a previous snapshot.

        Args:
            project_id: Project to restore.
            snapshot_id: Target snapshot identifier.

        Returns:
            Dict with restore operation result.

        Raises:
            ValidationError: When either argument is empty.
            NotFoundError: When the snapshot does not exist.

        Requirements: 19.7, 30.5
        """
        if not project_id:
            raise ValidationError(
                "project_id is required", details={"field": "project_id"}
            )
        if not snapshot_id:
            raise ValidationError(
                "snapshot_id is required", details={"field": "snapshot_id"}
            )
        try:
            versioning = self._get_versioning()
            result = versioning.restore_snapshot(
                project_id=project_id, snapshot_id=snapshot_id
            )
            if result is None:
                raise NotFoundError(
                    f"Snapshot {snapshot_id} not found for project {project_id}"
                )
            return result
        except (NotFoundError, ValidationError):
            raise
        except Exception as exc:
            logger.error(
                "Failed to restore snapshot %s for project %s: %s",
                snapshot_id,
                project_id,
                exc,
            )
            raise UpstreamError(
                "Snapshot restoration failed.",
                service="ProjectVersioning",
                upstream_status=500,
            ) from exc
