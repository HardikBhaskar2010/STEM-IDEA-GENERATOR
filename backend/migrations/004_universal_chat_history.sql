-- ============================================================================
-- MIGRATION 004: Universal Chat History
-- ============================================================================
-- Creates table for storing universal voice chat conversations
-- This is separate from project-specific chat_messages table
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
-- Sample data for testing (optional - remove in production)
-- ============================================================================
-- This creates a sample session for testing purposes
-- Remove this section when running in production

/*
-- Insert a sample user if not exists (for testing)
INSERT INTO public.users (guest_id, preferences) 
VALUES ('guest_test_123', '{"theme": "dark"}')
ON CONFLICT (guest_id) DO NOTHING;

-- Insert sample chat messages
WITH sample_user AS (
    SELECT id FROM public.users WHERE guest_id = 'guest_test_123' LIMIT 1
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
    'session_test_001',
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
    'session_test_001',
    'assistant',
    '🎉 **AMAZING! I just created your perfect project!** ✨\n\n**📋 What you asked for:**\n• **Your request**: "Help me create a robotics project of expert level"\n• **Project type**: Robotics\n• **Skill level**: Expert\n\n**🚀 Here''s what I created for you:**\n\n## **Advanced Autonomous Navigation Robot**\n\nA sophisticated robotics project featuring advanced navigation algorithms...',
    'text',
    NULL,
    'project_created',
    '{"project": {"title": "Advanced Autonomous Navigation Robot", "difficulty": "Expert"}, "saved": true}'
FROM sample_user;
*/

-- ============================================================================
-- Migration complete
-- ============================================================================
-- This migration adds:
-- 1. universal_chat_messages table for storing voice chat history
-- 2. universal_chat_sessions table for session management
-- 3. Automatic session tracking with triggers
-- 4. Proper indexing for performance
-- 5. RLS policies for security
-- ============================================================================