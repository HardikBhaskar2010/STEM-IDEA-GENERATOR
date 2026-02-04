import { useRef, useEffect } from 'react';
import { ANIMATION_PRESETS, createAnimation } from '@/lib/animation';
import { useAnimation } from '@/contexts/AnimationContext';

interface HoverAnimationOptions {
  scale?: number;
  lift?: number;
  glow?: boolean;
  bounce?: boolean;
  duration?: number;
  easing?: string;
}

export const useHoverAnimation = <T extends HTMLElement = HTMLElement>(options: HoverAnimationOptions = {}) => {
  const {
    scale = 1.05,
    lift = 4,
    glow = false,
    bounce = false,
    duration = 200,
    easing = 'easeOutCubic',
  } = options;

  const { config } = useAnimation();
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || config.reducedMotion) {
      return;
    }

    const handleMouseEnter = () => {
      if (bounce) {
        ANIMATION_PRESETS.bounce(element, {
          duration,
          easing,
        });
      } else {
        createAnimation({
          targets: element,
          scale: scale,
          translateY: -lift,
          duration,
          easing,
          boxShadow: glow ? '0 8px 25px rgba(139, 92, 246, 0.2)' : undefined,
        });
      }
    };

    const handleMouseLeave = () => {
      createAnimation({
        targets: element,
        scale: 1,
        translateY: 0,
        duration: duration * 0.8,
        easing,
        boxShadow: '0 0 0 rgba(139, 92, 246, 0)',
      });
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [scale, lift, glow, bounce, duration, easing, config.reducedMotion]);

  return ref;
};