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
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, Optional, Literal, Any

from backend.models.project_spec import ProjectSpec, VeronicaPlatform
from backend.services.veronica_project_store import VeronicaProjectStore
from backend.services.remote_docker_http import RemoteDockerHTTP, make_project_tar, DockerAPIError


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
    container_id: Optional[str] = None
    host_port: Optional[int] = None


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
        self._base_dir = Path(base_dir).resolve()
        self._base_preview_url = os.getenv("VERONICA_PREVIEW_BASE_URL", "http://localhost").rstrip("/")
        self._web_base_image = os.getenv("VERONICA_WEB_BASE_IMAGE", "veronica-web-base:node18")
        self._docker = RemoteDockerHTTP()

    def _persist_run(self, run: SandboxRun) -> None:
        try:
            root = self._store.get_paths(run.project_id).root_dir
            runs_dir = (root / "runs").resolve()
            runs_dir.mkdir(parents=True, exist_ok=True)
            payload = {
                "run_id": run.run_id,
                "project_id": run.project_id,
                "status": run.status,
                "created_at": run.created_at,
                "updated_at": run.updated_at,
                "platform": run.platform.value,
                "preview_url": run.preview_url,
                "last_error": run.last_error,
                "container_id": run.container_id,
                "host_port": run.host_port,
            }
            (runs_dir / f"{run.run_id}.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
        except Exception:
            # Persistence failure should not crash execution path
            pass

    def create_run(self, project_id: str) -> SandboxRun:
        spec = self._store.load_spec(project_id)

        run_id = str(uuid.uuid4())
        now = time.time()

        preview_url = f"{self._base_preview_url}/api/veronica-preview/{run_id}/"

        run = SandboxRun(
            run_id=run_id,
            project_id=project_id,
            status="starting",
            created_at=now,
            updated_at=now,
            platform=spec.platform,
            preview_url=preview_url,
        )
        self._runs[run_id] = run
        self._store.append_event(project_id, event_type="run_starting", meta={"run_id": run_id})
        self._persist_run(run)

        if spec.platform != VeronicaPlatform.WEB:
            run.status = "running"
            run.updated_at = time.time()
            self._store.append_event(project_id, event_type="run_started", meta={"run_id": run_id, "mode": "non_web_no_container"})
            self._persist_run(run)
            return run

        # --- Web: Docker-backed run ---
        container_name = f"veronica_{project_id[:8]}_{run_id[:8]}"

        # Build file map for tar upload; also inject a run-specific vite config.
        file_map: Dict[str, str] = {f.path: (f.content or "") for f in (spec.files or [])}

        # Ensure a vite config that uses VERONICA_HMR_PATH for websocket proxying.
        if "vite.config.ts" not in file_map:
            file_map["vite.config.ts"] = """import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nconst hmrPath = process.env.VERONICA_HMR_PATH || '/api/veronica-preview-ws/unknown';\n\nexport default defineConfig({\n  plugins: [react()],\n  server: {\n    host: true,\n    port: 5173,\n    strictPort: true,\n    hmr: {\n      path: hmrPath,\n    },\n  },\n});\n"""
        # Plugin react might not exist; if missing, Vite will error, but this is the canonical config for HMR path.

        tar_bytes = make_project_tar(file_map)

        # Hardened container create config.
        config: Dict[str, Any] = {
            "Image": self._web_base_image,
            "Env": [
                "HOST=0.0.0.0",
                "PORT=5173",
                f"VERONICA_HMR_PATH=/api/veronica-preview-ws/{run_id}",
            ],
            "WorkingDir": "/workspace",
            "ExposedPorts": {"5173/tcp": {}},
            "HostConfig": {
                "PortBindings": {"5173/tcp": [{"HostPort": "0"}]},
                "NetworkMode": "bridge",
                "ReadonlyRootfs": True,
                "PidsLimit": int(os.getenv("VERONICA_PIDS_LIMIT", "256")),
                "Memory": int(os.getenv("VERONICA_MEM_BYTES", str(512 * 1024 * 1024))),  # 512MB
                "NanoCpus": int(os.getenv("VERONICA_NANO_CPUS", str(1_000_000_000))),  # 1 CPU
                "Tmpfs": {"/tmp": "rw,noexec,nosuid,size=256m"},
                "CapDrop": ["ALL"],
            },
            "User": "1000:1000",
            "Cmd": [
                "sh",
                "-lc",
                "npm install && npm run dev -- --host 0.0.0.0 --port 5173 --strictPort",
            ],
        }

        try:
            container_id = self._docker.create_container(name=container_name, config=config)
            self._docker.put_archive(container_id=container_id, path="/workspace", tar_bytes=tar_bytes)
            self._docker.start_container(container_id)
            inspected = self._docker.inspect_container(container_id)
            ports = (
                inspected.get("NetworkSettings", {})
                .get("Ports", {})
                .get("5173/tcp", [])
            )
            host_port = int(ports[0]["HostPort"]) if ports else None

            run.container_id = container_id
            run.host_port = host_port
            run.status = "running"
            run.updated_at = time.time()
            self._store.append_event(
                project_id,
                event_type="run_started",
                meta={"run_id": run_id, "container_id": container_id, "host_port": host_port},
            )
            self._persist_run(run)
        except Exception as e:
            run.status = "failed"
            run.last_error = str(e)
            run.updated_at = time.time()
            self._store.append_event(project_id, event_type="run_failed", meta={"run_id": run_id, "error": str(e)})
            self._persist_run(run)
            return run

        return run

    def get_run(self, run_id: str) -> SandboxRun:
        if run_id not in self._runs:
            raise KeyError("run not found")
        return self._runs[run_id]

    def stop_run(self, run_id: str) -> SandboxRun:
        run = self.get_run(run_id)
        if run.status in ("stopped", "failed"):
            return run
        if run.container_id:
            try:
                self._docker.stop_container(run.container_id, timeout=10)
                self._docker.remove_container(run.container_id, force=True)
            except Exception:
                pass
        run.status = "stopped"
        run.updated_at = time.time()
        self._store.append_event(run.project_id, event_type="run_stopped", meta={"run_id": run_id})
        self._persist_run(run)
        return run

    def append_log(self, run_id: str, text: str) -> None:
        run = self.get_run(run_id)
        run.log_buffer += text
        run.updated_at = time.time()

    def get_logs(self, run_id: str) -> str:
        run = self.get_run(run_id)
        if run.container_id:
            try:
                return self._docker.logs(container_id=run.container_id, tail=300)
            except Exception:
                return run.log_buffer
        return run.log_buffer


_sandbox_manager_singleton: Optional[SandboxManager] = None


def get_sandbox_manager() -> SandboxManager:
    global _sandbox_manager_singleton
    if _sandbox_manager_singleton is None:
        base_dir = os.path.join(os.path.dirname(__file__), "data")
        _sandbox_manager_singleton = SandboxManager(base_dir=base_dir)
    return _sandbox_manager_singleton

