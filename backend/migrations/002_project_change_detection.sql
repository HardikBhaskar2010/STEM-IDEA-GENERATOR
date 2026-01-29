-- Project Change Detection Migration
-- This migration adds triggers and functions for automatic project change detection
-- Requirements: 7.4
-- Task: 8.1 Add project data change detection and cache invalidation

-- Create function to handle project change notifications
CREATE OR REPLACE FUNCTION notify_project_change()
RETURNS TRIGGER AS $$
BEGIN
    -- When a project is updated, we need to invalidate any cached AI context
    -- We do this by inserting/updating a record in ai_context_cache with an expired timestamp
    -- This serves as a marker that the cache is invalid
    
    IF TG_OP = 'UPDATE' THEN
        -- Only invalidate cache if meaningful fields have changed
        IF (OLD.title IS DISTINCT FROM NEW.title OR
            OLD.description IS DISTINCT FROM NEW.description OR
            OLD.project_type IS DISTINCT FROM NEW.project_type OR
            OLD.difficulty IS DISTINCT FROM NEW.difficulty OR
            OLD.estimated_time IS DISTINCT FROM NEW.estimated_time OR
            OLD.estimated_cost IS DISTINCT FROM NEW.estimated_cost OR
            OLD.components IS DISTINCT FROM NEW.components OR
            OLD.skills IS DISTINCT FROM NEW.skills OR
            OLD.steps IS DISTINCT FROM NEW.steps OR
            OLD.status IS DISTINCT FROM NEW.status OR
            OLD.progress IS DISTINCT FROM NEW.progress OR
            OLD.notes IS DISTINCT FROM NEW.notes OR
            OLD.tags IS DISTINCT FROM NEW.tags) THEN
            
            -- Mark cache as invalid by setting an expired timestamp
            INSERT INTO public.ai_context_cache (project_id, context_data, generated_at, expires_at)
            VALUES (
                NEW.id,
                jsonb_build_object(
                    'invalidated', true,
                    'reason', 'project_updated',
                    'changed_at', NOW(),
                    'trigger_op', TG_OP
                ),
                NOW(),
                NOW() - INTERVAL '1 second'  -- Immediately expired to mark as invalid
            )
            ON CONFLICT (project_id) DO UPDATE SET
                context_data = jsonb_build_object(
                    'invalidated', true,
                    'reason', 'project_updated',
                    'changed_at', NOW(),
                    'trigger_op', TG_OP
                ),
                generated_at = NOW(),
                expires_at = NOW() - INTERVAL '1 second';
        END IF;
        
        RETURN NEW;
        
    ELSIF TG_OP = 'INSERT' THEN
        -- For new projects, no cache to invalidate
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- For deleted projects, remove any cached context
        DELETE FROM public.ai_context_cache WHERE project_id = OLD.id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on projects table to detect changes
DROP TRIGGER IF EXISTS project_change_trigger ON public.projects;
CREATE TRIGGER project_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION notify_project_change();

-- Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_ai_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired cache entries
    DELETE FROM public.ai_context_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup (in a real system, you might use a proper logging table)
    RAISE NOTICE 'Cleaned up % expired AI context cache entries', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get project change summary
CREATE OR REPLACE FUNCTION get_project_change_summary(project_uuid UUID, hours_back INTEGER DEFAULT 24)
RETURNS JSON AS $$
DECLARE
    result JSON;
    time_threshold TIMESTAMP WITH TIME ZONE;
BEGIN
    time_threshold := NOW() - (hours_back || ' hours')::INTERVAL;
    
    SELECT json_build_object(
        'project_id', project_uuid,
        'time_range_hours', hours_back,
        'changes', json_agg(
            json_build_object(
                'timestamp', updated_at,
                'title', title,
                'status', status,
                'progress', progress,
                'change_detected', CASE 
                    WHEN updated_at > time_threshold THEN true 
                    ELSE false 
                END
            )
        ),
        'cache_status', CASE 
            WHEN EXISTS (
                SELECT 1 FROM public.ai_context_cache 
                WHERE project_id = project_uuid 
                AND expires_at > NOW()
            ) THEN 'valid'
            ELSE 'invalid_or_missing'
        END,
        'last_cache_update', (
            SELECT generated_at FROM public.ai_context_cache 
            WHERE project_id = project_uuid 
            ORDER BY generated_at DESC 
            LIMIT 1
        )
    ) INTO result
    FROM public.projects
    WHERE id = project_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create index for better performance on cache lookups by project_id and expiration
CREATE INDEX IF NOT EXISTS idx_ai_context_cache_project_expires 
ON public.ai_context_cache(project_id, expires_at);

-- Create index for better performance on project updates
CREATE INDEX IF NOT EXISTS idx_projects_updated_at 
ON public.projects(updated_at);

-- Add a comment to document the change detection system
COMMENT ON FUNCTION notify_project_change() IS 
'Automatically invalidates AI context cache when project data changes. Triggered on INSERT, UPDATE, DELETE operations on projects table.';

COMMENT ON FUNCTION cleanup_expired_ai_cache() IS 
'Removes expired AI context cache entries. Should be called periodically by a cleanup job.';

COMMENT ON FUNCTION get_project_change_summary(UUID, INTEGER) IS 
'Returns a summary of project changes and cache status for the specified project within the given time range.';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_project_change() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_ai_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_change_summary(UUID, INTEGER) TO authenticated;

COMMIT;