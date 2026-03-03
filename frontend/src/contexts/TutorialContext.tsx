import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TutorialState {
  hasSeenWelcome: boolean;
  hasSeenGenerator: boolean;
  hasSeenComponents: boolean;
  hasSeenLibrary: boolean;
  hasSeenProfile: boolean;
  isActive: boolean;
  currentStep: number;
}

interface TutorialContextType {
  tutorialState: TutorialState;
  startWelcomeTour: () => void;
  completeWelcomeTour: () => void;
  skipWelcomeTour: () => void;
  startPageTutorial: (page: string) => void;
  completePageTutorial: (page: string) => void;
  resetTutorials: () => void;
  isPageTutorialComplete: (page: string) => boolean;
  setCurrentStep: (step: number) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const TUTORIAL_STORAGE_KEY = 'stem-tutorial-state';

const defaultTutorialState: TutorialState = {
  hasSeenWelcome: false,
  hasSeenGenerator: false,
  hasSeenComponents: false,
  hasSeenLibrary: false,
  hasSeenProfile: false,
  isActive: false,
  currentStep: 0,
};

export const TutorialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tutorialState, setTutorialState] = useState<TutorialState>(() => {
    // Load from localStorage on initialization
    try {
      const stored = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (stored) {
        return { ...defaultTutorialState, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load tutorial state:', error);
    }
    return defaultTutorialState;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(tutorialState));
    } catch (error) {
      console.error('Failed to save tutorial state:', error);
    }
  }, [tutorialState]);

  const startWelcomeTour = () => {
    setTutorialState(prev => ({
      ...prev,
      isActive: true,
      currentStep: 0,
    }));
  };

  const completeWelcomeTour = () => {
    setTutorialState(prev => ({
      ...prev,
      hasSeenWelcome: true,
      isActive: false,
      currentStep: 0,
    }));
  };

  const skipWelcomeTour = () => {
    setTutorialState(prev => ({
      ...prev,
      hasSeenWelcome: true,
      isActive: false,
      currentStep: 0,
    }));
  };

  const startPageTutorial = (page: string) => {
    setTutorialState(prev => ({
      ...prev,
      isActive: true,
      currentStep: 0,
    }));
  };

  const completePageTutorial = (page: string) => {
    setTutorialState(prev => ({
      ...prev,
      [`hasSeen${page.charAt(0).toUpperCase() + page.slice(1)}`]: true,
      isActive: false,
      currentStep: 0,
    }));
  };

  const resetTutorials = () => {
    setTutorialState(defaultTutorialState);
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
  };

  const isPageTutorialComplete = (page: string): boolean => {
    const key = `hasSeen${page.charAt(0).toUpperCase() + page.slice(1)}` as keyof TutorialState;
    return tutorialState[key] as boolean || false;
  };

  const setCurrentStep = (step: number) => {
    setTutorialState(prev => ({ ...prev, currentStep: step }));
  };

  return (
    <TutorialContext.Provider
      value={{
        tutorialState,
        startWelcomeTour,
        completeWelcomeTour,
        skipWelcomeTour,
        startPageTutorial,
        completePageTutorial,
        resetTutorials,
        isPageTutorialComplete,
        setCurrentStep,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};
