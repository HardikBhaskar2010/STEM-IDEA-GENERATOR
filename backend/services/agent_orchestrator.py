from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

from backend.services.self_fix_runner import SelfFixRunner
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
            {"type": "self_fix_build", "title": "Install/build and self-fix common errors", "max_attempts": 2},
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
        self._self_fix = SelfFixRunner(base_dir=base_dir)
        self._planner = PlannerAgent()
        self._jobs: Dict[str, AgentJob] = {}

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
            for step in job.plan:
                if step["type"] == "self_fix_build":
                    attempts = self._self_fix.run_self_fix(
                        project_id=job.project_id,
                        run_id=run_id,
                        max_attempts=int(step.get("max_attempts", 2)),
                    )
                    job.result["self_fix_attempts"] = [a.__dict__ for a in attempts]
                elif step["type"] == "summarize":
                    job.result["summary"] = "Completed self-fix build step(s)."
                else:
                    # Unknown step types are skipped for now to keep determinism.
                    continue

            job.status = "succeeded"
            job.updated_at = time.time()
            self._store.append_event(job.project_id, event_type="agent_job_succeeded", meta={"job_id": job_id})
            return job
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            job.updated_at = time.time()
            self._store.append_event(job.project_id, event_type="agent_job_failed", meta={"job_id": job_id, "error": str(e)})
            return job


_orchestrator_singleton: Optional[AgentOrchestrator] = None


def get_agent_orchestrator(*, base_dir: str) -> AgentOrchestrator:
    global _orchestrator_singleton
    if _orchestrator_singleton is None:
        _orchestrator_singleton = AgentOrchestrator(base_dir=base_dir)
    return _orchestrator_singleton

