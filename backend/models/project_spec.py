from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, ConfigDict


class VeronicaPlatform(str, Enum):
    ARDUINO = "arduino"
    RASPBERRY_PI = "raspberry-pi"
    WEB = "web"


class ProjectFile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    path: str = Field(..., min_length=1, max_length=500, description="Relative, posix-style path")
    content: str = Field(..., description="File contents as UTF-8 text")
    description: Optional[str] = Field(default=None, max_length=1000)
    is_main: bool = False


class ProjectWiring(BaseModel):
    model_config = ConfigDict(extra="forbid")

    overview: str = Field(default="", max_length=5000)
    connections: List[str] = Field(default_factory=list, description="Bullet-ish connection steps")
    notes: List[str] = Field(default_factory=list)


class ProjectSpec(BaseModel):
    """
    Canonical Veronica project contract for V1:
    idea + plan + materials/wiring + generated files + README.
    """

    model_config = ConfigDict(extra="forbid")

    project_id: str = Field(..., min_length=1, max_length=100)
    title: str = Field(..., min_length=3, max_length=200)
    platform: VeronicaPlatform

    from pydantic import field_validator
    @field_validator('platform', mode='before')
    @classmethod
    def lowercase_platform(cls, v):
        if isinstance(v, str):
            v_lower = v.lower()
            if v_lower == 'raspberry_pi':
                return 'raspberry-pi'
            return v_lower
        return v

    difficulty: str = Field(..., min_length=1, max_length=50)

    summary: str = Field(..., min_length=10, max_length=5000)
    learning_goals: List[str] = Field(default_factory=list)
    steps: List[str] = Field(default_factory=list)

    materials: List[str] = Field(default_factory=list)
    wiring: ProjectWiring = Field(default_factory=ProjectWiring)

    files: List[ProjectFile] = Field(default_factory=list)
    readme: str = Field(default="", max_length=20000)

    meta: Dict[str, Any] = Field(default_factory=dict, description="Reserved for future fields")

