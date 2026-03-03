/**
 * usePerformanceMode Hook
 * Phase 9: Performance & Accessibility - Enhanced
 * 
 * Provides performance mode detection and configuration with device detection
 */

import { useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';
import { getDeviceCapabilities, isLowEndDevice, isMobile, getConnectionInfo, getBatteryStatus } from '@/lib/deviceDetection';

export type PerformanceMode = 'low' | 'medium' | 'high';

export interface PerformanceConfig {
  mode: PerformanceMode;
  enableAnimations: boolean;
  enableCursorEffects: boolean;
  enableBackgroundEffects: boolean;
  enableTextEffects: boolean;
  enableParticles: boolean;
  enable3D: boolean;
  maxFPS: number;
}

/**
 * Detect device performance tier based on various factors
 * Enhanced with comprehensive device detection
 */
async function detectPerformanceTier(): Promise<PerformanceMode> {
  const capabilities = getDeviceCapabilities();
  const connection = getConnectionInfo();
  
  // Check battery status for additional optimization
  const battery = await getBatteryStatus();
  const isLowPower = battery && battery.level < 0.2 && !battery.charging;
  
  // Force low mode if device is low-end or battery is low
  if (capabilities.isLowEndDevice || isLowPower) {
    return 'low';
  }
  
  // Mobile devices default to medium
  if (capabilities.isMobile || capabilities.isTablet) {
    return 'medium';
  }
  
  // Check connection quality
  if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
    return 'low';
  }
  
  // High performance criteria for desktop
  if (capabilities.hardwareConcurrency >= 8 && 
      capabilities.deviceMemory >= 8 && 
      capabilities.supportsWebGL2) {
    return 'high';
  }
  
  // Low performance criteria
  if (capabilities.hardwareConcurrency <= 2 || capabilities.deviceMemory <= 2) {
    return 'low';
  }
  
  // Medium by default
  return 'medium';
}

/**
 * Get performance configuration based on mode
 */
function getPerformanceConfig(mode: PerformanceMode, reducedMotion: boolean): PerformanceConfig {
  // If reduced motion is preferred, use minimal settings
  if (reducedMotion) {
    return {
      mode: 'low',
      enableAnimations: false,
      enableCursorEffects: false,
      enableBackgroundEffects: false,
      enableTextEffects: false,
      enableParticles: false,
      enable3D: false,
      maxFPS: 30,
    };
  }

  switch (mode) {
    case 'low':
      return {
        mode: 'low',
        enableAnimations: true,
        enableCursorEffects: false,
        enableBackgroundEffects: false,
        enableTextEffects: true,
        enableParticles: false,
        enable3D: false,
        maxFPS: 30,
      };
    
    case 'medium':
      return {
        mode: 'medium',
        enableAnimations: true,
        enableCursorEffects: true,
        enableBackgroundEffects: true,
        enableTextEffects: true,
        enableParticles: true,
        enable3D: false,
        maxFPS: 60,
      };
    
    case 'high':
      return {
        mode: 'high',
        enableAnimations: true,
        enableCursorEffects: true,
        enableBackgroundEffects: true,
        enableTextEffects: true,
        enableParticles: true,
        enable3D: true,
        maxFPS: 60,
      };
    
    default:
      return getPerformanceConfig('medium', reducedMotion);
  }
}


export function usePerformanceMode(manualMode?: PerformanceMode): PerformanceConfig {
  const reducedMotion = useReducedMotion();
