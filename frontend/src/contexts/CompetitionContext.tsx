// Competition Context - Manage competition mode state
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TeamInfo, UserProgress, getMyTeam, getUserProgress } from '@/services/competitionService';

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
  const [isLoading, setIsLoading] = useState(true);

  const refreshTeamInfo = async () => {
    try {
      const info = await getMyTeam();
      setTeamInfo(info);
    } catch (error) {
      console.error('Error refreshing team info:', error);
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
    await Promise.all([refreshTeamInfo(), refreshUserProgress()]);
    setIsLoading(false);
  };

  useEffect(() => {
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
