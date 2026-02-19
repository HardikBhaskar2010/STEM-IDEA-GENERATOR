/**
 * FloatingMotion Component
 * Reusable wrapper for floating animation effect
 */

import React, { useEffect, useRef, ReactNode } from 'react';
import { floatingAnimation } from '@/lib/commandAnimations';
import { usePerf } from '@/contexts/PerfContext';

export interface FloatingMotionProps {
  children: ReactNode;
  distance?: number;
  duration?: number;
  delay?: number;
  className?: string;
  enabled?: boolean;
}

export const FloatingMotion: React.FC<FloatingMotionProps> = ({
  children,
  distance = 4,
  duration = 3000,
  delay = 0,
  className = '',
  enabled = true,
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const { mode } = usePerf();

  const shouldAnimate = enabled && (mode === 'high' || mode === 'medium');

  useEffect(() => {
    if (!elementRef.current || !shouldAnimate) return;

    // Add delay before starting animation
    const timeout = setTimeout(() => {
      if (elementRef.current) {
        const animation = floatingAnimation(
          elementRef.current,
          distance,
          duration
        );

        return () => {
          if (animation) {
            animation.pause();
          }
        };
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [distance, duration, delay, shouldAnimate]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
};
