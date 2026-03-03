-- =====================================================
-- STEM IDEA ADVENTURE - Achievement System Schema
-- =====================================================
-- Comprehensive achievement system with tiers and progress tracking
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ACHIEVEMENTS TABLE - Define all possible achievements
-- =====================================================
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- e.g., 'first_login', 'join_team'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('getting_started', 'explorer', 'gateway', 'competition', 'mastery')),
    tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    icon_emoji TEXT NOT NULL, -- emoji icon
    xp_reward INTEGER NOT NULL DEFAULT 0,
    points_reward INTEGER NOT NULL DEFAULT 0,
    unlock_condition JSONB NOT NULL, -- Conditions to unlock (e.g., {type: 'project_count', value: 5})
    requires_team BOOLEAN DEFAULT FALSE, -- True if achievement requires team membership
    prerequisite_achievement_code TEXT, -- Code of achievement that must be unlocked first
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_tier ON public.achievements(tier);
CREATE INDEX IF NOT EXISTS idx_achievements_code ON public.achievements(code);

-- =====================================================
-- USER ACHIEVEMENTS TABLE - Track unlocked achievements
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notified BOOLEAN DEFAULT FALSE, -- Whether user has been notified
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON public.user_achievements(unlocked_at DESC);

-- =====================================================
-- ACHIEVEMENT PROGRESS TABLE - Track progress towards achievements
-- =====================================================
CREATE TABLE IF NOT EXISTS public.achievement_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
    current_value INTEGER DEFAULT 0, -- Current progress (e.g., 3 out of 5 projects)
    target_value INTEGER NOT NULL, -- Target to reach (e.g., 5 projects)
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievement_progress_user ON public.achievement_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_achievement ON public.achievement_progress(achievement_id);

-- =====================================================
-- INSERT PREDEFINED ACHIEVEMENTS
-- =====================================================

-- Category: Getting Started (Bronze tier - available to all)
INSERT INTO public.achievements (code, title, description, category, tier, icon_emoji, xp_reward, points_reward, unlock_condition, requires_team, display_order) VALUES
('first_login', 'Welcome Aboard! 🎉', 'Sign in to STEM Idea Adventure for the first time', 'getting_started', 'bronze', '🎉', 10, 5, '{"type": "manual", "trigger": "first_login"}', FALSE, 1),
('profile_complete', 'Identity Established 👤', 'Complete your profile with username, bio, and interests', 'getting_started', 'bronze', '👤', 15, 10, '{"type": "profile_complete"}', FALSE, 2),
('first_project_generated', 'Idea Spark ✨', 'Generate your first AI-powered project', 'getting_started', 'bronze', '✨', 20, 15, '{"type": "project_generated", "value": 1}', FALSE, 3),
('first_project_saved', 'Keeper of Ideas 💾', 'Save your first project to the library', 'getting_started', 'bronze', '💾', 25, 20, '{"type": "project_saved", "value": 1}', FALSE, 4);

-- Category: Explorer (Silver tier - available to all)
INSERT INTO public.achievements (code, title, description, category, tier, icon_emoji, xp_reward, points_reward, unlock_condition, requires_team, display_order) VALUES
('5_projects_created', 'Project Enthusiast 🚀', 'Generate 5 unique AI projects', 'explorer', 'silver', '🚀', 50, 30, '{"type": "project_generated", "value": 5}', FALSE, 10),
('10_projects_created', 'Idea Factory 🏭', 'Generate 10 unique AI projects', 'explorer', 'silver', '🏭', 100, 50, '{"type": "project_generated", "value": 10}', FALSE, 11),
('25_projects_created', 'Innovation Champion 🎯', 'Generate 25 unique AI projects', 'explorer', 'gold', '🎯', 250, 100, '{"type": "project_generated", "value": 25}', FALSE, 12),
('component_explorer', 'Component Seeker 📦', 'Explore the Component Catalog', 'explorer', 'bronze', '📦', 30, 15, '{"type": "page_visit", "page": "components"}', FALSE, 13),
('learning_enthusiast', 'Knowledge Seeker 📚', 'Visit the Learning Hub', 'explorer', 'bronze', '📚', 30, 15, '{"type": "page_visit", "page": "learn"}', FALSE, 14),
('code_generator_first', 'Code Wizard 💻', 'Use the AI Code Generator (Veronica)', 'explorer', 'silver', '💻', 50, 25, '{"type": "page_visit", "page": "code_generator"}', FALSE, 15);

-- Category: Gateway Achievement (Gold tier - unlocks competition)
INSERT INTO public.achievements (code, title, description, category, tier, icon_emoji, xp_reward, points_reward, unlock_condition, requires_team, display_order) VALUES
('join_team', '🔑 Team Player', 'Join or create a team to unlock competition achievements!', 'gateway', 'gold', '🔑', 100, 50, '{"type": "team_joined"}', FALSE, 20);

-- Category: Competition (Platinum tier - requires team membership)
INSERT INTO public.achievements (code, title, description, category, tier, icon_emoji, xp_reward, points_reward, unlock_condition, requires_team, prerequisite_achievement_code, display_order) VALUES
('first_submission', 'Competition Debut 🎪', 'Submit your first idea to the competition', 'competition', 'silver', '🎪', 75, 40, '{"type": "submission_count", "value": 1}', TRUE, 'join_team', 30),
('10_submissions', 'Submission Expert 📝', 'Submit 10 ideas to competitions', 'competition', 'gold', '📝', 150, 75, '{"type": "submission_count", "value": 10}', TRUE, 'join_team', 31),
('25_submissions', 'Idea Machine 🎰', 'Submit 25 ideas to competitions', 'competition', 'platinum', '🎰', 300, 150, '{"type": "submission_count", "value": 25}', TRUE, 'join_team', 32),
('first_upvote', 'Community Approved ⭐', 'Receive your first upvote on a submission', 'competition', 'bronze', '⭐', 50, 25, '{"type": "upvote_received", "value": 1}', TRUE, 'join_team', 33),
('10_upvotes', 'Popular Creator 🌟', 'Receive 10 upvotes across all submissions', 'competition', 'gold', '🌟', 150, 75, '{"type": "upvote_received", "value": 10}', TRUE, 'join_team', 34),
('reach_builder', 'Builder Status 🔨', 'Reach Builder level (Level 2)', 'competition', 'silver', '🔨', 100, 50, '{"type": "level_reached", "value": 2}', TRUE, 'join_team', 35),
('reach_innovator', 'Innovator Status 💡', 'Reach Innovator level (Level 3)', 'competition', 'gold', '💡', 200, 100, '{"type": "level_reached", "value": 3}', TRUE, 'join_team', 36),
('reach_inventor', 'Inventor Status 🔬', 'Reach Inventor level (Level 4)', 'competition', 'gold', '🔬', 300, 150, '{"type": "level_reached", "value": 4}', TRUE, 'join_team', 37),
('reach_visionary', 'Visionary Status 🌟', 'Reach Visionary level (Level 5)', 'competition', 'platinum', '🌟', 500, 250, '{"type": "level_reached", "value": 5}', TRUE, 'join_team', 38),
('top_10_leaderboard', 'Top 10 Contender 🏅', 'Reach top 10 on any leaderboard', 'competition', 'gold', '🏅', 200, 100, '{"type": "leaderboard_position", "value": 10}', TRUE, 'join_team', 39),
('top_3_leaderboard', 'Podium Finisher 🥉', 'Reach top 3 on any leaderboard', 'competition', 'platinum', '🥉', 400, 200, '{"type": "leaderboard_position", "value": 3}', TRUE, 'join_team', 40),
('7_day_streak', 'Week Warrior 🔥', 'Maintain a 7-day submission streak', 'competition', 'silver', '🔥', 100, 50, '{"type": "streak_days", "value": 7}', TRUE, 'join_team', 41),
('30_day_streak', 'Month Master 🌙', 'Maintain a 30-day submission streak', 'competition', 'platinum', '🌙', 500, 250, '{"type": "streak_days", "value": 30}', TRUE, 'join_team', 42);

-- Category: Mastery (Platinum tier - special achievements)
INSERT INTO public.achievements (code, title, description, category, tier, icon_emoji, xp_reward, points_reward, unlock_condition, requires_team, display_order) VALUES
('all_categories', 'Category Master 🎨', 'Generate projects in all 7 STEM categories', 'mastery', 'platinum', '🎨', 300, 150, '{"type": "all_categories"}', FALSE, 50),
('help_others', 'Community Helper 🤝', 'Give upvotes to 10 different submissions', 'mastery', 'gold', '🤝', 200, 100, '{"type": "upvotes_given", "value": 10}', FALSE, 51),
('early_adopter', 'Early Adopter 🌟', 'Join during beta phase', 'mastery', 'platinum', '🌟', 500, 250, '{"type": "manual", "trigger": "early_adopter"}', FALSE, 52),
('profile_complete_advanced', 'Profile Perfectionist 🎨', 'Complete profile with avatar, 5+ interests, and bio', 'mastery', 'gold', '🎨', 150, 75, '{"type": "profile_advanced"}', FALSE, 53);

-- =====================================================
-- FUNCTION: Check and Award Achievements
-- =====================================================
CREATE OR REPLACE FUNCTION check_and_award_achievement(
    p_user_id UUID,
    p_achievement_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_achievement_id UUID;
    v_already_unlocked BOOLEAN;
    v_xp_reward INTEGER;
    v_points_reward INTEGER;
BEGIN
    -- Get achievement details
    SELECT id, xp_reward, points_reward INTO v_achievement_id, v_xp_reward, v_points_reward
    FROM public.achievements
    WHERE code = p_achievement_code AND is_active = TRUE;
    
    IF v_achievement_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if already unlocked
    SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = p_user_id AND achievement_id = v_achievement_id
    ) INTO v_already_unlocked;
    
    IF v_already_unlocked THEN
        RETURN FALSE;
    END IF;
    
    -- Award achievement
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (p_user_id, v_achievement_id);
    
    -- Award XP and points to user_levels if exists
    IF EXISTS(SELECT 1 FROM public.user_levels WHERE user_id = p_user_id) THEN
        UPDATE public.user_levels
        SET 
            total_xp = total_xp + v_xp_reward,
            total_points = total_points + v_points_reward,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    -- Record activity
    INSERT INTO public.user_activities (user_id, activity_type, points_value)
    VALUES (p_user_id, 'award', v_points_reward);
    
    RETURN TRUE;
END;
$$;

-- =====================================================
-- FUNCTION: Get User Achievement Stats
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_achievement_stats(p_user_id UUID)
RETURNS TABLE(
    total_achievements INTEGER,
    unlocked_achievements INTEGER,
    bronze_count INTEGER,
    silver_count INTEGER,
    gold_count INTEGER,
    platinum_count INTEGER,
    total_xp_from_achievements INTEGER,
    total_points_from_achievements INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM public.achievements WHERE is_active = TRUE),
        (SELECT COUNT(*)::INTEGER FROM public.user_achievements WHERE user_id = p_user_id),
        (SELECT COUNT(*)::INTEGER FROM public.user_achievements ua 
         JOIN public.achievements a ON ua.achievement_id = a.id 
         WHERE ua.user_id = p_user_id AND a.tier = 'bronze'),
        (SELECT COUNT(*)::INTEGER FROM public.user_achievements ua 
         JOIN public.achievements a ON ua.achievement_id = a.id 
         WHERE ua.user_id = p_user_id AND a.tier = 'silver'),
        (SELECT COUNT(*)::INTEGER FROM public.user_achievements ua 
         JOIN public.achievements a ON ua.achievement_id = a.id 
         WHERE ua.user_id = p_user_id AND a.tier = 'gold'),
        (SELECT COUNT(*)::INTEGER FROM public.user_achievements ua 
         JOIN public.achievements a ON ua.achievement_id = a.id 
         WHERE ua.user_id = p_user_id AND a.tier = 'platinum'),
        (SELECT COALESCE(SUM(a.xp_reward), 0)::INTEGER FROM public.user_achievements ua 
         JOIN public.achievements a ON ua.achievement_id = a.id 
         WHERE ua.user_id = p_user_id),
        (SELECT COALESCE(SUM(a.points_reward), 0)::INTEGER FROM public.user_achievements ua 
         JOIN public.achievements a ON ua.achievement_id = a.id 
         WHERE ua.user_id = p_user_id);
END;
$$;

-- =====================================================
-- Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;

-- Achievements are public (everyone can read)
CREATE POLICY "Achievements are viewable by everyone" ON public.achievements
    FOR SELECT USING (true);

-- Users can only view their own achievement unlocks
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only view their own progress
CREATE POLICY "Users can view own progress" ON public.achievement_progress
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- Grant Permissions
-- =====================================================
GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT SELECT ON public.user_achievements TO authenticated;
GRANT SELECT ON public.achievement_progress TO authenticated;

-- =====================================================
-- Create view for easier achievement queries
-- =====================================================
CREATE OR REPLACE VIEW public.user_achievements_detailed AS
SELECT 
    ua.id,
    ua.user_id,
    ua.unlocked_at,
    ua.notified,
    a.code,
    a.title,
    a.description,
    a.category,
    a.tier,
    a.icon_emoji,
    a.xp_reward,
    a.points_reward,
    a.requires_team,
    a.prerequisite_achievement_code
FROM public.user_achievements ua
JOIN public.achievements a ON ua.achievement_id = a.id
WHERE a.is_active = TRUE;

GRANT SELECT ON public.user_achievements_detailed TO authenticated;
