/**
 * NumberCounter Component
 * Animates number counting from start to end value
 */

import React, { useEffect, useRef, useState } from 'react';
import { countNumber, TIMING } from '@/lib/commandAnimations';
import { usePerf } from '@/contexts/PerfContext';

export interface NumberCounterProps {
  from?: number;
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  onComplete?: () => void;
  autoStart?: boolean;
  formatNumber?: (value: number) => string;
}

export const NumberCounter: React.FC<NumberCounterProps> = ({
  from = 0,
  to,
  duration = TIMING.numberCount,
  prefix = '',
  suffix = '',
  className = '',
  onComplete,
  autoStart = true,
  formatNumber,
}) => {
  const elementRef = useRef<HTMLSpanElement>(null);
  const { mode } = usePerf();
  const [hasAnimated, setHasAnimated] = useState(false);

  const shouldAnimate = (mode === 'high' || mode === 'medium') && autoStart && !hasAnimated;

  useEffect(() => {
    if (!elementRef.current || !shouldAnimate) {
      // Show final value immediately if not animating
      if (elementRef.current) {
        const formatted = formatNumber ? formatNumber(to) : Math.round(to).toString();
        elementRef.current.textContent = `${prefix}${formatted}${suffix}`;
      }
      return;
    }

    const animation = countNumber(
      elementRef.current,
      from,
      to,
      duration,
      (value) => {
        if (elementRef.current) {
          const formatted = formatNumber ? formatNumber(value) : Math.round(value).toString();
          elementRef.current.textContent = `${prefix}${formatted}${suffix}`;
        }
      }
    );

    if (animation) {
      animation.finished.then(() => {
        setHasAnimated(true);
        if (onComplete) {
          onComplete();
        }
      });

      return () => {
        if (animation) {
          animation.pause();
        }
      };
    }
  }, [from, to, duration, prefix, suffix, shouldAnimate, onComplete, formatNumber]);

  return (
    <span ref={elementRef} className={className}>
      {prefix}{formatNumber ? formatNumber(mode === 'low' ? to : from) : (mode === 'low' ? to : from)}{suffix}
    </span>
  );
};
