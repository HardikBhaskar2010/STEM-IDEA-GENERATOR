/**
 * Performance Guard - Performance Constraints for Effects
 * Phase 9: Enhanced with memory monitoring and GPU optimization
 * 
 * Provides performance mode configurations and helpers to ensure
 * effects run smoothly across different device capabilities.
 */

import type { PerformanceMode, PerformanceConstraints } from '@/types/effects';
import { getMemoryUsage, detectMemoryLeak } from '@/lib/memoryManager';
import { isMobile, isLowEndDevice } from '@/lib/deviceDetection';

/**
 * Performance constraints for each mode
 */
export const PERFORMANCE_CONSTRAINTS: Record<PerformanceMode, PerformanceConstraints> = {
  low: {
    maxParticles: 0,
    enableGlow: false,
    enable3D: false,
    enableComplexAnimations: false,
    targetFPS: 60,
  },
  medium: {
    maxParticles: 100,
    enableGlow: true,
    enable3D: false,
    enableComplexAnimations: true,
    targetFPS: 60,
  },
  high: {
    maxParticles: 500,
    enableGlow: true,
    enable3D: true,
    enableComplexAnimations: true,
    targetFPS: 60,
  },
};

/**
 * Get performance constraints for current mode
 * Enhanced with device detection
 */
export function getPerformanceConstraints(mode: PerformanceMode): PerformanceConstraints {
  const constraints = PERFORMANCE_CONSTRAINTS[mode];
  
  // Adjust for mobile/low-end devices
  if (isMobile() || isLowEndDevice()) {
    return {
      ...constraints,
      maxParticles: Math.min(constraints.maxParticles, 50),
      enable3D: false, // Disable 3D on mobile/low-end
    };
  }
  
  return constraints;
}

/**
 * Check if an effect should be enabled for current performance mode
 */
export function shouldEnableEffect(
  effectPerformanceModes: PerformanceMode[],
  currentMode: PerformanceMode
): boolean {
  return effectPerformanceModes.includes(currentMode);
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * FPS monitor with memory tracking (Enhanced for Phase 9)
 */
export class FPSMonitor {
  private frames: number[] = [];
  private lastTime = performance.now();
  private memoryHistory: number[] = [];
  
  tick(): number {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    
    const fps = 1000 / delta;
    this.frames.push(fps);
    
    // Keep last 60 frames
    if (this.frames.length > 60) {
      this.frames.shift();
    }
    
    // Track memory
    const memUsage = getMemoryUsage();
    if (memUsage) {
      this.memoryHistory.push(memUsage.used);
      if (this.memoryHistory.length > 60) {
        this.memoryHistory.shift();
      }
    }
    
    return fps;
  }
  
  getAverageFPS(): number {
    if (this.frames.length === 0) return 0;
    const sum = this.frames.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.frames.length);
  }
  
  getAverageMemory(): number {
    if (this.memoryHistory.length === 0) return 0;
    const sum = this.memoryHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.memoryHistory.length);
  }
  
  hasMemoryLeak(): boolean {
    return detectMemoryLeak(80);
  }
  
  reset(): void {
    this.frames = [];
    this.memoryHistory = [];
    this.lastTime = performance.now();
  }
}

/**
 * GPU acceleration helpers (Enhanced)
 */
export function enableGPUAcceleration(element: HTMLElement | null, properties: string[] = ['transform']): void {
  if (!element) return;
  
  // Force GPU acceleration with translate3d
  element.style.transform = element.style.transform || 'translate3d(0, 0, 0)';
  
  // Set will-change for properties that will animate
  element.style.willChange = properties.join(', ');
}

export function disableGPUAcceleration(element: HTMLElement | null): void {
  if (!element) return;
  
  // Remove will-change to free GPU resources
  element.style.willChange = 'auto';
}

/**
 * Throttle helper for performance
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Debounce helper for performance
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * RequestAnimationFrame wrapper for cleanup (Enhanced)
 */
export class AnimationFrameController {
  private frameId: number | null = null;
  private isRunning: boolean = false;
  
  start(callback: (time: number) => void): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    const loop = (time: number) => {
      if (!this.isRunning) return;
      callback(time);
      this.frameId = requestAnimationFrame(loop);
    };
    this.frameId = requestAnimationFrame(loop);
  }
  
  stop(): void {
    this.isRunning = false;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
  
  isActive(): boolean {
    return this.isRunning;
  }
}

