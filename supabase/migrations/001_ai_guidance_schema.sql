-- AI Project Guidance Database Schema Migration
-- This migration adds the necessary tables for the AI Project Guidance feature
-- Requirements: 7.1, 7.2

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    session_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Add foreign key constraints (assuming projects and users tables exist)
    -- FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    -- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for chat_sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_project_id ON public.chat_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_activity ON public.chat_sessions(last_activity);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    message_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID NOT NULL,
    content TEXT NOT NULL,
    sender VARCHAR(10) CHECK (sender IN ('user', 'ai')) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint
    FOREIGN KEY (session_id) REFERENCES public.chat_sessions(session_id) ON DELETE CASCADE
);

-- Create indexes for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON public.chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender);

-- Create ai_context_cache table
CREATE TABLE IF NOT EXISTS public.ai_context_cache (
    cache_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID NOT NULL,
    context_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Add foreign key constraint (assuming projects table exists)
    -- FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create indexes for ai_context_cache
CREATE INDEX IF NOT EXISTS idx_ai_context_cache_project_id ON public.ai_context_cache(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_context_cache_expires_at ON public.ai_context_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_context_cache_generated_at ON public.ai_context_cache(generated_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for chat_sessions
CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON public.chat_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_context_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (adjust based on your auth system)
-- Users can only access their own chat sessions
CREATE POLICY "Users can access own chat sessions" ON public.chat_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Users can only access messages from their own sessions
CREATE POLICY "Users can access own chat messages" ON public.chat_messages
    FOR ALL USING (
        session_id IN (
            SELECT session_id FROM public.chat_sessions 
            WHERE user_id = auth.uid()
        )
    );

-- Users can only access context cache for their own projects
CREATE POLICY "Users can access own project context cache" ON public.ai_context_cache
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.chat_sessions TO authenticated;
GRANT ALL ON public.chat_messages TO authenticated;
GRANT ALL ON public.ai_context_cache TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create cleanup function for expired context cache
CREATE OR REPLACE FUNCTION cleanup_expired_context_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM public.ai_context_cache 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to get chat session with message count
CREATE OR REPLACE FUNCTION get_chat_session_details(session_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'session', row_to_json(s),
        'message_count', COUNT(m.message_id),
        'last_message_time', MAX(m.timestamp)
    ) INTO result
    FROM public.chat_sessions s
    LEFT JOIN public.chat_messages m ON s.session_id = m.session_id
    WHERE s.session_id = session_uuid
    GROUP BY s.session_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to get recent chat sessions for a user
CREATE OR REPLACE FUNCTION get_user_recent_sessions(user_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_agg(
            json_build_object(
                'session_id', s.session_id,
                'project_id', s.project_id,
                'start_time', s.start_time,
                'last_activity', s.last_activity,
                'message_count', COALESCE(msg_counts.count, 0)
            )
            ORDER BY s.last_activity DESC
        )
        FROM public.chat_sessions s
        LEFT JOIN (
            SELECT session_id, COUNT(*) as count
            FROM public.chat_messages
            GROUP BY session_id
        ) msg_counts ON s.session_id = msg_counts.session_id
        WHERE s.user_id = user_uuid
        ORDER BY s.last_activity DESC
        LIMIT limit_count
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;