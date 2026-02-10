'use client';

// src/context/PreferencesContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserMode = 'student' | 'normal';
export type ColorTheme = 'allblack' | 'purple' | 'pink' | 'blue' | 'green' | 'red' | 'orange';

interface PreferencesState {
  userMode: UserMode;
  colorTheme: ColorTheme;
  showPrice: boolean;
  setUserMode: (m: UserMode) => void;
  setColorTheme: (t: ColorTheme) => void;
}

// Theme color definition type
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

// Theme metadata type
export interface ThemeMetadata {
  name: string;
  description: string;
  colors: ThemeColors;
}

// Theme definitions with name and description
export const COLOR_THEMES: Record<ColorTheme, ThemeMetadata> = {
  allblack: {
    name: 'Charcoal Gray',
    description: 'Elegant grayscale theme with soft gray accents for better readability',
    colors: {
      primary: '0 0% 65%',
      secondary: '0 0% 55%',
      accent: '0 0% 75%'
    }
  },
  purple: {
    name: 'Purple Fusion',
    description: 'Default theme with purple gradients',
    colors: {
      primary: '270 70% 55%',
      secondary: '280 65% 60%',
      accent: '290 80% 65%'
    }
  },
  pink: {
    name: 'Pink Blossom',
    description: 'Vibrant and energetic pink theme',
    colors: {
      primary: '330 81% 60%',
      secondary: '340 75% 55%',
      accent: '350 85% 65%'
    }
  },
  blue: {
    name: 'Ocean Blue',
    description: 'Cool and professional blue theme',
    colors: {
      primary: '217 91% 60%',
      secondary: '221 83% 53%',
      accent: '212 95% 65%'
    }
  },
  green: {
    name: 'Matrix Green',
    description: 'Tech-inspired green theme',
    colors: {
      primary: '160 84% 39%',
      secondary: '158 64% 52%',
      accent: '162 80% 45%'
    }
  },
  red: {
    name: 'Cyber Red',
    description: 'Bold and powerful red theme',
    colors: {
      primary: '0 84% 60%',
      secondary: '0 72% 51%',
      accent: '4 90% 58%'
    }
  },
  orange: {
    name: 'Sunset Orange',
    description: 'Warm and inviting orange theme',
    colors: {
      primary: '24 95% 53%',
      secondary: '20 91% 48%',
      accent: '27 87% 55%'
    }
  }
};

const PreferencesContext = createContext<PreferencesState | undefined>(
  undefined
);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Load theme from localStorage or default to 'purple'
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('colorTheme');
      return (saved as ColorTheme) || 'purple';
    }
    return 'purple';
  });

  const [userMode, setUserMode] = useState<UserMode>('normal');

  // Apply theme changes to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const theme = COLOR_THEMES[colorTheme];
    
    if (theme) {
      // Update CSS custom properties
      root.style.setProperty('--primary', theme.colors.primary);
      root.style.setProperty('--primary-foreground', '0 0% 100%');
      root.style.setProperty('--primary-glow', theme.colors.accent);
      
      root.style.setProperty('--secondary', theme.colors.secondary);
      root.style.setProperty('--secondary-foreground', '0 0% 100%');
      
      root.style.setProperty('--accent', theme.colors.accent);
      root.style.setProperty('--accent-foreground', '0 0% 100%');
      
      root.style.setProperty('--ring', theme.colors.primary);
      
      // Update sidebar colors
      root.style.setProperty('--sidebar-primary', theme.colors.primary);
      root.style.setProperty('--sidebar-ring', theme.colors.primary);

      // Update gradient variables based on theme
      const [h, s, l] = theme.colors.primary.split(' ');
      const [h2, s2, l2] = theme.colors.secondary.split(' ');
      const [h3, s3, l3] = theme.colors.accent.split(' ');
      
      root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${h}, ${s}, ${l}), hsl(${h3}, ${s3}, ${l3}))`);
      root.style.setProperty('--gradient-secondary', `linear-gradient(135deg, hsl(${h2}, ${s2}, ${l2}), hsl(${h}, ${s}, ${l}))`);
      root.style.setProperty('--gradient-accent', `linear-gradient(135deg, hsl(${h3}, ${s3}, ${l3}), hsl(${h}, ${s}, ${l}))`);
      root.style.setProperty('--gradient-hero', `linear-gradient(135deg, hsl(${h}, ${s}, ${l}), hsl(${h2}, ${s2}, ${l2}), hsl(${h3}, ${s3}, ${l3}))`);
      
      // Update shadow colors
      root.style.setProperty('--shadow-glow', `0 0 40px hsl(${h} ${s} ${l} / 0.5)`);
      root.style.setProperty('--shadow-glow-secondary', `0 0 40px hsl(${h2} ${s2} ${l2} / 0.4)`);
    }
    
    // Save to localStorage
    localStorage.setItem('colorTheme', colorTheme);
  }, [colorTheme]);

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
  };

  const value: PreferencesState = {
    userMode,
    colorTheme,
    showPrice: true,
    setUserMode,
    setColorTheme,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return ctx;
}
