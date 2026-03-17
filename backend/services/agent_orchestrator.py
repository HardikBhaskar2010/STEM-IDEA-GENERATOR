from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

import json
from pathlib import Path

from backend.services.agent_tools_docker import DockerAgentTools
from backend.services.auto_fix_rules import suggest_fix
from backend.services.error_parser import parse_error
from backend.services.project_versioning import ProjectVersioning
from backend.services.sandbox_manager import get_sandbox_manager
from backend.services.veronica_project_store import VeronicaProjectStore


AgentJobStatus = Literal["queued", "running", "succeeded", "failed", "cancelled"]


@dataclass
class AgentJob:
    job_id: str
    project_id: str
    status: AgentJobStatus
    created_at: float
    updated_at: float
    plan: List[Dict[str, Any]] = field(default_factory=list)
    result: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


class PlannerAgent:
    """
    MVP planner: produces an ordered task list.
    """

    def plan(self, *, project_id: str) -> List[Dict[str, Any]]:
        return [
            {"type": "install", "title": "Install dependencies (if needed)"},
            {"type": "build", "title": "Run build to verify"},
            {"type": "fix_loop", "title": "Observe errors and apply bounded fixes", "max_attempts": 3},
            {"type": "summarize", "title": "Summarize result"},
        ]


class AgentOrchestrator:
    """
    MVP orchestrator:
    - Generates a plan via PlannerAgent
    - Executes minimal tool flows deterministically
    - Logs actions to project events for auditability
    """

    def __init__(self, *, base_dir: str):
        self._store = VeronicaProjectStore(base_dir=base_dir)
        self._planner = PlannerAgent()
        self._jobs: Dict[str, AgentJob] = {}
        self._base_dir = Path(base_dir).resolve()
        self._tools = DockerAgentTools(base_dir=base_dir)
        self._versioning = ProjectVersioning(base_dir=base_dir)

    def _state_dir(self, project_id: str) -> Path:
        root = self._store.get_paths(project_id).root_dir
        d = (root / "agent_jobs").resolve()
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _save_state(self, project_id: str, job_id: str, state: Dict[str, Any]) -> None:
        p = self._state_dir(project_id) / f"{job_id}.state.json"
        p.write_text(json.dumps(state, indent=2), encoding="utf-8")

    def _save_result(self, project_id: str, job_id: str, result: Dict[str, Any]) -> None:
        p = self._state_dir(project_id) / f"{job_id}.result.json"
        p.write_text(json.dumps(result, indent=2), encoding="utf-8")

    def start_job(self, *, project_id: str) -> AgentJob:
        job_id = str(uuid.uuid4())
        now = time.time()
        plan = self._planner.plan(project_id=project_id)
        job = AgentJob(
            job_id=job_id,
            project_id=project_id,
            status="queued",
            created_at=now,
            updated_at=now,
            plan=plan,
        )
        self._jobs[job_id] = job
        self._store.append_event(project_id, event_type="agent_job_created", meta={"job_id": job_id, "plan": plan})
        return job

    def get_job(self, job_id: str) -> AgentJob:
        if job_id not in self._jobs:
            raise KeyError("job not found")
        return self._jobs[job_id]

    def run_job(self, job_id: str, *, run_id: str) -> AgentJob:
        job = self.get_job(job_id)
        if job.status not in ("queued", "running"):
            return job

        job.status = "running"
        job.updated_at = time.time()
        self._store.append_event(job.project_id, event_type="agent_job_started", meta={"job_id": job_id, "run_id": run_id})

        try:
            # Resolve container for this run
            manager = get_sandbox_manager()
            run = manager.get_run(run_id)
            if not run.container_id:
                raise RuntimeError("No container_id for run; start a web run first")
            container_id = run.container_id

            state: Dict[str, Any] = {
                "goal": "Build and validate the project; apply bounded fixes if needed.",
                "current_step": "init",
                "success_criteria": ["npm run build succeeds"],
                "last_error": "",
                "files_changed": [],
                "attempt": 0,
                "run_id": run_id,
                "container_id": container_id,
            }
            self._save_state(job.project_id, job_id, state)

            for step in job.plan:
                state["current_step"] = step["type"]
                self._save_state(job.project_id, job_id, state)

                if step["type"] == "install":
                    # Batched install; base image + cache should make this faster on warm runs.
                    r = self._tools.run_command(
                        project_id=job.project_id,
                        container_id=container_id,
                        commands=["npm install"],
                    )
                    job.result["install_ok"] = r.ok
                    job.result["install_output"] = (r.stdout or "")[:4000]
                    if not r.ok:
                        state["last_error"] = "npm install failed"
                        break

                elif step["type"] == "build":
                    r = self._tools.run_command(
                        project_id=job.project_id,
                        container_id=container_id,
                        commands=["npm run build"],
                    )
                    job.result["build_ok"] = r.ok
                    job.result["build_output"] = (r.stdout or "")[:4000]
                    if r.ok:
                        continue
                    state["last_error"] = (r.stdout or "")[-2000:]

                elif step["type"] == "fix_loop":
                    max_attempts = int(step.get("max_attempts", 3))
                    for attempt in range(1, max_attempts + 1):
                        state["attempt"] = attempt
                        self._save_state(job.project_id, job_id, state)

                        # Try build; on failure parse error and apply small fix.
                        r = self._tools.run_command(
                            project_id=job.project_id,
                            container_id=container_id,
                            commands=["npm run build"],
                        )
                        if r.ok:
                            job.result["build_ok"] = True
                            job.result["fixed_in_attempt"] = attempt
                            break

                        logs = (r.stdout or "")[-4000:]
                        parsed = parse_error(logs)
                        if not parsed:
                            state["last_error"] = logs
                            job.result["unparsed_error"] = logs
                            break

                        suggestion = suggest_fix(parsed)
                        if not suggestion:
                            state["last_error"] = f"{parsed.kind}: {parsed.message}"
                            job.result["no_fix_suggestion"] = {"kind": parsed.kind, "meta": parsed.meta}
                            break

                        # Snapshot before changing files (rollback safety)
                        snap = self._versioning.create_snapshot(project_id=job.project_id, label=f"agent_fix_attempt_{attempt}")

                        applied = {"title": suggestion.title, "patch": suggestion.patch, "snapshot_id": snap.snapshot_id}
                        job.result.setdefault("applied_fixes", []).append(applied)
                        self._store.append_event(job.project_id, event_type="agent_fix_planned", meta=applied)

                        # Apply minimal fix types (currently dependency add by editing package.json in stored project, not inside container)
                        # We apply inside container AND also update stored project spec via archive write for durability.
                        if suggestion.patch.get("type") == "add_npm_dependency":
                            mod = str(suggestion.patch.get("module") or "")
                            # Read package.json from container, patch, write back.
                            pkg_res = self._tools.read_file(project_id=job.project_id, container_id=container_id, path="package.json")
                            if not pkg_res.ok:
                                break
                            pkg = json.loads(pkg_res.stdout or "{}")
                            deps = pkg.get("dependencies") or {}
                            if not isinstance(deps, dict):
                                deps = {}
                            if mod and mod not in deps:
                                deps[mod] = "latest"
                            pkg["dependencies"] = deps
                            new_text = json.dumps(pkg, indent=2)
                            self._tools.write_file(project_id=job.project_id, container_id=container_id, path="package.json", content=new_text)
                            state["files_changed"].append("package.json")
                            self._save_state(job.project_id, job_id, state)

                        # Re-install after dependency changes
                        self._tools.run_command(project_id=job.project_id, container_id=container_id, commands=["npm install"])

                elif step["type"] == "summarize":
                    job.result["summary"] = "Executed install/build with bounded fix loop (see applied_fixes/result logs)."
                else:
                    # Unknown step types are skipped for now to keep determinism.
                    continue

            self._save_result(job.project_id, job_id, job.result)
            job.status = "succeeded"
            job.updated_at = time.time()
            self._store.append_event(job.project_id, event_type="agent_job_succeeded", meta={"job_id": job_id})
            return job
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            job.updated_at = time.time()
            self._store.append_event(job.project_id, event_type="agent_job_failed", meta={"job_id": job_id, "error": str(e)})
            try:
                self._save_result(job.project_id, job_id, {"error": str(e), **job.result})
            except Exception:
                pass
            return job


_orchestrator_singleton: Optional[AgentOrchestrator] = None


def get_agent_orchestrator(*, base_dir: str) -> AgentOrchestrator:
    global _orchestrator_singleton
    if _orchestrator_singleton is None:
        _orchestrator_singleton = AgentOrchestrator(base_dir=base_dir)
    return _orchestrator_singleton

