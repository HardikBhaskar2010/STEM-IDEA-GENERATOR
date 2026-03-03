import React, { createContext, useContext, useEffect, useState } from 'react';

type PerfContextValue = {
  lowPerf: boolean;
  setLowPerf: (value: boolean) => void;
  suggested: boolean;
  shouldPrompt: boolean;
  dismissPrompt: () => void;
};

const PerfContext = createContext<PerfContextValue | undefined>(undefined);

const STORAGE_KEY = 'perf:low';
const PROMPT_DISMISSED_KEY = 'perf:prompt-dismissed';

export const PerfProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lowPerf, setLowPerfState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const [suggested, setSuggested] = useState(false);
  const [shouldPrompt, setShouldPrompt] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(() => {
    try {
      return localStorage.getItem(PROMPT_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Apply data-mode attribute whenever lowPerf changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lowPerf));
    } catch {
      // Ignore storage errors
    }

    // Apply to document root
    document.documentElement.setAttribute('data-mode', lowPerf ? 'low' : 'normal');
  }, [lowPerf]);

  // Auto-detection on mount
  useEffect(() => {
    // Get device capabilities
    const deviceMem = (navigator as any).deviceMemory || 4; // Default to 4GB if not available
    const cores = navigator.hardwareConcurrency || 4;
    const connection = (navigator as any).connection;
    const saveData = connection?.saveData ?? false;
    const effectiveType = connection?.effectiveType; // '4g', '3g', '2g', 'slow-2g'
    
    // Check for prefers-reduced-motion
    const reducedMotion = window.matchMedia && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Auto-enable logic: Only for very low-end devices (≤1GB RAM)
    const shouldAutoEnable = deviceMem <= 1.0;

    // Suggestion logic: For 1-2GB RAM or other constraints
    const shouldSuggest = 
      (deviceMem > 1.0 && deviceMem <= 2.0) || 
      cores <= 2 || 
      saveData || 
      reducedMotion ||
      effectiveType === '2g' ||
      effectiveType === 'slow-2g';

    setSuggested(shouldSuggest || shouldAutoEnable);

    // Auto-enable for very constrained devices
    if (shouldAutoEnable && !lowPerf) {
      setLowPerfState(true);
      console.log('[PerfContext] Auto-enabled low-perf mode (RAM ≤ 1GB)');
    }

    // Show prompt for moderately constrained devices (if not already dismissed)
    if (shouldSuggest && !shouldAutoEnable && !lowPerf && !promptDismissed) {
      setShouldPrompt(true);
      console.log('[PerfContext] Low-perf mode suggested for this device');
    }

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[PerfContext] Device capabilities:', {
        deviceMemory: deviceMem + 'GB',
        cores,
        saveData,
        effectiveType,
        reducedMotion,
        shouldAutoEnable,
        shouldSuggest,
      });
    }
  }, [lowPerf, promptDismissed]);

  const setLowPerf = (value: boolean) => {
    setLowPerfState(value);
    console.log('[PerfContext] Low-perf mode:', value ? 'enabled' : 'disabled');
  };

  const dismissPrompt = () => {
    setShouldPrompt(false);
    setPromptDismissed(true);
    try {
      localStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <PerfContext.Provider 
      value={{ 
        lowPerf, 
        setLowPerf, 
        suggested, 
        shouldPrompt,
        dismissPrompt 
      }}
    >
      {children}
    </PerfContext.Provider>
  );
};

export const usePerf = () => {
  const context = useContext(PerfContext);
  if (!context) {
    throw new Error('usePerf must be used within PerfProvider');
  }
  return context;
};
