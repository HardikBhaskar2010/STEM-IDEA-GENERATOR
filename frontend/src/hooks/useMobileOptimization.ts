/**
 * useMobileOptimization Hook
 * Phase 9: Performance & Accessibility
 * 
 * Mobile-specific optimizations and touch support
 */

import { useEffect, useState } from 'react';
import { isMobile, isTablet, isTouchDevice, getDeviceCapabilities } from '@/lib/deviceDetection';
import type { DeviceCapabilities } from '@/lib/deviceDetection';

/**
 * Hook for mobile detection and optimization
 */
export function useMobileOptimization() {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);

  useEffect(() => {
    setCapabilities(getDeviceCapabilities());

    // Listen for orientation changes
    const handleOrientationChange = () => {
      setCapabilities(getDeviceCapabilities());
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  return {
    isMobile: capabilities?.isMobile ?? false,
    isTablet: capabilities?.isTablet ?? false,
    isDesktop: capabilities?.isDesktop ?? true,
    isTouchDevice: capabilities?.isTouchDevice ?? false,
    isLowEndDevice: capabilities?.isLowEndDevice ?? false,
    orientation: capabilities?.orientation ?? 'landscape',
    capabilities,
  };
}

/**
 * Hook for touch event handling
 */
export function useTouchEvents<T extends HTMLElement>(
  onTouchStart?: (e: TouchEvent) => void,
  onTouchMove?: (e: TouchEvent) => void,
  onTouchEnd?: (e: TouchEvent) => void
) {
  const [ref, setRef] = useState<T | null>(null);

  useEffect(() => {
    if (!ref || !isTouchDevice()) return;

    const handleTouchStart = (e: TouchEvent) => onTouchStart?.(e);
    const handleTouchMove = (e: TouchEvent) => onTouchMove?.(e);
    const handleTouchEnd = (e: TouchEvent) => onTouchEnd?.(e);

    if (onTouchStart) {
      ref.addEventListener('touchstart', handleTouchStart, { passive: true });
    }
    if (onTouchMove) {
      ref.addEventListener('touchmove', handleTouchMove, { passive: true });
    }
    if (onTouchEnd) {
      ref.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      if (onTouchStart) ref.removeEventListener('touchstart', handleTouchStart);
      if (onTouchMove) ref.removeEventListener('touchmove', handleTouchMove);
      if (onTouchEnd) ref.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, onTouchStart, onTouchMove, onTouchEnd]);

  return setRef;
}

/**
 * Hook for mobile-optimized settings
 */
export function useMobileSettings<T extends Record<string, any>>(
  desktopSettings: T,
  mobileSettings: Partial<T>
): T {
  const { isMobile: mobile } = useMobileOptimization();

  if (mobile) {
    return { ...desktopSettings, ...mobileSettings };
  }

  return desktopSettings;
}

/**
 * Hook for adaptive particle count
 */
export function useAdaptiveParticleCount(desktopCount: number): number {
  const { isMobile: mobile, isLowEndDevice } = useMobileOptimization();

  if (isLowEndDevice) return Math.min(20, desktopCount);
  if (mobile) return Math.min(50, desktopCount);
  return desktopCount;
}
