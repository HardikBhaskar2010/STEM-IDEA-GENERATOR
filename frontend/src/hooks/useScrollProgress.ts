import { useRef, useEffect } from 'react';

interface UseScrollProgressReturn {
  scrollProgressRef: React.MutableRefObject<number>;
  containerRef: React.RefObject<HTMLDivElement>;
  prefersReducedMotion: boolean;
}

/**
 * Performance-optimized scroll progress tracker
 * Uses ref instead of state to avoid React re-renders on every scroll tick
 * Returns ref to be read inside useFrame for smooth 60fps animation
 */
export const useScrollProgress = (): UseScrollProgressReturn => {
  const scrollProgressRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useRef<boolean>(false);

  useEffect(() => {
    // Detect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mediaQuery.matches;

    const handleMotionPreferenceChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };

    mediaQuery.addEventListener('change', handleMotionPreferenceChange);

    // Scroll handler - updates ref only, NO setState
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const containerHeight = container.offsetHeight;
      const viewportHeight = window.innerHeight;

      // Calculate scroll progress (0 to 1)
      const scrollStart = -rect.top;
      const scrollRange = containerHeight - viewportHeight;
      const progress = Math.max(0, Math.min(1, scrollStart / scrollRange));

      // Update ref directly - no React re-render
      scrollProgressRef.current = progress;
    };

    // Use passive listeners for performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Initial calculation
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      mediaQuery.removeEventListener('change', handleMotionPreferenceChange);
    };
  }, []);

  return {
    scrollProgressRef,
    containerRef,
    prefersReducedMotion: prefersReducedMotion.current,
  };
};

