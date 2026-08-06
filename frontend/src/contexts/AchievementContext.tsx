import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';
import type {
  Achievement,
  AchievementStats,
  RecentUnlock
} from '@/services/achievementService';
import {
  getUserAchievements,
  getUserAchievementStats,
  checkAndUnlockAchievements,
  unlockAchievement,
  invalidateAchievementCache
} from '@/services/achievementService';

// ─────────────────────────────────────────────────────────────
// How often the background "check for new achievements" runs.
// Was 30 s (way too aggressive) → now 5 min as a safety net.
// The primary trigger is event-driven: call checkForNewAchievements()
// explicitly after user actions (project generated, idea submitted, etc.)
// ─────────────────────────────────────────────────────────────
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface AchievementContextType {
  achievements: Achievement[];
  stats: AchievementStats | null;
  isLoading: boolean;
  refreshAchievements: () => Promise<void>;
  checkForNewAchievements: () => Promise<void>;
  unlockSpecificAchievement: (code: string) => Promise<boolean>;
  recentUnlocks: RecentUnlock[];
}

const AchievementContext = createContext<AchievementContextType | undefined>(undefined);

export const useAchievements = () => {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievements must be used within AchievementProvider');
  }
  return context;
};

interface AchievementProviderProps {
  children: ReactNode;
}

export const AchievementProvider: React.FC<AchievementProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [recentUnlocks, setRecentUnlocks] = useState<RecentUnlock[]>([]);

  // ── Concurrency guards ────────────────────────────────────────────────────
  // Prevents React Strict Mode / multiple provider mounts from firing
  // check-and-unlock simultaneously (the "double call" pattern in the logs).
  const isCheckingRef = useRef(false);

  const userId = user && !('isGuest' in user && user.isGuest) ? user.id : null;

  // ── TanStack Query: achievements list ─────────────────────────────────────
  // staleTime: 60 s  →  any component reading this query within 60 s after
  // the last fetch gets cached data immediately — zero extra HTTP requests.
  const {
    data: achievements = [],
    isLoading: achievementsLoading,
    refetch: refetchAchievements,
  } = useQuery<Achievement[]>({
    queryKey: ['achievements', userId],
    queryFn: () => getUserAchievements(true),   // forceRefresh bypasses service-layer TTL
    enabled: !!userId,
    staleTime: 60_000,
    retry: 1,
  });

  // ── TanStack Query: achievement stats ─────────────────────────────────────
  const {
    data: stats = null,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery<AchievementStats | null>({
    queryKey: ['achievement-stats', userId],
    queryFn: () => getUserAchievementStats(true),
    enabled: !!userId,
    staleTime: 60_000,
    retry: 1,
  });

  const isLoading = achievementsLoading || statsLoading;

  // ── refreshAchievements: invalidate + refetch ─────────────────────────────
  const refreshAchievements = async () => {
    invalidateAchievementCache();
    await Promise.all([refetchAchievements(), refetchStats()]);
  };

  // ── checkForNewAchievements ───────────────────────────────────────────────
  // Guarded with isCheckingRef so concurrent calls (React Strict Mode double
  // effect, multiple components, polling + action trigger at same time) are
  // collapsed into a single in-flight request.
  const checkForNewAchievements = async () => {
    if (!userId) {return;}
    if (isCheckingRef.current) {return;} // already running — skip duplicate

    isCheckingRef.current = true;
    try {
      const result = await checkAndUnlockAchievements();

      if (result.unlocked_count > 0) {
        // Show toast notifications for newly unlocked achievements
        result.newly_unlocked.forEach((achievement: any) => {
          toast({
            title: `🎉 Achievement Unlocked!`,
            description: (
              <div className="flex items-start gap-3">
                <div className="text-2xl">
                  {achievement.tier === 'platinum' ? '💎'
                    : achievement.tier === 'gold' ? '🏆'
                    : achievement.tier === 'silver' ? '🥈'
                    : '🥉'}
                </div>
                <div>
                  <div className="font-bold">{achievement.title}</div>
                  <div className="text-sm text-muted-foreground">
                    +{achievement.xp_reward} XP, +{achievement.points_reward} points
                  </div>
                </div>
              </div>
            ),
            duration: 5000,
          });
        });

        setRecentUnlocks(result.newly_unlocked);

        // Only refresh achievement data when something actually changed
        await refreshAchievements();
      }
    } catch (error) {
      console.error('Error checking for new achievements:', error);
    } finally {
      isCheckingRef.current = false;
    }
  };

  // ── unlockSpecificAchievement ─────────────────────────────────────────────
  const unlockSpecificAchievement = async (code: string): Promise<boolean> => {
    if (!userId) {return false;}

    try {
      const unlocked = await unlockAchievement(code);

      if (unlocked) {
        const achievement = achievements.find(a => a.code === code);
        if (achievement) {
          toast({
            title: `🎉 Achievement Unlocked!`,
            description: (
              <div className="flex items-start gap-3">
                <div className="text-2xl">{achievement.icon_emoji}</div>
                <div>
                  <div className="font-bold">{achievement.title}</div>
                  <div className="text-sm text-muted-foreground">
                    +{achievement.xp_reward} XP, +{achievement.points_reward} points
                  </div>
                </div>
              </div>
            ),
            duration: 5000,
          });
        }

        await refreshAchievements();
      }

      return unlocked;
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      return false;
    }
  };

  // ── Background polling: every 5 min (safety net only) ────────────────────
  // Primary trigger should be event-driven (call checkForNewAchievements()
  // inside your project-generation / idea-submission success handlers).
  useEffect(() => {
    if (!userId) {return;}

    const interval = setInterval(() => {
      checkForNewAchievements();
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const value: AchievementContextType = {
    achievements,
    stats,
    isLoading,
    refreshAchievements,
    checkForNewAchievements,
    unlockSpecificAchievement,
    recentUnlocks,
  };

  return (
    <AchievementContext.Provider value={value}>
      {children}
    </AchievementContext.Provider>
  );
};
