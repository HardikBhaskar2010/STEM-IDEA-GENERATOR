-- ============================================================================
-- MIGRATION 009: Extend public.users to support email-authenticated users
-- ============================================================================
-- Run this on your Supabase project AFTER 007 and 008.
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT DO UPDATE.
--
-- What this does:
--   • Adds email, auth_user_id, display_name, avatar_url, email_marketing,
--     email_notifications, provider columns to public.users
--   • guest_id = 'N/A' for email/OAuth authenticated users
--   • Updates the handle_new_user() trigger to ALSO upsert into public.users
--   • Adds proper RLS policy so auth users can see/edit their own row
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add new columns to public.users (all safe with IF NOT EXISTS equivalent
--    — Postgres uses DO blocks for conditional DDL)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS auth_user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS email              TEXT,
    ADD COLUMN IF NOT EXISTS display_name       TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url         TEXT,
    ADD COLUMN IF NOT EXISTS provider           TEXT        DEFAULT 'guest',  -- 'guest' | 'email' | 'google'
    ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN    DEFAULT true,
    ADD COLUMN IF NOT EXISTS email_marketing    BOOLEAN     DEFAULT false,
    ADD COLUMN IF NOT EXISTS bio                TEXT,
    ADD COLUMN IF NOT EXISTS username           TEXT,
    ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ DEFAULT NOW();

-- Unique index on auth_user_id (one row per auth user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id
    ON public.users(auth_user_id)
    WHERE auth_user_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Drop and recreate RLS policies for the extended table
-- ─────────────────────────────────────────────────────────────────────────────

-- Allow authenticated users to read/update THEIR OWN row (by auth_user_id)
DROP POLICY IF EXISTS "Auth users manage own user row" ON public.users;
CREATE POLICY "Auth users manage own user row"
    ON public.users FOR ALL
    USING  (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

-- Keep existing guest policy (auth.uid()::text = guest_id)
-- already exists from 007 as "Users manage own guest row"

-- Anon insert still allowed for guest self-registration
-- already exists from 007 as "Anon can insert guest row"

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Update handle_new_user() trigger to also upsert into public.users
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_display_name TEXT;
    v_avatar_url   TEXT;
    v_username     TEXT;
    v_provider     TEXT;
BEGIN
    -- Extract from OAuth / email metadata
    v_display_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'display_name',
        split_part(NEW.email, '@', 1)
    );
    v_avatar_url := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture'
    );
    v_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        split_part(NEW.email, '@', 1)
    );
    v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

    -- ── Upsert into public.profiles (existing behaviour) ──────────────────────
    INSERT INTO public.profiles (user_id, display_name, avatar_url, username)
    VALUES (NEW.id, v_display_name, v_avatar_url, v_username)
    ON CONFLICT (user_id) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            avatar_url   = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
            updated_at   = NOW();

    -- ── Upsert into public.users (NEW — auth user row) ────────────────────────
    INSERT INTO public.users (
        auth_user_id,
        guest_id,          -- 'N/A' for all email/OAuth users
        email,
        display_name,
        avatar_url,
        username,
        provider,
        last_active,
        updated_at
    )
    VALUES (
        NEW.id,
        'N/A',
        NEW.email,
        v_display_name,
        v_avatar_url,
        v_username,
        v_provider,
        NOW(),
        NOW()
    )
    ON CONFLICT (auth_user_id) WHERE auth_user_id IS NOT NULL
    DO UPDATE
        SET email        = EXCLUDED.email,
            display_name = EXCLUDED.display_name,
            avatar_url   = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
            provider     = EXCLUDED.provider,
            last_active  = NOW(),
            updated_at   = NOW();

    RETURN NEW;
END;
$$;

-- Re-attach trigger (DROP + CREATE is idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. updated_at auto-trigger for public.users
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Backfill existing auth users who signed up before this migration
-- ─────────────────────────────────────────────────────────────────────────────
-- Reads from auth.users (requires service_role — run this in the Supabase SQL editor)

INSERT INTO public.users (
    auth_user_id,
    guest_id,
    email,
    display_name,
    avatar_url,
    username,
    provider,
    last_active,
    updated_at
)
SELECT
    au.id,
    'N/A',
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        split_part(au.email, '@', 1)
    ),
    COALESCE(
        au.raw_user_meta_data->>'avatar_url',
        au.raw_user_meta_data->>'picture'
    ),
    COALESCE(
        au.raw_user_meta_data->>'username',
        split_part(au.email, '@', 1)
    ),
    COALESCE(au.raw_app_meta_data->>'provider', 'email'),
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email IS NOT NULL
ON CONFLICT (auth_user_id) WHERE auth_user_id IS NOT NULL
DO UPDATE
    SET email        = EXCLUDED.email,
        display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
        provider     = EXCLUDED.provider,
        updated_at   = NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Grants
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
