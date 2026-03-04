"""
Project Service - Unified project context and planning functionality
Consolidates: project_context_service, enhanced_project_context_service, software_project_planning_service

Requirements: 1.2, 1.4, 9.4
Task: 6.1 Consolidate project context functionality
"""

import logging
import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Tuple
from enum import Enum

from backend.infrastructure.base_service import BaseService
from backend.infrastructure.redis_client import RedisClient
from backend.infrastructure.db_pool import DatabaseConnectionPool
from backend.database.connection import get_db_client
from backend.models.ai_guidance import (
    ProjectContext, Task, Milestone, TaskStatus, TaskPriority
)

logger = logging.getLogger(__name__)


class ProjectType(Enum):
    """Software project types"""
    WEB_APP = "web_app"
    MOBILE_APP = "mobile_app"
    DESKTOP_APP = "desktop_app"
    API = "api"
    FULL_STACK = "full_stack"
    MICROSERVICES = "microservices"
    PWA = "progressive_web_app"
    IOT = "iot"
    ROBOTICS = "robotics"
    GENERAL = "general"


class Platform(Enum):
    """Target platforms"""
    WEB = "web"
    IOS = "ios"
    ANDROID = "android"
    DESKTOP = "desktop"
    ARDUINO = "arduino"
    RASPBERRY_PI = "raspberry_pi"
    ALL = "all"


class ComplexityLevel(Enum):
    """Project complexity levels"""
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    ENTERPRISE = "enterprise"


class CodeGenerationStatus:
    """Represents code generation status for a project"""
    def __init__(
        self,
        has_generated_code: bool = False,
        total_generations: int = 0,
        active_generations: int = 0,
        last_generation_date: Optional[datetime] = None,
        platforms_used: Optional[List[str]] = None,
        recent_generations: Optional[List[Dict[str, Any]]] = None
    ):
        self.has_generated_code = has_generated_code
        self.total_generations = total_generations
        self.active_generations = active_generations
        self.last_generation_date = last_generation_date
        self.platforms_used = platforms_used or []
        self.recent_generations = recent_generations or []


class Feature:
    """Represents a software feature"""
    def __init__(
        self,
        name: str,
        description: str,
        priority: str = "medium",
        acceptance_criteria: Optional[List[str]] = None,
        estimated_hours: Optional[int] = None,
        dependencies: Optional[List[str]] = None
    ):
        self.name = name
        self.description = description
        self.priority = priority
        self.acceptance_criteria = acceptance_criteria or []
        self.estimated_hours = estimated_hours
        self.dependencies = dependencies or []
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "priority": self.priority,
            "acceptance_criteria": self.acceptance_criteria,
            "estimated_hours": self.estimated_hours,
            "dependencies": self.dependencies
        }


class ProjectService(BaseService):
    """
    Unified project service consolidating all project-related functionality.
    
    Consolidates:
    - project_context_service: Project context retrieval and caching
    - enhanced_project_context_service: Code generation status tracking
    - software_project_planning_service: Project planning and recommendations
    
    Provides:
    - Project CRUD operations
    - Project context retrieval with 2-hour TTL caching
    - Code generation status tracking
    - Project planning and technology recommendations
    - Project analytics and progress tracking
    
    Requirements:
    - 1.2: Consolidate project services
    - 1.4: Preserve existing functionality
    - 9.4: Cache project context with 2 hour TTL
    """
    
    def __init__(
        self,
        cache: Optional[RedisClient] = None,
        logger_instance: Optional[logging.Logger] = None,
        db_client: Optional[DatabaseConnectionPool] = None
    ):
        super().__init__(cache, logger_instance, db_client)
        self.supabase_client = None  # Will be initialized on first use

    
    async def _get_supabase_client(self):
        """Get or initialize Supabase client"""
        if self.supabase_client is None:
            self.supabase_client = get_db_client()
        return self.supabase_client
    
    # ========== Project CRUD Operations ==========
    
    async def create_project(
        self,
        user_id: str,
        title: str,
        description: str,
        project_type: str,
        difficulty: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a new project.
        
        Args:
            user_id: ID of the user creating the project
            title: Project title
            description: Project description
            project_type: Type of project (iot, robotics, web, etc.)
            difficulty: Difficulty level (beginner, intermediate, advanced)
            **kwargs: Additional project fields
        
        Returns:
            Created project data
        """
        try:
            client = await self._get_supabase_client()
            
            project_data = {
                "user_id": user_id,
                "title": title,
                "description": description,
                "project_type": project_type,
                "difficulty": difficulty,
                "status": kwargs.get("status", "planning"),
                "progress": kwargs.get("progress", 0),
                "created_at": datetime.now(timezone.utc).isoformat(),
                **{k: v for k, v in kwargs.items() if k not in ["status", "progress"]}
            }

            
            result = client.table('projects').insert(project_data).execute()
            
            if result.data:
                self.logger.info(f"Created project {result.data[0]['id']} for user {user_id}")
                return result.data[0]
            
            raise Exception("Failed to create project")
            
        except Exception as e:
            self.logger.error(f"Error creating project: {e}")
            raise
    
    async def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """
        Get project by ID.
        
        Args:
            project_id: Project ID
        
        Returns:
            Project data or None if not found
        """
        try:
            client = await self._get_supabase_client()
            
            result = client.table('projects').select('*').eq('id', project_id).execute()
            
            if result.data:
                return result.data[0]
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error getting project {project_id}: {e}")
            raise

    
    async def update_project(
        self,
        project_id: str,
        updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Update project data.
        
        Args:
            project_id: Project ID
            updates: Dictionary of fields to update
        
        Returns:
            Updated project data or None if not found
        """
        try:
            if not updates:
                raise ValueError("updates cannot be empty")
            
            client = await self._get_supabase_client()
            
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            result = client.table('projects').update(updates).eq('id', project_id).execute()
            
            if result.data:
                # Invalidate cache for this project
                await self.invalidate_cache(f"project:{project_id}:*")
                
                self.logger.info(f"Updated project {project_id}")
                return result.data[0]
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error updating project {project_id}: {e}")
            raise

    
    async def delete_project(self, project_id: str) -> bool:
        """
        Delete a project.
        
        Args:
            project_id: Project ID
        
        Returns:
            True if deleted, False otherwise
        """
        try:
            client = await self._get_supabase_client()
            
            result = client.table('projects').delete().eq('id', project_id).execute()
            
            if result.data:
                # Invalidate all cache for this project
                await self.invalidate_cache(f"project:{project_id}:*")
                
                self.logger.info(f"Deleted project {project_id}")
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error deleting project {project_id}: {e}")
            raise
    
    # ========== Project Context Operations (from project_context_service) ==========
    
    async def get_project_context(
        self, 
        project_id: str, 
        include_ai_suggestions: bool = False
    ) -> Optional[ProjectContext]:
        """
        Get complete project context for AI processing with 2-hour caching.

        Migrated from: project_context_service.getProjectContext
        Enhanced with: files, dependencies, technology_stack, AI suggestions

        Args:
            project_id: ID of the project
            include_ai_suggestions: Whether to enrich context with AI suggestions

        Returns:
            ProjectContext with all project data or None if not found
        """
        try:
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")

            project_id = project_id.strip()


            # Use cache-aside pattern with 2-hour TTL
            cache_key = f"project:{project_id}:context"
            if include_ai_suggestions:
                cache_key += ":enriched"

            async def fetch_context():
                # Fetch project data
                project_data = await self._fetch_project_data(project_id)
                if not project_data:
                    return None

                # Get project tasks
                tasks = await self.get_project_tasks(project_id)

                # Get project milestones
                milestones = await self.get_project_milestones(project_id)

                # Calculate progress
                progress = await self.calculate_progress(project_id)

                # Fetch files associated with the project
                files = await self._fetch_project_files(project_id)

                # Extract dependencies from project data
                dependencies = await self._fetch_project_dependencies(project_id)

                # Get technology stack
                technology_stack = await self._fetch_technology_stack(project_id)

                # Build project context
                context = ProjectContext(
                    project_id=project_id,
                    title=project_data.get("title", "Untitled Project"),
                    description=project_data.get("description", "No description available"),
                    goals=project_data.get("goals", []),
                    current_phase=project_data.get("current_phase", "Planning"),
                    tasks=tasks,
                    milestones=milestones,
                    progress=progress,
                    deadlines=project_data.get("deadlines", []),
                    technology_stack=technology_stack,
                    files=files,
                    dependencies=dependencies
                )

                # Enrich with AI suggestions if requested
                if include_ai_suggestions:
                    context.ai_suggestions = await self._generate_ai_suggestions(context)

                return context

            # Get from cache or fetch with 2-hour TTL
            context = await self.get_cached_or_fetch(
                cache_key,
                fetch_context,
                ttl=timedelta(hours=2)
            )

            if context:
                self.logger.info(
                    f"Retrieved project context for {project_id}"
                    f"{' with AI enrichment' if include_ai_suggestions else ''}"
                )

            return context

        except ValueError as e:
            self.logger.error(f"Validation error getting project context: {e}")
            raise
        except Exception as e:
            self.logger.error(f"Error getting project context for {project_id}: {e}")
            raise


    
    async def get_project_tasks(self, project_id: str) -> List[Task]:
        """
        Get all tasks for a project.
        
        Migrated from: project_context_service.getProjectTasks
        
        Args:
            project_id: ID of the project
        
        Returns:
            List of tasks for the project
        """
        try:
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            
            project_id = project_id.strip()
            
            tasks = await self._fetch_project_tasks(project_id)
            
            self.logger.info(f"Retrieved {len(tasks)} tasks for project {project_id}")
            return tasks
            
        except ValueError as e:
            self.logger.error(f"Validation error getting project tasks: {e}")
            raise
        except Exception as e:
            self.logger.error(f"Error getting tasks for project {project_id}: {e}")
            raise

    
    async def get_project_milestones(self, project_id: str) -> List[Milestone]:
        """
        Get all milestones for a project.
        
        Migrated from: project_context_service.getProjectMilestones
        
        Args:
            project_id: ID of the project
        
        Returns:
            List of milestones for the project
        """
        try:
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            
            project_id = project_id.strip()
            
            milestones = await self._fetch_project_milestones(project_id)
            
            self.logger.info(f"Retrieved {len(milestones)} milestones for project {project_id}")
            return milestones
            
        except ValueError as e:
            self.logger.error(f"Validation error getting project milestones: {e}")
            raise
        except Exception as e:
            self.logger.error(f"Error getting milestones for project {project_id}: {e}")
            raise
    
    async def create_milestone(
        self,
        project_id: str,
        title: str,
        description: str,
        target_date: datetime,
        completed: bool = False
    ) -> Milestone:
        """
        Create a new milestone for a project.
        
        Args:
            project_id: ID of the project
            title: Milestone title
            description: Milestone description
            target_date: Target completion date
            completed: Whether milestone is completed
        
        Returns:
            Created Milestone object
            
        Requirements: 1.2 - Project planning features
        """
        try:
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            if not title or not title.strip():
                raise ValueError("title cannot be empty")
            
            client = await self._get_supabase_client()
            
            milestone_data = {
                "project_id": project_id,
                "title": title.strip(),
                "description": description,
                "target_date": target_date.isoformat(),
                "completed": completed,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            result = client.table('project_milestones').insert(milestone_data).execute()
            
            if result.data:
                # Invalidate project context cache
                await self.invalidate_cache(f"project:{project_id}:*")
                
                milestone = Milestone(
                    title=result.data[0]['title'],
                    description=result.data[0]['description'],
                    target_date=datetime.fromisoformat(result.data[0]['target_date'].replace('Z', '+00:00')),
                    completed=result.data[0]['completed']
                )
                
                self.logger.info(f"Created milestone '{title}' for project {project_id}")
                return milestone
            
            raise Exception("Failed to create milestone")
            
        except ValueError as e:
            self.logger.error(f"Validation error creating milestone: {e}")
            raise
        except Exception as e:
            self.logger.error(f"Error creating milestone: {e}")
            raise
    
    async def update_milestone(
        self,
        project_id: str,
        milestone_id: str,
        updates: Dict[str, Any]
    ) -> bool:
        """
        Update a milestone.
        
        Args:
            project_id: ID of the project
            milestone_id: ID of the milestone
            updates: Dictionary of fields to update
        
        Returns:
            True if updated successfully
            
        Requirements: 1.2 - Project planning features
        """
        try:
            if not updates:
                raise ValueError("updates cannot be empty")
            
            client = await self._get_supabase_client()
            
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            result = client.table('project_milestones').update(updates).eq('id', milestone_id).eq('project_id', project_id).execute()
            
            if result.data:
                # Invalidate project context cache
                await self.invalidate_cache(f"project:{project_id}:*")
                
                self.logger.info(f"Updated milestone {milestone_id} for project {project_id}")
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error updating milestone: {e}")
            raise
    
    async def create_task(
        self,
        project_id: str,
        title: str,
        description: str,
        status: TaskStatus = TaskStatus.PENDING,
        priority: TaskPriority = TaskPriority.MEDIUM,
        due_date: Optional[datetime] = None
    ) -> Task:
        """
        Create a new task for a project.
        
        Args:
            project_id: ID of the project
            title: Task title
            description: Task description
            status: Task status
            priority: Task priority
            due_date: Optional due date
        
        Returns:
            Created Task object
            
        Requirements: 1.2 - Project planning features
        """
        try:
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            if not title or not title.strip():
                raise ValueError("title cannot be empty")
            
            client = await self._get_supabase_client()
            
            task_data = {
                "project_id": project_id,
                "title": title.strip(),
                "description": description,
                "status": status.value,
                "priority": priority.value,
                "due_date": due_date.isoformat() if due_date else None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            result = client.table('project_tasks').insert(task_data).execute()
            
            if result.data:
                # Invalidate project context cache
                await self.invalidate_cache(f"project:{project_id}:*")
                
                task = Task(
                    title=result.data[0]['title'],
                    description=result.data[0]['description'],
                    status=TaskStatus(result.data[0]['status']),
                    priority=TaskPriority(result.data[0]['priority']),
                    due_date=datetime.fromisoformat(result.data[0]['due_date'].replace('Z', '+00:00')) if result.data[0].get('due_date') else None
                )
                
                self.logger.info(f"Created task '{title}' for project {project_id}")
                return task
            
            raise Exception("Failed to create task")
            
        except ValueError as e:
            self.logger.error(f"Validation error creating task: {e}")
            raise
        except Exception as e:
            self.logger.error(f"Error creating task: {e}")
            raise
    
    async def update_task(
        self,
        project_id: str,
        task_id: str,
        updates: Dict[str, Any]
    ) -> bool:
        """
        Update a task.
        
        Args:
            project_id: ID of the project
            task_id: ID of the task
            updates: Dictionary of fields to update
        
        Returns:
            True if updated successfully
            
        Requirements: 1.2 - Project planning features
        """
        try:
            if not updates:
                raise ValueError("updates cannot be empty")
            
            client = await self._get_supabase_client()
            
            # Convert enum values to strings if present
            if 'status' in updates and isinstance(updates['status'], TaskStatus):
                updates['status'] = updates['status'].value
            if 'priority' in updates and isinstance(updates['priority'], TaskPriority):
                updates['priority'] = updates['priority'].value
            
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            result = client.table('project_tasks').update(updates).eq('id', task_id).eq('project_id', project_id).execute()
            
            if result.data:
                # Invalidate project context cache
                await self.invalidate_cache(f"project:{project_id}:*")
                
                self.logger.info(f"Updated task {task_id} for project {project_id}")
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error updating task: {e}")
            raise

    
    async def calculate_progress(self, project_id: str) -> float:
        """
        Calculate overall progress for a project based on tasks and milestones.
        
        Migrated from: project_context_service.calculateProgress
        
        Args:
            project_id: ID of the project
        
        Returns:
            Progress percentage (0.0 to 100.0)
        """
        try:
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            
            project_id = project_id.strip()
            
            tasks = await self.get_project_tasks(project_id)
            milestones = await self.get_project_milestones(project_id)
            
            total_items = len(tasks) + len(milestones)
            if total_items == 0:
                return 0.0
            
            completed_tasks = len([task for task in tasks if task.status == TaskStatus.COMPLETED])
            completed_milestones = len([milestone for milestone in milestones if milestone.completed])
            
            completed_items = completed_tasks + completed_milestones
            progress = (completed_items / total_items) * 100.0
            
            progress = max(0.0, min(100.0, progress))
            
            self.logger.info(f"Calculated progress for project {project_id}: {progress:.1f}%")
            return progress
            
        except ValueError as e:
            self.logger.error(f"Validation error calculating progress: {e}")
            raise
        except Exception as e:
            self.logger.error(f"Error calculating progress for project {project_id}: {e}")
            raise

    
    # ========== Code Generation Status (from enhanced_project_context_service) ==========
    
    async def get_code_generation_status(self, project_id: str) -> CodeGenerationStatus:
        """
        Get code generation status for a project.
        
        Migrated from: enhanced_project_context_service.getCodeGenerationStatus
        
        Args:
            project_id: ID of the project
        
        Returns:
            CodeGenerationStatus object with generation information
        """
        try:
            client = await self._get_supabase_client()
            
            # Get all generations for this project
            generations_result = client.table("generated_code").select(
                "id, status, platform, created_at, completed_at"
            ).eq("project_id", project_id).order("created_at", desc=True).execute()
            
            generations = generations_result.data if generations_result.data else []
            
            total_generations = len(generations)
            has_generated_code = total_generations > 0
            active_generations = len([g for g in generations if g["status"] == "generating"])
            
            last_generation_date = None
            if generations:
                last_generation_date = datetime.fromisoformat(
                    generations[0]["created_at"].replace('Z', '+00:00')
                )
            
            platforms_used = list(set(g["platform"] for g in generations))
            
            recent_generations = []
            for gen in generations[:5]:
                recent_generations.append({
                    "id": gen["id"],
                    "status": gen["status"],
                    "platform": gen["platform"],
                    "created_at": gen["created_at"],
                    "completed_at": gen.get("completed_at")
                })
            
            return CodeGenerationStatus(
                has_generated_code=has_generated_code,
                total_generations=total_generations,
                active_generations=active_generations,
                last_generation_date=last_generation_date,
                platforms_used=platforms_used,
                recent_generations=recent_generations
            )
            
        except Exception as e:
            self.logger.error(f"Error getting code generation status: {e}")
            return CodeGenerationStatus()

    
    # ========== Project Planning (from software_project_planning_service) ==========
    
    async def get_technology_recommendations(
        self,
        project_type: str,
        platforms: List[str],
        complexity: str,
        team_expertise: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get technology stack recommendations with 24-hour caching.
        
        This method wraps _recommend_tech_stack with caching to reduce
        computation for frequently requested technology stacks.
        
        Args:
            project_type: Type of project (web_app, mobile_app, etc.)
            platforms: List of target platforms
            complexity: Project complexity level
            team_expertise: Team expertise level (beginner, intermediate, advanced)
        
        Returns:
            Dict with technology stack recommendations
            
        Requirements: 9.5 - Cache technology stacks (24 hour TTL)
        """
        try:
            # Create cache key from parameters
            cache_key = f"tech_stack:{project_type}:{':'.join(sorted(platforms))}:{complexity}:{team_expertise or 'default'}"
            
            # Define fetch function
            async def fetch_tech_stack():
                return self._recommend_tech_stack(
                    project_type,
                    platforms,
                    complexity,
                    team_expertise
                )
            
            # Get from cache or fetch with 24-hour TTL
            tech_stack = await self.get_cached_or_fetch(
                cache_key,
                fetch_tech_stack,
                ttl=timedelta(hours=24)
            )
            
            self.logger.info(
                f"Retrieved technology recommendations for {project_type} "
                f"on {platforms} with {complexity} complexity"
            )
            
            return tech_stack
            
        except Exception as e:
            self.logger.error(f"Error getting technology recommendations: {e}")
            # Fallback to direct call if caching fails
            return self._recommend_tech_stack(
                project_type,
                platforms,
                complexity,
                team_expertise
            )
    
    async def analyze_requirements(
        self,
        description: str,
        target_platforms: List[str],
        budget: Optional[str] = None,
        timeline: Optional[str] = None,
        team_size: Optional[int] = None,
        team_expertise: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze project requirements and generate comprehensive project plan.
        
        Migrated from: software_project_planning_service.analyze_requirements
        
        Args:
            description: Project description and goals
            target_platforms: List of target platforms
            budget: Budget constraint
            timeline: Timeline constraint
            team_size: Size of development team
            team_expertise: Team expertise level
        
        Returns:
            Dict with project plan recommendations
        """
        self.logger.info(f"Analyzing requirements for project: {description[:100]}...")
        
        try:
            # Determine project type
            project_type = self._determine_project_type(description, target_platforms)
            
            # Extract features
            features = self._extract_features(description, project_type)
            
            # Determine complexity
            complexity = self._assess_complexity(features, target_platforms, description)
            
            # Recommend technology stack with caching (24-hour TTL)
            tech_stack = await self.get_technology_recommendations(
                project_type, 
                target_platforms, 
                complexity, 
                team_expertise
            )
            
            # Estimate timeline and budget
            estimated_timeline = self._estimate_timeline(features, complexity, team_size, team_expertise)
            estimated_budget = self._estimate_budget(complexity, timeline, team_size) if not budget else budget
            
            return {
                "project_type": project_type,
                "platforms": target_platforms,
                "features": [f.to_dict() for f in features],
                "recommended_tech_stack": tech_stack,
                "estimated_timeline": estimated_timeline,
                "estimated_budget": estimated_budget,
                "complexity_level": complexity
            }
            
        except Exception as e:
            self.logger.error(f"Error analyzing requirements: {e}")
            raise
    async def get_technology_recommendations(
        self,
        project_type: str,
        platforms: List[str],
        complexity: str,
        team_expertise: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get technology stack recommendations with 24-hour caching.

        This method wraps _recommend_tech_stack with caching to reduce
        computation for frequently requested technology stacks.

        Args:
            project_type: Type of project (web_app, mobile_app, etc.)
            platforms: List of target platforms
            complexity: Project complexity level
            team_expertise: Team expertise level (beginner, intermediate, advanced)

        Returns:
            Dict with technology stack recommendations

        Requirements: 9.5 - Cache technology stacks (24 hour TTL)
        """
        try:
            # Create cache key from parameters
            cache_key = f"tech_stack:{project_type}:{':'.join(sorted(platforms))}:{complexity}:{team_expertise or 'default'}"

            # Define fetch function
            async def fetch_tech_stack():
                return self._recommend_tech_stack(
                    project_type,
                    platforms,
                    complexity,
                    team_expertise
                )

            # Get from cache or fetch with 24-hour TTL
            tech_stack = await self.get_cached_or_fetch(
                cache_key,
                fetch_tech_stack,
                ttl=timedelta(hours=24)
            )

            self.logger.info(
                f"Retrieved technology recommendations for {project_type} "
                f"on {platforms} with {complexity} complexity"
            )

            return tech_stack

        except Exception as e:
            self.logger.error(f"Error getting technology recommendations: {e}")
            # Fallback to direct call if caching fails
            return self._recommend_tech_stack(
                project_type,
                platforms,
                complexity,
                team_expertise
            )


    
    # ========== Health Check ==========
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Service-specific health check.
        
        Returns:
            Dict with health status information
        """
        base_health = await self.base_health_check()
        
        # Add service-specific checks
        try:
            client = await self._get_supabase_client()
            # Try a simple query to verify database connectivity
            result = client.table('projects').select('id').limit(1).execute()
            base_health["database_query"] = {"healthy": True}
        except Exception as e:
            base_health["database_query"] = {"healthy": False, "error": str(e)}
            base_health["healthy"] = False
        
        return base_health
    
    # ========== Private Helper Methods ==========
    
    async def _fetch_project_data(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Fetch basic project data from database or create mock data"""
        try:
            client = await self._get_supabase_client()
            result = client.table('projects').select('*').eq('id', project_id).execute()
            
            if result.data:
                project_data = result.data[0]
                
                # Convert to expected format
                goals = []
                if project_data.get('skills'):
                    goals.extend([f"Learn {skill}" for skill in project_data['skills'][:3]])
                if project_data.get('components'):
                    goals.append(f"Integrate {len(project_data['components'])} components")
                
                status = project_data.get('status', 'planning')
                progress = project_data.get('progress', 0)
                
                if status == 'completed' or progress == 100:
                    current_phase = "Completed"
                elif status == 'in_progress' or progress > 0:
                    current_phase = "Development"
                else:
                    current_phase = "Planning"
                
                deadlines = []
                if project_data.get('estimated_time'):
                    try:
                        time_str = project_data['estimated_time'].lower()
                        days = 7
                        if 'day' in time_str:
                            days = int(''.join(filter(str.isdigit, time_str))) or 7
                        elif 'week' in time_str:
                            days = (int(''.join(filter(str.isdigit, time_str))) or 1) * 7
                        elif 'month' in time_str:
                            days = (int(''.join(filter(str.isdigit, time_str))) or 1) * 30
                        deadline = datetime.now(timezone.utc) + timedelta(days=days)
                        deadlines.append(deadline)
                    except:
                        deadlines.append(datetime.now(timezone.utc) + timedelta(days=7))
                
                return {
                    "title": project_data.get("title", "Untitled Project"),
                    "description": project_data.get("description", "No description available"),
                    "goals": goals,
                    "current_phase": current_phase,
                    "deadlines": deadlines
                }
            else:
                return self._create_mock_project_data(project_id)
                
        except Exception as e:
            self.logger.warning(f"Error fetching project data for {project_id}: {e}")
            return self._create_mock_project_data(project_id)

    
    def _create_mock_project_data(self, project_id: str) -> Dict[str, Any]:
        """Create mock project data when project is not found in database"""
        return {
            "title": "STEM Project",
            "description": "An innovative STEM project focusing on hands-on learning.",
            "goals": ["Learn fundamental STEM concepts", "Build practical skills", "Complete project successfully"],
            "current_phase": "Planning",
            "deadlines": [datetime.now(timezone.utc) + timedelta(days=14)]
        }
    
    async def _fetch_project_tasks(self, project_id: str) -> List[Task]:
        """Fetch tasks for a project from database"""
        try:
            project_data = await self._fetch_project_data(project_id)
            if not project_data:
                return []
            
            tasks = []
            steps = project_data.get('steps', [])
            progress = project_data.get('progress', 0)
            
            for i, step in enumerate(steps):
                step_lines = step.split('\n', 1)
                title = step_lines[0].strip()
                description = step_lines[1].strip() if len(step_lines) > 1 else ""
                
                import re
                title = re.sub(r'^[📚🎯📐🔌💻🧪🔗🐛📊📦]\s*Phase\s*\d+:\s*', '', title)
                title = re.sub(r'^[📚🎯📐🔌💻🧪🔗🐛📊📦]\s*', '', title)
                
                task_progress_threshold = ((i + 1) / len(steps)) * 100
                if progress >= task_progress_threshold:
                    status = TaskStatus.COMPLETED
                elif progress >= (i / len(steps)) * 100:
                    status = TaskStatus.IN_PROGRESS
                else:
                    status = TaskStatus.PENDING
                
                if i < 3:
                    priority = TaskPriority.HIGH
                elif i < len(steps) - 2:
                    priority = TaskPriority.MEDIUM
                else:
                    priority = TaskPriority.LOW
                
                task = Task(
                    title=title,
                    description=description,
                    status=status,
                    priority=priority,
                    due_date=None
                )
                tasks.append(task)
            
            return tasks
            
        except Exception as e:
            self.logger.error(f"Error fetching tasks for project {project_id}: {e}")
            return []

    
    async def _fetch_project_milestones(self, project_id: str) -> List[Milestone]:
        """Fetch milestones for a project from database"""
        try:
            project_data = await self._fetch_project_data(project_id)
            if not project_data:
                return []
            
            milestones = []
            # Generate basic milestones based on project phase
            current_phase = project_data.get('current_phase', 'Planning')
            
            milestone_templates = [
                ("Project Planning Complete", "All components researched and project plan finalized", 0.2),
                ("Development Started", "Core development phase initiated", 0.4),
                ("Integration Complete", "All components integrated successfully", 0.7),
                ("Testing Complete", "All tests passed and bugs fixed", 0.9),
                ("Project Completion", "Final documentation and deployment completed", 1.0)
            ]
            
            progress = project_data.get('progress', 0) / 100.0
            
            for title, description, threshold in milestone_templates:
                completed = progress >= threshold
                target_date = datetime.now(timezone.utc) + timedelta(days=int(threshold * 30))
                
                milestone = Milestone(
                    title=title,
                    description=description,
                    target_date=target_date,
                    completed=completed
                )
                milestones.append(milestone)
            
            return milestones
            
        except Exception as e:
            self.logger.error(f"Error fetching milestones for project {project_id}: {e}")
            return []

    
    def _determine_project_type(self, description: str, platforms: List[str]) -> str:
        """Determine project type based on description and platforms"""
        desc_lower = description.lower()
        
        if "api" in desc_lower or "backend" in desc_lower:
            return "api"
        elif "microservice" in desc_lower:
            return "microservices"
        elif "mobile" in platforms or "ios" in platforms or "android" in platforms:
            return "mobile_app"
        elif "arduino" in platforms or "iot" in desc_lower:
            return "iot"
        elif "robotics" in desc_lower or "robot" in desc_lower:
            return "robotics"
        elif "web" in platforms:
            return "web_app"
        else:
            return "general"
    
    def _extract_features(self, description: str, project_type: str) -> List[Feature]:
        """Extract features from project description"""
        features = []
        
        # Add basic features based on project type
        if project_type in ["web_app", "mobile_app"]:
            features.append(
                Feature("User Authentication", "Secure user registration and login", "high", 
                       ["Users can register", "Users can login"], 16)
            )
            features.append(
                Feature("User Dashboard", "Personalized dashboard", "high",
                       ["Display user data", "Real-time updates"], 24)
            )
        
        if not features:
            features.append(
                Feature("Core Functionality", "Main application features", "critical",
                       ["Based on project requirements"], 80)
            )
        
        return features

    
    def _assess_complexity(self, features: List[Feature], platforms: List[str], description: str) -> str:
        """Assess project complexity"""
        total_hours = sum(f.estimated_hours or 0 for f in features)
        feature_count = len(features)
        platform_count = len(platforms)
        
        desc_lower = description.lower()
        has_realtime = "realtime" in desc_lower or "websocket" in desc_lower
        has_payment = "payment" in desc_lower
        has_ml = "machine learning" in desc_lower or "ai" in desc_lower
        
        complexity_score = feature_count * 2 + platform_count * 5
        complexity_score += 10 if has_realtime else 0
        complexity_score += 10 if has_payment else 0
        complexity_score += 20 if has_ml else 0
        
        if complexity_score > 50 or total_hours > 300:
            return "enterprise"
        elif complexity_score > 30 or total_hours > 150:
            return "complex"
        elif complexity_score > 15 or total_hours > 80:
            return "moderate"
        else:
            return "simple"
    
    def _recommend_tech_stack(
        self, 
        project_type: str, 
        platforms: List[str], 
        complexity: str, 
        team_expertise: Optional[str]
    ) -> Dict[str, Any]:
        """Recommend technology stack"""
        expertise = team_expertise or "intermediate"
        
        if project_type in ["web_app", "full_stack"]:
            if complexity in ["simple", "moderate"] and expertise in ["beginner", "intermediate"]:
                return {
                    "name": "MERN Stack",
                    "frontend": "React",
                    "backend": "Node.js + Express",
                    "database": "MongoDB",
                    "reasoning": "Popular, JavaScript-based, great for rapid development"
                }
            else:
                return {
                    "name": "React + FastAPI",
                    "frontend": "React + TypeScript",
                    "backend": "Python FastAPI",
                    "database": "PostgreSQL",
                    "reasoning": "Type-safe, high performance, excellent for complex applications"
                }
        
        return {
            "name": "React + Node.js",
            "frontend": "React",
            "backend": "Node.js + Express",
            "database": "PostgreSQL",
            "reasoning": "Versatile, popular, good for most use cases"
        }

    
    def _estimate_timeline(
        self, 
        features: List[Feature], 
        complexity: str, 
        team_size: Optional[int], 
        team_expertise: Optional[str]
    ) -> str:
        """Estimate project timeline"""
        total_hours = sum(f.estimated_hours or 0 for f in features)
        team_size = team_size or 2
        effective_hours = total_hours / team_size
        
        expertise_multiplier = {
            "beginner": 1.5,
            "intermediate": 1.0,
            "advanced": 0.8,
            "expert": 0.6
        }
        multiplier = expertise_multiplier.get(team_expertise or "intermediate", 1.0)
        effective_hours *= multiplier
        
        total_hours_with_buffer = effective_hours * 1.3
        weeks = total_hours_with_buffer / 40
        
        if weeks < 2:
            return "1-2 weeks"
        elif weeks < 4:
            return "2-4 weeks"
        elif weeks < 8:
            return "1-2 months"
        elif weeks < 12:
            return "2-3 months"
        elif weeks < 24:
            return "3-6 months"
        else:
            return "6+ months"
    
    def _estimate_budget(
        self, 
        complexity: str, 
        timeline: Optional[str], 
        team_size: Optional[int]
    ) -> str:
        """Estimate project budget"""
        base_costs = {
            "simple": (5000, 15000),
            "moderate": (15000, 40000),
            "complex": (40000, 100000),
            "enterprise": (100000, 500000)
        }
        
        min_cost, max_cost = base_costs.get(complexity, (10000, 50000))
        
        if team_size and team_size > 3:
            min_cost *= 1.5
            max_cost *= 1.5
        
        return f"${min_cost:,} - ${max_cost:,}"


    async def _fetch_project_files(self, project_id: str) -> List[Dict[str, Any]]:
        """
        Fetch files associated with the project.

        Args:
            project_id: ID of the project

        Returns:
            List of file metadata dictionaries
        """
        try:
            # Try to fetch from Supabase
            supabase = await self._get_supabase_client()
            if supabase:
                response = supabase.table("project_files").select("*").eq("project_id", project_id).execute()
                if response.data:
                    return response.data

            # Return empty list if no files found
            return []

        except Exception as e:
            self.logger.warning(f"Error fetching project files for {project_id}: {e}")
            return []

    async def _fetch_project_dependencies(self, project_id: str) -> List[str]:
        """
        Fetch dependencies for the project.

        Args:
            project_id: ID of the project

        Returns:
            List of dependency names/identifiers
        """
        try:
            # Try to fetch from Supabase
            supabase = await self._get_supabase_client()
            if supabase:
                response = supabase.table("project_dependencies").select("dependency_name").eq("project_id", project_id).execute()
                if response.data:
                    return [dep["dependency_name"] for dep in response.data]

            # Return empty list if no dependencies found
            return []

        except Exception as e:
            self.logger.warning(f"Error fetching project dependencies for {project_id}: {e}")
            return []

    async def _fetch_technology_stack(self, project_id: str) -> List[str]:
        """
        Fetch technology stack for the project.

        Args:
            project_id: ID of the project

        Returns:
            List of technology names
        """
        try:
            # Try to fetch from Supabase
            supabase = await self._get_supabase_client()
            if supabase:
                response = supabase.table("projects").select("technology_stack").eq("id", project_id).execute()
                if response.data and response.data[0].get("technology_stack"):
                    tech_stack = response.data[0]["technology_stack"]
                    # Handle both list and comma-separated string formats
                    if isinstance(tech_stack, list):
                        return tech_stack
                    elif isinstance(tech_stack, str):
                        return [tech.strip() for tech in tech_stack.split(",") if tech.strip()]

            # Return empty list if no technology stack found
            return []

        except Exception as e:
            self.logger.warning(f"Error fetching technology stack for {project_id}: {e}")
            return []

    async def _generate_ai_suggestions(self, context: ProjectContext) -> Dict[str, Any]:
        """
        Generate AI suggestions for project improvement.

        Args:
            context: Current project context

        Returns:
            Dictionary containing AI-generated suggestions
        """
        try:
            suggestions = {
                "next_steps": [],
                "potential_risks": [],
                "optimization_opportunities": [],
                "recommended_resources": []
            }

            # Analyze project progress and suggest next steps
            if context.progress < 25:
                suggestions["next_steps"].append("Complete project planning and requirements gathering")
                suggestions["next_steps"].append("Set up development environment and initial project structure")
            elif context.progress < 50:
                suggestions["next_steps"].append("Implement core features and functionality")
                suggestions["next_steps"].append("Set up testing framework and write initial tests")
            elif context.progress < 75:
                suggestions["next_steps"].append("Complete remaining features and integrations")
                suggestions["next_steps"].append("Conduct thorough testing and bug fixes")
            else:
                suggestions["next_steps"].append("Finalize documentation and deployment preparation")
                suggestions["next_steps"].append("Conduct final testing and quality assurance")

            # Identify potential risks based on project data
            if not context.technology_stack:
                suggestions["potential_risks"].append("No technology stack defined - may lead to inconsistent implementation")

            if not context.milestones:
                suggestions["potential_risks"].append("No milestones defined - difficult to track progress")

            if len(context.tasks) > 50:
                suggestions["potential_risks"].append("Large number of tasks - consider breaking down into smaller sprints")

            # Suggest optimization opportunities
            if context.technology_stack:
                suggestions["optimization_opportunities"].append(
                    f"Consider using modern frameworks and tools compatible with {', '.join(context.technology_stack[:3])}"
                )

            if context.dependencies:
                suggestions["optimization_opportunities"].append(
                    "Review dependencies for security vulnerabilities and updates"
                )

            # Recommend resources based on technology stack
            for tech in context.technology_stack[:5]:
                suggestions["recommended_resources"].append({
                    "technology": tech,
                    "resource_type": "documentation",
                    "description": f"Official {tech} documentation and best practices"
                })

            return suggestions

        except Exception as e:
            self.logger.error(f"Error generating AI suggestions: {e}")
            return {
                "next_steps": [],
                "potential_risks": [],
                "optimization_opportunities": [],
                "recommended_resources": []
            }


    async def _fetch_project_files(self, project_id: str) -> List[Dict[str, Any]]:
        """
        Fetch files associated with the project.
        
        Args:
            project_id: ID of the project
            
        Returns:
            List of file metadata dictionaries
        """
        try:
            # Try to fetch from Supabase
            supabase = await self._get_supabase_client()
            if supabase:
                response = supabase.table("project_files").select("*").eq("project_id", project_id).execute()
                if response.data:
                    return response.data
            
            # Return empty list if no files found
            return []
            
        except Exception as e:
            self.logger.warning(f"Error fetching project files for {project_id}: {e}")
            return []
    
    async def _fetch_project_dependencies(self, project_id: str) -> List[str]:
        """
        Fetch dependencies for the project.
        
        Args:
            project_id: ID of the project
            
        Returns:
            List of dependency names/identifiers
        """
        try:
            # Try to fetch from Supabase
            supabase = await self._get_supabase_client()
            if supabase:
                response = supabase.table("project_dependencies").select("dependency_name").eq("project_id", project_id).execute()
                if response.data:
                    return [dep["dependency_name"] for dep in response.data]
            
            # Return empty list if no dependencies found
            return []
            
        except Exception as e:
            self.logger.warning(f"Error fetching project dependencies for {project_id}: {e}")
            return []
    
    async def _fetch_technology_stack(self, project_id: str) -> List[str]:
        """
        Fetch technology stack for the project.
        
        Args:
            project_id: ID of the project
            
        Returns:
            List of technology names
        """
        try:
            # Try to fetch from Supabase
            supabase = await self._get_supabase_client()
            if supabase:
                response = supabase.table("projects").select("technology_stack").eq("id", project_id).execute()
                if response.data and response.data[0].get("technology_stack"):
                    tech_stack = response.data[0]["technology_stack"]
                    # Handle both list and comma-separated string formats
                    if isinstance(tech_stack, list):
                        return tech_stack
                    elif isinstance(tech_stack, str):
                        return [tech.strip() for tech in tech_stack.split(",") if tech.strip()]
            
            # Return empty list if no technology stack found
            return []
            
        except Exception as e:
            self.logger.warning(f"Error fetching technology stack for {project_id}: {e}")
            return []
    
    async def _generate_ai_suggestions(self, context: ProjectContext) -> Dict[str, Any]:
        """
        Generate AI suggestions for project improvement.
        
        Args:
            context: Current project context
            
        Returns:
            Dictionary containing AI-generated suggestions
        """
        try:
            suggestions = {
                "next_steps": [],
                "potential_risks": [],
                "optimization_opportunities": [],
                "recommended_resources": []
            }
            
            # Analyze project progress and suggest next steps
            if context.progress < 25:
                suggestions["next_steps"].append("Complete project planning and requirements gathering")
                suggestions["next_steps"].append("Set up development environment and initial project structure")
            elif context.progress < 50:
                suggestions["next_steps"].append("Implement core features and functionality")
                suggestions["next_steps"].append("Set up testing framework and write initial tests")
            elif context.progress < 75:
                suggestions["next_steps"].append("Complete remaining features and integrations")
                suggestions["next_steps"].append("Conduct thorough testing and bug fixes")
            else:
                suggestions["next_steps"].append("Finalize documentation and deployment preparation")
                suggestions["next_steps"].append("Conduct final testing and quality assurance")
            
            # Identify potential risks based on project data
            if not context.technology_stack:
                suggestions["potential_risks"].append("No technology stack defined - may lead to inconsistent implementation")
            
            if not context.milestones:
                suggestions["potential_risks"].append("No milestones defined - difficult to track progress")
            
            if len(context.tasks) > 50:
                suggestions["potential_risks"].append("Large number of tasks - consider breaking down into smaller sprints")
            
            # Suggest optimization opportunities
            if context.technology_stack:
                suggestions["optimization_opportunities"].append(
                    f"Consider using modern frameworks and tools compatible with {', '.join(context.technology_stack[:3])}"
                )
            
            if context.dependencies:
                suggestions["optimization_opportunities"].append(
                    "Review dependencies for security vulnerabilities and updates"
                )
            
            # Recommend resources based on technology stack
            for tech in context.technology_stack[:5]:
                suggestions["recommended_resources"].append({
                    "technology": tech,
                    "resource_type": "documentation",
                    "description": f"Official {tech} documentation and best practices"
                })
            
            return suggestions
            
        except Exception as e:
            self.logger.error(f"Error generating AI suggestions: {e}")
            return {
                "next_steps": [],
                "potential_risks": [],
                "optimization_opportunities": [],
                "recommended_resources": []
            }
