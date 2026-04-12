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
// REQUEST DEDUPLICATION + TTL CACHE
//
// Problem solved: multiple components calling getUserAchievements()
// simultaneously each launched a separate fetch. Now:
//   1. If a request for the same URL is already in-flight, we return
//      the same Promise (deduplication).
//   2. Successful responses are cached for CACHE_TTL_MS (60 s).
//      Subsequent callers within that window get the cached value
//      immediately with zero network cost.
// =====================================================

const CACHE_TTL_MS = 60_000; // 60 seconds

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Permanent TTL cache
const _cache = new Map<string, CacheEntry<any>>();

// In-flight deduplication map: url → pending Promise
const _inflight = new Map<string, Promise<any>>();

function _getCached<T>(key: string): T | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function _setCached<T>(key: string, data: T): void {
  _cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Cache-aware, deduplication-aware fetch wrapper.
 * - Returns cached data immediately if still fresh.
 * - Deduplicates parallel requests for the same URL.
 * - Caches successful responses.
 */
async function _fetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: { skipCache?: boolean } = {}
): Promise<T> {
  if (!options.skipCache) {
    const cached = _getCached<T>(cacheKey);
    if (cached !== null) return cached;
  }

  // Already in-flight? Return the same promise (dedup).
  const existing = _inflight.get(cacheKey);
  if (existing) return existing as Promise<T>;

  const pending = fetcher().then((result) => {
    _setCached(cacheKey, result);
    _inflight.delete(cacheKey);
    return result;
  }).catch((err) => {
    _inflight.delete(cacheKey);
    throw err;
  });

  _inflight.set(cacheKey, pending);
  return pending;
}

/** Invalidate a specific cache key (call after mutations). */
export function invalidateAchievementCache(key?: string): void {
  if (key) {
    _cache.delete(key);
    _inflight.delete(key);
  } else {
    _cache.clear();
    _inflight.clear();
  }
}

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

export const getUserAchievements = async (forceRefresh = false): Promise<Achievement[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const cacheKey = `user-achievements-${user.id}`;
    return await _fetch(
      cacheKey,
      async () => {
        const response = await fetch(`${API_BASE_URL}/achievements/user/${user.id}`);
        if (!response.ok) return [];
        const result = await response.json();
        return result.achievements || [];
      },
      { skipCache: forceRefresh }
    );
  } catch (error) {
    console.error('Error getting user achievements:', error);
    return [];
  }
};

export const getUserAchievementStats = async (forceRefresh = false): Promise<AchievementStats | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const cacheKey = `user-achievement-stats-${user.id}`;
    return await _fetch(
      cacheKey,
      async () => {
        const response = await fetch(`${API_BASE_URL}/achievements/user/${user.id}/stats`);
        if (!response.ok) return null;
        const result = await response.json();
        return result.stats || null;
      },
      { skipCache: forceRefresh }
    );
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
    // Invalidate cache so next read is fresh
    invalidateAchievementCache();
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
    const unlocked_count = result.unlocked_count || 0;

    // Only bust cache if something was actually unlocked
    if (unlocked_count > 0) {
      invalidateAchievementCache();
    }

    return {
      unlocked_count,
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
