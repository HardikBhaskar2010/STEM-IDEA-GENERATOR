"""
Unit tests for ImplementationPlan data models.

Tests FileSpec, FolderSpec, ScaffoldCommand, and ImplementationPlan models
including validation and to_markdown() conversion.

Requirements: 2.2, 2.3, 2.4, 17.1
"""

import pytest
from pydantic import ValidationError

from backend.models.implementation_plan import (
    FileSpec,
    FolderSpec,
    ScaffoldCommand,
    ImplementationPlan,
)


class TestFileSpec:
    """Test FileSpec model."""

    def test_file_spec_basic_creation(self):
        file = FileSpec(
            path="src/App.tsx",
            purpose="Main application component",
        )
        assert file.path == "src/App.tsx"
        assert file.purpose == "Main application component"
        assert file.dependencies == []

    def test_file_spec_with_dependencies(self):
        file = FileSpec(
            path="src/components/Button.tsx",
            purpose="Reusable button component",
            dependencies=["src/types.ts", "src/styles.css"],
        )
        assert len(file.dependencies) == 2
        assert "src/types.ts" in file.dependencies

    def test_file_spec_requires_path(self):
        with pytest.raises(ValidationError):
            FileSpec(purpose="Test file")

    def test_file_spec_requires_purpose(self):
        with pytest.raises(ValidationError):
            FileSpec(path="test.ts")


class TestFolderSpec:
    """Test FolderSpec model."""

    def test_folder_spec_basic_creation(self):
        folder = FolderSpec(
            path="src/components",
            purpose="React components directory",
        )
        assert folder.path == "src/components"
        assert folder.purpose == "React components directory"

    def test_folder_spec_requires_path(self):
        with pytest.raises(ValidationError):
            FolderSpec(purpose="Test folder")

    def test_folder_spec_requires_purpose(self):
        with pytest.raises(ValidationError):
            FolderSpec(path="src/test")


class TestScaffoldCommand:
    """Test ScaffoldCommand model."""

    def test_scaffold_command_basic_creation(self):
        cmd = ScaffoldCommand(
            command="npm create vite@latest",
            purpose="Initialize Vite project",
        )
        assert cmd.command == "npm create vite@latest"
        assert cmd.purpose == "Initialize Vite project"
        assert cmd.working_dir == "."

    def test_scaffold_command_with_working_dir(self):
        cmd = ScaffoldCommand(
            command="npm install",
            purpose="Install dependencies",
            working_dir="./frontend",
        )
        assert cmd.working_dir == "./frontend"

    def test_scaffold_command_requires_command(self):
        with pytest.raises(ValidationError):
            ScaffoldCommand(purpose="Test command")

    def test_scaffold_command_requires_purpose(self):
        with pytest.raises(ValidationError):
            ScaffoldCommand(command="npm install")


class TestImplementationPlan:
    """Test ImplementationPlan model and validation."""

    def test_implementation_plan_basic_creation(self):
        plan = ImplementationPlan(
            project_title="Todo App",
            project_description="A simple todo application",
            platform="web",
            tech_stack=["React", "TypeScript", "Vite"],
            estimated_file_count=15,
        )
        assert plan.project_title == "Todo App"
        assert plan.platform == "web"
        assert len(plan.tech_stack) == 3
        assert plan.estimated_file_count == 15

    def test_implementation_plan_with_all_fields(self):
        plan = ImplementationPlan(
            project_title="Pomodoro Timer",
            project_description="A productivity timer app",
            platform="web",
            tech_stack=["React", "TypeScript"],
            folders=[
                FolderSpec(path="src/components", purpose="React components"),
                FolderSpec(path="src/utils", purpose="Utility functions"),
            ],
            scaffold_commands=[
                ScaffoldCommand(
                    command="npm create vite@latest",
                    purpose="Initialize project",
                )
            ],
            files=[
                FileSpec(path=f"src/file{i}.tsx", purpose=f"File {i}")
                for i in range(15)
            ],
            estimated_file_count=15,
            additional_features=["Dark mode", "Sound notifications"],
        )
        assert len(plan.folders) == 2
        assert len(plan.scaffold_commands) == 1
        assert len(plan.files) == 15
        assert len(plan.additional_features) == 2

    def test_implementation_plan_minimum_file_count_validation(self):
        """Test that estimated_file_count must be at least 15 (Requirement 17.1)."""
        with pytest.raises(ValidationError) as exc_info:
            ImplementationPlan(
                project_title="Test",
                project_description="Test project",
                platform="web",
                tech_stack=["React"],
                estimated_file_count=10,  # Too few
            )
        error_str = str(exc_info.value)
        assert "estimated_file_count" in error_str
        assert ("greater than or equal to 15" in error_str or "at least 15" in error_str)

    def test_implementation_plan_accepts_15_files(self):
        """Test that exactly 15 files is valid."""
        plan = ImplementationPlan(
            project_title="Test",
            project_description="Test project",
            platform="web",
            tech_stack=["React"],
            estimated_file_count=15,
        )
        assert plan.estimated_file_count == 15

    def test_implementation_plan_accepts_more_than_15_files(self):
        """Test that more than 15 files is valid."""
        plan = ImplementationPlan(
            project_title="Test",
            project_description="Test project",
            platform="web",
            tech_stack=["React"],
            estimated_file_count=20,
        )
        assert plan.estimated_file_count == 20

    def test_implementation_plan_requires_project_title(self):
        with pytest.raises(ValidationError):
            ImplementationPlan(
                project_description="Test",
                platform="web",
                tech_stack=["React"],
                estimated_file_count=15,
            )

    def test_implementation_plan_requires_platform(self):
        with pytest.raises(ValidationError):
            ImplementationPlan(
                project_title="Test",
                project_description="Test",
                tech_stack=["React"],
                estimated_file_count=15,
            )

    def test_implementation_plan_requires_tech_stack(self):
        with pytest.raises(ValidationError):
            ImplementationPlan(
                project_title="Test",
                project_description="Test",
                platform="web",
                estimated_file_count=15,
            )


class TestImplementationPlanToMarkdown:
    """Test ImplementationPlan.to_markdown() method (Requirement 2.2, 2.3, 2.4)."""

    def test_to_markdown_includes_title_and_description(self):
        plan = ImplementationPlan(
            project_title="Todo App",
            project_description="A simple todo application",
            platform="web",
            tech_stack=["React"],
            estimated_file_count=15,
        )
        md = plan.to_markdown()
        assert "# Implementation Plan: Todo App" in md
        assert "A simple todo application" in md

    def test_to_markdown_includes_platform_and_tech_stack(self):
        plan = ImplementationPlan(
            project_title="Test",
            project_description="Test",
            platform="web",
            tech_stack=["React", "TypeScript", "Vite"],
            estimated_file_count=15,
        )
        md = plan.to_markdown()
        assert "**Platform:** web" in md
        assert "**Tech Stack:** React, TypeScript, Vite" in md

    def test_to_markdown_includes_folder_structure(self):
        plan = ImplementationPlan(
            project_title="Test",
            project_description="Test",
            platform="web",
            tech_stack=["React"],
            folders=[
                FolderSpec(path="src/components", purpose="React components"),
                FolderSpec(path="src/utils", purpose="Utility functions"),
            ],
            estimated_file_count=15,
        )
        md = plan.to_markdown()
        assert "## Folder Structure" in md
        assert "`src/components`: React components" in md
        assert "`src/utils`: Utility functions" in md

    def test_to_markdown_includes_scaffold_commands(self):
        plan = ImplementationPlan(
            project_title="Test",
            project_description="Test",
            platform="web",
            tech_stack=["React"],
            scaffold_commands=[
                ScaffoldCommand(
                    command="npm create vite@latest",
                    purpose="Initialize Vite project",
                ),
                ScaffoldCommand(
                    command="npm install",
                    purpose="Install dependencies",
                ),
            ],
            estimated_file_count=15,
        )
        md = plan.to_markdown()
        assert "## Scaffold Commands" in md
        assert "```bash\nnpm create vite@latest\n```" in md
        assert "Initialize Vite project" in md
        assert "```bash\nnpm install\n```" in md
        assert "Install dependencies" in md

    def test_to_markdown_includes_files_with_numbering(self):
        plan = ImplementationPlan(
            project_title="Test",
            project_description="Test",
            platform="web",
            tech_stack=["React"],
            files=[
                FileSpec(path="src/App.tsx", purpose="Main app component"),
                FileSpec(path="src/index.tsx", purpose="Entry point"),
            ],
            estimated_file_count=15,
        )
        md = plan.to_markdown()
        assert "## Files to Create" in md
        assert "1. `src/App.tsx`: Main app component" in md
        assert "2. `src/index.tsx`: Entry point" in md

    def test_to_markdown_includes_file_dependencies(self):
        plan = ImplementationPlan(
            project_title="Test",
            project_description="Test",
            platform="web",
            tech_stack=["React"],
            files=[
                FileSpec(path="src/types.ts", purpose="Type definitions"),
                FileSpec(
                    path="src/App.tsx",
                    purpose="Main app",
                    dependencies=["src/types.ts"],
                ),
            ],
            estimated_file_count=15,
        )
        md = plan.to_markdown()
        assert "Depends on: src/types.ts" in md

    def test_to_markdown_includes_total_file_count(self):
        plan = ImplementationPlan(
            project_title="Test",
            project_description="Test",
            platform="web",
            tech_stack=["React"],
            files=[FileSpec(path=f"file{i}.ts", purpose="Test") for i in range(18)],
            estimated_file_count=18,
        )
        md = plan.to_markdown()
        assert "**Total Files:** 18" in md

    def test_to_markdown_includes_additional_features(self):
        plan = ImplementationPlan(
            project_title="Test",
            project_description="Test",
            platform="web",
            tech_stack=["React"],
            estimated_file_count=15,
            additional_features=[
                "Dark mode support",
                "Keyboard shortcuts",
                "Export to CSV",
            ],
        )
        md = plan.to_markdown()
        assert "## Additional Features" in md
        assert "- Dark mode support" in md
        assert "- Keyboard shortcuts" in md
        assert "- Export to CSV" in md

    def test_to_markdown_complete_example(self):
        """Test a complete implementation plan conversion."""
        plan = ImplementationPlan(
            project_title="Pomodoro Timer",
            project_description="A productivity timer with task tracking",
            platform="web",
            tech_stack=["React", "TypeScript", "Vite"],
            folders=[
                FolderSpec(path="src/components", purpose="React components"),
                FolderSpec(path="src/hooks", purpose="Custom React hooks"),
                FolderSpec(path="src/utils", purpose="Utility functions"),
            ],
            scaffold_commands=[
                ScaffoldCommand(
                    command="npm create vite@latest my-app -- --template react-ts",
                    purpose="Initialize React TypeScript project",
                )
            ],
            files=[
                FileSpec(path="src/types.ts", purpose="TypeScript type definitions"),
                FileSpec(
                    path="src/App.tsx",
                    purpose="Main application component",
                    dependencies=["src/types.ts"],
                ),
                FileSpec(path="src/components/Timer.tsx", purpose="Timer display"),
                FileSpec(path="src/components/TaskList.tsx", purpose="Task list"),
                FileSpec(path="src/hooks/useTimer.ts", purpose="Timer logic hook"),
            ] + [FileSpec(path=f"src/file{i}.tsx", purpose=f"File {i}") for i in range(10)],
            estimated_file_count=15,
            additional_features=["Sound notifications", "Statistics dashboard"],
        )
        
        md = plan.to_markdown()
        
        # Verify all sections are present
        assert "# Implementation Plan: Pomodoro Timer" in md
        assert "## Folder Structure" in md
        assert "## Scaffold Commands" in md
        assert "## Files to Create" in md
        assert "## Additional Features" in md
        assert "**Total Files:** 15" in md
        
        # Verify content is properly formatted
        assert "`src/components`: React components" in md
        assert "```bash" in md
        assert "1. `src/types.ts`" in md
        assert "Depends on: src/types.ts" in md
        assert "- Sound notifications" in md
