-- AI Code Generation Integration Migration
-- This migration adds all necessary tables and policies for AI code generation functionality
-- Run this in your Supabase SQL editor

BEGIN;

-- Create generated_code table
CREATE TABLE IF NOT EXISTS generated_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    generation_request JSONB NOT NULL, -- Original request parameters
    status VARCHAR(20) DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('arduino', 'raspberry_pi', 'web', 'mobile')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Foreign key constraints (assuming projects and users tables exist)
    CONSTRAINT fk_generated_code_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_generated_code_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create code_files table
CREATE TABLE IF NOT EXISTS code_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generated_code_id UUID NOT NULL,
    file_path VARCHAR(500) NOT NULL, -- relative path within project
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- js, py, cpp, html, css, etc.
    content TEXT NOT NULL,
    description TEXT,
    size_bytes INTEGER,
    is_main_file BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_code_files_generated_code FOREIGN KEY (generated_code_id) REFERENCES generated_code(id) ON DELETE CASCADE
);

-- Create generation_history table
CREATE TABLE IF NOT EXISTS generation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    project_id UUID,
    generated_code_id UUID,
    action VARCHAR(50) NOT NULL CHECK (action IN ('generate', 'regenerate', 'modify', 'download', 'view', 'copy')),
    parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_generation_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_generation_history_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_generation_history_generated_code FOREIGN KEY (generated_code_id) REFERENCES generated_code(id) ON DELETE CASCADE
);

-- Create file_metadata table
CREATE TABLE IF NOT EXISTS file_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_file_id UUID NOT NULL,
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP WITH TIME ZONE,
    is_modified BOOLEAN DEFAULT FALSE,
    original_content TEXT, -- backup of original AI-generated content
    modification_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_file_metadata_code_file FOREIGN KEY (code_file_id) REFERENCES code_files(id) ON DELETE CASCADE
);

-- Add columns to existing projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS has_generated_code BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS code_generation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_code_generated_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_code_project_id ON generated_code(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_code_user_id ON generated_code(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_code_status ON generated_code(status);
CREATE INDEX IF NOT EXISTS idx_generated_code_platform ON generated_code(platform);
CREATE INDEX IF NOT EXISTS idx_generated_code_created_at ON generated_code(created_at);

CREATE INDEX IF NOT EXISTS idx_code_files_generated_code_id ON code_files(generated_code_id);
CREATE INDEX IF NOT EXISTS idx_code_files_file_type ON code_files(file_type);
CREATE INDEX IF NOT EXISTS idx_code_files_is_main_file ON code_files(is_main_file);
CREATE INDEX IF NOT EXISTS idx_code_files_updated_at ON code_files(updated_at);

CREATE INDEX IF NOT EXISTS idx_generation_history_user_id ON generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_project_id ON generation_history(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_generated_code_id ON generation_history(generated_code_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_action ON generation_history(action);
CREATE INDEX IF NOT EXISTS idx_generation_history_created_at ON generation_history(created_at);

CREATE INDEX IF NOT EXISTS idx_file_metadata_code_file_id ON file_metadata(code_file_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_is_modified ON file_metadata(is_modified);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_generated_code_project_status ON generated_code(project_id, status);
CREATE INDEX IF NOT EXISTS idx_generated_code_user_status ON generated_code(user_id, status);
CREATE INDEX IF NOT EXISTS idx_code_files_generation_type ON code_files(generated_code_id, file_type);

-- Enable Row Level Security (RLS)
ALTER TABLE generated_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies for generated_code table
CREATE POLICY "Users can view their own generated code" ON generated_code
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generated code" ON generated_code
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated code" ON generated_code
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated code" ON generated_code
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for code_files table
CREATE POLICY "Users can view files from their generated code" ON code_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM generated_code 
            WHERE generated_code.id = code_files.generated_code_id 
            AND generated_code.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create files for their generated code" ON code_files
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM generated_code 
            WHERE generated_code.id = code_files.generated_code_id 
            AND generated_code.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update files from their generated code" ON code_files
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM generated_code 
            WHERE generated_code.id = code_files.generated_code_id 
            AND generated_code.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete files from their generated code" ON code_files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM generated_code 
            WHERE generated_code.id = code_files.generated_code_id 
            AND generated_code.user_id = auth.uid()
        )
    );

-- RLS Policies for generation_history table
CREATE POLICY "Users can view their own generation history" ON generation_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generation history" ON generation_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for file_metadata table
CREATE POLICY "Users can view metadata for their files" ON file_metadata
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM code_files 
            JOIN generated_code ON generated_code.id = code_files.generated_code_id
            WHERE code_files.id = file_metadata.code_file_id 
            AND generated_code.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create metadata for their files" ON file_metadata
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM code_files 
            JOIN generated_code ON generated_code.id = code_files.generated_code_id
            WHERE code_files.id = file_metadata.code_file_id 
            AND generated_code.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update metadata for their files" ON file_metadata
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM code_files 
            JOIN generated_code ON generated_code.id = code_files.generated_code_id
            WHERE code_files.id = file_metadata.code_file_id 
            AND generated_code.user_id = auth.uid()
        )
    );

-- Create functions for common operations
CREATE OR REPLACE FUNCTION update_file_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER trigger_update_code_files_updated_at
    BEFORE UPDATE ON code_files
    FOR EACH ROW
    EXECUTE FUNCTION update_file_updated_at();

-- Function to update project code generation stats
CREATE OR REPLACE FUNCTION update_project_code_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
        UPDATE projects 
        SET 
            has_generated_code = TRUE,
            code_generation_count = COALESCE(code_generation_count, 0) + 1,
            last_code_generated_at = NEW.completed_at
        WHERE id = NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update project stats when code generation completes
CREATE TRIGGER trigger_update_project_code_stats
    AFTER INSERT OR UPDATE ON generated_code
    FOR EACH ROW
    EXECUTE FUNCTION update_project_code_stats();

-- Create function to log generation history
CREATE OR REPLACE FUNCTION log_generation_action()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO generation_history (user_id, project_id, generated_code_id, action, parameters)
        VALUES (NEW.user_id, NEW.project_id, NEW.id, 'generate', NEW.generation_request);
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'completed' THEN
        INSERT INTO generation_history (user_id, project_id, generated_code_id, action)
        VALUES (NEW.user_id, NEW.project_id, NEW.id, 'completed');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically log generation actions
CREATE TRIGGER trigger_log_generation_action
    AFTER INSERT OR UPDATE ON generated_code
    FOR EACH ROW
    EXECUTE FUNCTION log_generation_action();

COMMIT;

-- Verification queries (run these after migration to verify)
-- SELECT 'generated_code' as table_name, count(*) as row_count FROM generated_code
-- UNION ALL
-- SELECT 'code_files' as table_name, count(*) as row_count FROM code_files
-- UNION ALL  
-- SELECT 'generation_history' as table_name, count(*) as row_count FROM generation_history
-- UNION ALL
-- SELECT 'file_metadata' as table_name, count(*) as row_count FROM file_metadata;