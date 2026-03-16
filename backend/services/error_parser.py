from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, Optional


@dataclass(frozen=True)
class ParsedError:
    kind: str
    message: str
    meta: Dict[str, str]


_MISSING_MODULE_RE = re.compile(r"Cannot find module ['\"]([^'\"]+)['\"]", re.IGNORECASE)
_TS_CANNOT_FIND_MODULE_RE = re.compile(r"TS2307: Cannot find module ['\"]([^'\"]+)['\"]", re.IGNORECASE)


def parse_error(logs: str) -> Optional[ParsedError]:
    """
    Very small MVP parser for common web-template build failures.
    Returns None when no known failure patterns are detected.
    """
    if not logs:
        return None

    m = _MISSING_MODULE_RE.search(logs)
    if m:
        return ParsedError(kind="missing_node_module", message="Missing Node module", meta={"module": m.group(1)})

    m = _TS_CANNOT_FIND_MODULE_RE.search(logs)
    if m:
        return ParsedError(kind="missing_ts_module", message="TypeScript cannot resolve module", meta={"module": m.group(1)})

    if "npm ERR!" in logs and "not found" in logs.lower():
        return ParsedError(kind="npm_error", message="NPM error (package or script not found)", meta={})

    return None

