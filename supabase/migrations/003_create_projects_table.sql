-- Create Projects Table Migration
-- This migration creates the projects table to store user projects
-- Requirements: Frontend-Backend Integration

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(100),
    difficulty VARCHAR(50) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
    estimated_time VARCHAR(100),
    estimated_cost VARCHAR(100),
    components TEXT[] DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    steps TEXT[] DEFAULT '{}',
    status VARCHAR(50) CHECK (status IN ('planning', 'in-progress', 'completed', 'abandoned')) DEFAULT 'planning',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    notes TEXT DEFAULT '',
    starred BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    completed_steps INTEGER[] DEFAULT '{}',
    generated_from_params JSONB DEFAULT '{}',
    user_id UUID, -- For future authentication support
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_difficulty ON public.projects(difficulty);
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON public.projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_starred ON public.projects(starred);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON public.projects 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for demo purposes - adjust as needed)
CREATE POLICY "Allow public read access on projects" ON public.projects
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on projects" ON public.projects
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on projects" ON public.projects
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on projects" ON public.projects
    FOR DELETE USING (true);

-- Grant necessary permissions
GRANT ALL ON public.projects TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create function to sync project from frontend
CREATE OR REPLACE FUNCTION sync_project_from_frontend(
    project_data JSONB
)
RETURNS UUID AS $
DECLARE
    project_uuid UUID;
    existing_project UUID;
BEGIN
    -- Extract project ID from the data
    project_uuid := (project_data->>'id')::UUID;
    
    -- Check if project already exists
    SELECT id INTO existing_project 
    FROM public.projects 
    WHERE id = project_uuid;
    
    IF existing_project IS NOT NULL THEN
        -- Update existing project
        UPDATE public.projects SET
            title = project_data->>'title',
            description = project_data->>'description',
            project_type = COALESCE(project_data->>'project_type', (project_data->'generated_from_params'->>'projectType')),
            difficulty = project_data->>'difficulty',
            estimated_time = project_data->>'estimatedTime',
            estimated_cost = project_data->>'estimatedCost',
            components = ARRAY(SELECT jsonb_array_elements_text(project_data->'components')),
            skills = ARRAY(SELECT jsonb_array_elements_text(project_data->'skills')),
            steps = ARRAY(SELECT jsonb_array_elements_text(project_data->'steps')),
            status = project_data->>'status',
            progress = COALESCE((project_data->>'progress')::INTEGER, 0),
            notes = COALESCE(project_data->>'notes', ''),
            starred = COALESCE((project_data->>'starred')::BOOLEAN, false),
            tags = ARRAY(SELECT jsonb_array_elements_text(project_data->'tags')),
            completed_steps = ARRAY(SELECT (jsonb_array_elements(project_data->'completed_steps'))::INTEGER),
            generated_from_params = COALESCE(project_data->'generated_from_params', '{}'::jsonb),
            updated_at = NOW()
        WHERE id = project_uuid;
    ELSE
        -- Insert new project
        INSERT INTO public.projects (
            id, title, description, project_type, difficulty, estimated_time, estimated_cost,
            components, skills, steps, status, progress, notes, starred, tags, completed_steps,
            generated_from_params, created_at, updated_at
        ) VALUES (
            project_uuid,
            project_data->>'title',
            project_data->>'description',
            COALESCE(project_data->>'project_type', (project_data->'generated_from_params'->>'projectType')),
            project_data->>'difficulty',
            project_data->>'estimatedTime',
            project_data->>'estimatedCost',
            ARRAY(SELECT jsonb_array_elements_text(project_data->'components')),
            ARRAY(SELECT jsonb_array_elements_text(project_data->'skills')),
            ARRAY(SELECT jsonb_array_elements_text(project_data->'steps')),
            COALESCE(project_data->>'status', 'planning'),
            COALESCE((project_data->>'progress')::INTEGER, 0),
            COALESCE(project_data->>'notes', ''),
            COALESCE((project_data->>'starred')::BOOLEAN, false),
            ARRAY(SELECT jsonb_array_elements_text(project_data->'tags')),
            ARRAY(SELECT (jsonb_array_elements(project_data->'completed_steps'))::INTEGER),
            COALESCE(project_data->'generated_from_params', '{}'::jsonb),
            COALESCE((project_data->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW()),
            NOW()
        );
    END IF;
    
    RETURN project_uuid;
END;
$ LANGUAGE plpgsql;

-- Grant execute permission on the sync function
GRANT EXECUTE ON FUNCTION sync_project_from_frontend(JSONB) TO anon, authenticated;

COMMIT;
</content>