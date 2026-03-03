// Competition Service - API client for competition features
import { supabase } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

// =====================================================
// TYPES
// =====================================================

export interface Team {
  id: string;
  name: string;
  code: string;
  school_name?: string;
  teacher_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamInfo {
  team_id: string;
  team_name: string;
  school_name?: string;
  team_code: string;
  member_count: number;
  role: string;
}

export interface Submission {
  id: string;
  user_id: string;
  team_id: string;
  title: string;
  description: string;
  category: string;
  generated_project?: any;
  points: number;
  is_manual: boolean;
  submitted_at: string;
  vote_count?: number;
}

export interface UserProgress {
  user_id: string;
  current_level: string;
  level_number: number;
  total_xp: number;
  total_points: number;
  streak_days: number;
  xp_to_next_level: number;
  submissions_count: number;
  votes_received: number;
}

export interface LeaderboardEntry {
  user_id: string;
  username?: string;
  total_points: number;
  current_level: string;
  team_name?: string;
  submission_count: number;
  rank: number;
}

export interface ConsistencyLeaderboardEntry {
  user_id: string;
  username?: string;
  streak_days: number;
  total_points: number;
  current_level: string;
  team_name?: string;
  last_activity_date: string;
  rank: number;
}

export interface TeamLeaderboardEntry {
  team_id: string;
  team_name: string;
  school_name?: string;
  member_count: number;
  total_submissions: number;
  total_team_points: number;
  avg_points_per_member: number;
  rank: number;
}

export const CATEGORIES = [
  'Robotics',
  'Environment',
  'IoT',
  'AI/Software',
  'Healthcare',
  'Energy',
  'General STEM',
] as const;

export type Category = typeof CATEGORIES[number];

export const LEVELS = [
  { name: 'Explorer', number: 1, minXP: 0, maxXP: 99 },
  { name: 'Builder', number: 2, minXP: 100, maxXP: 299 },
  { name: 'Innovator', number: 3, minXP: 300, maxXP: 599 },
  { name: 'Inventor', number: 4, minXP: 600, maxXP: 999 },
  { name: 'Visionary', number: 5, minXP: 1000, maxXP: Infinity },
] as const;

// =====================================================
// TEAM MANAGEMENT
// =====================================================

export const createTeam = async (name: string, schoolName?: string): Promise<{ team_id: string; team_code: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/competition/teams/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        school_name: schoolName,
        teacher_id: user.id,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create team');
    }

    const result = await response.json();
    return { team_id: result.team_id, team_code: result.team_code };
  } catch (error) {
    console.error('Error creating team:', error);
    throw error;
  }
};

export const joinTeam = async (teamCode: string): Promise<TeamInfo> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/competition/teams/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_code: teamCode,
        user_id: user.id,
        role: 'student',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to join team');
    }

    const result = await response.json();
    
    // Get full team info
    const teamInfo = await getMyTeam();
    return teamInfo;
  } catch (error) {
    console.error('Error joining team:', error);
    throw error;
  }
};

export const getMyTeam = async (): Promise<TeamInfo | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const response = await fetch(`${API_BASE_URL}/competition/teams/my-team/${user.id}`);
    
    if (response.status === 404) {
      return null; // User not in a team
    }

    if (!response.ok) {
      throw new Error('Failed to get team info');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting team:', error);
    return null;
  }
};

export const leaveTeam = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/competition/teams/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to leave team');
    }
  } catch (error) {
    console.error('Error leaving team:', error);
    throw error;
  }
};

export const validateTeamCode = async (teamCode: string): Promise<{ valid: boolean; team_name?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/competition/teams/validate-code/${teamCode}`);
    return await response.json();
  } catch (error) {
    console.error('Error validating team code:', error);
    return { valid: false };
  }
};

// =====================================================
// SUBMISSIONS
// =====================================================

export const createSubmission = async (
  teamId: string,
  title: string,
  description: string,
  category: Category,
  generatedProject?: any,
  isManual: boolean = false
): Promise<{ submission_id: string; points_awarded: number; new_level?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/competition/submissions/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        team_id: teamId,
        title,
        description,
        category,
        generated_project: generatedProject,
        is_manual: isManual,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create submission');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating submission:', error);
    throw error;
  }
};

export const getMySubmissions = async (): Promise<Submission[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const response = await fetch(`${API_BASE_URL}/competition/submissions/my-submissions/${user.id}`);
    
    if (!response.ok) return [];

    const result = await response.json();
    return result.submissions || [];
  } catch (error) {
    console.error('Error getting submissions:', error);
    return [];
  }
};

export const upvoteSubmission = async (submissionId: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/competition/submissions/upvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submission_id: submissionId,
        voter_id: user.id,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upvote');
    }
  } catch (error) {
    console.error('Error upvoting:', error);
    throw error;
  }
};

// =====================================================
// PROGRESS & LEVELS
// =====================================================

export const getUserProgress = async (): Promise<UserProgress | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const response = await fetch(`${API_BASE_URL}/competition/users/progress/${user.id}`);
    
    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error('Error getting progress:', error);
    return null;
  }
};

export const getLevelInfo = (xp: number) => {
  return LEVELS.find(level => xp >= level.minXP && xp <= level.maxXP) || LEVELS[0];
};

export const getLevelProgress = (xp: number) => {
  const level = getLevelInfo(xp);
  if (level.number === 5) return 100; // Max level
  
  const currentLevelXP = xp - level.minXP;
  const totalLevelXP = level.maxXP - level.minXP + 1;
  return Math.round((currentLevelXP / totalLevelXP) * 100);
};

// =====================================================
// LEADERBOARDS
// =====================================================

export const getTopScorersLeaderboard = async (limit: number = 20, teamId?: string): Promise<LeaderboardEntry[]> => {
  try {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (teamId) params.append('team_id', teamId);

    const response = await fetch(`${API_BASE_URL}/competition/leaderboards/top-scorers?${params}`);
    
    if (!response.ok) return [];

    const result = await response.json();
    return result.leaderboard || [];
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
};

export const getConsistencyLeaderboard = async (limit: number = 20): Promise<ConsistencyLeaderboardEntry[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/competition/leaderboards/consistency?limit=${limit}`);
    
    if (!response.ok) return [];

    const result = await response.json();
    return result.leaderboard || [];
  } catch (error) {
    console.error('Error getting consistency leaderboard:', error);
    return [];
  }
};

export const getTeamLeaderboard = async (limit: number = 20): Promise<TeamLeaderboardEntry[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/competition/leaderboards/teams?limit=${limit}`);
    
    if (!response.ok) return [];

    const result = await response.json();
    return result.leaderboard || [];
  } catch (error) {
    console.error('Error getting team leaderboard:', error);
    return [];
  }
};

// =====================================================
// MODE DETECTION
// =====================================================

export const checkCompetitionMode = async (): Promise<boolean> => {
  const teamInfo = await getMyTeam();
  return teamInfo !== null;
};

export const getCompetitionModeInfo = async (): Promise<{ isCompetitionMode: boolean; teamInfo: TeamInfo | null }> => {
  const teamInfo = await getMyTeam();
  return {
    isCompetitionMode: teamInfo !== null,
    teamInfo,
  };
};
