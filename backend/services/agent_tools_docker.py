from __future__ import annotations

import io
import json
import os
import tarfile
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple

from backend.services.remote_docker_http import RemoteDockerHTTP
from backend.services.veronica_project_store import VeronicaProjectStore, sanitize_rel_path


@dataclass(frozen=True)
class ToolResult:
    tool: str
    ok: bool
    started_at: float
    finished_at: float
    meta: Dict[str, Any]
    stdout: str = ""
    stderr: str = ""


def _tar_single_file(path: str, content: str) -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w") as tf:
        data = (content or "").encode("utf-8")
        ti = tarfile.TarInfo(name=path)
        ti.size = len(data)
        tf.addfile(ti, io.BytesIO(data))
    return buf.getvalue()


def _untar_first_file(tar_bytes: bytes) -> str:
    with tarfile.open(fileobj=io.BytesIO(tar_bytes), mode="r:*") as tf:
        members = tf.getmembers()
        if not members:
            return ""
        f = tf.extractfile(members[0])
        if not f:
            return ""
        return f.read().decode("utf-8", errors="replace")


class DockerAgentTools:
    """
    Optimized tool layer for agentic behavior:
    - Reads/writes via Docker archive API (fast, no exec overhead).
    - Runs batched commands via `sh -lc` exec.
    - Audits tool calls to project events.jsonl.
    """

    def __init__(self, *, base_dir: str):
        self._docker = RemoteDockerHTTP()
        self._store = VeronicaProjectStore(base_dir=base_dir)

    def _log(self, project_id: str, event_type: str, meta: Dict[str, Any]) -> None:
        # Truncate noisy fields
        safe_meta = dict(meta)
        for k in ("stdout", "stderr"):
            if k in safe_meta and isinstance(safe_meta[k], str) and len(safe_meta[k]) > 2000:
                safe_meta[k] = safe_meta[k][:2000] + "…"
        self._store.append_event(project_id, event_type=event_type, meta=safe_meta)

    def read_file(self, *, project_id: str, container_id: str, path: str) -> ToolResult:
        started = time.time()
        rel = sanitize_rel_path(path)
        try:
            tar_bytes = self._docker.get_archive(container_id=container_id, path=f"/workspace/{rel}")
            content = _untar_first_file(tar_bytes)
            finished = time.time()
            res = ToolResult(
                tool="readFile",
                ok=True,
                started_at=started,
                finished_at=finished,
                meta={"path": rel, "bytes": len(content)},
                stdout=content,
            )
            self._log(project_id, "tool_read_file", {"path": rel, "bytes": len(content)})
            return res
        except Exception as e:
            finished = time.time()
            self._log(project_id, "tool_read_file_failed", {"path": rel, "error": str(e)})
            return ToolResult(tool="readFile", ok=False, started_at=started, finished_at=finished, meta={"path": rel, "error": str(e)})

    def write_file(self, *, project_id: str, container_id: str, path: str, content: str) -> ToolResult:
        started = time.time()
        rel = sanitize_rel_path(path)
        try:
            tar_bytes = _tar_single_file(rel, content)
            self._docker.put_archive(container_id=container_id, path="/workspace", tar_bytes=tar_bytes)
            finished = time.time()
            self._log(project_id, "tool_write_file", {"path": rel, "bytes": len(content or "")})
            return ToolResult(tool="writeFile", ok=True, started_at=started, finished_at=finished, meta={"path": rel, "bytes": len(content or "")})
        except Exception as e:
            finished = time.time()
            self._log(project_id, "tool_write_file_failed", {"path": rel, "error": str(e)})
            return ToolResult(tool="writeFile", ok=False, started_at=started, finished_at=finished, meta={"path": rel, "error": str(e)})

    def run_command(
        self,
        *,
        project_id: str,
        container_id: str,
        commands: Sequence[str],
        workdir: str = "/workspace",
        allow_binaries: Tuple[str, ...] = ("npm", "node", "sh"),
    ) -> ToolResult:
        """
        Runs a batched shell command: `sh -lc "<cmd1> && <cmd2> ..."` inside the container.
        """
        started = time.time()
        joined = " && ".join([c.strip() for c in commands if c.strip()])
        if not joined:
            return ToolResult(tool="runCommand", ok=False, started_at=started, finished_at=time.time(), meta={"error": "no commands"})

        # Basic allowlist guard: check first token of each command
        for c in commands:
            tok = (c.strip().split(" ", 1)[0] if c.strip() else "")
            if tok and tok not in allow_binaries:
                return ToolResult(tool="runCommand", ok=False, started_at=started, finished_at=time.time(), meta={"error": f"binary not allowed: {tok}"})

        try:
            exec_id = self._docker.exec_create(container_id=container_id, cmd=["sh", "-lc", joined], workdir=workdir)
            out = self._docker.exec_start(exec_id=exec_id)
            finished = time.time()
            self._log(project_id, "tool_run_command", {"cmd": joined, "duration_ms": int((finished - started) * 1000), "stdout": out})
            return ToolResult(tool="runCommand", ok=True, started_at=started, finished_at=finished, meta={"cmd": joined}, stdout=out)
        except Exception as e:
            finished = time.time()
            self._log(project_id, "tool_run_command_failed", {"cmd": joined, "error": str(e)})
            return ToolResult(tool="runCommand", ok=False, started_at=started, finished_at=finished, meta={"cmd": joined, "error": str(e)})

