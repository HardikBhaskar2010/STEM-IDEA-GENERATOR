import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  Achievement,
  AchievementStats,
  getUserAchievements,
  getUserAchievementStats,
  checkAndUnlockAchievements,
  unlockAchievement,
  RecentUnlock
} from '@/services/achievementService';

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
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentUnlocks, setRecentUnlocks] = useState<RecentUnlock[]>([]);

  const fetchAchievements = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [achievementsData, statsData] = await Promise.all([
        getUserAchievements(),
        getUserAchievementStats(),
      ]);

      setAchievements(achievementsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAchievements = async () => {
    await fetchAchievements();
  };

  const checkForNewAchievements = async () => {
    if (!user) return;

    try {
      const result = await checkAndUnlockAchievements();
      
      if (result.unlocked_count > 0) {
        // Show toast notifications for newly unlocked achievements
        result.newly_unlocked.forEach((achievement: any) => {
          toast({
            title: `🎉 Achievement Unlocked!`,
            description: (
              <div className="flex items-start gap-3">
                <div className="text-2xl">{achievement.tier === 'platinum' ? '💎' : achievement.tier === 'gold' ? '🏆' : achievement.tier === 'silver' ? '🥈' : '🥉'}</div>
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

        // Store recent unlocks
        setRecentUnlocks(result.newly_unlocked);

        // Refresh achievements after unlocking
        await refreshAchievements();
      }
    } catch (error) {
      console.error('Error checking for new achievements:', error);
    }
  };

  const unlockSpecificAchievement = async (code: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const unlocked = await unlockAchievement(code);
      
      if (unlocked) {
        // Find the achievement details
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

  // Fetch achievements when user changes
  useEffect(() => {
    fetchAchievements();
  }, [user]);

  // Check for new achievements periodically (every 30 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkForNewAchievements();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

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
