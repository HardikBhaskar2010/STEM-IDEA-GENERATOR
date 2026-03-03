/**
 * GPU Optimization Utilities
 * Phase 9: Performance & Accessibility
 * 
 * Provides utilities for GPU-accelerated animations and transforms
 */

/**
 * Apply GPU acceleration to an element
 * Uses translate3d and will-change for optimal performance
 */
export function enableGPUAcceleration(element: HTMLElement | null, properties: string[] = ['transform']): void {
  if (!element) return;
  
  // Force GPU acceleration with translate3d
  element.style.transform = element.style.transform || 'translate3d(0, 0, 0)';
  
  // Set will-change for properties that will animate
  element.style.willChange = properties.join(', ');
}

/**
 * Remove GPU acceleration hints
 * Important to call after animation completes to free GPU resources
 */
export function disableGPUAcceleration(element: HTMLElement | null): void {
  if (!element) return;
  
  // Remove will-change to free GPU resources
  element.style.willChange = 'auto';
}

/**
 * Create GPU-optimized transform string
 * Always uses translate3d for GPU acceleration
 */
export function createGPUTransform(x: number = 0, y: number = 0, z: number = 0): string {
  return `translate3d(${x}px, ${y}px, ${z}px)`;
}

/**
 * Optimize element for animations
 * Applies best practices for smooth 60fps animations
 */
export function optimizeForAnimation(element: HTMLElement | null): void {
  if (!element) return;
  
  // GPU acceleration
  element.style.transform = 'translate3d(0, 0, 0)';
  
  // Create new stacking context
  element.style.isolation = 'isolate';
  
  // Hardware acceleration hints
  element.style.backfaceVisibility = 'hidden';
  element.style.perspective = '1000px';
}

/**
 * Batch style updates to prevent layout thrashing
 * Groups style changes into a single reflow
 */
export function batchStyleUpdates(updates: Array<{ element: HTMLElement; styles: Partial<CSSStyleDeclaration> }>): void {
  // Use requestAnimationFrame to batch updates
  requestAnimationFrame(() => {
    updates.forEach(({ element, styles }) => {
      Object.assign(element.style, styles);
    });
  });
}

/**
 * Check if GPU acceleration is supported
 */
export function isGPUAccelerationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  return !!gl;
}

/**
 * Get optimal transform property based on browser support
 */
export function getTransformProperty(): string {
  if (typeof window === 'undefined') return 'transform';
  
  const prefixes = ['transform', 'webkitTransform', 'mozTransform', 'msTransform'];
  const testElement = document.createElement('div');
  
  for (const prefix of prefixes) {
    if (testElement.style[prefix as any] !== undefined) {
      return prefix;
    }
  }
  
  return 'transform';
}

/**
 * Force GPU layer creation for complex animations
 */
export function forceGPULayer(element: HTMLElement | null): void {
  if (!element) return;
  
  element.style.transform = 'translateZ(0)';
  element.style.willChange = 'transform';
}

/**
 * Clean up GPU optimization
 */
export function cleanupGPUOptimization(element: HTMLElement | null): void {
  if (!element) return;
  
  element.style.willChange = 'auto';
  element.style.transform = '';
  element.style.backfaceVisibility = '';
  element.style.perspective = '';
}
