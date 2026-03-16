from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional


JobStatus = Literal["queued", "running", "succeeded", "failed", "cancelled"]


@dataclass
class Job:
    job_id: str
    type: str
    status: JobStatus
    created_at: float
    updated_at: float
    project_id: Optional[str] = None
    progress: int = 0
    logs: List[str] = field(default_factory=list)
    result: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


class JobSystem:
    """
    Phase 5 MVP job system.

    In-memory only for now (swap to Redis/Postgres queue later).
    """

    def __init__(self):
        self._jobs: Dict[str, Job] = {}

    def create_job(self, *, type: str, project_id: Optional[str] = None) -> Job:
        now = time.time()
        job_id = str(uuid.uuid4())
        job = Job(job_id=job_id, type=type, status="queued", created_at=now, updated_at=now, project_id=project_id)
        self._jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> Job:
        if job_id not in self._jobs:
            raise KeyError("job not found")
        return self._jobs[job_id]

    def append_log(self, job_id: str, line: str) -> None:
        job = self.get_job(job_id)
        job.logs.append(line)
        job.updated_at = time.time()

    def set_progress(self, job_id: str, progress: int) -> None:
        job = self.get_job(job_id)
        job.progress = max(0, min(100, int(progress)))
        job.updated_at = time.time()

    def succeed(self, job_id: str, result: Optional[Dict[str, Any]] = None) -> None:
        job = self.get_job(job_id)
        job.status = "succeeded"
        job.result = result or {}
        job.progress = 100
        job.updated_at = time.time()

    def fail(self, job_id: str, error: str) -> None:
        job = self.get_job(job_id)
        job.status = "failed"
        job.error = error
        job.updated_at = time.time()


_job_system_singleton: Optional[JobSystem] = None


def get_job_system() -> JobSystem:
    global _job_system_singleton
    if _job_system_singleton is None:
        _job_system_singleton = JobSystem()
    return _job_system_singleton

