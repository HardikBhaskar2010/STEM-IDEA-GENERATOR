from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from backend.services.auto_fix_rules import FixSuggestion, suggest_fix
from backend.services.error_parser import ParsedError, parse_error
from backend.services.execution_tools import ExecutionTools
from backend.services.veronica_project_store import VeronicaProjectStore


@dataclass(frozen=True)
class SelfFixAttempt:
    attempt: int
    command: List[str]
    exit_code: int
    error_kind: Optional[str]
    applied_fix: Optional[Dict[str, Any]]
    stdout: str
    stderr: str


class SelfFixRunner:
    """
    Phase 3 bounded observe→fix→retry loop (MVP).

    For now, targets web projects by attempting `npm install` and `npm run build`
    in the project workspace. On common missing-module errors, applies a small
    fix to package.json and retries (up to max_attempts).
    """

    def __init__(self, *, base_dir: str):
        self._store = VeronicaProjectStore(base_dir=base_dir)
        self._tools = ExecutionTools(base_dir=base_dir)

    def _apply_fix(self, project_id: str, suggestion: FixSuggestion) -> None:
        patch = suggestion.patch
        if patch.get("type") != "add_npm_dependency":
            raise ValueError("Unsupported fix type")

        module = str(patch.get("module") or "").strip()
        if not module:
            raise ValueError("Missing module name")

        # Try common locations for package.json
        candidate_paths = ["package.json", "web/package.json", "app/package.json"]
        pkg_path = None
        pkg_text = None
        for p in candidate_paths:
            try:
                pkg_text = self._tools.read_file(project_id=project_id, path=p)
                pkg_path = p
                break
            except Exception:
                continue

        if not pkg_path or pkg_text is None:
            raise FileNotFoundError("package.json not found in ProjectSpec files")

        pkg = json.loads(pkg_text)
        deps = pkg.get("dependencies") or {}
        if not isinstance(deps, dict):
            deps = {}
        if module not in deps:
            deps[module] = "latest"
        pkg["dependencies"] = deps

        self._tools.write_file(project_id=project_id, path=pkg_path, content=json.dumps(pkg, indent=2))
        self._store.append_event(project_id, event_type="self_fix_applied", meta={"fix": suggestion.title, "module": module})

    def run_self_fix(
        self,
        *,
        project_id: str,
        run_id: str,
        max_attempts: int = 2,
    ) -> List[SelfFixAttempt]:
        attempts: List[SelfFixAttempt] = []

        # Detect cwd (same heuristic as apply_fix candidate paths)
        cwd_rel = "."
        for candidate in [".", "web", "app"]:
            try:
                # If package.json exists in spec, prefer that dir
                _ = self._tools.read_file(project_id=project_id, path=f"{candidate}/package.json" if candidate != "." else "package.json")
                cwd_rel = candidate
                break
            except Exception:
                continue

        for i in range(1, max_attempts + 1):
            # Install deps
            install = self._tools.run_command(project_id=project_id, run_id=run_id, cwd_rel=cwd_rel, command=["npm", "install"], timeout_seconds=300)
            combined = (install.stdout or "") + "\n" + (install.stderr or "")
            parsed = parse_error(combined) if install.exit_code != 0 else None

            if install.exit_code != 0 and parsed:
                suggestion = suggest_fix(parsed)
                applied = None
                if suggestion:
                    self._apply_fix(project_id, suggestion)
                    applied = suggestion.patch
                attempts.append(
                    SelfFixAttempt(
                        attempt=i,
                        command=install.command,
                        exit_code=install.exit_code,
                        error_kind=parsed.kind,
                        applied_fix=applied,
                        stdout=install.stdout,
                        stderr=install.stderr,
                    )
                )
                if applied:
                    # Retry next attempt
                    continue
                # No applicable fix, stop
                break

            attempts.append(
                SelfFixAttempt(
                    attempt=i,
                    command=install.command,
                    exit_code=install.exit_code,
                    error_kind=parsed.kind if parsed else None,
                    applied_fix=None,
                    stdout=install.stdout,
                    stderr=install.stderr,
                )
            )

            if install.exit_code != 0:
                break

            build = self._tools.run_command(project_id=project_id, run_id=run_id, cwd_rel=cwd_rel, command=["npm", "run", "build"], timeout_seconds=300)
            combined2 = (build.stdout or "") + "\n" + (build.stderr or "")
            parsed2 = parse_error(combined2) if build.exit_code != 0 else None
            suggestion2 = suggest_fix(parsed2) if parsed2 else None
            applied2 = None
            if suggestion2:
                self._apply_fix(project_id, suggestion2)
                applied2 = suggestion2.patch

            attempts.append(
                SelfFixAttempt(
                    attempt=i,
                    command=build.command,
                    exit_code=build.exit_code,
                    error_kind=parsed2.kind if parsed2 else None,
                    applied_fix=applied2,
                    stdout=build.stdout,
                    stderr=build.stderr,
                )
            )

            if build.exit_code == 0:
                break
            if applied2:
                continue
            break

        return attempts

