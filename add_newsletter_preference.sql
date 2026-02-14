-- ============================================================================
-- ADD NEWSLETTER PREFERENCE TO PROFILES TABLE
-- ============================================================================
-- Run this in your Supabase SQL Editor to add newsletter preference

-- Add newsletter_subscribed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS newsletter_subscribed BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.newsletter_subscribed IS 'Whether user opted-in to receive newsletters and promotional emails';

-- Create index for faster queries on newsletter subscribers
CREATE INDEX IF NOT EXISTS idx_profiles_newsletter_subscribed 
ON public.profiles(newsletter_subscribed) 
WHERE newsletter_subscribed = true;

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- Newsletter preference column added successfully!
-- Users can now opt-in during signup or update their preference later.
