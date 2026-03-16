from __future__ import annotations

"""
Phase 2 sandbox manager (MVP).

This module defines a minimal interface for running Veronica projects in an
isolated environment. The initial implementation is intentionally conservative:
it records desired run metadata and exposes a stubbed "preview URL" rather
than creating real containers, so it can be wired to Docker or another
sandbox later without changing API contracts.
"""

import os
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, Optional, Literal

from backend.models.project_spec import ProjectSpec, VeronicaPlatform
from backend.services.veronica_project_store import VeronicaProjectStore


RunStatus = Literal["pending", "starting", "running", "failed", "stopped"]


@dataclass
class SandboxRun:
    run_id: str
    project_id: str
    status: RunStatus
    created_at: float
    updated_at: float
    platform: VeronicaPlatform
    preview_url: Optional[str] = None
    last_error: Optional[str] = None
    log_buffer: str = field(default="", repr=False)


class SandboxManager:
    """
    In-memory sandbox manager facade.

    For V2 we expose:
      - create_run(project_id) → SandboxRun
      - get_run(run_id)
      - append_log(run_id, text)
      - stop_run(run_id)

    A future Docker-backed implementation can plug into the same interface.
    """

    def __init__(self, *, base_dir: str):
        self._runs: Dict[str, SandboxRun] = {}
        self._store = VeronicaProjectStore(base_dir=base_dir)
        self._base_preview_url = os.getenv("VERONICA_PREVIEW_BASE_URL", "http://localhost")

    def create_run(self, project_id: str) -> SandboxRun:
        spec = self._store.load_spec(project_id)

        run_id = str(uuid.uuid4())
        now = time.time()

        # Stubbed preview URL – in a real Docker-backed implementation this
        # would point at a per-run port or reverse-proxy path.
        preview_url = f"{self._base_preview_url}/veronica-preview/{run_id}"

        run = SandboxRun(
            run_id=run_id,
            project_id=project_id,
            status="running",
            created_at=now,
            updated_at=now,
            platform=spec.platform,
            preview_url=preview_url,
        )
        self._runs[run_id] = run
        self._store.append_event(project_id, event_type="run_started", meta={"run_id": run_id})
        return run

    def get_run(self, run_id: str) -> SandboxRun:
        if run_id not in self._runs:
            raise KeyError("run not found")
        return self._runs[run_id]

    def stop_run(self, run_id: str) -> SandboxRun:
        run = self.get_run(run_id)
        if run.status in ("stopped", "failed"):
            return run
        run.status = "stopped"
        run.updated_at = time.time()
        self._store.append_event(run.project_id, event_type="run_stopped", meta={"run_id": run_id})
        return run

    def append_log(self, run_id: str, text: str) -> None:
        run = self.get_run(run_id)
        run.log_buffer += text
        run.updated_at = time.time()

    def get_logs(self, run_id: str) -> str:
        run = self.get_run(run_id)
        return run.log_buffer


_sandbox_manager_singleton: Optional[SandboxManager] = None


def get_sandbox_manager() -> SandboxManager:
    global _sandbox_manager_singleton
    if _sandbox_manager_singleton is None:
        base_dir = os.path.join(os.path.dirname(__file__), "data")
        _sandbox_manager_singleton = SandboxManager(base_dir=base_dir)
    return _sandbox_manager_singleton

