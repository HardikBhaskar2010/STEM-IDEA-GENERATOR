-- 010_achievements_rpc.sql
-- Adds RPC functions for awarding points/achievements and seeds initial milestones.

-- 1. Create or replace the stored procedure to check and award achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievement(
    p_user_id UUID,
    p_achievement_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_achievement_id UUID;
    v_xp_reward INTEGER;
    v_points_reward INTEGER;
    v_already_unlocked BOOLEAN;
BEGIN
    -- Get achievement details
    SELECT id, xp_reward, points_reward INTO v_achievement_id, v_xp_reward, v_points_reward
    FROM public.achievements
    WHERE code = p_achievement_code AND is_active = true;

    -- If achievement does not exist, return false
    IF v_achievement_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check if user already unlocked this
    SELECT EXISTS (
        SELECT 1 FROM public.user_achievements 
        WHERE user_id = p_user_id AND achievement_id = v_achievement_id
    ) INTO v_already_unlocked;

    IF v_already_unlocked THEN
        RETURN FALSE;
    END IF;

    -- Insert into user_achievements
    INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, notified)
    VALUES (p_user_id, v_achievement_id, NOW(), false);

    -- Ensure user exists in user_levels table, then award points/xp
    INSERT INTO public.user_levels (user_id, current_level, level_number, total_xp, total_points, streak_days)
    VALUES (p_user_id, 'Explorer', 1, v_xp_reward, v_points_reward, 0)
    ON CONFLICT (user_id)
    DO UPDATE SET 
        total_xp = user_levels.total_xp + v_xp_reward,
        total_points = user_levels.total_points + v_points_reward;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Create or replace the stored procedure for getting user stats
CREATE OR REPLACE FUNCTION public.get_user_achievement_stats(
    p_user_id UUID
)
RETURNS TABLE (
    total_achievements BIGINT,
    unlocked_achievements BIGINT,
    bronze_count BIGINT,
    silver_count BIGINT,
    gold_count BIGINT,
    platinum_count BIGINT,
    total_xp_from_achievements BIGINT,
    total_points_from_achievements BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.achievements WHERE is_active = true) as total_achievements,
        COUNT(ua.id) as unlocked_achievements,
        COUNT(ua.id) FILTER (WHERE a.tier = 'bronze') as bronze_count,
        COUNT(ua.id) FILTER (WHERE a.tier = 'silver') as silver_count,
        COUNT(ua.id) FILTER (WHERE a.tier = 'gold') as gold_count,
        COUNT(ua.id) FILTER (WHERE a.tier = 'platinum') as platinum_count,
        COALESCE(SUM(a.xp_reward), 0) as total_xp_from_achievements,
        COALESCE(SUM(a.points_reward), 0) as total_points_from_achievements
    FROM public.user_achievements ua
    JOIN public.achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2.5 CREATE VIEW for user_achievements_detailed
CREATE OR REPLACE VIEW public.user_achievements_detailed AS
SELECT
    ua.id,
    ua.user_id,
    ua.achievement_id,
    ua.unlocked_at,
    ua.notified,
    a.code,
    a.title,
    a.description,
    a.category,
    a.tier,
    a.icon_emoji,
    a.xp_reward,
    a.points_reward
FROM public.user_achievements ua
JOIN public.achievements a ON ua.achievement_id = a.id;

GRANT SELECT ON public.user_achievements_detailed TO anon, authenticated;


-- 3. Seed Initial Achievements
INSERT INTO public.achievements (
    code, title, description, category, tier, icon_emoji, 
    xp_reward, points_reward, unlock_condition, display_order
) VALUES
-- First project generation
(
    'first_project', 'Creator', 'Generate your first STEM project using Veronica AI', 'getting_started', 'bronze', '🛠️',
    50, 100, '{"type": "project_generated", "value": 1}', 10
),
-- Idea explorer (generated 5 projects)
(
    'idea_explorer', 'Idea Explorer', 'Generate 5 projects using Veronica AI', 'explorer', 'silver', '🔍',
    150, 250, '{"type": "project_generated", "value": 5}', 20
),
-- Profile setup
(
    'setting_up', 'Setting Up', 'Complete your user profile interests and bio', 'getting_started', 'bronze', '👤',
    20, 50, '{"type": "profile_complete", "value": 1}', 30
),
-- Community first submission
(
    'first_submission', 'Brave Sharer', 'Submit an idea to the Community board', 'gateway', 'bronze', '📣',
    100, 150, '{"type": "submission_count", "value": 1}', 40
),
-- First Upvotes received
(
    'influencer', 'Influencer', 'Receive 5 upvotes on your community submissions', 'competition', 'silver', '🔥',
    100, 200, '{"type": "upvote_received", "value": 5}', 50
)
ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    xp_reward = EXCLUDED.xp_reward,
    points_reward = EXCLUDED.points_reward,
    unlock_condition = EXCLUDED.unlock_condition;
