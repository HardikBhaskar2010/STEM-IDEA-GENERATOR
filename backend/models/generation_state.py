from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Dict, List, Optional

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from backend.orchestration.veronica_orchestrator import VeronicaProjectStore


class GenerationState(BaseModel):
    """
    State model for resumable agentic project generation.
    
    Tracks the current phase, progress, and metadata for a generation session,
    enabling resume from interruption.
    """
    
    sandbox_id: Optional[str] = Field(default=None, description="E2B sandbox identifier (empty when running in local/memory mode)")
    project_id: str = Field(..., description="Unique project identifier")
    phase: str = Field(
        ...,
        description="Current generation phase: sandbox | planning | scaffolding | files | debugging"
    )
    
    plan: Optional[dict] = Field(
        default=None,
        description="Implementation plan (serialized ImplementationPlan)"
    )
    files_created: List[str] = Field(
        default_factory=list,
        description="List of file paths successfully created"
    )
    generated_files: Dict[str, str] = Field(
        default_factory=dict,
        description="In-memory file store: path -> content (used when sandbox_id is empty)"
    )
    commands_executed: List[str] = Field(
        default_factory=list,
        description="List of commands successfully executed"
    )
    
    debug_iterations: int = Field(
        default=0,
        description="Number of debugging iterations completed"
    )
    max_debug_iterations: int = Field(
        default=5,
        description="Maximum allowed debugging iterations"
    )
    last_error: Optional[str] = Field(
        default=None,
        description="Last error message encountered"
    )
    
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 timestamp of state creation"
    )
    updated_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 timestamp of last state update"
    )
    
    def save(self, store: VeronicaProjectStore) -> None:
        """
        Persist state to disk for resumability.
        
        Args:
            store: VeronicaProjectStore instance for state persistence
        """
        # Update timestamp before saving
        self.updated_at = datetime.now(timezone.utc).isoformat()
        store.save_generation_state(self.project_id, self)
    
    @classmethod
    def load(
        cls, project_id: str, store: VeronicaProjectStore
    ) -> Optional[GenerationState]:
        """
        Load state from disk to resume interrupted generation.
        
        Args:
            project_id: Unique project identifier
            store: VeronicaProjectStore instance for state retrieval
            
        Returns:
            GenerationState if found, None otherwise
        """
        return store.load_generation_state(project_id)
