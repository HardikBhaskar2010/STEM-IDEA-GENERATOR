/**
 * useGPUOptimization Hook
 * Phase 9: Performance & Accessibility
 * 
 * Automatically applies GPU optimization to elements
 */

import { useEffect, useRef } from 'react';
import { enableGPUAcceleration, disableGPUAcceleration, optimizeForAnimation } from '@/lib/gpuOptimization';

export interface UseGPUOptimizationOptions {
  properties?: string[];
  optimize?: boolean;
}

/**
 * Hook to apply GPU optimization to a ref element
 */
export function useGPUOptimization<T extends HTMLElement>(
  options: UseGPUOptimizationOptions = {}
) {
  const { properties = ['transform', 'opacity'], optimize = true } = options;
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!optimize || !ref.current) {return;}

    const element = ref.current;
    
    // Apply optimizations
    optimizeForAnimation(element);
    enableGPUAcceleration(element, properties);

    // Cleanup on unmount
    return () => {
      disableGPUAcceleration(element);
    };
  }, [optimize, properties.join(',')]);

  return ref;
}

/**
 * Hook for GPU-optimized transforms
 */
export function useGPUTransform<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const setTransform = (x: number, y: number, z: number = 0) => {
    if (!ref.current) {return;}
    ref.current.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;
  };

  const resetTransform = () => {
    if (!ref.current) {return;}
    ref.current.style.transform = 'translate3d(0, 0, 0)';
  };

  useEffect(() => {
    if (!ref.current) {return;}
    
    // Initialize with GPU acceleration
    ref.current.style.transform = 'translate3d(0, 0, 0)';
    
    return () => {
      if (ref.current) {
        ref.current.style.transform = '';
      }
    };
  }, []);

  return { ref, setTransform, resetTransform };
}
