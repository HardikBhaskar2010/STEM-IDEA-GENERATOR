/**
 * ReactbitsBackground Wrapper Utilities
 * 
 * This module provides standardized wrapper utilities for reactbits background components,
 * including theme adaptation, animation controls, and error handling.
 * 
 * Validates: Requirements 7.1, 7.2, 16.1, 16.2, 17.1
 */

import React, { CSSProperties } from 'react';
import { ReactbitsBackgroundProps } from './types';
import { BackgroundErrorBoundary } from './BackgroundErrorBoundary';

/**
 * Apply theme-specific adaptations to backgrounds that don't natively support themes
 * 
 * For backgrounds with native theme support, this returns an empty object.
 * For backgrounds without theme support, it applies opacity and brightness adjustments.
 * 
 * @param supportsTheme - Whether the background natively supports theme variants
 * @param theme - Current theme ('light' or 'dark')
 * @returns CSS properties for theme adaptation
 */
export function applyThemeAdaptation(
  supportsTheme: boolean,
  theme: 'light' | 'dark'
): CSSProperties {
  if (supportsTheme) {
    // Background handles theme natively
    return {};
  }

  // Apply fallback adaptations for backgrounds without native theme support
  return theme === 'light'
    ? {
        opacity: 0.7,
        filter: 'brightness(1.2)',
      }
    : {
        opacity: 1.0,
      };
}

/**
 * Wrapper component that provides standardized interface for reactbits backgrounds
 * 
 * This HOC wraps reactbits components with:
 * - Error boundary for graceful error handling
 * - Theme adaptation
 * - Animation controls (pause/play, speed)
 * - Consistent prop interface
 * 
 * @param Component - The reactbits background component to wrap
 * @param backgroundId - Unique identifier for the background
 * @param supportsTheme - Whether the component natively supports themes
 * @returns Wrapped component with standardized interface
 */
export function withReactbitsWrapper<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  backgroundId: string,
  supportsTheme: boolean = false
): React.FC<ReactbitsBackgroundProps> {
  return function WrappedReactbitsBackground({
    settings,
    theme,
    isActive,
    isPaused = false,
    animationSpeed = 1.0,
  }: ReactbitsBackgroundProps) {
    // Apply theme adaptations if needed
    const themeStyles = applyThemeAdaptation(supportsTheme, theme);

    // Handle error by reverting to safe state
    const handleError = () => {
      console.warn(`Background ${backgroundId} encountered an error and will be disabled`);
      // In a real implementation, this would call a callback to revert the background
      // For now, we just log the error
    };

    return (
      <BackgroundErrorBoundary backgroundId={backgroundId} onError={handleError}>
        <div
          style={themeStyles}
          className="absolute inset-0"
          data-background-id={backgroundId}
          data-background-active={isActive}
        >
          <Component
            {...(settings as T)}
            // Pass theme-related props if supported
            {...(supportsTheme && { theme })}
            // Pass animation control props if the component supports them
            {...(isPaused !== undefined && { paused: isPaused })}
            {...(animationSpeed !== undefined && { speed: animationSpeed })}
          />
        </div>
      </BackgroundErrorBoundary>
    );
  };
}

/**
 * Base wrapper component for manual wrapping (alternative to HOC)
 * 
 * Use this when you need more control over the wrapping behavior.
 */
export const ReactbitsBackgroundBase: React.FC<
  ReactbitsBackgroundProps & {
    backgroundId: string;
    supportsTheme?: boolean;
    children: React.ReactNode;
  }
> = ({
  backgroundId,
  supportsTheme = false,
  theme,
  isActive,
  children,
}) => {
  const themeStyles = applyThemeAdaptation(supportsTheme, theme);

  const handleError = () => {
    console.warn(`Background ${backgroundId} encountered an error`);
  };

  return (
    <BackgroundErrorBoundary backgroundId={backgroundId} onError={handleError}>
      <div
        style={themeStyles}
        className="absolute inset-0"
        data-background-id={backgroundId}
        data-background-active={isActive}
      >
        {children}
      </div>
    </BackgroundErrorBoundary>
  );
};

export default withReactbitsWrapper;
