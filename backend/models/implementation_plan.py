from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field, field_validator


class FileSpec(BaseModel):
    """Specification for a file to be created in the project."""
    
    path: str = Field(..., description="Relative file path")
    purpose: str = Field(..., description="What this file does")
    dependencies: List[str] = Field(default_factory=list, description="Files this depends on")


class FolderSpec(BaseModel):
    """Specification for a folder to be created in the project."""
    
    path: str = Field(..., description="Relative folder path")
    purpose: str = Field(..., description="What this folder contains")


class ScaffoldCommand(BaseModel):
    """Shell command to execute during project scaffolding."""
    
    command: str = Field(..., description="Shell command to execute")
    purpose: str = Field(..., description="What this command does")
    working_dir: str = Field(default=".", description="Directory to run command in")


class ImplementationPlan(BaseModel):
    """
    Complete implementation plan for agentic project generation.
    
    Includes project metadata, folder structure, scaffold commands,
    and file specifications with creation order.
    """
    
    project_title: str
    project_description: str
    platform: str = Field(..., description="web | cli | mobile")
    tech_stack: List[str] = Field(..., description="Technologies used")
    
    folders: List[FolderSpec] = Field(default_factory=list)
    scaffold_commands: List[ScaffoldCommand] = Field(default_factory=list)
    files: List[FileSpec] = Field(default_factory=list)
    
    estimated_file_count: int = Field(..., ge=15, description="Must be 15-20 minimum")
    additional_features: List[str] = Field(default_factory=list, description="Bonus features")
    
    @field_validator('estimated_file_count')
    @classmethod
    def validate_minimum_files(cls, v: int) -> int:
        """Validate that estimated file count meets minimum requirement of 15."""
        if v < 15:
            raise ValueError(f"estimated_file_count must be at least 15, got {v}")
        return v
    
    def to_markdown(self) -> str:
        """
        Convert plan to IMPLEMENTATION_PLAN.md format.
        
        Returns:
            Markdown-formatted implementation plan document
        """
        md = f"# Implementation Plan: {self.project_title}\n\n"
        md += f"{self.project_description}\n\n"
        md += f"**Platform:** {self.platform}\n"
        md += f"**Tech Stack:** {', '.join(self.tech_stack)}\n\n"
        
        md += "## Folder Structure\n\n"
        for folder in self.folders:
            md += f"- `{folder.path}`: {folder.purpose}\n"
        
        md += "\n## Scaffold Commands\n\n"
        for cmd in self.scaffold_commands:
            md += f"```bash\n{cmd.command}\n```\n{cmd.purpose}\n\n"
        
        md += "\n## Files to Create\n\n"
        for i, file in enumerate(self.files, 1):
            md += f"{i}. `{file.path}`: {file.purpose}\n"
            if file.dependencies:
                md += f"   - Depends on: {', '.join(file.dependencies)}\n"
        
        md += f"\n**Total Files:** {len(self.files)}\n"
        md += f"\n## Additional Features\n\n"
        for feature in self.additional_features:
            md += f"- {feature}\n"
        
        return md
