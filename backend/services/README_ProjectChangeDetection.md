# Project Change Detection and Cache Invalidation

## Overview

This module implements project data change detection and cache invalidation mechanisms for the AI Project Guidance system. It ensures that AI responses always reflect the most current project state by automatically detecting changes and refreshing cached context data.

## Requirements

- **Requirement 7.4**: When project data changes, the AI guidance system shall reflect updates in subsequent interactions

## Components

### 1. ProjectChangeDetector

The main service class that handles change detection logic.

**Key Features:**
- Detects changes in project data by comparing snapshots
- Manages in-memory project snapshots for efficient comparison
- Implements throttling to avoid excessive database queries
- Provides detailed change field identification for debugging

**Methods:**
- `detect_project_changes()`: Compares current project data with stored snapshot
- `invalidate_project_cache()`: Removes cached context data
- `refresh_project_context_if_changed()`: Checks for changes and refreshes context if needed
- `setup_change_monitoring()`: Initializes monitoring for multiple projects
- `get_project_change_history()`: Retrieves change history for a project

### 2. ProjectChangeNotifier

Service class for handling change notifications and triggering cache invalidation.

**Key Features:**
- Processes change notifications from various sources
- Coordinates cache invalidation across the system
- Sets up database triggers for automatic change detection

**Methods:**
- `notify_project_changed()`: Handles project change notifications
- `setup_database_triggers()`: Configures database-level change detection

### 3. Database Triggers and Functions

Automatic database-level change detection implemented via PostgreSQL triggers.

**Components:**
- `notify_project_change()`: Trigger function that detects meaningful project changes
- `project_change_trigger`: Database trigger on the projects table
- `cleanup_expired_ai_cache()`: Function to clean up expired cache entries
- `get_project_change_summary()`: Function to get project change summaries

## Integration

### ProjectContextService Integration

The `ProjectContextService` has been updated to integrate with the change detection system:

```python
# Check for project changes and refresh cache if needed
from services.project_change_detector import ProjectChangeDetector
change_detector = ProjectChangeDetector(self.client)
fresh_context = await change_detector.refresh_project_context_if_changed(project_id)
if fresh_context:
    return fresh_context
```

### Automatic Cache Invalidation

When project data is updated through `ProjectContextService.updateProjectData()`:

```python
# Notify change detector about the update
from services.project_change_detector import notify_project_changed
await notify_project_changed(project_id, "update")
```

## Database Schema Changes

### New Indexes

- `idx_ai_context_cache_project_expires`: Optimizes cache lookups by project and expiration
- `idx_projects_updated_at`: Optimizes queries based on project update timestamps

### Trigger Implementation

The database trigger monitors these project fields for changes:
- `title`, `description`, `project_type`, `difficulty`
- `estimated_time`, `estimated_cost`
- `components`, `skills`, `steps`
- `status`, `progress`, `notes`, `tags`

When changes are detected, the trigger:
1. Inserts/updates a record in `ai_context_cache` with expired timestamp
2. Marks the cache as invalid with metadata about the change

## Usage Examples

### Basic Change Detection

```python
from services.project_change_detector import detect_project_changes

# Check if project has changed
changed = await detect_project_changes(project_id, force_check=True)
if changed:
    print("Project data has changed!")
```

### Cache Invalidation

```python
from services.project_change_detector import invalidate_project_cache

# Manually invalidate cache
success = await invalidate_project_cache(project_id)
```

### Automatic Refresh

```python
from services.project_change_detector import refresh_project_context_if_changed

# Get fresh context only if changes detected
fresh_context = await refresh_project_context_if_changed(project_id)
if fresh_context:
    # Use the updated context
    print(f"Updated project: {fresh_context.title}")
```

### Change Monitoring Setup

```python
from services.project_change_detector import ProjectChangeDetector

detector = ProjectChangeDetector()
await detector.setup_change_monitoring(
    project_ids=['proj1', 'proj2', 'proj3'],
    check_interval_minutes=5
)
```

## Performance Considerations

### Throttling

- Change detection is throttled to run at most once every 30 seconds per project
- This prevents excessive database queries while maintaining responsiveness

### Efficient Comparison

- Only meaningful project fields are monitored for changes
- List/array fields use set comparison for efficient change detection
- Snapshots are stored in memory for fast comparison

### Database Optimization

- Indexes are created for optimal query performance
- Triggers only fire on actual data changes, not every update
- Expired cache cleanup can be run periodically to maintain performance

## Error Handling

### Graceful Degradation

- If change detection fails, the system falls back to normal cache behavior
- Errors are logged but don't prevent core functionality
- Cache invalidation failures trigger manual cache clearing as fallback

### Validation

- All inputs are validated for proper UUID format
- Empty or invalid project IDs are rejected with clear error messages
- Database connection issues are handled gracefully

## Testing

### Unit Tests

Comprehensive unit tests cover:
- Change detection logic with various scenarios
- Cache invalidation functionality
- Error handling and edge cases
- Convenience function behavior

### Integration Tests

Integration tests verify:
- Database trigger functionality
- Function existence and execution
- Index creation and performance
- End-to-end change detection flow

## Monitoring and Debugging

### Logging

The system provides detailed logging for:
- Change detection results with specific changed fields
- Cache invalidation operations
- Performance metrics and timing
- Error conditions and recovery

### Change History

The `get_project_change_history()` method provides:
- Timestamps of recent changes
- Change types and affected fields
- Cache status information
- Debugging information for troubleshooting

## Future Enhancements

### Real-time Notifications

- Could be extended to use PostgreSQL LISTEN/NOTIFY for real-time change notifications
- WebSocket integration for immediate UI updates

### Advanced Caching Strategies

- Implement cache warming for frequently accessed projects
- Add cache versioning for more sophisticated invalidation
- Implement distributed caching for multi-instance deployments

### Analytics and Metrics

- Track change frequency and patterns
- Monitor cache hit/miss ratios
- Analyze performance impact of change detection

## Migration Guide

To apply the project change detection system:

1. **Run Database Migration**:
   ```sql
   -- Apply backend/migrations/002_project_change_detection.sql
   ```

2. **Update Service Integration**:
   ```python
   # Update existing ProjectContextService calls to use change detection
   ```

3. **Configure Monitoring** (Optional):
   ```python
   # Set up periodic change monitoring for active projects
   ```

4. **Test Integration**:
   ```bash
   # Run tests to verify functionality
   python -m pytest tests/test_project_change_detection.py
   ```

The system is designed to be backward compatible and will work seamlessly with existing code while providing enhanced cache management capabilities.