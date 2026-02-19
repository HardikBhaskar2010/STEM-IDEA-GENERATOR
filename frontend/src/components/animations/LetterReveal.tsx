/**
 * LetterReveal Component
 * Animates text reveal letter by letter
 */

import React, { useEffect, useRef, useState } from 'react';
import { revealText, TIMING } from '@/lib/commandAnimations';
import { usePerf } from '@/contexts/PerfContext';

export interface LetterRevealProps {
  text: string;
  duration?: number;
  stagger?: number;
  className?: string;
  onComplete?: () => void;
  autoStart?: boolean;
}

export const LetterReveal: React.FC<LetterRevealProps> = ({
  text,
  duration = TIMING.letterReveal,
  stagger = TIMING.letterReveal,
  className = '',
  onComplete,
  autoStart = true,
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const { mode } = usePerf();
  const [hasAnimated, setHasAnimated] = useState(false);

  const shouldAnimate = mode !== 'low' && autoStart && !hasAnimated;

  useEffect(() => {
    if (!containerRef.current || !shouldAnimate) return;

    containerRef.current.textContent = text;
    const animation = revealText(containerRef.current, duration, stagger);

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
  }, [text, duration, stagger, shouldAnimate, onComplete]);

  // For low performance mode, show text immediately
  if (mode === 'low' || hasAnimated) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span
      ref={containerRef}
      className={className}
      style={{ whiteSpace: 'pre-wrap' }}
    >
      {text}
    </span>
  );
};
