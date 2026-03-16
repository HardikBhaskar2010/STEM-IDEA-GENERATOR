from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, Optional

from backend.services.error_parser import ParsedError


@dataclass(frozen=True)
class FixSuggestion:
    title: str
    description: str
    patch: Dict[str, Any]


def _add_dependency_patch(module_name: str) -> Dict[str, Any]:
    return {"type": "add_npm_dependency", "module": module_name}


def suggest_fix(parsed: ParsedError) -> Optional[FixSuggestion]:
    if parsed.kind in ("missing_node_module", "missing_ts_module"):
        mod = parsed.meta.get("module")
        if not mod:
            return None
        return FixSuggestion(
            title="Add missing dependency",
            description=f"Add `{mod}` to dependencies and reinstall.",
            patch=_add_dependency_patch(mod),
        )
    return None

