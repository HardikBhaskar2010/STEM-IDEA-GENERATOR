'use client';

import { useRef, useCallback } from 'react';
import { createAnimation, ANIMATION_PRESETS } from '@/lib/animation';
import { useAnimation } from '@/contexts/AnimationContext';

interface MicroInteractionOptions {
  type?: 'click' | 'success' | 'error' | 'loading';
  intensity?: 'subtle' | 'normal' | 'strong';
  ripple?: boolean;
}

export const useMicroInteraction = <T extends HTMLElement = HTMLElement>(options: MicroInteractionOptions = {}) => {
  const { type = 'click', intensity = 'normal', ripple = false } = options;
  const { config } = useAnimation();
  const ref = useRef<T>(null);

  const trigger = useCallback(() => {
    const element = ref.current;
    if (!element || config.reducedMotion) {
      return;
    }

    const intensityMap = {
      subtle: { scale: 0.98, duration: 100 },
      normal: { scale: 0.95, duration: 150 },
      strong: { scale: 0.9, duration: 200 },
    };

    const { scale, duration } = intensityMap[intensity];

    switch (type) {
      case 'click':
        // Quick scale down and back up
        createAnimation({
          targets: element,
          scale: [1, scale, 1],
          duration,
          easing: 'easeOutCubic',
        });
        break;

      case 'success':
        // Subtle green glow and gentle scale
        createAnimation({
          targets: element,
          scale: [1, 1.02, 1],
          duration: 400,
          easing: 'easeOutCubic',
          boxShadow: [
            '0 0 0 rgba(34, 197, 94, 0)',
            '0 0 10px rgba(34, 197, 94, 0.3)',
            '0 0 0 rgba(34, 197, 94, 0)',
          ],
        });
        break;

      case 'error':
        // Red glow and shake
        ANIMATION_PRESETS.shake(element, {
          duration: 400,
        });
        createAnimation({
          targets: element,
          boxShadow: [
            '0 0 0 rgba(239, 68, 68, 0)',
            '0 0 12px rgba(239, 68, 68, 0.3)',
            '0 0 0 rgba(239, 68, 68, 0)',
          ],
          duration: 400,
        });
        break;

      case 'loading':
        // Subtle pulse animation
        createAnimation({
          targets: element,
          opacity: [1, 0.7, 1],
          duration: 1000,
          easing: 'easeInOutSine',
          loop: true,
        });
        break;
    }

    // Add ripple effect if enabled
    if (ripple && type === 'click') {
      createRippleEffect(element);
    }
  }, [type, intensity, ripple, config.reducedMotion]);

  const createRippleEffect = (element: HTMLElement) => {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.background = 'rgba(255, 255, 255, 0.3)';
    ripple.style.transform = 'scale(0)';
    ripple.style.pointerEvents = 'none';
    ripple.style.left = '50%';
    ripple.style.top = '50%';
    ripple.style.marginLeft = `-${size / 2}px`;
    ripple.style.marginTop = `-${size / 2}px`;

    // Ensure element has relative positioning
    const originalPosition = element.style.position;
    if (!originalPosition || originalPosition === 'static') {
      element.style.position = 'relative';
    }
    element.style.overflow = 'hidden';

    element.appendChild(ripple);

    createAnimation({
      targets: ripple,
      scale: [0, 1],
      opacity: [0.3, 0],
      duration: 600,
      easing: 'easeOutCubic',
      complete: () => {
        ripple.remove();
      },
    });
  };

  return { ref, trigger };
};