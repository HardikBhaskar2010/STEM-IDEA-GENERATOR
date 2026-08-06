import { useLocation } from 'react-router-dom';
import { usePreferences } from '@/contexts/PreferencesContext';
import { COLOR_THEMES } from '@/contexts/PreferencesContext';
import { GridScan } from '@/components/ui/GridScan';
import { useMemo } from 'react';

/**
 * GlobalBackground - Centralized theme-aware background management
 * Renders the GridScan shader on all pages except auth/welcome/about.
 */
export function GlobalBackground() {
  const location = useLocation();
  const { colorTheme } = usePreferences();

  // EXCLUDED PATHS: No gridscan on these special experience pages
  const isExcluded = useMemo(() => {
    const path = location.pathname;
    return (
      path === '/' || 
      path === '/login' || 
      path === '/signup' || 
      path === '/about' || 
      path.startsWith('/auth/') ||
      path === '/veronica-ai'
    );
  }, [location.pathname]);

  // Map theme HSL to Hex for the shader
  const { linesColor, scanColor } = useMemo(() => {
    // Default to 'allblack' if theme not found
    const theme = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES] || COLOR_THEMES.allblack;
    
    // Helper to turn HSL string to Hex for Three.js
    const hslToHex = (hslStr: string) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {return '#000000';}
      ctx.fillStyle = hslStr;
      return ctx.fillStyle; // returns hex/rgb string
    };

    return {
      linesColor: hslToHex(`hsl(${theme.colors.primary} / 0.35)`), // Fade it slightly
      scanColor: hslToHex(`hsl(${theme.colors.accent})`)
    };
  }, [colorTheme]);

  if (isExcluded) {return null;}

  return (
    <div 
      className="global-background-container"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1, // Behind page content
        pointerEvents: 'none',
      }}
    >
      <GridScan
        sensitivity={0.55}
        lineThickness={1}
        linesColor={linesColor}
        gridScale={0.1}
        scanColor={scanColor}
        scanOpacity={0.4}
        enablePost
        bloomIntensity={0.6}
        chromaticAberration={0.002}
        noiseIntensity={0.01}
        listenOnWindow={true}
      />
    </div>
  );
}

