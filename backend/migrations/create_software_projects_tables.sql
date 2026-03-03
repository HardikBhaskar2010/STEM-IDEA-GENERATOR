-- Phase 1: Backend Foundation - Supabase Tables for Software Projects
-- Created for: Veronica AI Code Generation System

-- ============================================
-- 1. SOFTWARE PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS software_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    
    -- Project classification
    project_type VARCHAR(50) NOT NULL, -- web_app, mobile_app, desktop_app, api, full_stack, microservices, pwa
    platforms TEXT[] NOT NULL, -- Array: web, ios, android, desktop, all
    complexity_level VARCHAR(50) NOT NULL, -- simple, moderate, complex, enterprise
    
    -- Technical recommendations (JSONB for flexibility)
    features JSONB DEFAULT '[]'::jsonb,
    user_stories JSONB DEFAULT '[]'::jsonb,
    recommended_tech_stack JSONB,
    architecture_type VARCHAR(50), -- monolith, modular_monolith, microservices, spa, mvc, serverless
    database_recommendations JSONB DEFAULT '[]'::jsonb,
    
    -- Project planning
    estimated_timeline VARCHAR(100),
    estimated_budget VARCHAR(100),
    team_recommendations JSONB,
    deployment_recommendations JSONB DEFAULT '[]'::jsonb,
    
    -- Non-functional requirements
    non_functional_requirements JSONB,
    
    -- Project metadata
    status VARCHAR(50) DEFAULT 'planning', -- planning, in_development, completed
    ai_confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    analysis_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_confidence_score CHECK (ai_confidence_score IS NULL OR (ai_confidence_score >= 0 AND ai_confidence_score <= 1))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_software_projects_user_id ON software_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_software_projects_created_at ON software_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_software_projects_status ON software_projects(status);
CREATE INDEX IF NOT EXISTS idx_software_projects_project_type ON software_projects(project_type);

-- ============================================
-- 2. ARCHITECTURE DIAGRAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS architecture_diagrams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES software_projects(id) ON DELETE CASCADE,
    diagram_type VARCHAR(50) NOT NULL DEFAULT 'flowchart', -- flowchart, sequence, class, er, component
    mermaid_code TEXT NOT NULL, -- Mermaid diagram syntax
    description TEXT NOT NULL,
    components TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_architecture_diagrams_project_id ON architecture_diagrams(project_id);
CREATE INDEX IF NOT EXISTS idx_architecture_diagrams_diagram_type ON architecture_diagrams(diagram_type);

-- ============================================
-- 3. DATABASE SCHEMAS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS database_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES software_projects(id) ON DELETE CASCADE,
    database_type VARCHAR(50) NOT NULL, -- postgresql, mongodb, mysql, sqlite, firebase
    tables JSONB DEFAULT '[]'::jsonb, -- Table definitions
    relationships JSONB DEFAULT '[]'::jsonb, -- Foreign key relationships
    indexes JSONB DEFAULT '[]'::jsonb, -- Index definitions
    schema_sql TEXT, -- Generated SQL for relational databases
    schema_json JSONB, -- JSON schema for NoSQL databases
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_database_schemas_project_id ON database_schemas(project_id);
CREATE INDEX IF NOT EXISTS idx_database_schemas_database_type ON database_schemas(database_type);

-- ============================================
-- 4. API SPECIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS api_specifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES software_projects(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    version VARCHAR(20) DEFAULT '1.0.0',
    description TEXT NOT NULL,
    base_url VARCHAR(500),
    endpoints JSONB DEFAULT '[]'::jsonb, -- Array of endpoint definitions
    authentication_scheme VARCHAR(100), -- jwt, oauth2, api_key, basic
    openapi_spec JSONB, -- Complete OpenAPI 3.0 specification
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_specifications_project_id ON api_specifications(project_id);

-- ============================================
-- 5. CODE TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS code_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- web, ios, android, desktop
    framework VARCHAR(100) NOT NULL, -- react, vue, angular, flutter, react-native
    description TEXT NOT NULL,
    files JSONB DEFAULT '[]'::jsonb, -- Array of {path, content, description}
    dependencies TEXT[] DEFAULT ARRAY[]::TEXT[],
    setup_instructions TEXT[] DEFAULT ARRAY[]::TEXT[],
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    popularity_score INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_code_templates_platform ON code_templates(platform);
CREATE INDEX IF NOT EXISTS idx_code_templates_framework ON code_templates(framework);
CREATE INDEX IF NOT EXISTS idx_code_templates_popularity ON code_templates(popularity_score DESC);

-- ============================================
-- 6. PROJECT TEMPLATES TABLE (Pre-built templates)
-- ============================================
CREATE TABLE IF NOT EXISTS project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL, -- ecommerce, social_media, business, educational, portfolio
    description TEXT NOT NULL,
    project_type VARCHAR(50) NOT NULL,
    platforms TEXT[] NOT NULL,
    complexity_level VARCHAR(50) NOT NULL,
    
    -- Pre-configured data
    default_features JSONB DEFAULT '[]'::jsonb,
    default_tech_stack JSONB,
    default_architecture_type VARCHAR(50),
    
    -- Template metadata
    preview_image_url TEXT,
    demo_url TEXT,
    popularity_score INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_templates_category ON project_templates(category);
CREATE INDEX IF NOT EXISTS idx_project_templates_popularity ON project_templates(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_project_templates_is_active ON project_templates(is_active);

-- ============================================
-- 7. GENERATED CODE TABLE (Link to existing)
-- ============================================
-- Note: This table may already exist from code_generation_service
-- We'll create it only if it doesn't exist

CREATE TABLE IF NOT EXISTS generated_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES software_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    generation_request JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'generating', -- generating, completed, failed
    platform VARCHAR(50) NOT NULL,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_generated_code_project_id ON generated_code(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_code_user_id ON generated_code(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_code_status ON generated_code(status);

-- ============================================
-- 8. CODE FILES TABLE (Link to existing)
-- ============================================
CREATE TABLE IF NOT EXISTS code_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generated_code_id UUID REFERENCES generated_code(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(200) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    description TEXT,
    size_bytes INTEGER,
    is_main_file BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_code_files_generated_code_id ON code_files(generated_code_id);
CREATE INDEX IF NOT EXISTS idx_code_files_file_type ON code_files(file_type);
CREATE INDEX IF NOT EXISTS idx_code_files_is_main_file ON code_files(is_main_file);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic updated_at
CREATE TRIGGER update_software_projects_updated_at BEFORE UPDATE ON software_projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_architecture_diagrams_updated_at BEFORE UPDATE ON architecture_diagrams
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_database_schemas_updated_at BEFORE UPDATE ON database_schemas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_specifications_updated_at BEFORE UPDATE ON api_specifications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_code_templates_updated_at BEFORE UPDATE ON code_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_templates_updated_at BEFORE UPDATE ON project_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_code_files_updated_at BEFORE UPDATE ON code_files
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Enable RLS on tables
ALTER TABLE software_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_files ENABLE ROW LEVEL SECURITY;

-- Policies for software_projects
CREATE POLICY "Users can view their own projects"
    ON software_projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
    ON software_projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON software_projects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
    ON software_projects FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for architecture_diagrams (inherit from project ownership)
CREATE POLICY "Users can view diagrams of their projects"
    ON architecture_diagrams FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM software_projects
        WHERE software_projects.id = architecture_diagrams.project_id
        AND software_projects.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert diagrams for their projects"
    ON architecture_diagrams FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM software_projects
        WHERE software_projects.id = architecture_diagrams.project_id
        AND software_projects.user_id = auth.uid()
    ));

-- Similar policies for other related tables...
CREATE POLICY "Users can view schemas of their projects"
    ON database_schemas FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM software_projects
        WHERE software_projects.id = database_schemas.project_id
        AND software_projects.user_id = auth.uid()
    ));

CREATE POLICY "Users can view api specs of their projects"
    ON api_specifications FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM software_projects
        WHERE software_projects.id = api_specifications.project_id
        AND software_projects.user_id = auth.uid()
    ));

CREATE POLICY "Users can view their own generated code"
    ON generated_code FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view code files of their generated code"
    ON code_files FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM generated_code
        WHERE generated_code.id = code_files.generated_code_id
        AND generated_code.user_id = auth.uid()
    ));

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE software_projects IS 'Stores software project plans created by Veronica AI';
COMMENT ON TABLE architecture_diagrams IS 'Stores architecture diagrams in Mermaid format';
COMMENT ON TABLE database_schemas IS 'Stores database schema designs for projects';
COMMENT ON TABLE api_specifications IS 'Stores API endpoint specifications in OpenAPI format';
COMMENT ON TABLE code_templates IS 'Stores reusable code templates for different platforms';
COMMENT ON TABLE project_templates IS 'Stores pre-built project templates for quick start';

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Grant appropriate permissions to authenticated users
GRANT ALL ON software_projects TO authenticated;
GRANT ALL ON architecture_diagrams TO authenticated;
GRANT ALL ON database_schemas TO authenticated;
GRANT ALL ON api_specifications TO authenticated;
GRANT ALL ON code_templates TO authenticated;
GRANT ALL ON project_templates TO authenticated;
GRANT ALL ON generated_code TO authenticated;
GRANT ALL ON code_files TO authenticated;

-- Grant SELECT on templates to anonymous users (for browsing)
GRANT SELECT ON code_templates TO anon;
GRANT SELECT ON project_templates TO anon;
