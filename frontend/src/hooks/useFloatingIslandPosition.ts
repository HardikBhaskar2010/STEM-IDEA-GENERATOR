import { useState, useEffect, useRef } from 'react';

/**
 * Configuration for floating island positioning
 * Defines spacing between islands to prevent overlap
 */
export interface FloatingIslandConfig {
  id: string;
  width: number; // approximate width in pixels
  horizontalOffset: number; // offset from center in pixels
  mobileWidth?: number; // override width for mobile
  mobileOffset?: number; // override offset for mobile
}

/**
 * Hook to manage floating island positioning and prevent overlap
 * Calculates proper spacing based on viewport width and island dimensions
 */
export const useFloatingIslandPosition = () => {
  const [viewportWidth, setViewportWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1024;
  });

  const [isSmallScreen, setIsSmallScreen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setIsSmallScreen(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Calculate horizontal offset for an island to prevent overlap
   * Island 1 (FloatingNav): Centered at x=0 (left-1/2 -translate-x-1/2)
   * Island 2 (FloatingSettings): Positioned to the right with proper spacing
   */
  const getIslandPosition = (islandIndex: number, config: FloatingIslandConfig) => {
    const isMobile = isSmallScreen;
    const width = isMobile && config.mobileWidth ? config.mobileWidth : config.width;
    const offset = isMobile && config.mobileOffset !== undefined ? config.mobileOffset : config.horizontalOffset;

    return {
      transform: `translateX(${offset}px)`,
      width: `${width}px`,
      minWidth: `${width}px`,
    };
  };

  /**
   * Calculate safe spacing between islands
   * Returns the minimum horizontal distance needed between centers
   */
  const calculateMinimumSpacing = (
    island1Width: number,
    island2Width: number,
    gap: number = 16 // minimum gap in pixels
  ): number => {
    return (island1Width + island2Width) / 2 + gap;
  };

  return {
    viewportWidth,
    isSmallScreen,
    getIslandPosition,
    calculateMinimumSpacing,
  };
};

/**
 * Standard island configurations for the application
 */
export const FLOATING_ISLANDS_CONFIG = {
  nav: {
    id: 'floating-nav',
    width: 550, // approximate width of FloatingDock with all items
    mobileWidth: 320,
    horizontalOffset: 0, // centered
    mobileOffset: 0, // centered on mobile
  },
  settings: {
    id: 'floating-settings',
    width: 320, // approximate width of settings dock
    mobileWidth: 240,
    horizontalOffset: 420, // positioned to the right with spacing
    mobileOffset: 280, // smaller offset on mobile to account for smaller nav
  },
} as const;

/**
 * Calculate responsive offsets based on viewport
 */
export const calculateResponsiveOffsets = (viewportWidth: number) => {
  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth < 1024;

  return {
    nav: {
      offset: 0, // always centered
      spacing: isMobile ? 12 : 16,
    },
    settings: {
      // Responsive offset for settings island
      // On mobile: minimal offset due to smaller viewport
      // On tablet: medium offset
      // On desktop: maximum offset
      offset: isMobile ? 260 : isTablet ? 320 : 420,
      spacing: isMobile ? 12 : 16,
    },
  };
};
