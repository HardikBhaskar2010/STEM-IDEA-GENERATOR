-- ============================================================================
-- UNIVERSAL CHAT HISTORY TABLES
-- ============================================================================
-- Run this SQL in Supabase SQL Editor to create the universal chat tables
-- ============================================================================

-- Create universal_chat_messages table
CREATE TABLE IF NOT EXISTS public.universal_chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'action', 'navigation', 'project_created')),
    
    -- Voice-specific metadata
    voice_transcript TEXT,  -- Original voice transcript if different from content
    voice_duration DECIMAL(5,2),  -- Duration in seconds
    voice_confidence DECIMAL(3,2),  -- Speech recognition confidence (0.0-1.0)
    
    -- Action metadata (for navigation, project creation, etc.)
    action_type VARCHAR(100),  -- navigate, project_created, suggest_navigation, etc.
    action_parameters JSONB DEFAULT '{}',  -- Action-specific data
    
    -- Response metadata
    response_metadata JSONB DEFAULT '{}',  -- AI response metadata, TTS info, etc.
    
    -- Conversation context
    conversation_context JSONB DEFAULT '{}',  -- Context carried between messages
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_universal_chat_user_id ON public.universal_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_universal_chat_session_id ON public.universal_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_universal_chat_role ON public.universal_chat_messages(role);
CREATE INDEX IF NOT EXISTS idx_universal_chat_created_at ON public.universal_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_universal_chat_message_type ON public.universal_chat_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_universal_chat_action_type ON public.universal_chat_messages(action_type);

-- Create composite index for user sessions
CREATE INDEX IF NOT EXISTS idx_universal_chat_user_session ON public.universal_chat_messages(user_id, session_id, created_at DESC);

-- Add trigger for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_universal_chat_messages_updated_at 
    BEFORE UPDATE ON public.universal_chat_messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.universal_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (allow all for guest users - customize later if needed)
CREATE POLICY "Allow all operations on universal_chat_messages" 
    ON public.universal_chat_messages 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- ============================================================================
-- Create chat sessions table for better session management
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.universal_chat_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(500),  -- Auto-generated or user-defined session title
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,
    session_metadata JSONB DEFAULT '{}',  -- Session-specific data
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for chat sessions
CREATE INDEX IF NOT EXISTS idx_universal_chat_sessions_user_id ON public.universal_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_universal_chat_sessions_session_id ON public.universal_chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_universal_chat_sessions_active ON public.universal_chat_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_universal_chat_sessions_last_message ON public.universal_chat_sessions(last_message_at DESC);

-- Add trigger for automatic updated_at timestamp
CREATE TRIGGER update_universal_chat_sessions_updated_at 
    BEFORE UPDATE ON public.universal_chat_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.universal_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all operations on universal_chat_sessions" 
    ON public.universal_chat_sessions 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- ============================================================================
-- Create function to automatically update session metadata
-- ============================================================================
CREATE OR REPLACE FUNCTION update_chat_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or create session record
    INSERT INTO public.universal_chat_sessions (
        session_id, 
        user_id, 
        message_count, 
        last_message_at,
        title
    ) VALUES (
        NEW.session_id,
        NEW.user_id,
        1,
        NEW.created_at,
        CASE 
            WHEN NEW.role = 'user' THEN 
                CASE 
                    WHEN LENGTH(NEW.content) > 50 THEN LEFT(NEW.content, 47) || '...'
                    ELSE NEW.content
                END
            ELSE 'New Chat Session'
        END
    )
    ON CONFLICT (session_id) DO UPDATE SET
        message_count = universal_chat_sessions.message_count + 1,
        last_message_at = NEW.created_at,
        updated_at = NOW(),
        -- Update title only if it's still the default and this is a user message
        title = CASE 
            WHEN universal_chat_sessions.title = 'New Chat Session' AND NEW.role = 'user' THEN
                CASE 
                    WHEN LENGTH(NEW.content) > 50 THEN LEFT(NEW.content, 47) || '...'
                    ELSE NEW.content
                END
            ELSE universal_chat_sessions.title
        END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update session on new message
CREATE TRIGGER update_session_on_new_message
    AFTER INSERT ON public.universal_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_session_on_message();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the tables were created successfully:

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('universal_chat_messages', 'universal_chat_sessions');

-- Check table structures
\d public.universal_chat_messages;
\d public.universal_chat_sessions;

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('universal_chat_messages', 'universal_chat_sessions') 
AND schemaname = 'public';

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================
-- Uncomment and run this section to create sample data for testing

/*
-- Insert a sample user if not exists (for testing)
INSERT INTO public.users (guest_id, preferences) 
VALUES ('guest_test_universal_chat', '{"theme": "dark"}')
ON CONFLICT (guest_id) DO NOTHING;

-- Insert sample chat messages
WITH sample_user AS (
    SELECT id FROM public.users WHERE guest_id = 'guest_test_universal_chat' LIMIT 1
)
INSERT INTO public.universal_chat_messages (
    user_id, 
    session_id, 
    role, 
    content, 
    message_type,
    voice_transcript,
    action_type,
    action_parameters
) 
SELECT 
    sample_user.id,
    'session_test_universal_001',
    'user',
    'Help me create a robotics project of expert level',
    'voice',
    'Help me create a robotics project of expert level',
    NULL,
    '{}'
FROM sample_user
UNION ALL
SELECT 
    sample_user.id,
    'session_test_universal_001',
    'assistant',
    '🎉 **AMAZING! I just created your perfect project!** ✨

**📋 What you asked for:**
• **Your request**: "Help me create a robotics project of expert level"
• **Project type**: Robotics
• **Skill level**: Expert

**🚀 Here''s what I created for you:**

## **Advanced Autonomous Navigation Robot**

A sophisticated robotics project featuring advanced navigation algorithms, sensor fusion, and machine learning capabilities. Perfect for expert-level makers who want to push the boundaries of autonomous robotics!',
    'text',
    NULL,
    'project_created',
    '{"project": {"title": "Advanced Autonomous Navigation Robot", "difficulty": "Expert"}, "saved": true}'
FROM sample_user;
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created:
-- 1. universal_chat_messages - stores all chat messages with metadata
-- 2. universal_chat_sessions - manages chat sessions
-- 3. Automatic triggers for session tracking
-- 4. Proper indexing for performance
-- 5. RLS policies for security
-- ============================================================================