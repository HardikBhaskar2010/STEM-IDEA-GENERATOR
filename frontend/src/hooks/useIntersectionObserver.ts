/**
 * useIntersectionObserver Hook
 * Phase 9: Performance & Accessibility
 * 
 * Viewport-based effect loading and animation triggering
 */

import { useEffect, useRef, useState } from 'react';

export interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
  initialIsIntersecting?: boolean;
}

/**
 * Hook for intersection observer
 */
export function useIntersectionObserver<T extends HTMLElement>(
  options: UseIntersectionObserverOptions = {}
): [React.RefObject<T>, boolean] {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = false,
    initialIsIntersecting = false,
  } = options;

  const ref = useRef<T>(null);
  const [isIntersecting, setIsIntersecting] = useState(initialIsIntersecting);
  const frozenRef = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Don't observe if already frozen
    if (frozenRef.current) return;

    // Check for IntersectionObserver support
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: assume visible
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting;

        setIsIntersecting(isElementIntersecting);

        // Freeze if needed
        if (freezeOnceVisible && isElementIntersecting) {
          frozenRef.current = true;
          observer.disconnect();
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, freezeOnceVisible]);

  return [ref, isIntersecting];
}

/**
 * Hook for lazy loading based on intersection
 */
export function useLazyLoad<T extends HTMLElement>(
  options: UseIntersectionObserverOptions = {}
): [React.RefObject<T>, boolean] {
  return useIntersectionObserver<T>({
    ...options,
    freezeOnceVisible: true,
    rootMargin: options.rootMargin || '50px', // Preload slightly before visible
  });
}

/**
 * Hook for scroll-triggered animations
 */
export function useScrollAnimation<T extends HTMLElement>(
  options: UseIntersectionObserverOptions = {}
): [React.RefObject<T>, boolean, number] {
  const [ref, isIntersecting] = useIntersectionObserver<T>(options);
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element || !isIntersecting) return;

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate progress (0 to 1)
      const start = windowHeight;
      const end = -rect.height;
      const current = rect.top;

      const progress = Math.max(0, Math.min(1, (start - current) / (start - end)));
      setAnimationProgress(progress);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [ref, isIntersecting]);

  return [ref, isIntersecting, animationProgress];
}

/**
 * Hook for multiple intersection thresholds
 */
export function useIntersectionRatio<T extends HTMLElement>(
  options: Omit<UseIntersectionObserverOptions, 'threshold'> = {}
): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [ratio, setRatio] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === 'undefined') {
      setRatio(1);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setRatio(entry.intersectionRatio);
      },
      {
        ...options,
        threshold: Array.from({ length: 101 }, (_, i) => i / 100), // 0 to 1 in steps of 0.01
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [ref, ratio];
}
