-- ============================================================================
-- MIGRATION 009: Extend public.users to support email-authenticated users
-- ============================================================================
-- Run this on your Supabase project AFTER 007 and 008.
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT DO UPDATE.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add new columns FIRST (indexes depend on these columns existing)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS auth_user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS email               TEXT,
    ADD COLUMN IF NOT EXISTS display_name        TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url          TEXT,
    ADD COLUMN IF NOT EXISTS provider            TEXT        DEFAULT 'guest',
    ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN     DEFAULT true,
    ADD COLUMN IF NOT EXISTS email_marketing     BOOLEAN     DEFAULT false,
    ADD COLUMN IF NOT EXISTS bio                 TEXT,
    ADD COLUMN IF NOT EXISTS username            TEXT,
    ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fix the guest_id uniqueness constraint
--    Replace the global UNIQUE on guest_id with two partial unique indexes:
--      • guest rows → unique on guest_id WHERE auth_user_id IS NULL
--      • auth rows  → unique on auth_user_id WHERE auth_user_id IS NOT NULL
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop the old global unique constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema    = 'public'
          AND table_name      = 'users'
          AND constraint_name = 'users_guest_id_key'
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_guest_id_key;
    END IF;
END;
$$;

-- Drop any leftover plain indexes on guest_id
DROP INDEX IF EXISTS public.users_guest_id_key;
DROP INDEX IF EXISTS public.idx_users_guest_id;

-- Partial unique index: guest_id unique only for pure guest rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_guest_id_unique
    ON public.users(guest_id)
    WHERE auth_user_id IS NULL;

-- Partial unique index: one row per authenticated Supabase user
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id
    ON public.users(auth_user_id)
    WHERE auth_user_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Auth users manage own user row" ON public.users;
CREATE POLICY "Auth users manage own user row"
    ON public.users FOR ALL
    USING  (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

-- Guest policies from 007 are preserved:
--   "Users manage own guest row" and "Anon can insert guest row"

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Update handle_new_user() trigger
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

    -- ── Upsert into public.profiles ───────────────────────────────────────────
    INSERT INTO public.profiles (user_id, display_name, avatar_url, username)
    VALUES (NEW.id, v_display_name, v_avatar_url, v_username)
    ON CONFLICT (user_id) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            avatar_url   = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
            updated_at   = NOW();

    -- ── Upsert into public.users (auth row) ───────────────────────────────────
    -- guest_id = 'auth:<uuid>' is unique per user and distinguishable from
    -- real guest IDs. The partial index on auth_user_id handles dedup.
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
    VALUES (
        NEW.id,
        'auth:' || NEW.id::text,
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

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. updated_at auto-trigger
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Backfill existing auth users
-- ─────────────────────────────────────────────────────────────────────────────

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
    'auth:' || au.id::text,
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
-- 7. Grants
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
