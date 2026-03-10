// Achievement Service - API client for achievement system
import { supabase } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// =====================================================
// TYPES
// =====================================================

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  category: 'getting_started' | 'explorer' | 'gateway' | 'competition' | 'mastery';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  icon_emoji: string;
  xp_reward: number;
  points_reward: number;
  unlock_condition: any;
  requires_team: boolean;
  prerequisite_achievement_code?: string;
  display_order: number;
  is_unlocked: boolean;
  unlocked_at?: string;
  is_locked?: boolean;
  lock_reason?: string;
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
}

export interface AchievementStats {
  total_achievements: number;
  unlocked_achievements: number;
  bronze_count: number;
  silver_count: number;
  gold_count: number;
  platinum_count: number;
  total_xp_from_achievements: number;
  total_points_from_achievements: number;
  completion_percentage: number;
}

export interface RecentUnlock {
  code: string;
  title: string;
  description: string;
  tier: string;
  icon_emoji: string;
  xp_reward: number;
  points_reward: number;
  unlocked_at: string;
}

export const ACHIEVEMENT_CATEGORIES = [
  { value: 'getting_started', label: 'Getting Started', color: 'text-green-500' },
  { value: 'explorer', label: 'Explorer', color: 'text-blue-500' },
  { value: 'gateway', label: 'Gateway', color: 'text-yellow-500' },
  { value: 'competition', label: 'Competition', color: 'text-purple-500' },
  { value: 'mastery', label: 'Mastery', color: 'text-orange-500' },
] as const;

export const ACHIEVEMENT_TIERS = [
  { value: 'bronze', label: 'Bronze', color: 'text-amber-700', bgColor: 'bg-amber-700/10', borderColor: 'border-amber-700/30' },
  { value: 'silver', label: 'Silver', color: 'text-slate-400', bgColor: 'bg-slate-400/10', borderColor: 'border-slate-400/30' },
  { value: 'gold', label: 'Gold', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  { value: 'platinum', label: 'Platinum', color: 'text-cyan-400', bgColor: 'bg-cyan-400/10', borderColor: 'border-cyan-400/30' },
] as const;

// =====================================================
// ACHIEVEMENT API CALLS
// =====================================================

export const getAllAchievements = async (): Promise<Achievement[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/achievements/all`);
    
    if (!response.ok) return [];
    
    const result = await response.json();
    return result.achievements || [];
  } catch (error) {
    console.error('Error getting achievements:', error);
    return [];
  }
};

export const getUserAchievements = async (): Promise<Achievement[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const response = await fetch(`${API_BASE_URL}/achievements/user/${user.id}`);
    
    if (!response.ok) return [];
    
    const result = await response.json();
    return result.achievements || [];
  } catch (error) {
    console.error('Error getting user achievements:', error);
    return [];
  }
};

export const getUserAchievementStats = async (): Promise<AchievementStats | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const response = await fetch(`${API_BASE_URL}/achievements/user/${user.id}/stats`);
    
    if (!response.ok) return null;
    
    const result = await response.json();
    return result.stats || null;
  } catch (error) {
    console.error('Error getting achievement stats:', error);
    return null;
  }
};

export const unlockAchievement = async (achievementCode: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/achievements/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        achievement_code: achievementCode,
      }),
    });

    if (!response.ok) return false;
    
    const result = await response.json();
    return result.unlocked || false;
  } catch (error) {
    console.error('Error unlocking achievement:', error);
    return false;
  }
};

export const checkAndUnlockAchievements = async (): Promise<{ unlocked_count: number; newly_unlocked: any[] }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { unlocked_count: 0, newly_unlocked: [] };

    const response = await fetch(`${API_BASE_URL}/achievements/check-and-unlock/${user.id}`, {
      method: 'POST',
    });

    if (!response.ok) return { unlocked_count: 0, newly_unlocked: [] };
    
    const result = await response.json();
    return {
      unlocked_count: result.unlocked_count || 0,
      newly_unlocked: result.newly_unlocked || []
    };
  } catch (error) {
    console.error('Error checking achievements:', error);
    return { unlocked_count: 0, newly_unlocked: [] };
  }
};

export const getRecentUnlocks = async (limit: number = 10): Promise<RecentUnlock[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const response = await fetch(`${API_BASE_URL}/achievements/recent-unlocks/${user.id}?limit=${limit}`);
    
    if (!response.ok) return [];
    
    const result = await response.json();
    return result.recent_unlocks || [];
  } catch (error) {
    console.error('Error getting recent unlocks:', error);
    return [];
  }
};

export const getAchievementLeaderboard = async (limit: number = 50): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/achievements/leaderboard?limit=${limit}`);
    
    if (!response.ok) return [];
    
    const result = await response.json();
    return result.leaderboard || [];
  } catch (error) {
    console.error('Error getting achievement leaderboard:', error);
    return [];
  }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export const getTierConfig = (tier: string) => {
  return ACHIEVEMENT_TIERS.find(t => t.value === tier) || ACHIEVEMENT_TIERS[0];
};

export const getCategoryConfig = (category: string) => {
  return ACHIEVEMENT_CATEGORIES.find(c => c.value === category) || ACHIEVEMENT_CATEGORIES[0];
};

export const groupAchievementsByCategory = (achievements: Achievement[]) => {
  const grouped: Record<string, Achievement[]> = {};
  
  achievements.forEach(achievement => {
    if (!grouped[achievement.category]) {
      grouped[achievement.category] = [];
    }
    grouped[achievement.category].push(achievement);
  });
  
  return grouped;
};

export const getAchievementsByTier = (achievements: Achievement[], tier: string) => {
  return achievements.filter(a => a.tier === tier);
};

export const getUnlockedAchievements = (achievements: Achievement[]) => {
  return achievements.filter(a => a.is_unlocked);
};

export const getLockedAchievements = (achievements: Achievement[]) => {
  return achievements.filter(a => !a.is_unlocked);
};

export const getAchievementsInProgress = (achievements: Achievement[]) => {
  return achievements.filter(a => !a.is_unlocked && a.progress && a.progress.current > 0);
};
