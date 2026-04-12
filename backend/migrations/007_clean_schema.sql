-- ============================================================================
-- MIGRATION 007: Clean Authoritative Schema
-- ============================================================================
-- Run this on a FRESH Supabase project to get the complete schema in one shot.
-- Safe to run over existing installs: all DDL uses IF NOT EXISTS / OR REPLACE.
--
-- Dependency order:
--   0. Extensions
--   1. Helper functions
--   2. public.users        (guest tracking, no auth dependency)
--   3. public.profiles     (auth.users FK + preferences)
--   4. public.user_preferences (NEW — per-key typed preferences)
--   5. public.components   (seed separately in 008)
--   6. public.projects
--   7. generated_code / code_files / file_metadata / generation_history
--   8. veronica_project_chats / veronica_chat_messages
--   9. veronica_community_posts / veronica_community_upvotes
--  10. effect_presets
--  11. universal_chat_sessions / universal_chat_messages
--  12. teams / team_members / idea_submissions / idea_votes
--  13. achievements / user_achievements / achievement_progress / user_levels / user_activities
--  14. software_projects / technology_stacks / application_templates / database_schemas
--      api_endpoints / deployment_configs / template_customizations
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- for text-search indexes

-- ============================================================================
-- 1. HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. public.users  (guest / anonymous tracking row)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id    VARCHAR(255) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    preferences JSONB DEFAULT '{}',
    metadata    JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_users_guest_id ON public.users(guest_id);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Guests can create/read their own row (matched by guest_id cookie).
-- Authenticated users get a row too (guest_id = auth.uid()::text is fine).
DROP POLICY IF EXISTS "Users manage own guest row" ON public.users;
CREATE POLICY "Users manage own guest row"
    ON public.users FOR ALL
    USING  (auth.uid()::text = guest_id OR guest_id = 'anon')
    WITH CHECK (auth.uid()::text = guest_id OR guest_id = 'anon');

-- Allow anon inserts so guest users can register themselves.
DROP POLICY IF EXISTS "Anon can insert guest row" ON public.users;
CREATE POLICY "Anon can insert guest row"
    ON public.users FOR INSERT
    WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;

-- ============================================================================
-- 3. public.profiles  (one row per authenticated Supabase user)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username             TEXT UNIQUE,
    display_name         TEXT,
    bio                  TEXT,
    avatar_url           TEXT,
    interests            TEXT[] DEFAULT '{}',
    skills               TEXT[] DEFAULT '{}',
    newsletter_subscribed BOOLEAN DEFAULT false,
    -- Typed preference blob — quick reads without joining user_preferences
    preferences          JSONB DEFAULT '{}',
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username)
    WHERE username IS NOT NULL;

CREATE OR REPLACE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
CREATE POLICY "Users manage own profile"
    ON public.profiles FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public profiles are readable" ON public.profiles;
CREATE POLICY "Public profiles are readable"
    ON public.profiles FOR SELECT USING (true);

-- Auto-create a profile row on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO authenticated;

-- ============================================================================
-- 4. public.user_preferences  (NEW — per-key typed preference storage)
-- ============================================================================
--
-- Why a separate table instead of just profiles.preferences?
--   • Fine-grained RLS per preference category
--   • Allows partial updates without reading the whole blob
--   • Easier to query: "all users who enabled dark mode"
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Namespace for the preference, e.g. "theme", "notifications", "veronica"
    category   TEXT NOT NULL DEFAULT 'general',
    -- The preference key, e.g. "dark_mode", "email_notifications"
    key        TEXT NOT NULL,
    -- The value — any JSON scalar or object
    value      JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, category, key)
);

CREATE INDEX IF NOT EXISTS idx_user_prefs_user_id
    ON public.user_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_prefs_category
    ON public.user_preferences(user_id, category);

CREATE OR REPLACE TRIGGER user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own prefs" ON public.user_preferences;
CREATE POLICY "Users manage own prefs"
    ON public.user_preferences FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.user_preferences TO authenticated;

COMMENT ON TABLE public.user_preferences IS
    'Per-user preference storage. Replaces localStorage for authenticated users. '
    'Use upsert on (user_id, category, key) to set a preference.';

-- ============================================================================
-- 5. public.components  (structure — seeded separately in 008)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.components (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  VARCHAR(255) NOT NULL,
    category              VARCHAR(100) NOT NULL,
    description           TEXT,
    price                 VARCHAR(20),         -- e.g. "$12.00"
    stock                 VARCHAR(50) DEFAULT 'In Stock',
    stock_count           INTEGER DEFAULT 0,
    manufacturer          VARCHAR(255),
    model_number          VARCHAR(100),
    datasheet_url         TEXT,
    image_url             TEXT,
    specifications        JSONB DEFAULT '{}',
    tags                  TEXT[] DEFAULT '{}',
    dimensions            JSONB DEFAULT '{}',
    weight                NUMERIC,
    operating_voltage_min NUMERIC,
    operating_voltage_max NUMERIC,
    operating_current     NUMERIC,
    power_consumption     NUMERIC,
    interface_type        VARCHAR(100),
    pin_count             INTEGER,
    package_type          VARCHAR(100),
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_components_category  ON public.components(category);
CREATE INDEX IF NOT EXISTS idx_components_name_trgm ON public.components USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_components_tags      ON public.components USING GIN (tags);

CREATE OR REPLACE TRIGGER components_updated_at
    BEFORE UPDATE ON public.components
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Components are public read" ON public.components;
CREATE POLICY "Components are public read"
    ON public.components FOR SELECT USING (true);

GRANT SELECT ON public.components TO anon, authenticated;

-- ============================================================================
-- 6. public.projects
-- ============================================================================
--
-- NOTE: user_id references auth.users so authenticated projects have proper
-- ownership. Guest projects use user_id = NULL.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.projects (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- NULL for guest users; set to auth.uid() after sign-in
    user_id                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title                  VARCHAR(255) NOT NULL,
    description            TEXT,
    difficulty             VARCHAR(50),
    estimated_time         VARCHAR(100),
    estimated_cost         VARCHAR(100),
    components             TEXT[] DEFAULT '{}',
    skills                 TEXT[] DEFAULT '{}',
    steps                  TEXT[] DEFAULT '{}',
    status                 VARCHAR(50) DEFAULT 'planning',
    progress               INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    notes                  TEXT DEFAULT '',
    starred                BOOLEAN DEFAULT false,
    tags                   TEXT[] DEFAULT '{}',
    completed_steps        INTEGER[] DEFAULT '{}',
    generated_from_params  JSONB DEFAULT '{}',
    has_generated_code     BOOLEAN DEFAULT false,
    code_generation_count  INTEGER DEFAULT 0,
    last_code_generated_at TIMESTAMPTZ,
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id   ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status    ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_starred   ON public.projects(starred) WHERE starred = true;
CREATE INDEX IF NOT EXISTS idx_projects_created   ON public.projects(created_at DESC);

CREATE OR REPLACE TRIGGER projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Authenticated users see only their own projects
DROP POLICY IF EXISTS "Auth users manage own projects" ON public.projects;
CREATE POLICY "Auth users manage own projects"
    ON public.projects FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Guest / unauthenticated: allow insert and read only for rows with no owner
DROP POLICY IF EXISTS "Guests can insert unowned projects" ON public.projects;
CREATE POLICY "Guests can insert unowned projects"
    ON public.projects FOR INSERT
    WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "Guests can read unowned projects" ON public.projects;
CREATE POLICY "Guests can read unowned projects"
    ON public.projects FOR SELECT
    USING (user_id IS NULL);

GRANT SELECT, INSERT, UPDATE ON public.projects TO anon, authenticated;

-- ============================================================================
-- 7. Code generation tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.generated_code (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id         UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    generation_request JSONB NOT NULL,
    status             VARCHAR(20) DEFAULT 'generating'
                       CHECK (status IN ('generating', 'completed', 'failed')),
    platform           VARCHAR(50) NOT NULL
                       CHECK (platform IN ('arduino', 'raspberry_pi', 'web', 'mobile')),
    error_message      TEXT,
    metadata           JSONB DEFAULT '{}',
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    completed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_generated_code_project ON public.generated_code(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_code_user    ON public.generated_code(user_id);

ALTER TABLE public.generated_code ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own generated code" ON public.generated_code;
CREATE POLICY "Users manage own generated code"
    ON public.generated_code FOR ALL
    USING  (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

GRANT ALL ON public.generated_code TO authenticated;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.code_files (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generated_code_id UUID NOT NULL REFERENCES public.generated_code(id) ON DELETE CASCADE,
    file_path        VARCHAR(500) NOT NULL,
    file_name        VARCHAR(255) NOT NULL,
    file_type        VARCHAR(100) NOT NULL,
    content          TEXT NOT NULL,
    description      TEXT,
    size_bytes       INTEGER,
    is_main_file     BOOLEAN DEFAULT false,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_code_files_generated_code ON public.code_files(generated_code_id);

ALTER TABLE public.code_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access files via generated_code" ON public.code_files;
CREATE POLICY "Users access files via generated_code"
    ON public.code_files FOR ALL
    USING (
        generated_code_id IN (
            SELECT id FROM public.generated_code
            WHERE user_id = auth.uid() OR user_id IS NULL
        )
    );

GRANT ALL ON public.code_files TO authenticated;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.file_metadata (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_file_id         UUID NOT NULL REFERENCES public.code_files(id) ON DELETE CASCADE,
    download_count       INTEGER DEFAULT 0,
    last_downloaded_at   TIMESTAMPTZ,
    is_modified          BOOLEAN DEFAULT false,
    original_content     TEXT,
    modification_history JSONB DEFAULT '[]',
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.file_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "File metadata via code_files" ON public.file_metadata;
CREATE POLICY "File metadata via code_files"
    ON public.file_metadata FOR ALL
    USING (
        code_file_id IN (
            SELECT cf.id FROM public.code_files cf
            JOIN public.generated_code gc ON gc.id = cf.generated_code_id
            WHERE gc.user_id = auth.uid() OR gc.user_id IS NULL
        )
    );

GRANT ALL ON public.file_metadata TO authenticated;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.generation_history (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    project_id       UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    generated_code_id UUID REFERENCES public.generated_code(id) ON DELETE SET NULL,
    action           VARCHAR(50) NOT NULL
                     CHECK (action IN ('generate', 'regenerate', 'modify', 'download', 'view', 'copy')),
    parameters       JSONB,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gen_history_user   ON public.generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_gen_history_project ON public.generation_history(project_id);

ALTER TABLE public.generation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own generation history" ON public.generation_history;
CREATE POLICY "Users see own generation history"
    ON public.generation_history FOR ALL
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

GRANT SELECT, INSERT ON public.generation_history TO authenticated;

-- ============================================================================
-- 8. Veronica chat tables  (from migration 006, reproduced cleanly)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.veronica_project_chats (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    mode            VARCHAR(20)  NOT NULL DEFAULT 'idea'
                    CHECK (mode IN ('idea', 'full_build', 'debug')),
    project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    message_count   INTEGER NOT NULL DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    is_archived     BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_veronica_chats_user      ON public.veronica_project_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_veronica_chats_archived  ON public.veronica_project_chats(is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_veronica_chats_last_msg  ON public.veronica_project_chats(last_message_at DESC);

CREATE OR REPLACE TRIGGER veronica_project_chats_updated_at
    BEFORE UPDATE ON public.veronica_project_chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.veronica_project_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own Veronica chats" ON public.veronica_project_chats;
CREATE POLICY "Users manage own Veronica chats"
    ON public.veronica_project_chats FOR ALL
    USING  (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Guests (unauthenticated) can create and read anonymous chats
DROP POLICY IF EXISTS "Anon can insert Veronica chats" ON public.veronica_project_chats;
CREATE POLICY "Anon can insert Veronica chats"
    ON public.veronica_project_chats FOR INSERT
    WITH CHECK (user_id IS NULL);

GRANT ALL ON public.veronica_project_chats TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.veronica_project_chats TO anon;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.veronica_chat_messages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id      UUID NOT NULL REFERENCES public.veronica_project_chats(id) ON DELETE CASCADE,
    role         VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content      TEXT NOT NULL,
    intent       VARCHAR(100),
    confidence   NUMERIC(4,3),
    actions      JSONB DEFAULT '[]',
    project_snap JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_veronica_msgs_chat ON public.veronica_chat_messages(chat_id, created_at ASC);

ALTER TABLE public.veronica_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access msgs in own chats" ON public.veronica_chat_messages;
CREATE POLICY "Users access msgs in own chats"
    ON public.veronica_chat_messages FOR ALL
    USING (
        chat_id IN (
            SELECT id FROM public.veronica_project_chats
            WHERE user_id = auth.uid() OR user_id IS NULL
        )
    )
    WITH CHECK (
        chat_id IN (
            SELECT id FROM public.veronica_project_chats
            WHERE user_id = auth.uid() OR user_id IS NULL
        )
    );

DROP POLICY IF EXISTS "Anon can insert veronica_chat_messages" ON public.veronica_chat_messages;
CREATE POLICY "Anon can insert veronica_chat_messages"
    ON public.veronica_chat_messages FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can read veronica_chat_messages" ON public.veronica_chat_messages;
CREATE POLICY "Anon can read veronica_chat_messages"
    ON public.veronica_chat_messages FOR SELECT
    TO anon
    USING (true);

GRANT ALL ON public.veronica_chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.veronica_chat_messages TO anon;

-- Trigger: keep parent chat stats in sync
CREATE OR REPLACE FUNCTION sync_veronica_chat_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.veronica_project_chats
    SET
        message_count   = message_count + 1,
        last_message_at = NEW.created_at,
        title = CASE
            WHEN title = 'New Chat' AND NEW.role = 'user'
            THEN CASE
                WHEN LENGTH(NEW.content) > 60 THEN LEFT(NEW.content, 57) || '…'
                ELSE NEW.content
            END
            ELSE title
        END,
        updated_at = NOW()
    WHERE id = NEW.chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS veronica_chat_message_inserted ON public.veronica_chat_messages;
CREATE TRIGGER veronica_chat_message_inserted
    AFTER INSERT ON public.veronica_chat_messages
    FOR EACH ROW EXECUTE FUNCTION sync_veronica_chat_stats();

-- ============================================================================
-- 9. Community posts & upvotes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.veronica_community_posts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    project_id    UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    platform      VARCHAR(100),
    difficulty    VARCHAR(20)
                  CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
    tags          TEXT[] DEFAULT '{}',
    upvotes       INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    is_featured   BOOLEAN NOT NULL DEFAULT false,
    is_approved   BOOLEAN NOT NULL DEFAULT false,
    thumbnail_url TEXT,
    repo_url      TEXT,
    demo_url      TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_approved ON public.veronica_community_posts(is_approved) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_community_posts_featured ON public.veronica_community_posts(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_community_posts_author   ON public.veronica_community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_tags     ON public.veronica_community_posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_community_posts_upvotes  ON public.veronica_community_posts(upvotes DESC);

CREATE OR REPLACE TRIGGER veronica_community_posts_updated_at
    BEFORE UPDATE ON public.veronica_community_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.veronica_community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved posts readable by all"       ON public.veronica_community_posts;
DROP POLICY IF EXISTS "Authors read own posts"               ON public.veronica_community_posts;
DROP POLICY IF EXISTS "Auth users create posts"              ON public.veronica_community_posts;
DROP POLICY IF EXISTS "Authors update own posts"             ON public.veronica_community_posts;
DROP POLICY IF EXISTS "Authors delete own posts"             ON public.veronica_community_posts;

CREATE POLICY "Approved posts readable by all"
    ON public.veronica_community_posts FOR SELECT
    USING (is_approved = true);

CREATE POLICY "Authors read own posts"
    ON public.veronica_community_posts FOR SELECT
    USING (auth.uid() = author_id);

CREATE POLICY "Auth users create posts"
    ON public.veronica_community_posts FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors update own posts"
    ON public.veronica_community_posts FOR UPDATE
    USING  (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors delete own posts"
    ON public.veronica_community_posts FOR DELETE
    USING (auth.uid() = author_id);

GRANT SELECT ON public.veronica_community_posts TO anon;
GRANT ALL    ON public.veronica_community_posts TO authenticated;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.veronica_community_upvotes (
    post_id    UUID NOT NULL REFERENCES public.veronica_community_posts(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_upvotes_user ON public.veronica_community_upvotes(user_id);

ALTER TABLE public.veronica_community_upvotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own upvotes" ON public.veronica_community_upvotes;
CREATE POLICY "Users manage own upvotes"
    ON public.veronica_community_upvotes FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.veronica_community_upvotes TO authenticated;

-- Sync upvote counter
CREATE OR REPLACE FUNCTION sync_community_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.veronica_community_posts SET upvotes = upvotes + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.veronica_community_posts SET upvotes = GREATEST(0, upvotes - 1) WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS community_upvote_count_sync ON public.veronica_community_upvotes;
CREATE TRIGGER community_upvote_count_sync
    AFTER INSERT OR DELETE ON public.veronica_community_upvotes
    FOR EACH ROW EXECUTE FUNCTION sync_community_upvote_count();

-- ============================================================================
-- 10. Effect presets
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.effect_presets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    effects     JSONB NOT NULL,
    is_public   BOOLEAN DEFAULT false,
    thumbnail   TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_effect_presets_user   ON public.effect_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_effect_presets_public ON public.effect_presets(is_public) WHERE is_public = true;

CREATE OR REPLACE TRIGGER effect_presets_updated_at
    BEFORE UPDATE ON public.effect_presets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.effect_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own effect presets" ON public.effect_presets;
DROP POLICY IF EXISTS "Public presets readable"         ON public.effect_presets;

CREATE POLICY "Users manage own effect presets"
    ON public.effect_presets FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public presets readable"
    ON public.effect_presets FOR SELECT
    USING (is_public = true);

GRANT ALL ON public.effect_presets TO authenticated;

-- ============================================================================
-- 11. Universal chat sessions & messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.universal_chat_sessions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id       VARCHAR(255) NOT NULL UNIQUE,
    user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title            VARCHAR(255),
    message_count    INTEGER DEFAULT 0,
    last_message_at  TIMESTAMPTZ,
    session_metadata JSONB DEFAULT '{}',
    is_active        BOOLEAN DEFAULT true,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uchat_sessions_user      ON public.universal_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_uchat_sessions_session   ON public.universal_chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_uchat_sessions_active    ON public.universal_chat_sessions(is_active) WHERE is_active = true;

CREATE OR REPLACE TRIGGER universal_chat_sessions_updated_at
    BEFORE UPDATE ON public.universal_chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.universal_chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own chat sessions" ON public.universal_chat_sessions;
CREATE POLICY "Users manage own chat sessions"
    ON public.universal_chat_sessions FOR ALL
    USING  (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

GRANT ALL ON public.universal_chat_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.universal_chat_sessions TO anon;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.universal_chat_messages (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id            VARCHAR(255) NOT NULL,
    role                  VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content               TEXT NOT NULL,
    message_type          VARCHAR(50) DEFAULT 'text'
                          CHECK (message_type IN ('text', 'voice', 'action', 'navigation', 'project_created')),
    voice_transcript      TEXT,
    voice_duration        NUMERIC,
    voice_confidence      NUMERIC,
    action_type           VARCHAR(100),
    action_parameters     JSONB DEFAULT '{}',
    response_metadata     JSONB DEFAULT '{}',
    conversation_context  JSONB DEFAULT '{}',
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uchat_msgs_session ON public.universal_chat_messages(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_uchat_msgs_user    ON public.universal_chat_messages(user_id);

ALTER TABLE public.universal_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own universal msgs" ON public.universal_chat_messages;
CREATE POLICY "Users manage own universal msgs"
    ON public.universal_chat_messages FOR ALL
    USING  (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

GRANT ALL ON public.universal_chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.universal_chat_messages TO anon;

-- ============================================================================
-- 12. Teams, team members, ideas, votes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.teams (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    code        TEXT NOT NULL UNIQUE,
    school_name TEXT,
    teacher_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_code ON public.teams(code);

CREATE OR REPLACE TRIGGER teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- NOTE: 'Teams readable by members' policy is defined AFTER team_members is created below
--       to avoid a forward-reference error.

DROP POLICY IF EXISTS "Teachers manage teams" ON public.teams;
CREATE POLICY "Teachers manage teams"
    ON public.teams FOR ALL
    USING  (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

GRANT SELECT, INSERT, UPDATE ON public.teams TO authenticated;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.team_members (
    user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id   UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    role      TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read own membership" ON public.team_members;
CREATE POLICY "Members read own membership"
    ON public.team_members FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Members see teammates" ON public.team_members;
CREATE POLICY "Members see teammates"
    ON public.team_members FOR SELECT
    USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users join teams" ON public.team_members;
CREATE POLICY "Users join teams"
    ON public.team_members FOR INSERT
    WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.team_members TO authenticated;

-- Now that team_members exists, define the teams policy that references it
DROP POLICY IF EXISTS "Teams readable by members" ON public.teams;
CREATE POLICY "Teams readable by members"
    ON public.teams FOR SELECT
    USING (
        id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
        OR teacher_id = auth.uid()
    );

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.idea_submissions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id          UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    description      TEXT NOT NULL,
    category         TEXT NOT NULL,
    generated_project JSONB,
    points           INTEGER DEFAULT 10,
    is_manual        BOOLEAN DEFAULT false,
    submitted_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idea_submissions_user ON public.idea_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_submissions_team ON public.idea_submissions(team_id);

ALTER TABLE public.idea_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own submissions" ON public.idea_submissions;
CREATE POLICY "Users manage own submissions"
    ON public.idea_submissions FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Team members see submissions" ON public.idea_submissions;
CREATE POLICY "Team members see submissions"
    ON public.idea_submissions FOR SELECT
    USING (team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()));

GRANT SELECT, INSERT ON public.idea_submissions TO authenticated;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.idea_votes (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES public.idea_submissions(id) ON DELETE CASCADE,
    voter_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    voted_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (submission_id, voter_id)
);

ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users vote on visible submissions" ON public.idea_votes;
CREATE POLICY "Users vote on visible submissions"
    ON public.idea_votes FOR ALL
    USING  (auth.uid() = voter_id)
    WITH CHECK (auth.uid() = voter_id);

GRANT SELECT, INSERT, DELETE ON public.idea_votes TO authenticated;

-- ============================================================================
-- 13. Achievements & gamification
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.achievements (
    id                           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code                         TEXT NOT NULL UNIQUE,
    title                        TEXT NOT NULL,
    description                  TEXT NOT NULL,
    category                     TEXT NOT NULL
                                 CHECK (category IN ('getting_started','explorer','gateway','competition','mastery')),
    tier                         TEXT NOT NULL
                                 CHECK (tier IN ('bronze','silver','gold','platinum')),
    icon_emoji                   TEXT NOT NULL,
    xp_reward                    INTEGER NOT NULL DEFAULT 0,
    points_reward                INTEGER NOT NULL DEFAULT 0,
    unlock_condition             JSONB NOT NULL,
    requires_team                BOOLEAN DEFAULT false,
    prerequisite_achievement_code TEXT,
    is_active                    BOOLEAN DEFAULT true,
    display_order                INTEGER DEFAULT 0,
    created_at                   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Achievements readable by all" ON public.achievements;
CREATE POLICY "Achievements readable by all"
    ON public.achievements FOR SELECT USING (true);

GRANT SELECT ON public.achievements TO anon, authenticated;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at    TIMESTAMPTZ DEFAULT NOW(),
    notified       BOOLEAN DEFAULT false,
    UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own achievements" ON public.user_achievements;
CREATE POLICY "Users see own achievements"
    ON public.user_achievements FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.user_achievements TO authenticated;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.achievement_progress (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    current_value  INTEGER DEFAULT 0,
    target_value   INTEGER NOT NULL,
    last_updated   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, achievement_id)
);

ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own progress" ON public.achievement_progress;
CREATE POLICY "Users manage own progress"
    ON public.achievement_progress FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.achievement_progress TO authenticated;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_levels (
    user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_level      TEXT NOT NULL DEFAULT 'Explorer',
    level_number       INTEGER DEFAULT 1,
    total_xp           INTEGER DEFAULT 0,
    total_points       INTEGER DEFAULT 0,
    streak_days        INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER user_levels_updated_at
    BEFORE UPDATE ON public.user_levels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own level" ON public.user_levels;
CREATE POLICY "Users manage own level"
    ON public.user_levels FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.user_levels TO authenticated;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_activities (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type        TEXT NOT NULL CHECK (activity_type IN ('submit','upvote','daily','award')),
    points_value         INTEGER NOT NULL DEFAULT 0,
    related_submission_id UUID REFERENCES public.idea_submissions(id) ON DELETE SET NULL,
    timestamp            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user ON public.user_activities(user_id);

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own activities" ON public.user_activities;
CREATE POLICY "Users see own activities"
    ON public.user_activities FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.user_activities TO authenticated;

-- ============================================================================
-- 14. Software project planning tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.technology_stacks (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255) NOT NULL,
    description             TEXT,
    category                VARCHAR(50) CHECK (category IN ('web','mobile','desktop','full_stack','backend','frontend')),
    frontend_framework      VARCHAR(100),
    backend_framework       VARCHAR(100),
    database                VARCHAR(100),
    additional_technologies JSONB DEFAULT '[]',
    popularity_score        INTEGER DEFAULT 0 CHECK (popularity_score >= 0 AND popularity_score <= 100),
    learning_curve          VARCHAR(20) CHECK (learning_curve IN ('easy','moderate','steep')),
    community_size          VARCHAR(20) CHECK (community_size IN ('small','medium','large','very_large')),
    maturity                VARCHAR(20) CHECK (maturity IN ('experimental','stable','mature','legacy')),
    pros                    TEXT[],
    cons                    TEXT[],
    best_for                TEXT[],
    documentation_url       TEXT,
    tutorial_links          JSONB DEFAULT '[]',
    estimated_hosting_cost  VARCHAR(100),
    requires_paid_services  BOOLEAN DEFAULT false,
    is_template             BOOLEAN DEFAULT true,
    created_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    usage_count             INTEGER DEFAULT 0,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.technology_stacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tech stacks readable by all" ON public.technology_stacks;
CREATE POLICY "Tech stacks readable by all"
    ON public.technology_stacks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users create tech stacks" ON public.technology_stacks;
CREATE POLICY "Auth users create tech stacks"
    ON public.technology_stacks FOR INSERT
    WITH CHECK (auth.uid() = created_by);

GRANT SELECT ON public.technology_stacks TO anon;
GRANT ALL    ON public.technology_stacks TO authenticated;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.software_projects (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id                UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id                   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    project_type              VARCHAR(50) NOT NULL
                              CHECK (project_type IN ('web_app','mobile_app','desktop_app','api','full_stack','microservices','progressive_web_app')),
    platforms                 TEXT[] DEFAULT '{}',
    features                  JSONB DEFAULT '[]',
    user_stories              JSONB DEFAULT '[]',
    non_functional_requirements JSONB DEFAULT '{}',
    estimated_timeline        VARCHAR(100),
    estimated_budget          VARCHAR(100),
    team_size                 INTEGER,
    team_expertise_level      VARCHAR(20) CHECK (team_expertise_level IN ('beginner','intermediate','advanced','expert')),
    architecture_type         VARCHAR(20) CHECK (architecture_type IN ('monolith','microservices','serverless','jamstack','spa','ssr','hybrid')),
    architecture_diagram_data JSONB,
    selected_tech_stack_id    UUID REFERENCES public.technology_stacks(id) ON DELETE SET NULL,
    database_type             VARCHAR(100),
    authentication_method     VARCHAR(100),
    deployment_target         VARCHAR(100),
    status                    VARCHAR(50) DEFAULT 'planning'
                              CHECK (status IN ('planning','tech_stack_selection','architecture_design','database_design','api_design','ready_for_generation','completed')),
    created_at                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_software_projects_user    ON public.software_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_software_projects_project ON public.software_projects(project_id);

CREATE OR REPLACE TRIGGER software_projects_updated_at
    BEFORE UPDATE ON public.software_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.software_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own software projects" ON public.software_projects;
CREATE POLICY "Users manage own software projects"
    ON public.software_projects FOR ALL
    USING  (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

GRANT ALL ON public.software_projects TO authenticated;

-- ---------------------------------------------------------------------------
-- Remaining software planning tables (API endpoints, DB schemas, deployment)

CREATE TABLE IF NOT EXISTS public.api_endpoints (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    software_project_id    UUID NOT NULL REFERENCES public.software_projects(id) ON DELETE CASCADE,
    method                 VARCHAR(10) NOT NULL CHECK (method IN ('GET','POST','PUT','PATCH','DELETE')),
    path                   VARCHAR(500) NOT NULL,
    description            TEXT,
    request_body_schema    JSONB,
    response_schema        JSONB,
    query_parameters       JSONB DEFAULT '[]',
    path_parameters        JSONB DEFAULT '[]',
    headers                JSONB DEFAULT '[]',
    requires_authentication BOOLEAN DEFAULT false,
    required_permissions   TEXT[],
    rate_limit             INTEGER,
    example_request        TEXT,
    example_response       TEXT,
    error_responses        JSONB DEFAULT '[]',
    is_public              BOOLEAN DEFAULT false,
    tags                   TEXT[],
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own api endpoints" ON public.api_endpoints;
CREATE POLICY "Users manage own api endpoints"
    ON public.api_endpoints FOR ALL
    USING (software_project_id IN (
        SELECT id FROM public.software_projects WHERE user_id = auth.uid() OR user_id IS NULL
    ));
GRANT ALL ON public.api_endpoints TO authenticated;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.database_schemas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    software_project_id UUID NOT NULL REFERENCES public.software_projects(id) ON DELETE CASCADE,
    database_type       VARCHAR(100) NOT NULL,
    tables              JSONB DEFAULT '[]',
    relationships       JSONB DEFAULT '[]',
    collections         JSONB DEFAULT '[]',
    sql_schema          TEXT,
    migration_scripts   TEXT[],
    er_diagram_data     JSONB,
    version             INTEGER DEFAULT 1,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.database_schemas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own db schemas" ON public.database_schemas;
CREATE POLICY "Users manage own db schemas"
    ON public.database_schemas FOR ALL
    USING (software_project_id IN (
        SELECT id FROM public.software_projects WHERE user_id = auth.uid() OR user_id IS NULL
    ));
GRANT ALL ON public.database_schemas TO authenticated;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deployment_configs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    software_project_id UUID NOT NULL REFERENCES public.software_projects(id) ON DELETE CASCADE,
    platform            VARCHAR(100) NOT NULL,
    config_files        JSONB DEFAULT '[]',
    environment_variables JSONB DEFAULT '[]',
    dockerfile          TEXT,
    docker_compose      TEXT,
    ci_cd_config        TEXT,
    cloud_provider      VARCHAR(100),
    cloud_services      JSONB DEFAULT '[]',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.deployment_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own deployment configs" ON public.deployment_configs;
CREATE POLICY "Users manage own deployment configs"
    ON public.deployment_configs FOR ALL
    USING (software_project_id IN (
        SELECT id FROM public.software_projects WHERE user_id = auth.uid() OR user_id IS NULL
    ));
GRANT ALL ON public.deployment_configs TO authenticated;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.application_templates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    category            VARCHAR(50) NOT NULL
                        CHECK (category IN ('ecommerce','social_media','productivity','portfolio','business','educational','blog','dashboard','landing_page')),
    features            TEXT[],
    tech_stack_id       UUID REFERENCES public.technology_stacks(id) ON DELETE SET NULL,
    complexity_level    VARCHAR(20) CHECK (complexity_level IN ('simple','moderate','complex','enterprise')),
    frontend_template   JSONB,
    backend_template    JSONB,
    database_template   JSONB,
    preview_images      TEXT[],
    demo_url            TEXT,
    repository_url      TEXT,
    setup_instructions  TEXT,
    customization_guide TEXT,
    deployment_guide    TEXT,
    popularity_score    INTEGER DEFAULT 0,
    usage_count         INTEGER DEFAULT 0,
    average_rating      NUMERIC DEFAULT 0.0,
    is_premium          BOOLEAN DEFAULT false,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.application_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Templates readable by all" ON public.application_templates;
CREATE POLICY "Templates readable by all"
    ON public.application_templates FOR SELECT USING (true);
GRANT SELECT ON public.application_templates TO anon, authenticated;

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.template_customizations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id         UUID NOT NULL REFERENCES public.application_templates(id) ON DELETE CASCADE,
    software_project_id UUID NOT NULL REFERENCES public.software_projects(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customizations      JSONB DEFAULT '{}',
    generated_code_id   UUID REFERENCES public.generated_code(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.template_customizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own customizations" ON public.template_customizations;
CREATE POLICY "Users manage own customizations"
    ON public.template_customizations FOR ALL
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
GRANT ALL ON public.template_customizations TO authenticated;

-- ============================================================================
-- GRANTS (blanket schema usage)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- END OF MIGRATION 007
-- Tables created or confirmed in this migration:
--   users, profiles, user_preferences (NEW),
--   components, projects,
--   generated_code, code_files, file_metadata, generation_history,
--   veronica_project_chats, veronica_chat_messages,
--   veronica_community_posts, veronica_community_upvotes,
--   effect_presets,
--   universal_chat_sessions, universal_chat_messages,
--   teams, team_members, idea_submissions, idea_votes,
--   achievements, user_achievements, achievement_progress, user_levels, user_activities,
--   technology_stacks, software_projects, api_endpoints, database_schemas,
--   deployment_configs, application_templates, template_customizations
-- ============================================================================
