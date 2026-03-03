/**
 * Blur Reveal Text Effect
 * 
 * Text reveals from blurred to sharp with optional slide
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
    defaultValue: 1,
    min: 0.3,
    max: 3,
    step: 0.1,
    description: 'Duration of the reveal animation',
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
  blurAmount: {
    type: 'range',
    label: 'Initial Blur',
    defaultValue: 20,
    min: 5,
    max: 40,
    step: 5,
    description: 'Initial blur amount in pixels',
  },
  slideDistance: {
    type: 'range',
    label: 'Slide Distance',
    defaultValue: 20,
    min: 0,
    max: 100,
    step: 5,
    description: 'Distance to slide during reveal (0 = no slide)',
  },
  direction: {
    type: 'select',
    label: 'Slide Direction',
    defaultValue: 'up',
    options: [
      { value: 'up', label: 'Slide Up' },
      { value: 'down', label: 'Slide Down' },
      { value: 'left', label: 'Slide Left' },
      { value: 'right', label: 'Slide Right' },
      { value: 'none', label: 'No Slide' },
    ],
    description: 'Direction of slide animation',
  },
  color: {
    type: 'color',
    label: 'Text Color',
    defaultValue: '#ffffff',
    description: 'Color of the text',
  },
};

export function BlurReveal({ children, settings, isPreview }: TextEffectComponentProps) {
  const {
    duration = 1,
    delay = 0,
    blurAmount = 20,
    slideDistance = 20,
    direction = 'up',
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

  const adaptiveBlur = flags.isMobile ? Math.round(blurAmount * 0.7) : blurAmount;
  const adaptiveSlideDistance = flags.isMobile ? Math.round(slideDistance * 0.75) : slideDistance;
  
  const getInitialPosition = () => {
    if (direction === 'none' || adaptiveSlideDistance === 0) return {};
    
    switch (direction) {
      case 'up':
        return { y: adaptiveSlideDistance };
      case 'down':
        return { y: -adaptiveSlideDistance };
      case 'left':
        return { x: adaptiveSlideDistance };
      case 'right':
        return { x: -adaptiveSlideDistance };
      default:
        return {};
    }
  };
  
  return (
    <motion.div
      ref={ref}
      className="inline-block"
      style={{ color, ...gpuStyle }}
      initial={{
        opacity: 0,
        filter: `blur(${adaptiveBlur}px)`,
        ...getInitialPosition(),
      }}
      animate={{
        opacity: 1,
        filter: 'blur(0px)',
        x: 0,
        y: 0,
      }}
      transition={{
        duration: getAdaptiveDuration(duration, flags),
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
      data-testid="effect-blur-reveal"
    >
      {children}
    </motion.div>
  );
}

// Register this effect
const blurRevealEffect: TextEffect = {
  id: 'blur-reveal',
  name: 'Blur Reveal',
  type: 'text',
  library: 'framer',
  description: 'Text reveals from blurred to sharp with optional slide',
  tags: ['blur', 'reveal', 'fade', 'slide', 'smooth'],
  performanceModes: ['medium', 'high'],
  component: BlurReveal,
  defaultSettings: {
    duration: 1,
    delay: 0,
    blurAmount: 20,
    slideDistance: 20,
    direction: 'up',
    color: '#ffffff',
  },
  settingsSchema,
};

effectsRegistry.register(blurRevealEffect);

export default blurRevealEffect;


