# Enhanced Project Context Service with Code Generation Support
# Requirements: 4.2
# Task: 2.5 Update project service to include code generation status

import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from services.project_context_service import ProjectContextService
from database.connection import get_db_client
from models.ai_guidance import ProjectContext

logger = logging.getLogger(__name__)


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


class EnhancedProjectContext(ProjectContext):
    """Extended ProjectContext with code generation information"""
    def __init__(self, *args, **kwargs):
        # Extract code generation status from kwargs
        self.code_generation_status = kwargs.pop('code_generation_status', None)
        super().__init__(*args, **kwargs)


class EnhancedProjectContextService(ProjectContextService):
    """
    Enhanced project context service that includes code generation status
    Extends the base ProjectContextService with code generation capabilities
    """
    
    def __init__(self, client=None):
        super().__init__(client)
    
    async def getProjectContext(self, project_id: str) -> Optional[EnhancedProjectContext]:
        """
        Get complete project context including code generation status
        
        Args:
            project_id: ID of the project
            
        Returns:
            EnhancedProjectContext with project data and code generation status
        """
        try:
            # Get base project context
            base_context = await super().getProjectContext(project_id)
            
            if not base_context:
                return None
            
            # Get code generation status
            code_gen_status = await self.getCodeGenerationStatus(project_id)
            
            # Create enhanced context
            enhanced_context = EnhancedProjectContext(
                project_id=base_context.project_id,
                title=base_context.title,
                description=base_context.description,
                goals=base_context.goals,
                current_phase=base_context.current_phase,
                tasks=base_context.tasks,
                milestones=base_context.milestones,
                progress=base_context.progress,
                deadlines=base_context.deadlines,
                code_generation_status=code_gen_status
            )
            
            return enhanced_context
            
        except Exception as e:
            logger.error(f"Error getting enhanced project context: {e}")
            # Fallback to base context if enhancement fails
            return await super().getProjectContext(project_id)
    
    async def getCodeGenerationStatus(self, project_id: str) -> CodeGenerationStatus:
        """
        Get code generation status for a project
        
        Args:
            project_id: ID of the project
            
        Returns:
            CodeGenerationStatus object with generation information
        """
        try:
            client = await get_db_client()
            
            # Get all generations for this project
            generations_result = client.table("generated_code").select(
                "id, status, platform, created_at, completed_at"
            ).eq("project_id", project_id).order("created_at", desc=True).execute()
            
            generations = generations_result.data if generations_result.data else []
            
            # Calculate status metrics
            total_generations = len(generations)
            has_generated_code = total_generations > 0
            active_generations = len([g for g in generations if g["status"] == "generating"])
            
            # Get last generation date
            last_generation_date = None
            if generations:
                last_generation_date = datetime.fromisoformat(
                    generations[0]["created_at"].replace('Z', '+00:00')
                )
            
            # Get platforms used
            platforms_used = list(set(g["platform"] for g in generations))
            
            # Get recent generations (last 5)
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
            logger.error(f"Error getting code generation status: {e}")
            return CodeGenerationStatus()
    
    async def updateProjectCodeGenerationStats(
        self, 
        project_id: str, 
        generation_id: str,
        status: str
    ) -> bool:
        """
        Update project-level code generation statistics
        
        Args:
            project_id: ID of the project
            generation_id: ID of the generation
            status: New status of the generation
            
        Returns:
            True if update successful, False otherwise
        """
        try:
            client = await get_db_client()
            
            # Get current project data
            project_result = client.table("projects").select(
                "has_generated_code, code_generation_count, last_code_generated_at"
            ).eq("id", project_id).execute()
            
            if not project_result.data:
                logger.warning(f"Project {project_id} not found for stats update")
                return False
            
            project_data = project_result.data[0]
            
            # Update stats based on status
            update_data = {}
            
            if status == "completed":
                # Mark project as having generated code
                update_data["has_generated_code"] = True
                update_data["last_code_generated_at"] = datetime.now(timezone.utc).isoformat()
                
                # Increment generation count if this is a new completion
                current_count = project_data.get("code_generation_count", 0)
                update_data["code_generation_count"] = current_count + 1
            
            elif status == "failed":
                # Don't increment count for failed generations
                # But still mark as having attempted generation
                if not project_data.get("has_generated_code"):
                    update_data["has_generated_code"] = True
            
            # Apply updates if any
            if update_data:
                result = client.table("projects").update(update_data).eq("id", project_id).execute()
                
                if result.data:
                    logger.info(f"Updated project {project_id} code generation stats")
                    return True
                else:
                    logger.warning(f"Failed to update project {project_id} stats")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating project code generation stats: {e}")
            return False
    
    async def getProjectGenerations(
        self, 
        project_id: str, 
        limit: int = 10,
        status_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get code generations for a project
        
        Args:
            project_id: ID of the project
            limit: Maximum number of generations to return
            status_filter: Optional status filter (generating, completed, failed)
            
        Returns:
            List of generation records
        """
        try:
            client = await get_db_client()
            
            # Build query
            query = client.table("generated_code").select(
                "id, status, platform, created_at, completed_at, error_message, metadata"
            ).eq("project_id", project_id)
            
            # Apply status filter if provided
            if status_filter:
                query = query.eq("status", status_filter)
            
            # Apply limit and ordering
            result = query.order("created_at", desc=True).limit(limit).execute()
            
            generations = result.data if result.data else []
            
            # Enhance with file counts
            enhanced_generations = []
            for gen in generations:
                # Get file count for this generation
                files_result = client.table("code_files").select(
                    "id", count="exact"
                ).eq("generated_code_id", gen["id"]).execute()
                
                file_count = files_result.count if hasattr(files_result, 'count') else 0
                
                enhanced_gen = {
                    **gen,
                    "file_count": file_count
                }
                enhanced_generations.append(enhanced_gen)
            
            return enhanced_generations
            
        except Exception as e:
            logger.error(f"Error getting project generations: {e}")
            return []
    
    async def getProjectCodeGenerationSummary(self, project_id: str) -> Dict[str, Any]:
        """
        Get a comprehensive summary of code generation activity for a project
        
        Args:
            project_id: ID of the project
            
        Returns:
            Dictionary with code generation summary
        """
        try:
            # Get code generation status
            status = await self.getCodeGenerationStatus(project_id)
            
            # Get recent generations with details
            recent_generations = await self.getProjectGenerations(project_id, limit=5)
            
            # Calculate additional metrics
            completed_generations = len([g for g in recent_generations if g["status"] == "completed"])
            failed_generations = len([g for g in recent_generations if g["status"] == "failed"])
            
            # Get total file count across all generations
            client = await get_db_client()
            total_files_result = client.table("code_files").select(
                "id", count="exact"
            ).in_(
                "generated_code_id", 
                [g["id"] for g in recent_generations]
            ).execute()
            
            total_files = total_files_result.count if hasattr(total_files_result, 'count') else 0
            
            return {
                "project_id": project_id,
                "has_generated_code": status.has_generated_code,
                "total_generations": status.total_generations,
                "active_generations": status.active_generations,
                "completed_generations": completed_generations,
                "failed_generations": failed_generations,
                "platforms_used": status.platforms_used,
                "total_files_generated": total_files,
                "last_generation_date": status.last_generation_date.isoformat() if status.last_generation_date else None,
                "recent_generations": recent_generations
            }
            
        except Exception as e:
            logger.error(f"Error getting project code generation summary: {e}")
            return {
                "project_id": project_id,
                "error": str(e),
                "has_generated_code": False
            }
    
    async def canGenerateCode(self, project_id: str, user_id: str) -> Dict[str, Any]:
        """
        Check if code generation is allowed for a project
        
        Args:
            project_id: ID of the project
            user_id: ID of the user
            
        Returns:
            Dictionary with permission status and any limitations
        """
        try:
            # Get current generation status
            status = await self.getCodeGenerationStatus(project_id)
            
            # Check for active generations
            if status.active_generations > 0:
                return {
                    "can_generate": False,
                    "reason": "code_generation_in_progress",
                    "message": "Code generation is already in progress for this project",
                    "active_generations": status.active_generations
                }
            
            # Check generation limits (if any)
            # For now, allow unlimited generations
            max_generations_per_project = 10  # Could be configurable
            
            if status.total_generations >= max_generations_per_project:
                return {
                    "can_generate": False,
                    "reason": "generation_limit_reached",
                    "message": f"Maximum of {max_generations_per_project} generations reached for this project",
                    "total_generations": status.total_generations
                }
            
            # Check if project has sufficient information
            project_context = await super().getProjectContext(project_id)
            if not project_context:
                return {
                    "can_generate": False,
                    "reason": "project_not_found",
                    "message": "Project not found or inaccessible"
                }
            
            if not project_context.description or len(project_context.description.strip()) < 10:
                return {
                    "can_generate": False,
                    "reason": "insufficient_project_details",
                    "message": "Project needs more detailed description for code generation"
                }
            
            # All checks passed
            return {
                "can_generate": True,
                "message": "Code generation is available for this project",
                "suggestions": {
                    "recommended_platforms": self._suggestPlatforms(project_context),
                    "estimated_complexity": self._estimateComplexity(project_context)
                }
            }
            
        except Exception as e:
            logger.error(f"Error checking code generation permissions: {e}")
            return {
                "can_generate": False,
                "reason": "permission_check_failed",
                "message": f"Unable to verify code generation permissions: {str(e)}"
            }
    
    def _suggestPlatforms(self, project_context: ProjectContext) -> List[str]:
        """
        Suggest appropriate platforms based on project context
        
        Args:
            project_context: Project context object
            
        Returns:
            List of suggested platform names
        """
        try:
            suggestions = []
            
            # Analyze project description for platform hints
            description_lower = project_context.description.lower()
            title_lower = project_context.title.lower()
            text_to_analyze = f"{title_lower} {description_lower}"
            
            # Platform detection patterns
            if any(word in text_to_analyze for word in ["arduino", "microcontroller", "sensor", "iot"]):
                suggestions.append("arduino")
            
            if any(word in text_to_analyze for word in ["raspberry pi", "linux", "gpio", "python"]):
                suggestions.append("raspberry_pi")
            
            if any(word in text_to_analyze for word in ["web", "website", "html", "browser"]):
                suggestions.append("web")
            
            if any(word in text_to_analyze for word in ["mobile", "app", "android", "ios"]):
                suggestions.append("mobile")
            
            # Default suggestions if no specific platform detected
            if not suggestions:
                suggestions = ["web", "arduino"]  # Most common starting points
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Error suggesting platforms: {e}")
            return ["web"]
    
    def _estimateComplexity(self, project_context: ProjectContext) -> str:
        """
        Estimate project complexity based on context
        
        Args:
            project_context: Project context object
            
        Returns:
            Estimated complexity level (beginner, intermediate, advanced)
        """
        try:
            # Analyze various factors to estimate complexity
            complexity_score = 0
            
            # Description length and detail
            description_length = len(project_context.description)
            if description_length > 500:
                complexity_score += 2
            elif description_length > 200:
                complexity_score += 1
            
            # Number of goals
            if hasattr(project_context, 'goals') and project_context.goals:
                goal_count = len(project_context.goals)
                if goal_count > 5:
                    complexity_score += 2
                elif goal_count > 2:
                    complexity_score += 1
            
            # Task complexity
            if project_context.tasks:
                task_count = len(project_context.tasks)
                if task_count > 10:
                    complexity_score += 2
                elif task_count > 5:
                    complexity_score += 1
            
            # Keyword analysis for complexity indicators
            description_lower = project_context.description.lower()
            
            advanced_keywords = ["algorithm", "machine learning", "ai", "database", "api", "network", "security"]
            intermediate_keywords = ["interface", "integration", "automation", "control", "monitoring"]
            beginner_keywords = ["simple", "basic", "easy", "tutorial", "learning"]
            
            if any(keyword in description_lower for keyword in advanced_keywords):
                complexity_score += 3
            elif any(keyword in description_lower for keyword in intermediate_keywords):
                complexity_score += 1
            elif any(keyword in description_lower for keyword in beginner_keywords):
                complexity_score -= 1
            
            # Determine complexity level
            if complexity_score >= 5:
                return "advanced"
            elif complexity_score >= 2:
                return "intermediate"
            else:
                return "beginner"
                
        except Exception as e:
            logger.error(f"Error estimating complexity: {e}")
            return "intermediate"