/**
 * Card Entrance Effect
 * Phase 9: Optimized with GPU acceleration, intersection observer, and mobile optimization
 * 
 * Entrance animations for card components
 */

import { motion } from 'framer-motion';
import type { UIEffectComponentProps, UIEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';
import { useLazyLoad } from '@/hooks/useIntersectionObserver';

const settingsSchema: EffectSettingsSchema = {
  duration: {
    type: 'range',
    label: 'Duration',
    defaultValue: 600,
    min: 300,
    max: 1200,
    step: 100,
    description: 'Animation duration in ms',
  },
  delay: {
    type: 'range',
    label: 'Delay',
    defaultValue: 0,
    min: 0,
    max: 1000,
    step: 100,
    description: 'Delay before animation',
  },
  scale: {
    type: 'range',
    label: 'Initial Scale',
    defaultValue: 0.8,
    min: 0.5,
    max: 1,
    step: 0.1,
    description: 'Starting scale',
  },
  translateY: {
    type: 'range',
    label: 'Slide Distance',
    defaultValue: 30,
    min: 0,
    max: 100,
    step: 10,
    description: 'Vertical slide distance',
  },
  blur: {
    type: 'range',
    label: 'Initial Blur',
    defaultValue: 5,
    min: 0,
    max: 20,
    step: 5,
    description: 'Starting blur amount',
  },
};

export function CardEntrance({ children, settings, trigger = 'mount' }: UIEffectComponentProps) {
  const {
    duration = 600,
    delay = 0,
    scale = 0.8,
    translateY = 30,
    blur = 5,
  } = settings;
  
  const { flags, reducedMotion, gpuStyle, animationFactor } = useEffectOptimization<HTMLDivElement>({ lazy: false });
  const [ref, isInView] = useLazyLoad<HTMLDivElement>({ threshold: 0.1, rootMargin: '50px' });
  
  // Adjust duration for mobile/low-end devices
  const adaptiveDuration = (duration * animationFactor) / 1000;
  const adaptiveDelay = (delay * animationFactor) / 1000;
  
  // Reduce blur on low-end devices
  const adaptiveBlur = flags.isLowEndDevice ? Math.min(blur, 5) : blur;
  
  // Simpler animation for reduced motion
  if (reducedMotion) {
    return (
      <div ref={ref} style={gpuStyle}>
        {children}
      </div>
    );
  }
  
  // Use intersection observer for scroll-triggered entrance
  const shouldAnimate = trigger === 'view' ? isInView : true;
  
  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: 0,
        scale,
        y: translateY,
        filter: `blur(${adaptiveBlur}px)`,
      }}
      animate={shouldAnimate ? {
        opacity: 1,
        scale: 1,
        y: 0,
        filter: 'blur(0px)',
      } : {}}
      transition={{
        duration: adaptiveDuration,
        delay: adaptiveDelay,
        ease: [0.4, 0, 0.2, 1],
      }}
      style={gpuStyle}
      data-testid="effect-card-entrance"
    >
      {children}
    </motion.div>
  );
}

// Register this effect
const cardEntranceEffect: UIEffect = {
  id: 'card-entrance',
  name: 'Card Entrance',
  type: 'ui',
  library: 'framer',
  description: 'Entrance animations for card components',
  tags: ['card', 'entrance', 'fade', 'slide', 'scale'],
  performanceModes: ['low', 'medium', 'high'],
  component: CardEntrance,
  defaultSettings: {
    duration: 600,
    delay: 0,
    scale: 0.8,
    translateY: 30,
    blur: 5,
  },
  settingsSchema,
};

effectsRegistry.register(cardEntranceEffect);

export default cardEntranceEffect;
