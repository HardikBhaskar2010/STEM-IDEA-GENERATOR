-- ============================================================================
-- STEM IDEA ADVENTURE - ADMIN SECURITY POLICIES
-- ============================================================================
-- This SQL script sets up Row Level Security (RLS) policies to ensure only
-- the owner/admin can modify components in the database.
-- 
-- IMPORTANT: Run this in your Supabase SQL Editor
-- ============================================================================

-- Step 1: Enable Row Level Security on components table
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if any (clean slate)
DROP POLICY IF EXISTS "Anyone can view components" ON public.components;
DROP POLICY IF EXISTS "Only admin can insert components" ON public.components;
DROP POLICY IF EXISTS "Only admin can update components" ON public.components;
DROP POLICY IF EXISTS "Only admin can delete components" ON public.components;

-- Step 3: Create SELECT policy - Everyone can read components
CREATE POLICY "Anyone can view components"
ON public.components
FOR SELECT
USING (true);

-- Step 4: Create INSERT policy - Only admin can add components
CREATE POLICY "Only admin can insert components"
ON public.components
FOR INSERT
WITH CHECK (
  auth.jwt()->>'email' = 'hardik.bhaskar2010@gmail.com'
);

-- Step 5: Create UPDATE policy - Only admin can update components
CREATE POLICY "Only admin can update components"
ON public.components
FOR UPDATE
USING (
  auth.jwt()->>'email' = 'hardik.bhaskar2010@gmail.com'
)
WITH CHECK (
  auth.jwt()->>'email' = 'hardik.bhaskar2010@gmail.com'
);

-- Step 6: Create DELETE policy - Only admin can delete components
CREATE POLICY "Only admin can delete components"
ON public.components
FOR DELETE
USING (
  auth.jwt()->>'email' = 'hardik.bhaskar2010@gmail.com'
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the policies are working correctly:

-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'components';

-- 2. List all policies on components table
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'components';

-- ============================================================================
-- TESTING
-- ============================================================================
-- To test the policies:
-- 1. Log in as the admin user (hardik.bhaskar2010@gmail.com)
--    - You should be able to add, edit, and delete components
-- 
-- 2. Log in as a regular user (any other email)
--    - You should be able to view components
--    - You should NOT be able to add, edit, or delete components
-- 
-- 3. As a guest (not logged in)
--    - You should be able to view components
--    - You should NOT be able to add, edit, or delete components
-- ============================================================================

-- ============================================================================
-- NOTES
-- ============================================================================
-- * These policies work at the DATABASE level, providing security even if
--   someone bypasses the frontend
-- * The admin email is hardcoded in the policies. To change it later, you'll
--   need to drop and recreate the policies with the new email
-- * RLS policies only affect authenticated users through Supabase Auth
-- * Service role key bypasses RLS (used for admin operations in backend)
-- ============================================================================
