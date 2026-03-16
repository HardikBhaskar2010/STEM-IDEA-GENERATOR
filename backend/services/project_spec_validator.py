from __future__ import annotations

import json
import re
from typing import Any, Dict, Tuple

from pydantic import ValidationError

from backend.models.project_spec import ProjectSpec


class ProjectSpecValidationError(Exception):
    def __init__(self, message: str, *, raw_text: str = "", details: Any = None):
        super().__init__(message)
        self.raw_text = raw_text
        self.details = details


def extract_json_object(text: str) -> str:
    """
    Best-effort extraction of a single JSON object from an LLM response.
    """
    if not text:
        raise ProjectSpecValidationError("Empty model output", raw_text=text)

    # Prefer fenced json
    m = re.search(r"```json\s*(\{[\s\S]*?\})\s*```", text, re.IGNORECASE)
    if m:
        return m.group(1).strip()

    # Fallback to first {...last}
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ProjectSpecValidationError("Could not locate JSON object", raw_text=text)

    return text[start : end + 1].strip()


def _coerce_basic_repairs(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Minimal, high-confidence repairs:
    - Accept legacy/alternate keys if present
    - Normalize files entries if they use `file_path` instead of `path`
    """
    repaired = dict(data or {})

    if "projectId" in repaired and "project_id" not in repaired:
        repaired["project_id"] = repaired.pop("projectId")

    if "README" in repaired and "readme" not in repaired:
        repaired["readme"] = repaired.pop("README")

    files = repaired.get("files")
    if isinstance(files, list):
        next_files = []
        for f in files:
            if isinstance(f, dict):
                ff = dict(f)
                if "file_path" in ff and "path" not in ff:
                    ff["path"] = ff.pop("file_path")
                if "isMain" in ff and "is_main" not in ff:
                    ff["is_main"] = ff.pop("isMain")
                next_files.append(ff)
            else:
                next_files.append(f)
        repaired["files"] = next_files

    return repaired


def validate_project_spec_from_text(text: str) -> Tuple[ProjectSpec, Dict[str, Any]]:
    """
    Returns (ProjectSpec, raw_dict_used_for_validation).
    Raises ProjectSpecValidationError if parsing/validation fails.
    """
    json_text = extract_json_object(text)
    try:
        raw = json.loads(json_text)
    except Exception as e:
        raise ProjectSpecValidationError("Invalid JSON in model output", raw_text=text, details=str(e))

    if not isinstance(raw, dict):
        raise ProjectSpecValidationError("ProjectSpec JSON must be an object", raw_text=text)

    raw = _coerce_basic_repairs(raw)

    try:
        spec = ProjectSpec.model_validate(raw)
    except ValidationError as ve:
        raise ProjectSpecValidationError("ProjectSpec validation failed", raw_text=text, details=ve.errors())

    return spec, raw

