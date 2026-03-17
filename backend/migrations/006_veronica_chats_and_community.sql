-- ============================================================================
-- MIGRATION 006: Veronica Project Chats & Community Posts
-- ============================================================================
-- Depends on: 001 (update_updated_at_column function), 004 (public.users)
-- Run after: 005_create_effect_presets_table.sql
-- ============================================================================

-- ============================================================================
-- TABLE: veronica_project_chats
-- One row per named chat tab in the Veronica Studio UI.
-- Optional project_id links a chat to a generated ProjectSpec.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.veronica_project_chats (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    mode            VARCHAR(20)  NOT NULL DEFAULT 'idea'
                    CHECK (mode IN ('idea', 'full_build', 'debug')),
    project_id      UUID,                        -- nullable: set once a ProjectSpec is created
    message_count   INTEGER NOT NULL DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    is_archived     BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_veronica_chats_user_id
    ON public.veronica_project_chats(user_id);

CREATE INDEX IF NOT EXISTS idx_veronica_chats_project_id
    ON public.veronica_project_chats(project_id)
    WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_veronica_chats_last_message
    ON public.veronica_project_chats(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_veronica_chats_archived
    ON public.veronica_project_chats(is_archived)
    WHERE is_archived = false;

-- updated_at trigger
CREATE TRIGGER veronica_project_chats_updated_at
    BEFORE UPDATE ON public.veronica_project_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.veronica_project_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chats"
    ON public.veronica_project_chats
    FOR ALL
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

COMMENT ON TABLE public.veronica_project_chats IS
    'Named chat tabs in the Veronica Studio — one row per chat session shown in the sidebar.';

-- ============================================================================
-- TABLE: veronica_chat_messages
-- Individual messages within a Veronica project chat.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.veronica_chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id         UUID NOT NULL
                    REFERENCES public.veronica_project_chats(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content         TEXT NOT NULL,

    -- Veronica AI metadata (for assistant messages)
    intent          VARCHAR(100),               -- e.g. "generate_project", "chat"
    confidence      DECIMAL(4, 3),             -- 0.000–1.000
    actions         JSONB DEFAULT '[]',         -- VeronicaAIAction[] serialised
    project_snap    JSONB,                      -- snapshot of the ProjectSpec at time of message

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_veronica_msgs_chat_id
    ON public.veronica_chat_messages(chat_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_veronica_msgs_role
    ON public.veronica_chat_messages(role);

-- Trigger: keep parent chat's message_count and last_message_at in sync
CREATE OR REPLACE FUNCTION sync_veronica_chat_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.veronica_project_chats
    SET
        message_count   = message_count + 1,
        last_message_at = NEW.created_at,
        -- Auto-title the chat from the first user message if still default
        title = CASE
            WHEN title = 'New Chat' AND NEW.role = 'user' THEN
                CASE
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

CREATE TRIGGER veronica_chat_message_inserted
    AFTER INSERT ON public.veronica_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION sync_veronica_chat_stats();

-- RLS
ALTER TABLE public.veronica_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access messages in own chats"
    ON public.veronica_chat_messages
    FOR ALL
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

COMMENT ON TABLE public.veronica_chat_messages IS
    'Messages within a Veronica project chat tab, including AI metadata.';

-- ============================================================================
-- TABLE: veronica_community_posts
-- Community showcase posts — builders sharing their STEM projects.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.veronica_community_posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
    project_id      UUID,                        -- nullable: link to a saved veronica project
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    platform        VARCHAR(100),                -- e.g. "Arduino", "Raspberry Pi", "Web"
    difficulty      VARCHAR(20)
                    CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
    tags            TEXT[] DEFAULT '{}',
    upvotes         INTEGER NOT NULL DEFAULT 0,
    comment_count   INTEGER NOT NULL DEFAULT 0,
    is_featured     BOOLEAN NOT NULL DEFAULT false,
    is_approved     BOOLEAN NOT NULL DEFAULT false, -- moderation gate
    thumbnail_url   TEXT,
    repo_url        TEXT,
    demo_url        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_posts_author
    ON public.veronica_community_posts(author_id);

CREATE INDEX IF NOT EXISTS idx_community_posts_featured
    ON public.veronica_community_posts(is_featured)
    WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_community_posts_approved
    ON public.veronica_community_posts(is_approved)
    WHERE is_approved = true;

CREATE INDEX IF NOT EXISTS idx_community_posts_upvotes
    ON public.veronica_community_posts(upvotes DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_platform
    ON public.veronica_community_posts(platform);

CREATE INDEX IF NOT EXISTS idx_community_posts_difficulty
    ON public.veronica_community_posts(difficulty);

CREATE INDEX IF NOT EXISTS idx_community_posts_tags
    ON public.veronica_community_posts USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_community_posts_created
    ON public.veronica_community_posts(created_at DESC);

-- updated_at trigger
CREATE TRIGGER veronica_community_posts_updated_at
    BEFORE UPDATE ON public.veronica_community_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.veronica_community_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved posts
CREATE POLICY "Anyone can read approved community posts"
    ON public.veronica_community_posts
    FOR SELECT
    USING (is_approved = true);

-- Authors can read their own (even pending)
CREATE POLICY "Authors can read own posts"
    ON public.veronica_community_posts
    FOR SELECT
    USING (auth.uid() = author_id);

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create community posts"
    ON public.veronica_community_posts
    FOR INSERT
    WITH CHECK (auth.uid() = author_id);

-- Authors can update own posts
CREATE POLICY "Authors can update own posts"
    ON public.veronica_community_posts
    FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- Authors can delete own posts
CREATE POLICY "Authors can delete own posts"
    ON public.veronica_community_posts
    FOR DELETE
    USING (auth.uid() = author_id);

COMMENT ON TABLE public.veronica_community_posts IS
    'Community showcase: STEM projects shared publicly by Veronica Studio users.';

COMMENT ON COLUMN public.veronica_community_posts.tags IS
    'Free-form tags for filtering, stored as a Postgres array.';

COMMENT ON COLUMN public.veronica_community_posts.is_approved IS
    'Posts are hidden until approved = true (set by admin/moderator).';

-- ============================================================================
-- TABLE: veronica_community_upvotes
-- Tracks which user upvoted which post (prevents double-upvotes).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.veronica_community_upvotes (
    post_id     UUID NOT NULL REFERENCES public.veronica_community_posts(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_upvotes_post
    ON public.veronica_community_upvotes(post_id);

CREATE INDEX IF NOT EXISTS idx_community_upvotes_user
    ON public.veronica_community_upvotes(user_id);

-- Trigger: keep upvotes count in sync
CREATE OR REPLACE FUNCTION sync_community_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.veronica_community_posts
        SET upvotes = upvotes + 1
        WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.veronica_community_posts
        SET upvotes = GREATEST(0, upvotes - 1)
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER community_upvote_count_sync
    AFTER INSERT OR DELETE ON public.veronica_community_upvotes
    FOR EACH ROW
    EXECUTE FUNCTION sync_community_upvote_count();

-- RLS
ALTER TABLE public.veronica_community_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own upvotes"
    ON public.veronica_community_upvotes
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.veronica_community_upvotes IS
    'Junction table tracking per-user upvotes on community posts. Ensures idempotency.';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON public.veronica_community_posts TO anon;
GRANT ALL ON public.veronica_project_chats TO authenticated;
GRANT ALL ON public.veronica_chat_messages TO authenticated;
GRANT ALL ON public.veronica_community_posts TO authenticated;
GRANT ALL ON public.veronica_community_upvotes TO authenticated;

-- ============================================================================
-- Migration complete
-- ============================================================================
-- Tables added:
--   veronica_project_chats       – chat tab sessions per user
--   veronica_chat_messages       – messages with AI metadata, auto-titles chat
--   veronica_community_posts     – public showcase posts with moderation
--   veronica_community_upvotes   – idempotent upvote junction with auto-sync
-- ============================================================================
