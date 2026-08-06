// Competition Context - Manage competition mode state
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { TeamInfo, UserProgress} from '@/services/competitionService';
import { getMyTeam, getUserProgress } from '@/services/competitionService';

interface CompetitionContextType {
  isCompetitionMode: boolean;
  teamInfo: TeamInfo | null;
  userProgress: UserProgress | null;
  isLoading: boolean;
  refreshTeamInfo: () => Promise<void>;
  refreshUserProgress: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const CompetitionContext = createContext<CompetitionContextType | undefined>(undefined);

export const CompetitionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshTeamInfo = async () => {
    try {
      const info = await getMyTeam();
      setTeamInfo(info);
      return info;
    } catch (error) {
      console.error('Error refreshing team info:', error);
      return null;
    }
  };

  const refreshUserProgress = async () => {
    try {
      const progress = await getUserProgress();
      setUserProgress(progress);
    } catch (error) {
      console.error('Error refreshing user progress:', error);
    }
  };

  const refreshAll = async () => {
    setIsLoading(true);
    // First fetch team info
    const team = await refreshTeamInfo();
    // Only fetch user progress if user is in a team
    if (team) {
      await refreshUserProgress();
    } else {
      setUserProgress(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // Load data in background without blocking UI
    refreshAll();
  }, []);

  const isCompetitionMode = teamInfo !== null;

  return (
    <CompetitionContext.Provider
      value={{
        isCompetitionMode,
        teamInfo,
        userProgress,
        isLoading,
        refreshTeamInfo,
        refreshUserProgress,
        refreshAll,
      }}
    >
      {children}
    </CompetitionContext.Provider>
  );
};

export const useCompetition = () => {
  const context = useContext(CompetitionContext);
  if (context === undefined) {
    throw new Error('useCompetition must be used within a CompetitionProvider');
  }
  return context;
};
