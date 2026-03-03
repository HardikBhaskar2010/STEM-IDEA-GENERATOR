/**
 * Lazy Effects Loading Utilities
 * Phase 9: Performance & Accessibility
 * 
 * Utilities for code-splitting and lazy loading heavy effects
 */

import { lazy, ComponentType } from 'react';

export interface LazyLoadOptions {
  delay?: number;
  fallback?: React.ReactNode;
  preload?: boolean;
}

/**
 * Create a lazy-loaded component with optional delay
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): ComponentType<T> {
  const { delay = 0 } = options;
  
  if (delay > 0) {
    return lazy(() =>
      Promise.all([
        importFn(),
        new Promise((resolve) => setTimeout(resolve, delay)),
      ]).then(([moduleExports]) => moduleExports)
    );
  }
  
  return lazy(importFn);
}

/**
 * Preload a lazy component
 */
export function preloadComponent(importFn: () => Promise<any>): void {
  importFn().catch((err) => {
    console.warn('Failed to preload component:', err);
  });
}

/**
 * Lazy load with intersection observer
 * Component loads when it enters the viewport
 */
export function lazyLoadOnIntersection<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: IntersectionObserverInit = {}
): ComponentType<T> {
  let importPromise: Promise<{ default: T }> | null = null;
  
  const observerOptions = {
    rootMargin: '50px',
    threshold: 0.01,
    ...options,
  };
  
  return lazy(() => {
    if (importPromise) return importPromise;
    
    importPromise = new Promise<{ default: T }>((resolve) => {
      if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
        // Fallback: load immediately if no IntersectionObserver
        importFn().then(resolve);
        return;
      }
      
      // Create a dummy element to observe
      const element = document.createElement('div');
      element.style.width = '1px';
      element.style.height = '1px';
      element.style.position = 'absolute';
      element.style.top = '0';
      element.style.left = '0';
      element.style.opacity = '0';
      element.style.pointerEvents = 'none';
      document.body.appendChild(element);
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              importFn().then(resolve);
              observer.disconnect();
              document.body.removeChild(element);
            }
          });
        },
        observerOptions
      );
      
      observer.observe(element);
    });
    
    return importPromise;
  });
}

/**
 * Lazy load on user interaction
 * Component loads when user interacts with the page
 */
export function lazyLoadOnInteraction<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): ComponentType<T> {
  let importPromise: Promise<{ default: T }> | null = null;
  
  return lazy(() => {
    if (importPromise) return importPromise;
    
    importPromise = new Promise<{ default: T }>((resolve) => {
      const events = ['mousedown', 'touchstart', 'keydown', 'scroll'];
      
      const loadComponent = () => {
        importFn().then(resolve);
        events.forEach((event) => {
          window.removeEventListener(event, loadComponent);
        });
      };
      
      events.forEach((event) => {
        window.addEventListener(event, loadComponent, { once: true, passive: true });
      });
      
      // Fallback: load after 5 seconds anyway
      setTimeout(loadComponent, 5000);
    });
    
    return importPromise;
  });
}

/**
 * Lazy load with network quality check
 * Only load on fast connections
 */
export function lazyLoadOnFastConnection<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallbackComponent: T
): ComponentType<T> {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  // If no connection API or connection is fast, lazy load
  if (!connection || connection.effectiveType === '4g' || connection.effectiveType === '3g') {
    return lazy(importFn);
  }
  
  // Otherwise, return fallback immediately
  return fallbackComponent as any;
}

/**
 * Batch lazy load multiple components
 */
export function batchLazyLoad(importFns: Array<() => Promise<any>>): Promise<any[]> {
  return Promise.all(importFns.map((fn) => fn()));
}

/**
 * Check if component should be lazy loaded based on performance mode
 */
export function shouldLazyLoad(performanceMode: 'low' | 'medium' | 'high'): boolean {
  return performanceMode === 'low' || performanceMode === 'medium';
}

/**
 * Create a lazy loading strategy based on device capabilities
 */
export function createAdaptiveLazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  deviceCapabilities: {
    isLowEndDevice: boolean;
    isMobile: boolean;
    effectiveConnectionType: string;
  }
): ComponentType<T> {
  const { isLowEndDevice, isMobile, effectiveConnectionType } = deviceCapabilities;
  
  // Low-end devices or slow connections: lazy load on interaction
  if (isLowEndDevice || effectiveConnectionType === '2g' || effectiveConnectionType === 'slow-2g') {
    return lazyLoadOnInteraction(importFn);
  }
  
  // Mobile devices: lazy load on intersection
  if (isMobile) {
    return lazyLoadOnIntersection(importFn);
  }
  
  // Desktop with good connection: standard lazy load
  return lazy(importFn);
}
