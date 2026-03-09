import { useEffect, useState, useCallback } from 'react';

type Theme = 'dark' | 'light' | 'system';

// Theme change event for global synchronization
export const themeChangeEvent = new EventTarget();

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'system';
    }
    return 'system';
  });

  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Get the effective theme (resolved if system is selected)
  const effectiveTheme = theme === 'system' ? systemTheme : theme;
  const isDark = effectiveTheme === 'dark';

  // Enhanced setTheme with event emission
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);

    // Emit custom event for theme change
    themeChangeEvent.dispatchEvent(
      new CustomEvent('themechange', {
        detail: { theme: newTheme, isDark: newTheme === 'dark' },
      })
    );
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (currentTheme: Theme, currentSystemTheme: 'dark' | 'light') => {
      root.classList.remove('light', 'dark');

      if (currentTheme === 'system') {
        root.classList.add(currentSystemTheme);
      } else {
        root.classList.add(currentTheme);
      }

      // Emit event when theme is applied
      themeChangeEvent.dispatchEvent(
        new CustomEvent('themechange', {
          detail: {
            theme: currentTheme,
            isDark: currentTheme === 'dark' || (currentTheme === 'system' && currentSystemTheme === 'dark'),
            effectiveTheme: currentTheme === 'system' ? currentSystemTheme : currentTheme,
          },
        })
      );
    };

    applyTheme(theme, systemTheme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystemTheme);
      if (theme === 'system') {
        applyTheme('system', newSystemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme, systemTheme]);

  return {
    theme,
    setTheme,
    isDark,
    effectiveTheme,
    systemTheme,
  };
};
