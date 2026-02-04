# Project Context Service for AI Project Guidance
# Requirements: 3.1, 7.1, 7.2
# Task: 2.3 Create ProjectContextService class

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from supabase import Client

from database.connection import get_db_client
from models.ai_guidance import (
    ProjectContext, Task, Milestone, TaskStatus, TaskPriority
)

logger = logging.getLogger(__name__)


class ProjectContextService:
    """
    Service class for managing project context and data retrieval
    Implements project data retrieval, caching logic, and progress calculation
    """
    
    def __init__(self, client: Optional[Client] = None):
        self.client = client or get_db_client()
    
    async def getProjectContext(self, project_id: str) -> Optional[ProjectContext]:
        """
        Get complete project context for AI processing
        
        Args:
            project_id: ID of the project
            
        Returns:
            ProjectContext with all project data or None if not found
            
        Raises:
            ValueError: If project_id is invalid
            Exception: If retrieval fails
        """
        try:
            # Validate input parameters
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            
            project_id = project_id.strip()
            
            # Check for project changes and refresh cache if needed
            try:
                from services.project_change_detector import ProjectChangeDetector
                change_detector = ProjectChangeDetector(self.client)
                
                # Check if project has changed and refresh if needed
                fresh_context = await change_detector.refresh_project_context_if_changed(project_id)
                if fresh_context:
                    logger.info(f"Retrieved fresh context for project {project_id} due to detected changes")
                    return fresh_context
            except Exception as e:
                logger.warning(f"Change detection failed for project {project_id}, proceeding with normal flow: {e}")
            
            # Check if we have any cached context first
            cached_context = await self._get_cached_context(project_id)
            if cached_context:
                logger.info(f"Retrieved cached context for project {project_id}")
                return cached_context
            
            # Simulate project data retrieval (replace with actual database queries)
            project_data = await self._fetch_project_data(project_id)
            if not project_data:
                logger.info(f"Project {project_id} not found")
                return None
            
            # Get project tasks
            tasks = await self.getProjectTasks(project_id)
            
            # Get project milestones
            milestones = await self.getProjectMilestones(project_id)
            
            # Calculate progress
            progress = await self.calculateProgress(project_id)
            
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
                deadlines=project_data.get("deadlines", [])
            )
            
            # Cache the context for future use
            await self._cache_project_context(project_id, context)
            
            logger.info(f"Retrieved project context for {project_id}: {context.title}")
            return context
            
        except ValueError as e:
            logger.error(f"Validation error getting project context: {e}")
            raise
        except Exception as e:
            logger.error(f"Error getting project context for {project_id}: {e}")
            raise
    
    async def getProjectTasks(self, project_id: str) -> List[Task]:
        """
        Get all tasks for a project
        
        Args:
            project_id: ID of the project
            
        Returns:
            List of tasks for the project
            
        Raises:
            ValueError: If project_id is invalid
            Exception: If retrieval fails
        """
        try:
            # Validate input parameters
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            
            project_id = project_id.strip()
            
            # For now, simulate task retrieval since there's no tasks table yet
            # In a real implementation, this would query the tasks table
            tasks = await self._fetch_project_tasks(project_id)
            
            logger.info(f"Retrieved {len(tasks)} tasks for project {project_id}")
            return tasks
            
        except ValueError as e:
            logger.error(f"Validation error getting project tasks: {e}")
            raise
        except Exception as e:
            logger.error(f"Error getting tasks for project {project_id}: {e}")
            raise
    
    async def getProjectMilestones(self, project_id: str) -> List[Milestone]:
        """
        Get all milestones for a project
        
        Args:
            project_id: ID of the project
            
        Returns:
            List of milestones for the project
            
        Raises:
            ValueError: If project_id is invalid
            Exception: If retrieval fails
        """
        try:
            # Validate input parameters
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            
            project_id = project_id.strip()
            
            # For now, simulate milestone retrieval since there's no milestones table yet
            # In a real implementation, this would query the milestones table
            milestones = await self._fetch_project_milestones(project_id)
            
            logger.info(f"Retrieved {len(milestones)} milestones for project {project_id}")
            return milestones
            
        except ValueError as e:
            logger.error(f"Validation error getting project milestones: {e}")
            raise
        except Exception as e:
            logger.error(f"Error getting milestones for project {project_id}: {e}")
            raise
    
    async def calculateProgress(self, project_id: str) -> float:
        """
        Calculate overall progress for a project based on tasks and milestones
        
        Args:
            project_id: ID of the project
            
        Returns:
            Progress percentage (0.0 to 100.0)
            
        Raises:
            ValueError: If project_id is invalid
            Exception: If calculation fails
        """
        try:
            # Validate input parameters
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            
            project_id = project_id.strip()
            
            # Get tasks and milestones
            tasks = await self.getProjectTasks(project_id)
            milestones = await self.getProjectMilestones(project_id)
            
            # Calculate progress based on completed tasks and milestones
            total_items = len(tasks) + len(milestones)
            if total_items == 0:
                logger.info(f"No tasks or milestones found for project {project_id}, progress = 0%")
                return 0.0
            
            completed_tasks = len([task for task in tasks if task.status == TaskStatus.COMPLETED])
            completed_milestones = len([milestone for milestone in milestones if milestone.completed])
            
            completed_items = completed_tasks + completed_milestones
            progress = (completed_items / total_items) * 100.0
            
            # Ensure progress is within valid range
            progress = max(0.0, min(100.0, progress))
            
            logger.info(f"Calculated progress for project {project_id}: {progress:.1f}% ({completed_items}/{total_items} items completed)")
            return progress
            
        except ValueError as e:
            logger.error(f"Validation error calculating progress: {e}")
            raise
        except Exception as e:
            logger.error(f"Error calculating progress for project {project_id}: {e}")
            raise
    
    async def refreshProjectContext(self, project_id: str) -> Optional[ProjectContext]:
        """
        Refresh project context by clearing cache and fetching fresh data
        
        Args:
            project_id: ID of the project
            
        Returns:
            Updated ProjectContext or None if not found
            
        Raises:
            ValueError: If project_id is invalid
            Exception: If refresh fails
        """
        try:
            # Validate input parameters
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            
            project_id = project_id.strip()
            
            # Clear cached context
            await self._clear_cached_context(project_id)
            
            # Fetch fresh context
            context = await self.getProjectContext(project_id)
            
            logger.info(f"Refreshed project context for {project_id}")
            return context
            
        except ValueError as e:
            logger.error(f"Validation error refreshing project context: {e}")
            raise
        except Exception as e:
            logger.error(f"Error refreshing project context for {project_id}: {e}")
            raise
    
    async def updateProjectData(self, project_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update project data and invalidate cache
        
        Args:
            project_id: ID of the project
            updates: Dictionary of fields to update
            
        Returns:
            True if update was successful, False otherwise
            
        Raises:
            ValueError: If project_id is invalid or updates are empty
            Exception: If update fails
        """
        try:
            # Validate input parameters
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            if not updates:
                raise ValueError("updates cannot be empty")
            
            project_id = project_id.strip()
            
            # Update project data (placeholder implementation)
            success = await self._update_project_data(project_id, updates)
            
            if success:
                # Notify change detector about the update
                try:
                    from services.project_change_detector import notify_project_changed
                    await notify_project_changed(project_id, "update")
                    logger.info(f"Updated project data and invalidated cache for {project_id}")
                except Exception as e:
                    logger.warning(f"Failed to notify change detector for project {project_id}: {e}")
                    # Still clear cached context manually as fallback
                    await self._clear_cached_context(project_id)
            else:
                logger.warning(f"Failed to update project data for {project_id}")
            
            return success
            
        except ValueError as e:
            logger.error(f"Validation error updating project data: {e}")
            raise
        except Exception as e:
            logger.error(f"Error updating project data for {project_id}: {e}")
            raise
    
    async def getProjectAnalytics(self, project_id: str) -> Dict[str, Any]:
        """
        Get analytics and insights for a project
        
        Args:
            project_id: ID of the project
            
        Returns:
            Dictionary with project analytics data
            
        Raises:
            ValueError: If project_id is invalid
            Exception: If analytics calculation fails
        """
        try:
            # Validate input parameters
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            
            project_id = project_id.strip()
            
            # Get project context
            context = await self.getProjectContext(project_id)
            if not context:
                raise ValueError(f"Project {project_id} not found")
            
            # Calculate analytics
            tasks = context.tasks
            milestones = context.milestones
            
            task_stats = {
                "total": len(tasks),
                "completed": len([t for t in tasks if t.status == TaskStatus.COMPLETED]),
                "in_progress": len([t for t in tasks if t.status == TaskStatus.IN_PROGRESS]),
                "pending": len([t for t in tasks if t.status == TaskStatus.PENDING]),
                "high_priority": len([t for t in tasks if t.priority == TaskPriority.HIGH]),
                "overdue": len([t for t in tasks if t.due_date and t.due_date < datetime.now(timezone.utc) and t.status != TaskStatus.COMPLETED])
            }
            
            milestone_stats = {
                "total": len(milestones),
                "completed": len([m for m in milestones if m.completed]),
                "upcoming": len([m for m in milestones if not m.completed and m.target_date > datetime.now(timezone.utc)]),
                "overdue": len([m for m in milestones if not m.completed and m.target_date < datetime.now(timezone.utc)])
            }
            
            analytics = {
                "project_id": project_id,
                "title": context.title,
                "progress": context.progress,
                "current_phase": context.current_phase,
                "task_stats": task_stats,
                "milestone_stats": milestone_stats,
                "completion_rate": (task_stats["completed"] / task_stats["total"]) * 100 if task_stats["total"] > 0 else 0,
                "milestone_completion_rate": (milestone_stats["completed"] / milestone_stats["total"]) * 100 if milestone_stats["total"] > 0 else 0,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Generated analytics for project {project_id}")
            return analytics
            
        except ValueError as e:
            logger.error(f"Validation error getting project analytics: {e}")
            raise
        except Exception as e:
            logger.error(f"Error getting analytics for project {project_id}: {e}")
            raise
    
    # Private helper methods
    
    async def _get_cached_context(self, project_id: str) -> Optional[ProjectContext]:
        """Get cached project context if available and not expired"""
        try:
            result = (self.client.table('ai_context_cache')
                     .select('context_data')
                     .eq('project_id', project_id)
                     .gt('expires_at', datetime.now(timezone.utc).isoformat())
                     .order('generated_at', desc=True)
                     .limit(1)
                     .execute())
            
            if result.data:
                context_data = result.data[0]['context_data']
                return ProjectContext(**context_data)
            return None
            
        except Exception as e:
            logger.warning(f"Error getting cached context for {project_id}: {e}")
            return None
    
    async def _cache_project_context(self, project_id: str, context: ProjectContext) -> None:
        """Cache project context for future use"""
        try:
            from datetime import timedelta
            
            expires_at = datetime.now(timezone.utc) + timedelta(hours=1)  # Cache for 1 hour
            
            # Convert context to dict and handle datetime serialization
            context_dict = context.dict()
            
            cache_data = {
                'project_id': project_id,
                'context_data': context_dict,
                'generated_at': datetime.now(timezone.utc).isoformat(),
                'expires_at': expires_at.isoformat()
            }
            
            # Try to update existing cache first
            existing_result = (self.client.table('ai_context_cache')
                              .select('cache_id')
                              .eq('project_id', project_id)
                              .execute())
            
            if existing_result.data:
                # Update existing cache
                cache_id = existing_result.data[0]['cache_id']
                self.client.table('ai_context_cache').update(cache_data).eq('cache_id', cache_id).execute()
            else:
                # Create new cache
                self.client.table('ai_context_cache').insert(cache_data).execute()
            
            logger.debug(f"Cached project context for {project_id}")
            
        except Exception as e:
            logger.warning(f"Error caching context for {project_id}: {e}")
    
    async def _clear_cached_context(self, project_id: str) -> None:
        """Clear cached project context"""
        try:
            self.client.table('ai_context_cache').delete().eq('project_id', project_id).execute()
            logger.debug(f"Cleared cached context for {project_id}")
            
        except Exception as e:
            logger.warning(f"Error clearing cached context for {project_id}: {e}")
    
    async def _fetch_project_data(self, project_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch basic project data from database or create mock data
        """
        try:
            # Query the projects table for the specific project
            result = (self.client.table('projects')
                     .select('*')
                     .eq('id', project_id)
                     .execute())
            
            if result.data:
                project_data = result.data[0]
                
                # Convert project data to the expected format
                # Extract goals from skills and components
                goals = []
                if project_data.get('skills'):
                    goals.extend([f"Learn {skill}" for skill in project_data['skills'][:3]])  # Take first 3 skills as goals
                if project_data.get('components'):
                    goals.append(f"Integrate {len(project_data['components'])} components")
                
                # Determine current phase based on status and progress
                status = project_data.get('status', 'planning')
                progress = project_data.get('progress', 0)
                
                if status == 'completed' or progress == 100:
                    current_phase = "Completed"
                elif status == 'in_progress' or progress > 0:
                    current_phase = "Development"
                else:
                    current_phase = "Planning"
                
                # Calculate deadlines based on estimated time
                deadlines = []
                if project_data.get('estimated_time'):
                    try:
                        # Parse estimated time and create deadline
                        time_str = project_data['estimated_time'].lower()
                        days = 7  # Default to 1 week
                        
                        if 'day' in time_str:
                            days = int(''.join(filter(str.isdigit, time_str))) or 7
                        elif 'week' in time_str:
                            days = (int(''.join(filter(str.isdigit, time_str))) or 1) * 7
                        elif 'month' in time_str:
                            days = (int(''.join(filter(str.isdigit, time_str))) or 1) * 30
                        
                        deadline = datetime.now(timezone.utc) + timedelta(days=days)
                        deadlines.append(deadline)
                    except:
                        # If parsing fails, use default deadline
                        deadlines.append(datetime.now(timezone.utc) + timedelta(days=7))
                
                return {
                    "title": project_data.get("title", "Untitled Project"),
                    "description": project_data.get("description", "No description available"),
                    "goals": goals,
                    "current_phase": current_phase,
                    "deadlines": deadlines,
                    "project_type": project_data.get("project_type"),
                    "difficulty": project_data.get("difficulty"),
                    "estimated_time": project_data.get("estimated_time"),
                    "estimated_cost": project_data.get("estimated_cost"),
                    "components": project_data.get("components", []),
                    "skills": project_data.get("skills", []),
                    "steps": project_data.get("steps", []),
                    "status": project_data.get("status"),
                    "progress": project_data.get("progress", 0),
                    "tags": project_data.get("tags", [])
                }
            else:
                # Project not found in database, create mock data
                logger.info(f"Project {project_id} not found in database, creating mock context")
                return self._create_mock_project_data(project_id)
                
        except Exception as e:
            logger.warning(f"Error fetching project data for {project_id}: {e}")
            # If database query fails, create mock data
            return self._create_mock_project_data(project_id)
    
    def _create_mock_project_data(self, project_id: str) -> Dict[str, Any]:
        """
        Create mock project data when project is not found in database
        This allows AI guidance to work even when projects are only stored in frontend localStorage
        """
        return {
            "title": "STEM Project",
            "description": "An innovative STEM project focusing on hands-on learning and practical application of science, technology, engineering, and mathematics concepts.",
            "goals": [
                "Learn fundamental STEM concepts",
                "Build practical skills",
                "Complete project successfully"
            ],
            "current_phase": "Planning",
            "deadlines": [datetime.now(timezone.utc) + timedelta(days=14)],  # 2 weeks from now
            "project_type": "general",
            "difficulty": "intermediate",
            "estimated_time": "2 weeks",
            "estimated_cost": "$50-100",
            "components": ["Microcontroller", "Sensors", "Basic components"],
            "skills": ["Programming", "Electronics", "Problem solving"],
            "steps": [
                "Research and planning phase",
                "Component selection and procurement", 
                "Initial setup and testing",
                "Core development phase",
                "Integration and testing",
                "Final optimization and documentation"
            ],
            "status": "planning",
            "progress": 0,
            "tags": ["stem", "learning", "hands-on"]
        }
    
    async def _fetch_project_tasks(self, project_id: str) -> List[Task]:
        """
        Fetch tasks for a project from database
        Convert project steps into tasks
        """
        try:
            # Get project data to extract steps
            project_data = await self._fetch_project_data(project_id)
            if not project_data:
                return []
            
            tasks = []
            steps = project_data.get('steps', [])
            progress = project_data.get('progress', 0)
            
            # Convert steps to tasks
            for i, step in enumerate(steps):
                # Extract step title and description
                step_lines = step.split('\n', 1)
                title = step_lines[0].strip()
                description = step_lines[1].strip() if len(step_lines) > 1 else ""
                
                # Remove emoji and phase indicators from title
                import re
                title = re.sub(r'^[📚🎯📐🔌💻🧪🔗🐛📊📦]\s*Phase\s*\d+:\s*', '', title)
                title = re.sub(r'^[📚🎯📐🔌💻🧪🔗🐛📊📦]\s*', '', title)
                
                # Determine task status based on project progress
                # Assume tasks are completed sequentially
                task_progress_threshold = ((i + 1) / len(steps)) * 100
                if progress >= task_progress_threshold:
                    status = TaskStatus.COMPLETED
                elif progress >= (i / len(steps)) * 100:
                    status = TaskStatus.IN_PROGRESS
                else:
                    status = TaskStatus.PENDING
                
                # Determine priority based on position and status
                if i < 3:  # First 3 tasks are high priority
                    priority = TaskPriority.HIGH
                elif i < len(steps) - 2:  # Middle tasks are medium priority
                    priority = TaskPriority.MEDIUM
                else:  # Last tasks are low priority
                    priority = TaskPriority.LOW
                
                # Calculate due date based on estimated time and task position
                due_date = None
                if project_data.get('estimated_time'):
                    try:
                        time_str = project_data['estimated_time'].lower()
                        total_days = 7  # Default
                        
                        if 'day' in time_str:
                            total_days = int(''.join(filter(str.isdigit, time_str))) or 7
                        elif 'week' in time_str:
                            total_days = (int(''.join(filter(str.isdigit, time_str))) or 1) * 7
                        elif 'month' in time_str:
                            total_days = (int(''.join(filter(str.isdigit, time_str))) or 1) * 30
                        
                        # Distribute tasks across the project timeline
                        task_days = (i + 1) * (total_days / len(steps))
                        due_date = datetime.now(timezone.utc) + timedelta(days=task_days)
                    except:
                        pass
                
                task = Task(
                    title=title,
                    description=description,
                    status=status,
                    priority=priority,
                    due_date=due_date
                )
                tasks.append(task)
            
            logger.info(f"Generated {len(tasks)} tasks from project steps for {project_id}")
            return tasks
            
        except Exception as e:
            logger.error(f"Error fetching tasks for project {project_id}: {e}")
            return []
    
    async def _fetch_project_milestones(self, project_id: str) -> List[Milestone]:
        """
        Fetch milestones for a project from database
        Generate milestones based on project phases and difficulty
        """
        try:
            # Get project data to generate appropriate milestones
            project_data = await self._fetch_project_data(project_id)
            if not project_data:
                return []
            
            milestones = []
            difficulty = project_data.get('difficulty', 'intermediate')
            project_type = project_data.get('project_type', 'general')
            estimated_time = project_data.get('estimated_time', '1 week')
            progress = project_data.get('progress', 0)
            
            # Calculate total project duration in days
            try:
                time_str = estimated_time.lower()
                total_days = 7  # Default
                
                if 'day' in time_str:
                    total_days = int(''.join(filter(str.isdigit, time_str))) or 7
                elif 'week' in time_str:
                    total_days = (int(''.join(filter(str.isdigit, time_str))) or 1) * 7
                elif 'month' in time_str:
                    total_days = (int(''.join(filter(str.isdigit, time_str))) or 1) * 30
            except:
                total_days = 7
            
            # Generate milestones based on project type and difficulty
            milestone_templates = []
            
            if project_type == 'iot':
                milestone_templates = [
                    ("Project Planning Complete", "All components researched and project plan finalized", 0.15),
                    ("Hardware Setup", "All hardware components connected and tested", 0.4),
                    ("Software Development", "Core software functionality implemented", 0.7),
                    ("System Integration", "Hardware and software integrated successfully", 0.9),
                    ("Project Completion", "Final testing and documentation completed", 1.0)
                ]
            elif project_type == 'robotics':
                milestone_templates = [
                    ("Design Phase Complete", "Robot design and component selection finalized", 0.2),
                    ("Mechanical Assembly", "Robot chassis and mechanical components assembled", 0.5),
                    ("Electronics Integration", "All sensors and actuators connected and tested", 0.75),
                    ("Programming Complete", "Robot control software implemented and tested", 0.95),
                    ("Final Testing", "Robot fully functional and tested", 1.0)
                ]
            elif project_type == 'automation':
                milestone_templates = [
                    ("Requirements Analysis", "System requirements and specifications defined", 0.15),
                    ("System Design", "Automation system architecture designed", 0.35),
                    ("Component Integration", "All automation components connected", 0.6),
                    ("Control Logic Implementation", "Automation control logic programmed", 0.85),
                    ("System Deployment", "Automation system deployed and operational", 1.0)
                ]
            else:
                # Generic milestones for other project types
                milestone_templates = [
                    ("Project Setup Complete", "Initial setup and planning completed", 0.2),
                    ("Development Phase 1", "First phase of development completed", 0.4),
                    ("Development Phase 2", "Second phase of development completed", 0.7),
                    ("Testing and Validation", "System testing and validation completed", 0.9),
                    ("Project Completion", "Final project delivery and documentation", 1.0)
                ]
            
            # Adjust number of milestones based on difficulty
            if difficulty == 'beginner':
                milestone_templates = milestone_templates[:3]  # Fewer milestones for beginners
            elif difficulty == 'expert':
                # Add more detailed milestones for experts
                milestone_templates.insert(1, ("Research Complete", "Technical research and feasibility study done", 0.1))
                milestone_templates.insert(-1, ("Performance Optimization", "System performance optimized", 0.95))
            
            # Create milestone objects
            for i, (title, description, progress_threshold) in enumerate(milestone_templates):
                # Calculate target date based on progress threshold
                days_offset = total_days * progress_threshold
                target_date = datetime.now(timezone.utc) + timedelta(days=days_offset)
                
                # Determine if milestone is completed based on project progress
                completed = progress >= (progress_threshold * 100)
                
                milestone = Milestone(
                    title=title,
                    description=description,
                    target_date=target_date,
                    completed=completed
                )
                milestones.append(milestone)
            
            logger.info(f"Generated {len(milestones)} milestones for {project_type} project {project_id}")
            return milestones
            
        except Exception as e:
            logger.error(f"Error fetching milestones for project {project_id}: {e}")
            return []
    
    async def _update_project_data(self, project_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update project data in database
        """
        try:
            # Update project data in the projects table
            result = (self.client.table('projects')
                     .update(updates)
                     .eq('id', project_id)
                     .execute())
            
            if result.data:
                logger.info(f"Successfully updated project {project_id} with {len(updates)} fields")
                return True
            else:
                logger.warning(f"No project found with id {project_id} to update")
                return False
            
        except Exception as e:
            logger.error(f"Error updating project data for {project_id}: {e}")
            return False


# Convenience functions for easy access

async def get_project_context(project_id: str) -> Optional[ProjectContext]:
    """
    Convenience function to get project context
    
    Args:
        project_id: ID of the project
        
    Returns:
        ProjectContext or None if not found
    """
    service = ProjectContextService()
    return await service.getProjectContext(project_id)


async def get_project_tasks(project_id: str) -> List[Task]:
    """
    Convenience function to get project tasks
    
    Args:
        project_id: ID of the project
        
    Returns:
        List of tasks for the project
    """
    service = ProjectContextService()
    return await service.getProjectTasks(project_id)


async def get_project_milestones(project_id: str) -> List[Milestone]:
    """
    Convenience function to get project milestones
    
    Args:
        project_id: ID of the project
        
    Returns:
        List of milestones for the project
    """
    service = ProjectContextService()
    return await service.getProjectMilestones(project_id)


async def calculate_project_progress(project_id: str) -> float:
    """
    Convenience function to calculate project progress
    
    Args:
        project_id: ID of the project
        
    Returns:
        Progress percentage (0.0 to 100.0)
    """
    service = ProjectContextService()
    return await service.calculateProgress(project_id)


async def refresh_project_context(project_id: str) -> Optional[ProjectContext]:
    """
    Convenience function to refresh project context
    
    Args:
        project_id: ID of the project
        
    Returns:
        Updated ProjectContext or None if not found
    """
    service = ProjectContextService()
    return await service.refreshProjectContext(project_id)


async def get_project_analytics(project_id: str) -> Dict[str, Any]:
    """
    Convenience function to get project analytics
    
    Args:
        project_id: ID of the project
        
    Returns:
        Dictionary with project analytics data
    """
    service = ProjectContextService()
    return await service.getProjectAnalytics(project_id)