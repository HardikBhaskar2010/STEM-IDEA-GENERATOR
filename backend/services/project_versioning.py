from __future__ import annotations

import json
import shutil
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

from backend.services.veronica_project_store import VeronicaProjectStore


@dataclass(frozen=True)
class ProjectSnapshot:
    snapshot_id: str
    project_id: str
    created_at: float
    label: str


class ProjectVersioning:
    """
    Phase 5 MVP versioning via snapshots.
    Stores snapshot copies of the project's `files/` and `spec.json`.
    """

    def __init__(self, *, base_dir: str):
        self._store = VeronicaProjectStore(base_dir=base_dir)
        self._snapshots_dir = Path(base_dir).resolve() / "snapshots"
        self._snapshots_dir.mkdir(parents=True, exist_ok=True)

    def create_snapshot(self, *, project_id: str, label: str = "") -> ProjectSnapshot:
        paths = self._store.get_paths(project_id)
        if not paths.root_dir.exists():
            raise FileNotFoundError("project not found")

        snapshot_id = str(uuid.uuid4())
        created_at = time.time()
        snap_root = (self._snapshots_dir / project_id / snapshot_id).resolve()
        snap_root.mkdir(parents=True, exist_ok=True)

        # Copy spec + files
        shutil.copy2(paths.spec_path, snap_root / "spec.json")
        if paths.files_dir.exists():
            shutil.copytree(paths.files_dir, snap_root / "files", dirs_exist_ok=True)

        meta = {"snapshot_id": snapshot_id, "project_id": project_id, "created_at": created_at, "label": label}
        (snap_root / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
        self._store.append_event(project_id, event_type="snapshot_created", meta=meta)

        return ProjectSnapshot(snapshot_id=snapshot_id, project_id=project_id, created_at=created_at, label=label)

    def list_snapshots(self, *, project_id: str) -> List[ProjectSnapshot]:
        root = (self._snapshots_dir / project_id).resolve()
        if not root.exists():
            return []
        snaps: List[ProjectSnapshot] = []
        for child in root.iterdir():
            meta_path = child / "meta.json"
            if meta_path.exists():
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
                snaps.append(
                    ProjectSnapshot(
                        snapshot_id=meta.get("snapshot_id", child.name),
                        project_id=meta.get("project_id", project_id),
                        created_at=float(meta.get("created_at", 0.0)),
                        label=str(meta.get("label", "")),
                    )
                )
        snaps.sort(key=lambda s: s.created_at, reverse=True)
        return snaps

    def restore_snapshot(self, *, project_id: str, snapshot_id: str) -> None:
        paths = self._store.get_paths(project_id)
        snap_root = (self._snapshots_dir / project_id / snapshot_id).resolve()
        if not snap_root.exists():
            raise FileNotFoundError("snapshot not found")

        spec_src = snap_root / "spec.json"
        files_src = snap_root / "files"
        if not spec_src.exists():
            raise FileNotFoundError("snapshot missing spec.json")

        paths.root_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(spec_src, paths.spec_path)
        if paths.files_dir.exists():
            shutil.rmtree(paths.files_dir)
        if files_src.exists():
            shutil.copytree(files_src, paths.files_dir, dirs_exist_ok=True)

        self._store.append_event(project_id, event_type="snapshot_restored", meta={"snapshot_id": snapshot_id})

