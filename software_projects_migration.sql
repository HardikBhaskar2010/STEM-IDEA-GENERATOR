-- ============================================================================
-- SOFTWARE PROJECTS & APPS DOMAIN DATABASE MIGRATION
-- ============================================================================
-- This migration adds tables for Apps & Websites domain functionality
-- including software project planning, technology stacks, architecture,
-- database design, API planning, and application templates.
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLE: software_projects
-- Detailed software project planning and requirements
-- ============================================================================
CREATE TABLE IF NOT EXISTS software_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Project Classification
    project_type VARCHAR(50) NOT NULL CHECK (project_type IN (
        'web_app', 'mobile_app', 'desktop_app', 'api', 
        'full_stack', 'microservices', 'progressive_web_app'
    )),
    platforms TEXT[] DEFAULT '{}', -- ['web', 'ios', 'android', 'desktop']
    
    -- Requirements
    features JSONB DEFAULT '[]'::jsonb, -- [{name, description, priority, acceptance_criteria}]
    user_stories JSONB DEFAULT '[]'::jsonb, -- [{as_a, i_want, so_that, acceptance_criteria}]
    non_functional_requirements JSONB DEFAULT '{}', -- {performance, security, scalability, etc}
    
    -- Planning
    estimated_timeline VARCHAR(100),
    estimated_budget VARCHAR(100),
    team_size INTEGER,
    team_expertise_level VARCHAR(50) CHECK (team_expertise_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    
    -- Architecture
    architecture_type VARCHAR(50) CHECK (architecture_type IN (
        'monolith', 'microservices', 'serverless', 'jamstack', 'spa', 'ssr', 'hybrid'
    )),
    architecture_diagram_data JSONB, -- Mermaid or diagram data structure
    
    -- Technical Decisions
    selected_tech_stack_id UUID, -- Reference to technology_stacks table
    database_type VARCHAR(50), -- 'postgresql', 'mongodb', 'mysql', etc.
    authentication_method VARCHAR(50), -- 'jwt', 'oauth', 'session', 'firebase', etc.
    deployment_target VARCHAR(50), -- 'vercel', 'netlify', 'aws', 'gcp', 'azure', 'heroku', etc.
    
    -- Metadata
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN (
        'planning', 'tech_stack_selection', 'architecture_design',
        'database_design', 'api_design', 'ready_for_generation', 'completed'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: technology_stacks
-- Pre-defined and custom technology stack configurations
-- ============================================================================
CREATE TABLE IF NOT EXISTS technology_stacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('web', 'mobile', 'desktop', 'full_stack', 'backend', 'frontend')),
    
    -- Stack Components
    frontend_framework VARCHAR(100), -- 'react', 'vue', 'angular', 'svelte', etc.
    backend_framework VARCHAR(100), -- 'express', 'fastapi', 'django', 'spring', etc.
    database VARCHAR(100), -- 'postgresql', 'mongodb', 'mysql', 'firebase', etc.
    additional_technologies JSONB DEFAULT '[]'::jsonb, -- [{name, purpose, version}]
    
    -- Metrics
    popularity_score INTEGER DEFAULT 0 CHECK (popularity_score >= 0 AND popularity_score <= 100),
    learning_curve VARCHAR(20) CHECK (learning_curve IN ('easy', 'moderate', 'steep')),
    community_size VARCHAR(20) CHECK (community_size IN ('small', 'medium', 'large', 'very_large')),
    maturity VARCHAR(20) CHECK (maturity IN ('experimental', 'stable', 'mature', 'legacy')),
    
    -- Pros and Cons
    pros TEXT[], -- Array of advantages
    cons TEXT[], -- Array of disadvantages
    best_for TEXT[], -- Use cases where this stack excels
    
    -- Resources
    documentation_url TEXT,
    tutorial_links JSONB DEFAULT '[]'::jsonb,
    
    -- Cost Estimation
    estimated_hosting_cost VARCHAR(100), -- Monthly hosting cost range
    requires_paid_services BOOLEAN DEFAULT false,
    
    -- Metadata
    is_template BOOLEAN DEFAULT true, -- Whether this is a pre-defined template
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: database_schemas
-- Database design and schema information
-- ============================================================================
CREATE TABLE IF NOT EXISTS database_schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    software_project_id UUID NOT NULL REFERENCES software_projects(id) ON DELETE CASCADE,
    database_type VARCHAR(50) NOT NULL, -- 'postgresql', 'mongodb', 'mysql', etc.
    
    -- Schema Definition
    tables JSONB DEFAULT '[]'::jsonb, -- [{name, fields, indexes, constraints}]
    relationships JSONB DEFAULT '[]'::jsonb, -- [{from_table, to_table, type, on_delete}]
    
    -- NoSQL Schema (for MongoDB, Firebase, etc.)
    collections JSONB DEFAULT '[]'::jsonb, -- [{name, schema, indexes}]
    
    -- Generated Artifacts
    sql_schema TEXT, -- Generated SQL for relational databases
    migration_scripts TEXT[], -- Array of migration SQL scripts
    er_diagram_data JSONB, -- ER diagram representation
    
    -- Metadata
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: api_endpoints
-- API design and endpoint specifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    software_project_id UUID NOT NULL REFERENCES software_projects(id) ON DELETE CASCADE,
    
    -- Endpoint Details
    method VARCHAR(10) NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
    path VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Request/Response
    request_body_schema JSONB, -- JSON Schema for request body
    response_schema JSONB, -- JSON Schema for response
    query_parameters JSONB DEFAULT '[]'::jsonb, -- [{name, type, required, description}]
    path_parameters JSONB DEFAULT '[]'::jsonb,
    headers JSONB DEFAULT '[]'::jsonb,
    
    -- Security
    requires_authentication BOOLEAN DEFAULT false,
    required_permissions TEXT[], -- ['admin', 'user', 'moderator']
    rate_limit INTEGER, -- Requests per minute
    
    -- Documentation
    example_request TEXT,
    example_response TEXT,
    error_responses JSONB DEFAULT '[]'::jsonb, -- [{status_code, message, description}]
    
    -- Metadata
    is_public BOOLEAN DEFAULT false,
    tags TEXT[], -- For grouping endpoints
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: deployment_configs
-- Deployment configuration for various platforms
-- ============================================================================
CREATE TABLE IF NOT EXISTS deployment_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    software_project_id UUID NOT NULL REFERENCES software_projects(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'vercel', 'netlify', 'aws', 'heroku', 'docker', etc.
    
    -- Configuration Files
    config_files JSONB DEFAULT '[]'::jsonb, -- [{filename, content, description}]
    environment_variables JSONB DEFAULT '[]'::jsonb, -- [{key, description, is_secret}]
    
    -- Docker Configuration
    dockerfile TEXT,
    docker_compose TEXT,
    
    -- CI/CD
    ci_cd_config TEXT, -- GitHub Actions, GitLab CI, etc.
    
    -- Cloud-Specific
    cloud_provider VARCHAR(50), -- 'aws', 'gcp', 'azure'
    cloud_services JSONB DEFAULT '[]'::jsonb, -- [{service, configuration}]
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: application_templates
-- Pre-built application templates (E-commerce, Social Media, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS application_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'ecommerce', 'social_media', 'productivity', 'portfolio', 
        'business', 'educational', 'blog', 'dashboard', 'landing_page'
    )),
    
    -- Template Details
    features TEXT[], -- List of included features
    tech_stack_id UUID REFERENCES technology_stacks(id),
    complexity_level VARCHAR(50) CHECK (complexity_level IN ('simple', 'moderate', 'complex', 'enterprise')),
    
    -- Code Templates
    frontend_template JSONB, -- Code structure and files for frontend
    backend_template JSONB, -- Code structure and files for backend
    database_template JSONB, -- Database schema template
    
    -- Preview
    preview_images TEXT[], -- URLs to preview images
    demo_url TEXT,
    repository_url TEXT,
    
    -- Documentation
    setup_instructions TEXT,
    customization_guide TEXT,
    deployment_guide TEXT,
    
    -- Metrics
    popularity_score INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.0,
    
    -- Metadata
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: template_customizations
-- Track user customizations of templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS template_customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES application_templates(id) ON DELETE CASCADE,
    software_project_id UUID NOT NULL REFERENCES software_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Customization Data
    customizations JSONB DEFAULT '{}'::jsonb, -- User's modifications to the template
    generated_code_id UUID REFERENCES generated_code(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for performance optimization
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_software_projects_project_id ON software_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_software_projects_user_id ON software_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_software_projects_project_type ON software_projects(project_type);
CREATE INDEX IF NOT EXISTS idx_software_projects_status ON software_projects(status);

CREATE INDEX IF NOT EXISTS idx_technology_stacks_category ON technology_stacks(category);
CREATE INDEX IF NOT EXISTS idx_technology_stacks_is_template ON technology_stacks(is_template);
CREATE INDEX IF NOT EXISTS idx_technology_stacks_popularity ON technology_stacks(popularity_score DESC);

CREATE INDEX IF NOT EXISTS idx_database_schemas_software_project_id ON database_schemas(software_project_id);
CREATE INDEX IF NOT EXISTS idx_database_schemas_database_type ON database_schemas(database_type);

CREATE INDEX IF NOT EXISTS idx_api_endpoints_software_project_id ON api_endpoints(software_project_id);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_method_path ON api_endpoints(method, path);

CREATE INDEX IF NOT EXISTS idx_deployment_configs_software_project_id ON deployment_configs(software_project_id);
CREATE INDEX IF NOT EXISTS idx_deployment_configs_platform ON deployment_configs(platform);

CREATE INDEX IF NOT EXISTS idx_application_templates_category ON application_templates(category);
CREATE INDEX IF NOT EXISTS idx_application_templates_is_active ON application_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_application_templates_popularity ON application_templates(popularity_score DESC);

CREATE INDEX IF NOT EXISTS idx_template_customizations_template_id ON template_customizations(template_id);
CREATE INDEX IF NOT EXISTS idx_template_customizations_user_id ON template_customizations(user_id);

-- ============================================================================
-- TRIGGERS for automatic timestamp updates
-- ============================================================================
CREATE OR REPLACE FUNCTION update_software_project_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_software_projects_timestamp
    BEFORE UPDATE ON software_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_software_project_timestamp();

CREATE TRIGGER trigger_update_technology_stacks_timestamp
    BEFORE UPDATE ON technology_stacks
    FOR EACH ROW
    EXECUTE FUNCTION update_software_project_timestamp();

CREATE TRIGGER trigger_update_database_schemas_timestamp
    BEFORE UPDATE ON database_schemas
    FOR EACH ROW
    EXECUTE FUNCTION update_software_project_timestamp();

CREATE TRIGGER trigger_update_api_endpoints_timestamp
    BEFORE UPDATE ON api_endpoints
    FOR EACH ROW
    EXECUTE FUNCTION update_software_project_timestamp();

CREATE TRIGGER trigger_update_deployment_configs_timestamp
    BEFORE UPDATE ON deployment_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_software_project_timestamp();

CREATE TRIGGER trigger_update_application_templates_timestamp
    BEFORE UPDATE ON application_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_software_project_timestamp();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE software_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE technology_stacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_customizations ENABLE ROW LEVEL SECURITY;

-- Software Projects Policies
CREATE POLICY "Users can view their own software projects" ON software_projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own software projects" ON software_projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own software projects" ON software_projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own software projects" ON software_projects
    FOR DELETE USING (auth.uid() = user_id);

-- Technology Stacks Policies (template stacks are public, custom stacks are private)
CREATE POLICY "Anyone can view template technology stacks" ON technology_stacks
    FOR SELECT USING (is_template = true OR auth.uid() = created_by);

CREATE POLICY "Users can create their own technology stacks" ON technology_stacks
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own technology stacks" ON technology_stacks
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own technology stacks" ON technology_stacks
    FOR DELETE USING (auth.uid() = created_by);

-- Database Schemas Policies
CREATE POLICY "Users can view their software project database schemas" ON database_schemas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM software_projects 
            WHERE software_projects.id = database_schemas.software_project_id 
            AND software_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create database schemas for their projects" ON database_schemas
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM software_projects 
            WHERE software_projects.id = database_schemas.software_project_id 
            AND software_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their database schemas" ON database_schemas
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM software_projects 
            WHERE software_projects.id = database_schemas.software_project_id 
            AND software_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their database schemas" ON database_schemas
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM software_projects 
            WHERE software_projects.id = database_schemas.software_project_id 
            AND software_projects.user_id = auth.uid()
        )
    );

-- API Endpoints Policies
CREATE POLICY "Users can view their API endpoints" ON api_endpoints
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM software_projects 
            WHERE software_projects.id = api_endpoints.software_project_id 
            AND software_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create API endpoints for their projects" ON api_endpoints
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM software_projects 
            WHERE software_projects.id = api_endpoints.software_project_id 
            AND software_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their API endpoints" ON api_endpoints
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM software_projects 
            WHERE software_projects.id = api_endpoints.software_project_id 
            AND software_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their API endpoints" ON api_endpoints
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM software_projects 
            WHERE software_projects.id = api_endpoints.software_project_id 
            AND software_projects.user_id = auth.uid()
        )
    );

-- Deployment Configs Policies
CREATE POLICY "Users can view their deployment configs" ON deployment_configs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM software_projects 
            WHERE software_projects.id = deployment_configs.software_project_id 
            AND software_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create deployment configs for their projects" ON deployment_configs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM software_projects 
            WHERE software_projects.id = deployment_configs.software_project_id 
            AND software_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their deployment configs" ON deployment_configs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM software_projects 
            WHERE software_projects.id = deployment_configs.software_project_id 
            AND software_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their deployment configs" ON deployment_configs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM software_projects 
            WHERE software_projects.id = deployment_configs.software_project_id 
            AND software_projects.user_id = auth.uid()
        )
    );

-- Application Templates Policies (active templates are public)
CREATE POLICY "Anyone can view active application templates" ON application_templates
    FOR SELECT USING (is_active = true);

-- Only admins can create/update/delete templates (you'll need an admin role system)
-- For now, we'll allow all authenticated users to suggest templates
CREATE POLICY "Authenticated users can create templates" ON application_templates
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Template Customizations Policies
CREATE POLICY "Users can view their template customizations" ON template_customizations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their template customizations" ON template_customizations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their template customizations" ON template_customizations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their template customizations" ON template_customizations
    FOR DELETE USING (auth.uid() = user_id);

COMMIT;

-- ============================================================================
-- SEED DATA: Technology Stacks
-- ============================================================================
BEGIN;

INSERT INTO technology_stacks (name, description, category, frontend_framework, backend_framework, database, popularity_score, learning_curve, community_size, maturity, pros, cons, best_for, documentation_url, estimated_hosting_cost, is_template) VALUES

-- Web Full-Stack Options
('MERN Stack', 'MongoDB, Express, React, Node.js - Popular JavaScript full-stack', 'full_stack', 'react', 'express', 'mongodb', 95, 'moderate', 'very_large', 'mature',
 ARRAY['Single language (JavaScript)', 'Large community', 'Fast development', 'Great for real-time apps', 'Excellent ecosystem'],
 ARRAY['NoSQL limitations', 'Callback hell without proper async', 'Performance concerns at scale'],
 ARRAY['Real-time applications', 'MVPs and startups', 'Content management systems', 'Social media platforms'],
 'https://www.mongodb.com/mern-stack', '$5-50/month', true),

('MEAN Stack', 'MongoDB, Express, Angular, Node.js - Enterprise JavaScript stack', 'full_stack', 'angular', 'express', 'mongodb', 85, 'steep', 'large', 'mature',
 ARRAY['TypeScript by default', 'Enterprise-ready', 'Strong typing', 'Two-way data binding'],
 ARRAY['Steeper learning curve', 'More boilerplate', 'Heavier than React'],
 ARRAY['Enterprise applications', 'Large-scale projects', 'Complex business logic'],
 'https://angular.io/', '$5-50/month', true),

('Django + React', 'Django REST Framework backend with React frontend', 'full_stack', 'react', 'django', 'postgresql', 90, 'moderate', 'very_large', 'mature',
 ARRAY['Python backend', 'Built-in admin panel', 'Excellent ORM', 'Strong security features', 'Scalable'],
 ARRAY['Monolithic by default', 'Can be overkill for small projects'],
 ARRAY['Data-driven applications', 'Content management', 'Admin dashboards', 'Enterprise apps'],
 'https://www.djangoproject.com/', '$10-100/month', true),

('FastAPI + React', 'Modern Python backend with React frontend', 'full_stack', 'react', 'fastapi', 'postgresql', 88, 'easy', 'large', 'stable',
 ARRAY['Very fast (async)', 'Automatic API documentation', 'Type hints', 'Easy to learn', 'Modern Python'],
 ARRAY['Newer ecosystem', 'Fewer plugins than Django'],
 ARRAY['APIs and microservices', 'ML/AI integration', 'Modern web apps', 'Real-time data'],
 'https://fastapi.tiangolo.com/', '$10-100/month', true),

('Vue + Express', 'Vue.js frontend with Express backend', 'full_stack', 'vue', 'express', 'postgresql', 82, 'easy', 'large', 'mature',
 ARRAY['Progressive framework', 'Easy learning curve', 'Great documentation', 'Flexible'],
 ARRAY['Smaller ecosystem than React', 'Less corporate backing'],
 ARRAY['Progressive web apps', 'User interfaces', 'Small to medium projects'],
 'https://vuejs.org/', '$5-50/month', true),

('Next.js Full-Stack', 'React framework with built-in backend capabilities', 'full_stack', 'next.js', 'next.js', 'postgresql', 92, 'moderate', 'very_large', 'mature',
 ARRAY['Server-side rendering', 'API routes built-in', 'Great performance', 'SEO-friendly', 'Vercel deployment'],
 ARRAY['Vendor lock-in risk', 'More complex than plain React'],
 ARRAY['SEO-critical sites', 'E-commerce', 'Marketing sites', 'SaaS products'],
 'https://nextjs.org/', '$0-50/month (Vercel free tier)', true),

-- Mobile Options
('React Native', 'Build native mobile apps with React', 'mobile', 'react-native', null, 'firebase', 90, 'moderate', 'very_large', 'mature',
 ARRAY['Cross-platform', 'Large community', 'Hot reload', 'Native performance', 'Share code with web'],
 ARRAY['Bridge overhead', 'Native debugging challenges', 'Large app size'],
 ARRAY['Cross-platform apps', 'MVPs', 'Apps with web counterpart'],
 'https://reactnative.dev/', '$0-50/month', true),

('Flutter', 'Google''s UI toolkit for beautiful native apps', 'mobile', 'flutter', null, 'firebase', 88, 'moderate', 'large', 'stable',
 ARRAY['Beautiful UI', 'Fast performance', 'Single codebase', 'Hot reload', 'Growing ecosystem'],
 ARRAY['Dart language', 'Larger app size', 'Fewer packages than React Native'],
 ARRAY['Beautiful UIs', 'Cross-platform apps', 'High-performance apps'],
 'https://flutter.dev/', '$0-50/month', true),

-- Desktop Options
('Electron', 'Build cross-platform desktop apps with web technologies', 'desktop', 'react', null, 'sqlite', 85, 'easy', 'large', 'mature',
 ARRAY['Cross-platform', 'Use web tech', 'Easy for web developers', 'Large ecosystem'],
 ARRAY['Large app size', 'High memory usage', 'Not truly native'],
 ARRAY['Cross-platform desktop apps', 'Developer tools', 'Productivity apps'],
 'https://www.electronjs.org/', 'N/A (desktop app)', true);

COMMIT;

-- ============================================================================
-- SEED DATA: Application Templates
-- ============================================================================
BEGIN;

INSERT INTO application_templates (name, description, category, features, complexity_level, preview_images, setup_instructions, is_active, popularity_score) VALUES

('E-Commerce Starter', 'Full-featured e-commerce platform with cart, checkout, and admin panel', 'ecommerce',
 ARRAY['Product catalog', 'Shopping cart', 'Stripe payment integration', 'Order management', 'Admin dashboard', 'User authentication', 'Product reviews', 'Inventory tracking'],
 'moderate',
 ARRAY['https://via.placeholder.com/800x600/6366f1/ffffff?text=E-Commerce+Preview'],
 '1. Clone repository\n2. Install dependencies: npm install\n3. Configure Stripe API keys\n4. Setup database: npm run db:setup\n5. Run: npm run dev',
 true, 95),

('Social Media Platform', 'Social networking platform with posts, messaging, and notifications', 'social_media',
 ARRAY['User profiles', 'News feed', 'Post creation', 'Like/Comment/Share', 'Real-time messaging', 'Push notifications', 'Friend/Follow system', 'Media uploads'],
 'complex',
 ARRAY['https://via.placeholder.com/800x600/ec4899/ffffff?text=Social+Media+Preview'],
 '1. Clone repository\n2. Install dependencies\n3. Setup MongoDB\n4. Configure WebSocket server\n5. Setup cloud storage for media\n6. Run: npm start',
 true, 88),

('Business Dashboard', 'Comprehensive business management system with CRM and analytics', 'business',
 ARRAY['Analytics dashboard', 'Customer management', 'Invoice generation', 'Reporting', 'Calendar integration', 'Email automation', 'Role-based access', 'PDF exports'],
 'complex',
 ARRAY['https://via.placeholder.com/800x600/10b981/ffffff?text=Business+Dashboard+Preview'],
 '1. Clone repository\n2. Install backend: pip install -r requirements.txt\n3. Install frontend: npm install\n4. Setup PostgreSQL\n5. Run migrations\n6. Start services',
 true, 82),

('Learning Management System', 'Educational platform with courses, quizzes, and progress tracking', 'educational',
 ARRAY['Course catalog', 'Video player', 'Quiz system', 'Progress tracking', 'Discussion forums', 'Certificate generation', 'Student dashboard', 'Instructor portal'],
 'complex',
 ARRAY['https://via.placeholder.com/800x600/3b82f6/ffffff?text=LMS+Preview'],
 '1. Clone repository\n2. Install dependencies\n3. Setup database and video storage\n4. Configure authentication\n5. Seed sample course data\n6. Run: npm run dev',
 true, 90);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the migration was successful:
--
-- SELECT 'software_projects' as table_name, count(*) as row_count FROM software_projects
-- UNION ALL
-- SELECT 'technology_stacks', count(*) FROM technology_stacks
-- UNION ALL
-- SELECT 'database_schemas', count(*) FROM database_schemas
-- UNION ALL
-- SELECT 'api_endpoints', count(*) FROM api_endpoints
-- UNION ALL
-- SELECT 'deployment_configs', count(*) FROM deployment_configs
-- UNION ALL
-- SELECT 'application_templates', count(*) FROM application_templates
-- UNION ALL
-- SELECT 'template_customizations', count(*) FROM template_customizations;
