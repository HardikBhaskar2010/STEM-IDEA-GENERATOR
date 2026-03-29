from __future__ import annotations

import io
import json
import os
import re
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from backend.models.project_spec import ProjectSpec, ProjectFile


class UnsafePathError(ValueError):
    pass


_WIN_DRIVE_RE = re.compile(r"^[a-zA-Z]:[\\/]")


def sanitize_rel_path(p: str) -> str:
    """
    Ensure p is a safe, relative posix-ish path.
    - no absolute paths
    - no drive letters
    - no path traversal
    """
    if not p or not isinstance(p, str):
        raise UnsafePathError("Empty path")

    s = p.strip().replace("\\", "/")
    if s.startswith("/") or _WIN_DRIVE_RE.match(s):
        raise UnsafePathError("Absolute paths are not allowed")
    if "\x00" in s:
        raise UnsafePathError("NUL byte not allowed")

    parts = [x for x in s.split("/") if x not in ("", ".")]
    if any(x == ".." for x in parts):
        raise UnsafePathError("Path traversal is not allowed")

    safe = "/".join(parts)
    if not safe:
        raise UnsafePathError("Invalid path")
    return safe


@dataclass(frozen=True)
class StoredVeronicaProject:
    project_id: str
    root_dir: Path
    spec_path: Path
    files_dir: Path
    events_path: Path


class VeronicaProjectStore:
    def __init__(self, *, base_dir: str):
        self.base_dir = Path(base_dir).resolve()

    def _project_root(self, project_id: str) -> Path:
        safe_id = (project_id or "").strip()
        if not safe_id:
            raise ValueError("project_id is required")
        # Keep UUID-ish IDs only for filesystem safety
        if not re.fullmatch(r"[a-fA-F0-9-]{16,64}", safe_id):
            raise ValueError("project_id must be UUID-like")
        return (self.base_dir / "projects" / safe_id).resolve()

    def get_paths(self, project_id: str) -> StoredVeronicaProject:
        root = self._project_root(project_id)
        return StoredVeronicaProject(
            project_id=project_id,
            root_dir=root,
            spec_path=root / "spec.json",
            files_dir=root / "files",
            events_path=root / "events.jsonl",
        )

    def append_event(self, project_id: str, *, event_type: str, meta: Optional[Dict[str, Any]] = None) -> None:
        paths = self.get_paths(project_id)
        paths.root_dir.mkdir(parents=True, exist_ok=True)
        payload = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "type": event_type,
            "meta": meta or {},
        }
        with paths.events_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")

    def save_spec(self, spec: ProjectSpec) -> StoredVeronicaProject:
        paths = self.get_paths(spec.project_id)
        paths.root_dir.mkdir(parents=True, exist_ok=True)
        paths.files_dir.mkdir(parents=True, exist_ok=True)

        # Write spec.json
        paths.spec_path.write_text(spec.model_dump_json(indent=2), encoding="utf-8")

        # Materialize files
        for pf in spec.files:
            rel = sanitize_rel_path(pf.path)
            out_path = (paths.files_dir / Path(rel)).resolve()
            # Ensure under files_dir
            if not str(out_path).startswith(str(paths.files_dir.resolve())):
                raise UnsafePathError("File path escapes project directory")
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(pf.content or "", encoding="utf-8")

        # Add README.md if not present
        if spec.readme:
            readme_path = (paths.files_dir / "README.md").resolve()
            if not readme_path.exists():
                readme_path.write_text(spec.readme, encoding="utf-8")

        self.append_event(spec.project_id, event_type="project_saved", meta={"file_count": len(spec.files)})
        return paths

    def load_spec(self, project_id: str) -> ProjectSpec:
        paths = self.get_paths(project_id)
        if not paths.spec_path.exists():
            raise FileNotFoundError(f"Project not found: {project_id}")
        raw = json.loads(paths.spec_path.read_text(encoding="utf-8"))
        return ProjectSpec.model_validate(raw)

    def update_file(self, project_id: str, *, path: str, content: str) -> ProjectFile:
        paths = self.get_paths(project_id)
        spec = self.load_spec(project_id)
        rel = sanitize_rel_path(path)

        # Update spec.files (create or replace)
        updated = None
        next_files = []
        for f in spec.files:
            if sanitize_rel_path(f.path) == rel:
                updated = f.model_copy(update={"content": content})
                next_files.append(updated)
            else:
                next_files.append(f)
        if updated is None:
            updated = ProjectFile(path=rel, content=content, is_main=False)
            next_files.append(updated)

        spec = spec.model_copy(update={"files": next_files})
        self.save_spec(spec)
        self.append_event(project_id, event_type="file_updated", meta={"path": rel})
        return updated

    def create_zip_bytes(self, project_id: str) -> bytes:
        paths = self.get_paths(project_id)
        if not paths.files_dir.exists():
            raise FileNotFoundError(f"No files for project: {project_id}")

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, _dirs, files in os.walk(paths.files_dir):
                for name in files:
                    full = Path(root) / name
                    rel = full.relative_to(paths.files_dir)
                    # Ensure consistent posix zip paths
                    zf.write(full, arcname=str(rel).replace("\\", "/"))

        self.append_event(project_id, event_type="zip_downloaded", meta={})
        return buf.getvalue()

    # ------------------------------------------------------------------
    # Generation state persistence (Task 10.1)
    # ------------------------------------------------------------------

    def _get_state_path(self, project_id: str) -> Path:
        """Return the path to the generation state file for a project.

        Requirements: 12.1, 12.2
        """
        root = self._project_root(project_id)
        return root / ".generation_state.json"

    def save_generation_state(self, project_id: str, state: "GenerationState") -> None:
        """Persist generation state to disk for resumability.

        Serialises the GenerationState model to JSON and writes it to
        ``<project_root>/.generation_state.json``.  Parent directories are
        created automatically.

        Args:
            project_id: The unique project identifier (UUID-like).
            state: GenerationState instance to persist.

        Requirements: 12.1, 12.2
        """
        state_path = self._get_state_path(project_id)
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(state.model_dump_json(), encoding="utf-8")

    def load_generation_state(self, project_id: str) -> Optional["GenerationState"]:
        """Load persisted generation state to resume interrupted generation.

        Returns ``None`` if no state has been saved for the project.

        Args:
            project_id: The unique project identifier (UUID-like).

        Returns:
            GenerationState if found on disk, otherwise None.

        Requirements: 12.4, 12.5
        """
        from backend.models.generation_state import GenerationState  # noqa: PLC0415

        state_path = self._get_state_path(project_id)
        if not state_path.exists():
            return None

        data = json.loads(state_path.read_text(encoding="utf-8"))
        return GenerationState(**data)

