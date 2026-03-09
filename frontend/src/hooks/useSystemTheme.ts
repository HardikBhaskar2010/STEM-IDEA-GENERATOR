import { useEffect, useState, useCallback } from 'react';

/**
 * Hook to detect and sync with system theme preferences
 * Provides automatic synchronization with OS dark/light mode settings
 */
export function useSystemTheme() {
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  // Setup system theme listener
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    darkModeQuery.addEventListener('change', handleSystemThemeChange);
    return () => darkModeQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  // Setup reduced motion listener
  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    return () => reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
  }, []);

  // Provide a method to check if system prefers dark theme
  const isDarkMode = useCallback(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }, []);

  return {
    systemTheme,
    isDarkMode: systemTheme === 'dark',
    prefersReducedMotion,
    isDarkModeQuery: isDarkMode,
  };
}
