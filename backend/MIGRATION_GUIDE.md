# AI Project Guidance - Database Migration Guide

## Overview

This guide will help you set up the database schema for the AI Project Guidance feature.

## Prerequisites

- Access to your Supabase project dashboard
- SQL Editor access in Supabase

## Migration Steps

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to the "SQL Editor" section
3. Create a new query

### Step 2: Execute the Migration SQL

Copy and paste the entire contents of `backend/migrations/001_ai_guidance_schema.sql` into the SQL Editor and execute it.

The migration will create:

- **chat_sessions** table - Stores chat sessions between users and AI
- **chat_messages** table - Stores individual messages in chat sessions  
- **ai_context_cache** table - Caches project context for AI processing
- Indexes for performance optimization
- Row Level Security (RLS) policies
- Helper functions for data management

### Step 3: Verify Tables Created

After running the migration, verify that these tables exist in your database:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chat_sessions', 'chat_messages', 'ai_context_cache');
```

You should see all three tables listed.

### Step 4: Test the Setup

Run the verification script to ensure everything is working:

```bash
python backend/scripts/init_ai_guidance.py
```

All checks should now pass.

## Table Schemas

### chat_sessions
- `session_id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key to projects)
- `user_id` (UUID, Foreign Key to users)  
- `start_time` (Timestamp)
- `last_activity` (Timestamp)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### chat_messages
- `message_id` (UUID, Primary Key)
- `session_id` (UUID, Foreign Key to chat_sessions)
- `content` (Text)
- `sender` (Enum: 'user' or 'ai')
- `timestamp` (Timestamp)
- `metadata` (JSONB)
- `created_at` (Timestamp)

### ai_context_cache
- `cache_id` (UUID, Primary Key)
- `project_id` (UUID, Foreign Key to projects)
- `context_data` (JSONB)
- `generated_at` (Timestamp)
- `expires_at` (Timestamp)
- `created_at` (Timestamp)

## Security

The migration includes Row Level Security (RLS) policies that ensure:

- Users can only access their own chat sessions
- Users can only see messages from their own sessions
- Users can only access context cache for their own projects

## Troubleshooting

### Common Issues

1. **Permission Denied**: Make sure you have admin access to the Supabase project
2. **Table Already Exists**: The migration uses `IF NOT EXISTS` so it's safe to run multiple times
3. **Foreign Key Constraints**: Some foreign key constraints are commented out - uncomment them if you have existing `projects` and `users` tables

### Getting Help

If you encounter issues:

1. Check the Supabase logs for detailed error messages
2. Verify your database permissions
3. Ensure the migration SQL syntax is correct for PostgreSQL

## Next Steps

After successful migration:

1. ✅ Database schema is ready
2. ✅ TypeScript interfaces are defined
3. ✅ CRUD operations are implemented
4. ✅ Service layer is created

You can now:
- Implement API endpoints in FastAPI
- Build frontend chat components
- Integrate with the AI service (OpenRouter)
- Test the complete chat functionality