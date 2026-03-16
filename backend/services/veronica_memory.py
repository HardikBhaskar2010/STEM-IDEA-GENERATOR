from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class UserMemory:
    user_id: str
    preferences: Dict[str, Any]
    learning_goals: Dict[str, Any]


class VeronicaMemoryStore:
    """
    Phase 6 MVP memory store.

    Stores per-user memory as JSON on disk (swap to DB later).
    """

    def __init__(self, *, base_dir: str):
        self._base = Path(base_dir).resolve() / "memory"
        self._base.mkdir(parents=True, exist_ok=True)

    def _path(self, user_id: str) -> Path:
        safe = "".join(ch for ch in (user_id or "") if ch.isalnum() or ch in ("-", "_"))
        if not safe:
            raise ValueError("user_id required")
        return (self._base / f"{safe}.json").resolve()

    def load(self, user_id: str) -> UserMemory:
        p = self._path(user_id)
        if not p.exists():
            return UserMemory(user_id=user_id, preferences={}, learning_goals={})
        data = json.loads(p.read_text(encoding="utf-8"))
        return UserMemory(
            user_id=user_id,
            preferences=dict(data.get("preferences") or {}),
            learning_goals=dict(data.get("learning_goals") or {}),
        )

    def save(self, mem: UserMemory) -> None:
        p = self._path(mem.user_id)
        payload = {"user_id": mem.user_id, "preferences": mem.preferences, "learning_goals": mem.learning_goals}
        p.write_text(json.dumps(payload, indent=2), encoding="utf-8")

