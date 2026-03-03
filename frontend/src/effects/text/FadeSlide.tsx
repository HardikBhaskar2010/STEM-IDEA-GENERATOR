/**
 * Fade + Slide Text Effect
 * 
 * Simple fade in combined with slide animation
 */

import { motion } from 'framer-motion';
import type { TextEffectComponentProps, TextEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';
import { getAdaptiveDuration } from '@/effects/core/optimizationUtils';

const settingsSchema: EffectSettingsSchema = {
  duration: {
    type: 'range',
    label: 'Duration',
    defaultValue: 0.8,
    min: 0.3,
    max: 2,
    step: 0.1,
    description: 'Duration of the animation',
  },
  delay: {
    type: 'range',
    label: 'Delay',
    defaultValue: 0,
    min: 0,
    max: 2,
    step: 0.1,
    description: 'Delay before animation starts',
  },
  direction: {
    type: 'select',
    label: 'Slide Direction',
    defaultValue: 'up',
    options: [
      { value: 'up', label: 'From Bottom' },
      { value: 'down', label: 'From Top' },
      { value: 'left', label: 'From Right' },
      { value: 'right', label: 'From Left' },
    ],
    description: 'Direction of slide animation',
  },
  distance: {
    type: 'range',
    label: 'Slide Distance',
    defaultValue: 30,
    min: 10,
    max: 100,
    step: 5,
    description: 'Distance to slide in pixels',
  },
  color: {
    type: 'color',
    label: 'Text Color',
    defaultValue: '#ffffff',
    description: 'Color of the text',
  },
};

export function FadeSlide({ children, settings, isPreview }: TextEffectComponentProps) {
  const {
    duration = 0.8,
    delay = 0,
    direction = 'up',
    distance = 30,
    color = '#ffffff',
  } = settings;

  const { ref, shouldRender, reducedMotion, flags, gpuStyle } = useEffectOptimization<HTMLDivElement>({
    lazy: !isPreview,
    rootMargin: '120px',
  });

  if (!shouldRender && !isPreview) {
    return (
      <div ref={ref} className="inline-block" style={{ color, ...gpuStyle }}>
        {children}
      </div>
    );
  }

  if (reducedMotion) {
    return (
      <div ref={ref} className="inline-block" style={{ color, ...gpuStyle }}>
        {children}
      </div>
    );
  }

  const adaptiveDistance = flags.isMobile ? Math.max(8, distance * 0.7) : distance;
  
  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: adaptiveDistance };
      case 'down':
        return { y: -adaptiveDistance };
      case 'left':
        return { x: adaptiveDistance };
      case 'right':
        return { x: -adaptiveDistance };
      default:
        return { y: adaptiveDistance };
    }
  };
  
  return (
    <motion.div
      ref={ref}
      className="inline-block"
      style={{ color, ...gpuStyle }}
      initial={{
        opacity: 0,
        ...getInitialPosition(),
      }}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
      }}
      transition={{
        duration: getAdaptiveDuration(duration, flags),
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
      data-testid="effect-fade-slide"
    >
      {children}
    </motion.div>
  );
}

// Register this effect
const fadeSlideEffect: TextEffect = {
  id: 'fade-slide',
  name: 'Fade + Slide',
  type: 'text',
  library: 'framer',
  description: 'Simple fade in combined with slide animation',
  tags: ['fade', 'slide', 'simple', 'clean'],
  performanceModes: ['low', 'medium', 'high'],
  component: FadeSlide,
  defaultSettings: {
    duration: 0.8,
    delay: 0,
    direction: 'up',
    distance: 30,
    color: '#ffffff',
  },
  settingsSchema,
};

effectsRegistry.register(fadeSlideEffect);

export default fadeSlideEffect;


