import type { ReactNode } from 'react';
import React from 'react';
import { useBackgroundColor } from '@/hooks/useBackgroundColor';
import { useTheme } from '@/hooks/useTheme';

interface AdaptiveFloatingContainerProps {
  children: ReactNode;
  className?: string;
  selector?: string;
}

/**
 * AdaptiveFloatingContainer component that adapts its styling based on:
 * 1. Background color detection (luminosity-based contrast)
 * 2. System/app theme (dark/light mode)
 * 3. Automatically centers itself within the viewport
 */
export function AdaptiveFloatingContainer({
  children,
  className = '',
  selector = 'body',
}: AdaptiveFloatingContainerProps) {
  const bgColorInfo = useBackgroundColor(selector);
  const { isDark, theme } = useTheme();

  // Calculate adaptive styles based on background luminosity
  const getAdaptiveClasses = (): string => {
    const isDarkBg = bgColorInfo.isDark;

    // Determine if we should use light or dark styling based on background
    const shouldUseLightText = isDarkBg;

    // Glass-morphism base styling with responsive centering
    let baseClasses =
      'floating-centered-lg fixed rounded-full backdrop-blur-lg border transition-all duration-300 theme-transition';

    // Adaptive border and background based on background luminosity
    if (isDarkBg) {
      // Light glass effect on dark backgrounds
      baseClasses +=
        ' bg-white/10 border-white/20 shadow-lg shadow-black/20 hover:bg-white/15 hover:border-white/30';
    } else {
      // Dark glass effect on light backgrounds
      baseClasses +=
        ' bg-black/5 border-black/10 shadow-md shadow-black/10 hover:bg-black/10 hover:border-black/20';
    }

    // Text color adaptation with smooth transitions
    const textClasses = shouldUseLightText 
      ? 'text-white' 
      : 'text-gray-900 dark:text-white';

    return `${baseClasses} ${textClasses}`;
  };

  // Add responsive padding and sizing
  const containerClasses = `
    ${getAdaptiveClasses()}
    px-3 py-3 sm:px-4 sm:py-3 md:px-4 md:py-4
    w-fit h-fit
    z-50
    will-change-transform
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <div
      className={containerClasses}
      role="region"
      aria-label="Floating action container"
      data-theme={theme}
      data-bg-luminosity={bgColorInfo.luminosity > 0.5 ? 'light' : 'dark'}
    >
      {children}
    </div>
  );
}
