import { useMemo } from 'react';
import { useLazyLoad } from '@/hooks/useIntersectionObserver';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  PHASE9_GPU_BASE_STYLE,
  getAnimationFactor,
  type EffectOptimizationFlags,
} from '@/effects/core/optimizationUtils';

interface UseEffectOptimizationOptions {
  lazy?: boolean;
  rootMargin?: string;
}

export function useEffectOptimization<T extends HTMLElement>(options: UseEffectOptimizationOptions = {}) {
  const { lazy = false, rootMargin = '100px' } = options;
  const [ref, isVisible] = useLazyLoad<T>({ rootMargin, threshold: 0.01 });
  const { isMobile, isLowEndDevice, isTouchDevice } = useMobileOptimization();
  const reducedMotion = useReducedMotion();

  const flags: EffectOptimizationFlags = useMemo(
    () => ({ isMobile, isLowEndDevice, reducedMotion }),
    [isMobile, isLowEndDevice, reducedMotion]
  );

  return {
    ref,
    flags,
    isMobile,
    isLowEndDevice,
    isTouchDevice,
    reducedMotion,
    shouldRender: lazy ? isVisible : true,
    gpuStyle: PHASE9_GPU_BASE_STYLE,
    animationFactor: getAnimationFactor(flags),
  };
}
