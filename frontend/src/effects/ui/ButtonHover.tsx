/**
 * Button Hover Effect
 * Phase 9: Optimized with GPU acceleration and mobile optimization
 * 
 * Microinteractions for button hover states
 */

import { motion } from 'framer-motion';
import type { UIEffectComponentProps, UIEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';

const settingsSchema: EffectSettingsSchema = {
  duration: {
    type: 'range',
    label: 'Duration',
    defaultValue: 200,
    min: 100,
    max: 500,
    step: 50,
    description: 'Hover animation duration in ms',
  },
  scale: {
    type: 'range',
    label: 'Scale',
    defaultValue: 1.05,
    min: 1,
    max: 1.2,
    step: 0.05,
    description: 'Scale on hover',
  },
  translateY: {
    type: 'range',
    label: 'Lift (Y)',
    defaultValue: -2,
    min: -10,
    max: 0,
    step: 1,
    description: 'Vertical lift on hover',
  },
  brightness: {
    type: 'range',
    label: 'Brightness',
    defaultValue: 1.1,
    min: 1,
    max: 1.5,
    step: 0.1,
    description: 'Brightness increase on hover',
  },
};

export function ButtonHover({ children, settings, trigger = 'hover' }: UIEffectComponentProps) {
  const {
    duration = 200,
    scale = 1.05,
    translateY = -2,
    brightness = 1.1,
  } = settings;
  
  const { flags, reducedMotion, gpuStyle, animationFactor } = useEffectOptimization<HTMLDivElement>({ lazy: false });
  
  // Adjust duration for mobile/low-end devices
  const adaptiveDuration = (duration * animationFactor) / 1000;
  
  // Simpler animation for reduced motion
  if (reducedMotion) {
    return (
      <div className="inline-block" style={gpuStyle}>
        {children}
      </div>
    );
  }
  
  // Reduce effects on touch devices
  const adaptiveScale = flags.isMobile ? Math.min(scale, 1.03) : scale;
  const adaptiveBrightness = flags.isLowEndDevice ? 1 : brightness;
  
  return (
    <motion.div
      className="inline-block"
      whileHover={{
        scale: adaptiveScale,
        y: translateY,
        filter: `brightness(${adaptiveBrightness})`,
      }}
      whileTap={{
        scale: 0.98,
      }}
      transition={{
        duration: adaptiveDuration,
        ease: [0.4, 0, 0.2, 1],
      }}
      style={gpuStyle}
      data-testid="effect-button-hover"
    >
      {children}
    </motion.div>
  );
}

// Register this effect
const buttonHoverEffect: UIEffect = {
  id: 'button-hover',
  name: 'Button Hover',
  type: 'ui',
  library: 'framer',
  description: 'Microinteractions for button hover states',
  tags: ['button', 'hover', 'interactive', 'lift'],
  performanceModes: ['low', 'medium', 'high'],
  component: ButtonHover,
  defaultSettings: {
    duration: 200,
    scale: 1.05,
    translateY: -2,
    brightness: 1.1,
  },
  settingsSchema,
};

effectsRegistry.register(buttonHoverEffect);

export default buttonHoverEffect;
