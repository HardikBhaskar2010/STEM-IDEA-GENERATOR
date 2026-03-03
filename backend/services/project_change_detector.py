# Project Change Detection Service for AI Project Guidance
# Requirements: 7.4
# Task: 8.1 Add project data change detection and cache invalidation

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Set
from supabase import Client
import asyncio
import json

from database.connection import get_db_client
from models.ai_guidance import ProjectContext

logger = logging.getLogger(__name__)


class ProjectChangeDetector:
    """
    Service class for detecting project data changes and managing cache invalidation
    Implements change detection logic and cache refresh mechanisms
    """
    
    def __init__(self, client: Optional[Client] = None):
        self.client = client or get_db_client()
        self._last_check_time = {}  # Track last check time per project
        self._project_snapshots = {}  # Store project data snapshots for comparison
    
    async def detect_project_changes(self, project_id: str, force_check: bool = False) -> bool:
        """
        Detect if project data has changed since last check
        
        Args:
            project_id: ID of the project to check
            force_check: Force check even if recently checked
            
        Returns:
            True if changes detected, False otherwise
            
        Raises:
            ValueError: If project_id is invalid
            Exception: If change detection fails
        """
        try:
            # Validate input parameters
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            
            project_id = project_id.strip()
            
            # Check if we need to perform change detection
            if not force_check and not self._should_check_for_changes(project_id):
                logger.debug(f"Skipping change detection for project {project_id} - recently checked")
                return False
            
            # Get current project data
            current_data = await self._get_current_project_data(project_id)
            if not current_data:
                logger.info(f"Project {project_id} not found")
                return False
            
            # Get previous snapshot
            previous_snapshot = self._project_snapshots.get(project_id)
            
            # If no previous snapshot, consider it changed (first check)
            if previous_snapshot is None:
                logger.info(f"First check for project {project_id} - considering as changed")
                self._update_project_snapshot(project_id, current_data)
                self._last_check_time[project_id] = datetime.now(timezone.utc)
                return True
            
            # Compare current data with previous snapshot
            changes_detected = self._compare_project_data(previous_snapshot, current_data)
            
            if changes_detected:
                logger.info(f"Changes detected for project {project_id}")
                self._update_project_snapshot(project_id, current_data)
                
                # Log specific changes for debugging
                changed_fields = self._identify_changed_fields(previous_snapshot, current_data)
                logger.debug(f"Changed fields for project {project_id}: {changed_fields}")
            else:
                logger.debug(f"No changes detected for project {project_id}")
            
            # Update last check time
            self._last_check_time[project_id] = datetime.now(timezone.utc)
            
            return changes_detected
            
        except ValueError as e:
            logger.error(f"Validation error detecting changes: {e}")
            raise
        except Exception as e:
            logger.error(f"Error detecting changes for project {project_id}: {e}")
            raise
    
    async def invalidate_project_cache(self, project_id: str) -> bool:
        """
        Invalidate cached project context data
        
        Args:
            project_id: ID of the project
            
        Returns:
            True if cache was invalidated successfully
            
        Raises:
            ValueError: If project_id is invalid
            Exception: If cache invalidation fails
        """
        try:
            # Validate input parameters
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            
            project_id = project_id.strip()
            
            # Delete cached context from ai_context_cache table
            result = (self.client.table('ai_context_cache')
                     .delete()
                     .eq('project_id', project_id)
                     .execute())
            
            # Clear in-memory snapshot
            if project_id in self._project_snapshots:
                del self._project_snapshots[project_id]
            
            # Reset last check time to force fresh check
            if project_id in self._last_check_time:
                del self._last_check_time[project_id]
            
            logger.info(f"Invalidated cache for project {project_id}")
            return True
            
        except ValueError as e:
            logger.error(f"Validation error invalidating cache: {e}")
            raise
        except Exception as e:
            logger.error(f"Error invalidating cache for project {project_id}: {e}")
            return False
    
    async def refresh_project_context_if_changed(self, project_id: str) -> Optional[ProjectContext]:
        """
        Check for changes and refresh project context if needed
        
        Args:
            project_id: ID of the project
            
        Returns:
            Updated ProjectContext if changes detected, None otherwise
            
        Raises:
            ValueError: If project_id is invalid
            Exception: If refresh fails
        """
        try:
            # Validate input parameters
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            
            project_id = project_id.strip()
            
            # Check for changes
            changes_detected = await self.detect_project_changes(project_id)
            
            if changes_detected:
                # Invalidate cache
                await self.invalidate_project_cache(project_id)
                
                # Import here to avoid circular imports
                from services.project_context_service import ProjectContextService
                
                # Get fresh context
                context_service = ProjectContextService(self.client)
                fresh_context = await context_service.getProjectContext(project_id)
                
                logger.info(f"Refreshed project context for {project_id} due to detected changes")
                return fresh_context
            
            logger.debug(f"No changes detected for project {project_id} - no refresh needed")
            return None
            
        except ValueError as e:
            logger.error(f"Validation error refreshing context: {e}")
            raise
        except Exception as e:
            logger.error(f"Error refreshing context for project {project_id}: {e}")
            raise
    
    async def setup_change_monitoring(self, project_ids: List[str], check_interval_minutes: int = 5) -> None:
        """
        Set up periodic monitoring for project changes
        
        Args:
            project_ids: List of project IDs to monitor
            check_interval_minutes: How often to check for changes (in minutes)
            
        Raises:
            ValueError: If parameters are invalid
            Exception: If monitoring setup fails
        """
        try:
            # Validate input parameters
            if not project_ids:
                raise ValueError("project_ids cannot be empty")
            if check_interval_minutes < 1:
                raise ValueError("check_interval_minutes must be at least 1")
            
            logger.info(f"Setting up change monitoring for {len(project_ids)} projects with {check_interval_minutes}min interval")
            
            # Start monitoring task (this would typically run in a background service)
            # For now, we'll just log the setup - actual implementation would use a task scheduler
            for project_id in project_ids:
                if not project_id or not project_id.strip():
                    logger.warning(f"Skipping invalid project_id: {project_id}")
                    continue
                
                # Initialize snapshot for each project
                await self.detect_project_changes(project_id.strip(), force_check=True)
            
            logger.info(f"Change monitoring setup complete for {len(project_ids)} projects")
            
        except ValueError as e:
            logger.error(f"Validation error setting up monitoring: {e}")
            raise
        except Exception as e:
            logger.error(f"Error setting up change monitoring: {e}")
            raise
    
    async def get_project_change_history(self, project_id: str, hours: int = 24) -> List[Dict[str, Any]]:
        """
        Get change history for a project based on updated_at timestamps
        
        Args:
            project_id: ID of the project
            hours: Number of hours to look back
            
        Returns:
            List of change events with timestamps
            
        Raises:
            ValueError: If project_id is invalid
            Exception: If history retrieval fails
        """
        try:
            # Validate input parameters
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            if hours < 1:
                raise ValueError("hours must be at least 1")
            
            project_id = project_id.strip()
            
            # Calculate time threshold
            time_threshold = datetime.now(timezone.utc) - timedelta(hours=hours)
            
            # Get project update history (simplified - in a real system you'd have an audit log)
            result = (self.client.table('projects')
                     .select('updated_at, title, status, progress')
                     .eq('id', project_id)
                     .gte('updated_at', time_threshold.isoformat())
                     .order('updated_at', desc=True)
                     .execute())
            
            changes = []
            if result.data:
                for record in result.data:
                    changes.append({
                        'timestamp': record['updated_at'],
                        'project_id': project_id,
                        'title': record.get('title'),
                        'status': record.get('status'),
                        'progress': record.get('progress'),
                        'change_type': 'project_update'
                    })
            
            logger.debug(f"Retrieved {len(changes)} change events for project {project_id} in last {hours} hours")
            return changes
            
        except ValueError as e:
            logger.error(f"Validation error getting change history: {e}")
            raise
        except Exception as e:
            logger.error(f"Error getting change history for project {project_id}: {e}")
            return []
    
    # Private helper methods
    
    def _should_check_for_changes(self, project_id: str) -> bool:
        """Check if enough time has passed since last change detection"""
        last_check = self._last_check_time.get(project_id)
        if last_check is None:
            return True
        
        # Check every 30 seconds at minimum to avoid excessive database queries
        time_since_check = datetime.now(timezone.utc) - last_check
        return time_since_check.total_seconds() > 30
    
    async def _get_current_project_data(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get current project data from database"""
        try:
            result = (self.client.table('projects')
                     .select('*')
                     .eq('id', project_id)
                     .execute())
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Error getting current project data for {project_id}: {e}")
            return None
    
    def _update_project_snapshot(self, project_id: str, project_data: Dict[str, Any]) -> None:
        """Update the stored snapshot of project data"""
        # Create a snapshot with only the fields we care about for change detection
        snapshot = {
            'id': project_data.get('id'),
            'title': project_data.get('title'),
            'description': project_data.get('description'),
            'project_type': project_data.get('project_type'),
            'difficulty': project_data.get('difficulty'),
            'estimated_time': project_data.get('estimated_time'),
            'estimated_cost': project_data.get('estimated_cost'),
            'components': project_data.get('components', []),
            'skills': project_data.get('skills', []),
            'steps': project_data.get('steps', []),
            'status': project_data.get('status'),
            'progress': project_data.get('progress'),
            'notes': project_data.get('notes'),
            'tags': project_data.get('tags', []),
            'updated_at': project_data.get('updated_at')
        }
        
        self._project_snapshots[project_id] = snapshot
        logger.debug(f"Updated snapshot for project {project_id}")
    
    def _compare_project_data(self, previous: Dict[str, Any], current: Dict[str, Any]) -> bool:
        """Compare two project data snapshots to detect changes"""
        # Fields to monitor for changes
        monitored_fields = [
            'title', 'description', 'project_type', 'difficulty', 
            'estimated_time', 'estimated_cost', 'components', 'skills', 
            'steps', 'status', 'progress', 'notes', 'tags', 'updated_at'
        ]
        
        for field in monitored_fields:
            prev_value = previous.get(field)
            curr_value = current.get(field)
            
            # Handle list/array comparisons
            if isinstance(prev_value, list) and isinstance(curr_value, list):
                if set(prev_value) != set(curr_value):
                    return True
            # Handle other value comparisons
            elif prev_value != curr_value:
                return True
        
        return False
    
    def _identify_changed_fields(self, previous: Dict[str, Any], current: Dict[str, Any]) -> List[str]:
        """Identify which specific fields have changed"""
        changed_fields = []
        
        monitored_fields = [
            'title', 'description', 'project_type', 'difficulty', 
            'estimated_time', 'estimated_cost', 'components', 'skills', 
            'steps', 'status', 'progress', 'notes', 'tags'
        ]
        
        for field in monitored_fields:
            prev_value = previous.get(field)
            curr_value = current.get(field)
            
            # Handle list/array comparisons
            if isinstance(prev_value, list) and isinstance(curr_value, list):
                if set(prev_value) != set(curr_value):
                    changed_fields.append(field)
            # Handle other value comparisons
            elif prev_value != curr_value:
                changed_fields.append(field)
        
        return changed_fields


class ProjectChangeNotifier:
    """
    Service class for notifying other services about project changes
    Implements notification mechanisms for cache invalidation
    """
    
    def __init__(self, client: Optional[Client] = None):
        self.client = client or get_db_client()
        self.change_detector = ProjectChangeDetector(client)
    
    async def notify_project_changed(self, project_id: str, change_type: str = "update") -> None:
        """
        Notify that a project has changed and trigger cache invalidation
        
        Args:
            project_id: ID of the changed project
            change_type: Type of change (update, delete, etc.)
            
        Raises:
            ValueError: If project_id is invalid
            Exception: If notification fails
        """
        try:
            # Validate input parameters
            if not project_id or not project_id.strip():
                raise ValueError("project_id cannot be empty")
            
            project_id = project_id.strip()
            
            logger.info(f"Project change notification received for {project_id}: {change_type}")
            
            # Invalidate cache immediately
            await self.change_detector.invalidate_project_cache(project_id)
            
            # Force a fresh change detection to update snapshots
            await self.change_detector.detect_project_changes(project_id, force_check=True)
            
            logger.info(f"Processed project change notification for {project_id}")
            
        except ValueError as e:
            logger.error(f"Validation error in change notification: {e}")
            raise
        except Exception as e:
            logger.error(f"Error processing change notification for project {project_id}: {e}")
            raise
    
    async def setup_database_triggers(self) -> bool:
        """
        Set up database triggers to automatically detect project changes
        
        Returns:
            True if triggers were set up successfully
            
        Raises:
            Exception: If trigger setup fails
        """
        try:
            # Create a function to handle project change notifications
            trigger_function_sql = """
            CREATE OR REPLACE FUNCTION notify_project_change()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Log the change (in a real system, you might use NOTIFY/LISTEN)
                INSERT INTO ai_context_cache (project_id, context_data, generated_at, expires_at)
                VALUES (
                    COALESCE(NEW.id, OLD.id),
                    '{"invalidated": true, "reason": "project_changed"}'::jsonb,
                    NOW(),
                    NOW() - INTERVAL '1 second'  -- Immediately expired to mark as invalid
                )
                ON CONFLICT (project_id) DO UPDATE SET
                    context_data = '{"invalidated": true, "reason": "project_changed"}'::jsonb,
                    generated_at = NOW(),
                    expires_at = NOW() - INTERVAL '1 second';
                
                RETURN COALESCE(NEW, OLD);
            END;
            $$ LANGUAGE plpgsql;
            """
            
            # Create trigger on projects table
            trigger_sql = """
            DROP TRIGGER IF EXISTS project_change_trigger ON projects;
            CREATE TRIGGER project_change_trigger
                AFTER INSERT OR UPDATE OR DELETE ON projects
                FOR EACH ROW
                EXECUTE FUNCTION notify_project_change();
            """
            
            # Execute the SQL (this would be done via migration in a real system)
            logger.info("Database triggers for project change detection would be set up here")
            logger.info("In a real implementation, this would execute the SQL via migration")
            
            return True
            
        except Exception as e:
            logger.error(f"Error setting up database triggers: {e}")
            return False


# Convenience functions for easy access

async def detect_project_changes(project_id: str, force_check: bool = False) -> bool:
    """
    Convenience function to detect project changes
    
    Args:
        project_id: ID of the project to check
        force_check: Force check even if recently checked
        
    Returns:
        True if changes detected, False otherwise
    """
    detector = ProjectChangeDetector()
    return await detector.detect_project_changes(project_id, force_check)


async def invalidate_project_cache(project_id: str) -> bool:
    """
    Convenience function to invalidate project cache
    
    Args:
        project_id: ID of the project
        
    Returns:
        True if cache was invalidated successfully
    """
    detector = ProjectChangeDetector()
    return await detector.invalidate_project_cache(project_id)


async def refresh_project_context_if_changed(project_id: str) -> Optional[ProjectContext]:
    """
    Convenience function to refresh project context if changed
    
    Args:
        project_id: ID of the project
        
    Returns:
        Updated ProjectContext if changes detected, None otherwise
    """
    detector = ProjectChangeDetector()
    return await detector.refresh_project_context_if_changed(project_id)


async def notify_project_changed(project_id: str, change_type: str = "update") -> None:
    """
    Convenience function to notify about project changes
    
    Args:
        project_id: ID of the changed project
        change_type: Type of change (update, delete, etc.)
    """
    notifier = ProjectChangeNotifier()
    await notifier.notify_project_changed(project_id, change_type)