from __future__ import annotations

import json
import os
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Sequence, Tuple

from backend.services.veronica_project_store import VeronicaProjectStore, sanitize_rel_path


@dataclass(frozen=True)
class CommandResult:
    command: List[str]
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: int


class ExecutionTools:
    """
    Phase 3 tools surface (MVP).

    For now, tools operate on the stored Veronica project files and run commands
    in a per-run workspace directory on the backend. This is intentionally
    scoped and allowlisted and is designed to be swapped to Docker exec later.
    """

    def __init__(self, *, base_dir: str):
        self._store = VeronicaProjectStore(base_dir=base_dir)
        self._runs_dir = Path(base_dir).resolve() / "runs"
        self._runs_dir.mkdir(parents=True, exist_ok=True)

    def _workspace_dir(self, run_id: str) -> Path:
        d = (self._runs_dir / run_id / "workspace").resolve()
        d.mkdir(parents=True, exist_ok=True)
        return d

    def materialize_project_to_workspace(self, *, project_id: str, run_id: str) -> Path:
        """
        Copies project files from store into run workspace.
        """
        paths = self._store.get_paths(project_id)
        ws = self._workspace_dir(run_id)
        # naive copy: recreate from spec so edits are reflected
        spec = self._store.load_spec(project_id)
        for f in spec.files:
            rel = sanitize_rel_path(f.path)
            out = (ws / Path(rel)).resolve()
            if not str(out).startswith(str(ws)):
                raise ValueError("workspace path escape")
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(f.content or "", encoding="utf-8")
        if spec.readme:
            (ws / "README.md").write_text(spec.readme, encoding="utf-8")
        return ws

    def read_file(self, *, project_id: str, path: str) -> str:
        spec = self._store.load_spec(project_id)
        rel = sanitize_rel_path(path)
        for f in spec.files:
            if sanitize_rel_path(f.path) == rel:
                return f.content or ""
        raise FileNotFoundError("file not found in spec")

    def write_file(self, *, project_id: str, path: str, content: str) -> None:
        self._store.update_file(project_id, path=path, content=content)

    def run_command(
        self,
        *,
        project_id: str,
        run_id: str,
        cwd_rel: str,
        command: Sequence[str],
        timeout_seconds: int = 120,
        allowlist: Optional[Tuple[str, ...]] = ("npm", "node"),
    ) -> CommandResult:
        if not command:
            raise ValueError("command is required")

        exe = str(command[0])
        if allowlist and exe not in allowlist:
            raise ValueError(f"command not allowed: {exe}")

        ws = self.materialize_project_to_workspace(project_id=project_id, run_id=run_id)
        cwd = (ws / Path(cwd_rel)).resolve()
        if not str(cwd).startswith(str(ws)):
            raise ValueError("cwd escapes workspace")
        if not cwd.exists():
            raise FileNotFoundError("cwd does not exist")

        started = time.time()
        proc = subprocess.run(
            list(command),
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            env={**os.environ},
        )
        dur_ms = int((time.time() - started) * 1000)
        return CommandResult(
            command=list(command),
            exit_code=int(proc.returncode),
            stdout=proc.stdout or "",
            stderr=proc.stderr or "",
            duration_ms=dur_ms,
        )

