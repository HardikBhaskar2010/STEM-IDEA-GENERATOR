"""
Standalone tests for the code generation pipeline.
Run with: python backend/scripts/test_code_generation.py
No test framework required.
"""
import sys
import os
import re

# Add project root to sys.path
_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _root not in sys.path:
    sys.path.insert(0, _root)

PASS = "\033[92m✅ PASS\033[0m"
FAIL = "\033[91m❌ FAIL\033[0m"

failures = []

def check(name: str, condition: bool, detail: str = ""):
    if condition:
        print(f"  {PASS}  {name}")
    else:
        print(f"  {FAIL}  {name}" + (f": {detail}" if detail else ""))
        failures.append(name)


# ─────────────────────────────────────────────────────────────────────────────
# Test 1 — _FILE_BLOCK_RE parser
# ─────────────────────────────────────────────────────────────────────────────
print("\n[Test 1] _FILE_BLOCK_RE regex parser")

# The regex from code_generation_service.py
_FILE_BLOCK_RE = re.compile(
    r"```(?:[a-zA-Z0-9+_-]*\s+)?(?:filename:\s*)?([^\s`]+\.[a-zA-Z0-9]+)[ \t]*\n(.*?)```",
    re.DOTALL,
)

MULTI_FILE_RESPONSE = """\
Here is the generated project:

```python filename: src/main.py
def main():
    print("Hello, world!")

if __name__ == "__main__":
    main()
```

```js src/utils.js
function greet(name) {
    return `Hello, ${name}!`;
}
```

```filename: README.md
# My Project
A nice project.
```

Some plain text with no file block here.
```
this is not a file block
```
"""

matches = list(_FILE_BLOCK_RE.finditer(MULTI_FILE_RESPONSE))

check("Finds 3 file blocks (not 4 or 1)", len(matches) == 3, f"found {len(matches)}")
if len(matches) >= 1:
    check("First block path is src/main.py", matches[0].group(1) == "src/main.py")
    check("First block content contains 'def main'", "def main" in matches[0].group(2))
if len(matches) >= 2:
    check("Second block path is src/utils.js", matches[1].group(1) == "src/utils.js")
if len(matches) >= 3:
    check("Third block path is README.md", matches[2].group(1) == "README.md")

# Ensure a plain ``` block with no filename does NOT get captured
plain_block = "```\nno filename here\n```"
plain_matches = list(_FILE_BLOCK_RE.finditer(plain_block))
check("Plain ``` block without filename is ignored", len(plain_matches) == 0, f"got {len(plain_matches)}")


# ─────────────────────────────────────────────────────────────────────────────
# Test 2 — validate_project_spec_from_text raises ProjectSpecValidationError
# ─────────────────────────────────────────────────────────────────────────────
print("\n[Test 2] validate_project_spec_from_text — malformed JSON")

try:
    from backend.services.project_spec_validator import (
        validate_project_spec_from_text,
        ProjectSpecValidationError,
    )

    bad_inputs = [
        "",
        "this is plain text, not JSON at all",
        '{"project_id": "ok"}',  # Valid JSON but missing required fields
    ]

    for bad in bad_inputs:
        exc_raised = False
        try:
            validate_project_spec_from_text(bad)
        except ProjectSpecValidationError:
            exc_raised = True
        except Exception as e:
            # Should be ProjectSpecValidationError, not raw Exception
            check(f"Input {bad[:30]!r} → ProjectSpecValidationError (not {type(e).__name__})", False, str(e))
            exc_raised = True  # still raised, just wrong type

        check(
            f"Input {bad[:30]!r} raises ProjectSpecValidationError",
            exc_raised,
        )

except ImportError as e:
    print(f"  ⚠️  SKIP (import unavailable in test env): {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Test 3 — _save_generated_files does NOT raise when DB is unavailable
# ─────────────────────────────────────────────────────────────────────────────
print("\n[Test 3] _save_generated_files — non-fatal when DB unavailable")

try:
    import asyncio
    from unittest.mock import AsyncMock, patch, MagicMock

    # Patch get_db_client to raise to simulate DB being down
    async def _failing_db():
        raise ConnectionError("Simulated DB unavailable")

    # Import the service without triggering its constructor imports
    from backend.services.code_generation_service import VeronicaAIService, CodeFile, Platform

    svc = VeronicaAIService.__new__(VeronicaAIService)
    # Provide a minimal logger
    import logging
    svc.logger = logging.getLogger("test")

    dummy_file = CodeFile(
        file_path="src/main.py",
        file_name="main.py",
        file_type="py",
        content="print('hi')",
        description="Test file",
        is_main_file=True,
    )

    raised = False
    with patch("backend.services.code_generation_service.get_db_client", new=_failing_db):
        try:
            asyncio.run(svc._save_generated_files("test-gen-id", [dummy_file]))
        except Exception as e:
            raised = True
            check(
                "_save_generated_files does not raise on DB failure",
                False,
                f"Raised {type(e).__name__}: {e}",
            )

    if not raised:
        check("_save_generated_files does not raise on DB failure", True)

except ImportError as e:
    print(f"  ⚠️  SKIP (import unavailable in test env): {e}")
except Exception as e:
    print(f"  ⚠️  SKIP (setup error): {e}")


# ─────────────────────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print()
    if failures:
        print(f"\033[91m{len(failures)} test(s) FAILED:\033[0m")
        for f in failures:
            print(f"  • {f}")
        sys.exit(1)
    else:
        print("\033[92mAll tests passed.\033[0m")
        sys.exit(0)
