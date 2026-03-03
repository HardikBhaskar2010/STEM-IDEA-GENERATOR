-- Fix RLS policies to allow public access for demo purposes
-- Run this in Supabase SQL Editor: https://satbswbgkcgaddbesgns.supabase.co/project/satbswbgkcgaddbesgns/sql

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can access own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can access own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can access own project context cache" ON public.ai_context_cache;

-- Create permissive policies for public access (demo purposes)
CREATE POLICY "Allow public access to chat sessions" ON public.chat_sessions
    FOR ALL USING (true);

CREATE POLICY "Allow public access to chat messages" ON public.chat_messages
    FOR ALL USING (true);

CREATE POLICY "Allow public access to context cache" ON public.ai_context_cache
    FOR ALL USING (true);

-- Alternatively, you can disable RLS entirely for demo purposes:
-- ALTER TABLE public.chat_sessions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.ai_context_cache DISABLE ROW LEVEL SECURITY;