# URGENT FIX: 500 Error Resolution

## Problem Identified
The 500 errors are caused by Row Level Security (RLS) policies in Supabase that are blocking database access. The current setup uses the `anon` key which doesn't have permission to bypass RLS policies.

## Quick Fix Options

### Option 1: Disable RLS (Fastest - Recommended for Demo)

1. Go to Supabase SQL Editor: https://satbswbgkcgaddbesgns.supabase.co/project/satbswbgkcgaddbesgns/sql

2. Run this SQL command:

```sql
-- Disable RLS for demo purposes
ALTER TABLE public.chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_context_cache DISABLE ROW LEVEL SECURITY;
```

### Option 2: Update RLS Policies (More Secure)

1. Go to Supabase SQL Editor: https://satbswbgkcgaddbesgns.supabase.co/project/satbswbgkcgaddbesgns/sql

2. Run this SQL command:

```sql
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can access own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can access own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can access own project context cache" ON public.ai_context_cache;

-- Create permissive policies for public access
CREATE POLICY "Allow public access to chat sessions" ON public.chat_sessions
    FOR ALL USING (true);

CREATE POLICY "Allow public access to chat messages" ON public.chat_messages
    FOR ALL USING (true);

CREATE POLICY "Allow public access to context cache" ON public.ai_context_cache
    FOR ALL USING (true);
```

### Option 3: Use Service Role Key (Most Secure)

1. Go to Supabase Settings > API: https://satbswbgkcgaddbesgns.supabase.co/project/satbswbgkcgaddbesgns/settings/api

2. Copy the `service_role` key (not the `anon` key)

3. Update `backend/.env`:

```env
# Replace the SUPABASE_KEY with the service_role key
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdGJzd2Jna2NnYWRkYmVzZ25zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkyNzg1NSwiZXhwIjoyMDgyNTAzODU1fQ.SERVICE_ROLE_KEY_HERE
```

## Testing the Fix

After applying any of the above fixes, test with:

```bash
cd backend
python test_ai_service.py
```

You should see:
```
✅ All AI Service tests passed!
```

## Root Cause
The issue was in the database migration file `backend/migrations/001_ai_guidance_schema.sql` which created RLS policies that expect authenticated users, but the application is running without proper authentication context.

## Recommended Solution
For a production deployment, implement proper authentication and use the service role key on the backend while keeping RLS enabled with appropriate policies.

For this demo, **Option 1 (Disable RLS)** is the fastest fix.