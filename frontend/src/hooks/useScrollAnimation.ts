'use client';

import { useEffect, useRef, useState } from 'react';
import { ANIMATION_PRESETS, type AnimationOptions } from '@/lib/animation';
import { useAnimation } from '@/contexts/AnimationContext';

interface ScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  stagger?: number;
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'scaleIn' | 'custom';
  customAnimation?: (element: Element) => void;
  delay?: number;
}

export const useScrollAnimation = <T extends HTMLElement = HTMLElement>(options: ScrollAnimationOptions = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    triggerOnce = true,
    stagger = 0,
    animation = 'fadeIn',
    customAnimation,
    delay = 0,
  } = options;

  const { config } = useAnimation();
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    // Set initial state for animations
    if (!config.reducedMotion) {
      switch (animation) {
        case 'fadeIn':
          element.style.opacity = '0';
          break;
        case 'slideUp':
          element.style.opacity = '0';
          element.style.transform = 'translateY(30px)';
          break;
        case 'slideDown':
          element.style.opacity = '0';
          element.style.transform = 'translateY(-30px)';
          break;
        case 'scaleIn':
          element.style.opacity = '0';
          element.style.transform = 'scale(0.8)';
          break;
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && (!triggerOnce || !hasAnimated)) {
            setIsVisible(true);
            
            // Trigger animation after delay and stagger
            const totalDelay = delay + stagger;
            
            setTimeout(() => {
              if (customAnimation) {
                customAnimation(entry.target);
              } else {
                const animationOptions: AnimationOptions = {
                  reducedMotion: config.reducedMotion,
                };

                switch (animation) {
                  case 'fadeIn':
                    ANIMATION_PRESETS.fadeIn(entry.target, animationOptions);
                    break;
                  case 'slideUp':
                    ANIMATION_PRESETS.slideUp(entry.target, animationOptions);
                    break;
                  case 'slideDown':
                    ANIMATION_PRESETS.slideDown(entry.target, animationOptions);
                    break;
                  case 'scaleIn':
                    ANIMATION_PRESETS.scaleIn(entry.target, animationOptions);
                    break;
                }
              }
            }, totalDelay);

            setHasAnimated(true);
            
            if (triggerOnce) {
              observer.unobserve(entry.target);
            }
          } else if (!entry.isIntersecting && !triggerOnce) {
            setIsVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, stagger, animation, customAnimation, delay, config.reducedMotion, hasAnimated]);

  return {
    ref,
    isVisible,
    hasAnimated,
  } as const;
};