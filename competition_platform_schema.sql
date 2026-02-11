-- =====================================================
-- STEM IDEA ADVENTURE - Competition Platform Schema
-- =====================================================
-- This schema adds competition features to the existing app
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TEAMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL, -- e.g., STEM-DEL01
    school_name TEXT,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_teams_code ON public.teams(code);
CREATE INDEX IF NOT EXISTS idx_teams_teacher ON public.teams(teacher_id);

-- =====================================================
-- TEAM MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.team_members (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);

-- =====================================================
-- IDEA SUBMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.idea_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- robotics, iot, electronics, biotech, environmental, etc.
    generated_project JSONB, -- Full AI-generated project data
    points INTEGER DEFAULT 10, -- Base submission points
    is_manual BOOLEAN DEFAULT FALSE, -- True if manually submitted, false if AI-generated
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_user ON public.idea_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team ON public.idea_submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_category ON public.idea_submissions(category);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON public.idea_submissions(submitted_at DESC);

-- =====================================================
-- USER ACTIVITIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('submit', 'upvote', 'daily', 'award')),
    points_value INTEGER NOT NULL DEFAULT 0,
    related_submission_id UUID REFERENCES public.idea_submissions(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_user ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_date ON public.user_activities(timestamp DESC);

-- =====================================================
-- USER LEVELS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_levels (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_level TEXT NOT NULL DEFAULT 'Explorer',
    level_number INTEGER DEFAULT 1, -- 1=Explorer, 2=Builder, 3=Innovator, 4=Inventor, 5=Visionary
    total_xp INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_levels_xp ON public.user_levels(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_levels_points ON public.user_levels(total_points DESC);

-- =====================================================
-- IDEA VOTES TABLE (for upvoting)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.idea_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES public.idea_submissions(id) ON DELETE CASCADE NOT NULL,
    voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(submission_id, voter_id) -- One vote per user per submission
);

CREATE INDEX IF NOT EXISTS idx_votes_submission ON public.idea_votes(submission_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON public.idea_votes(voter_id);

-- =====================================================
-- FUNCTIONS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for teams table
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_levels table
DROP TRIGGER IF EXISTS update_user_levels_updated_at ON public.user_levels;
CREATE TRIGGER update_user_levels_updated_at
    BEFORE UPDATE ON public.user_levels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTION: Calculate Level from XP
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_level(xp INTEGER)
RETURNS TABLE(level_name TEXT, level_number INTEGER) AS $$
BEGIN
    IF xp >= 1000 THEN
        RETURN QUERY SELECT 'Visionary'::TEXT, 5::INTEGER;
    ELSIF xp >= 600 THEN
        RETURN QUERY SELECT 'Inventor'::TEXT, 4::INTEGER;
    ELSIF xp >= 300 THEN
        RETURN QUERY SELECT 'Innovator'::TEXT, 3::INTEGER;
    ELSIF xp >= 100 THEN
        RETURN QUERY SELECT 'Builder'::TEXT, 2::INTEGER;
    ELSE
        RETURN QUERY SELECT 'Explorer'::TEXT, 1::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Update User Level Based on XP
-- =====================================================
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
DECLARE
    new_level_info RECORD;
BEGIN
    -- Calculate new level based on total XP
    SELECT * INTO new_level_info FROM calculate_level(NEW.total_xp);
    
    -- Update level if it changed
    NEW.current_level := new_level_info.level_name;
    NEW.level_number := new_level_info.level_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update level when XP changes
DROP TRIGGER IF EXISTS trigger_update_user_level ON public.user_levels;
CREATE TRIGGER trigger_update_user_level
    BEFORE UPDATE OF total_xp ON public.user_levels
    FOR EACH ROW
    WHEN (OLD.total_xp IS DISTINCT FROM NEW.total_xp)
    EXECUTE FUNCTION update_user_level();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;

-- Teams: Anyone can read, only teachers can create, only teacher who created can update/delete
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;
CREATE POLICY "Teams are viewable by everyone" ON public.teams
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Teachers can create teams" ON public.teams;
CREATE POLICY "Teachers can create teams" ON public.teams
    FOR INSERT WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can update their teams" ON public.teams;
CREATE POLICY "Teachers can update their teams" ON public.teams
    FOR UPDATE USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can delete their teams" ON public.teams;
CREATE POLICY "Teachers can delete their teams" ON public.teams
    FOR DELETE USING (auth.uid() = teacher_id);

-- Team Members: Anyone can read, users can insert themselves, no updates/deletes except by team teacher
DROP POLICY IF EXISTS "Team members are viewable by everyone" ON public.team_members;
CREATE POLICY "Team members are viewable by everyone" ON public.team_members
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can join teams" ON public.team_members;
CREATE POLICY "Users can join teams" ON public.team_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Idea Submissions: Everyone can read, users can create their own, only owner can update/delete
DROP POLICY IF EXISTS "Submissions are viewable by everyone" ON public.idea_submissions;
CREATE POLICY "Submissions are viewable by everyone" ON public.idea_submissions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create submissions" ON public.idea_submissions;
CREATE POLICY "Users can create submissions" ON public.idea_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their submissions" ON public.idea_submissions;
CREATE POLICY "Users can update their submissions" ON public.idea_submissions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their submissions" ON public.idea_submissions;
CREATE POLICY "Users can delete their submissions" ON public.idea_submissions
    FOR DELETE USING (auth.uid() = user_id);

-- User Activities: Everyone can read, only system/user can insert
DROP POLICY IF EXISTS "Activities are viewable by everyone" ON public.user_activities;
CREATE POLICY "Activities are viewable by everyone" ON public.user_activities
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create activities" ON public.user_activities;
CREATE POLICY "Users can create activities" ON public.user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Levels: Everyone can read, users can create/update their own
DROP POLICY IF EXISTS "Levels are viewable by everyone" ON public.user_levels;
CREATE POLICY "Levels are viewable by everyone" ON public.user_levels
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their level" ON public.user_levels;
CREATE POLICY "Users can create their level" ON public.user_levels
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their level" ON public.user_levels;
CREATE POLICY "Users can update their level" ON public.user_levels
    FOR UPDATE USING (auth.uid() = user_id);

-- Idea Votes: Everyone can read, users can vote
DROP POLICY IF EXISTS "Votes are viewable by everyone" ON public.idea_votes;
CREATE POLICY "Votes are viewable by everyone" ON public.idea_votes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can vote" ON public.idea_votes;
CREATE POLICY "Users can vote" ON public.idea_votes
    FOR INSERT WITH CHECK (auth.uid() = voter_id);

DROP POLICY IF EXISTS "Users can delete their votes" ON public.idea_votes;
CREATE POLICY "Users can delete their votes" ON public.idea_votes
    FOR DELETE USING (auth.uid() = voter_id);

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Note: You can add sample teams, submissions, etc. here for testing
-- But in production, these will be created through the app

-- =====================================================
-- VIEWS FOR LEADERBOARDS
-- =====================================================

-- View: Top Scorers (Global)
CREATE OR REPLACE VIEW public.leaderboard_top_scorers AS
SELECT 
    ul.user_id,
    ul.total_points,
    ul.current_level,
    ul.level_number,
    tm.team_id,
    t.name as team_name,
    COUNT(DISTINCT is2.id) as submission_count,
    COALESCE(SUM(vote_counts.vote_count), 0) as total_votes_received
FROM public.user_levels ul
LEFT JOIN public.team_members tm ON ul.user_id = tm.user_id
LEFT JOIN public.teams t ON tm.team_id = t.id
LEFT JOIN public.idea_submissions is2 ON ul.user_id = is2.user_id
LEFT JOIN (
    SELECT submission_id, COUNT(*) as vote_count
    FROM public.idea_votes
    GROUP BY submission_id
) vote_counts ON is2.id = vote_counts.submission_id
GROUP BY ul.user_id, ul.total_points, ul.current_level, ul.level_number, tm.team_id, t.name
ORDER BY ul.total_points DESC;

-- View: Most Consistent (Streak Leaders)
CREATE OR REPLACE VIEW public.leaderboard_consistency AS
SELECT 
    ul.user_id,
    ul.streak_days,
    ul.total_points,
    ul.current_level,
    tm.team_id,
    t.name as team_name,
    ul.last_activity_date
FROM public.user_levels ul
LEFT JOIN public.team_members tm ON ul.user_id = tm.user_id
LEFT JOIN public.teams t ON tm.team_id = t.id
WHERE ul.streak_days > 0
ORDER BY ul.streak_days DESC, ul.total_points DESC;

-- View: Team Rankings
CREATE OR REPLACE VIEW public.leaderboard_teams AS
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.school_name,
    COUNT(DISTINCT tm.user_id) as member_count,
    COUNT(DISTINCT is2.id) as total_submissions,
    COALESCE(SUM(ul.total_points), 0) as total_team_points,
    COALESCE(AVG(ul.total_points), 0) as avg_points_per_member
FROM public.teams t
LEFT JOIN public.team_members tm ON t.id = tm.team_id
LEFT JOIN public.user_levels ul ON tm.user_id = ul.user_id
LEFT JOIN public.idea_submissions is2 ON t.id = is2.team_id
GROUP BY t.id, t.name, t.school_name
ORDER BY total_team_points DESC;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
-- Schema created successfully!
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Verify all tables are created
-- 3. Test with sample data if needed
