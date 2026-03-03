/**
 * Gradient Text Effect
 * 
 * Animated gradient text with customizable colors and movement
 */

import { motion } from 'framer-motion';
import type { TextEffectComponentProps, TextEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';

const settingsSchema: EffectSettingsSchema = {
  speed: {
    type: 'range',
    label: 'Animation Speed',
    defaultValue: 2,
    min: 0.5,
    max: 5,
    step: 0.5,
    description: 'Speed of gradient animation',
  },
  angle: {
    type: 'range',
    label: 'Gradient Angle',
    defaultValue: 45,
    min: 0,
    max: 360,
    step: 15,
    description: 'Angle of the gradient',
  },
  animated: {
    type: 'boolean',
    label: 'Animate Gradient',
    defaultValue: true,
    description: 'Enable gradient animation',
  },
  colorFrom: {
    type: 'color',
    label: 'Start Color',
    defaultValue: '#667eea',
    description: 'Starting gradient color',
  },
  colorVia: {
    type: 'color',
    label: 'Middle Color',
    defaultValue: '#764ba2',
    description: 'Middle gradient color',
  },
  colorTo: {
    type: 'color',
    label: 'End Color',
    defaultValue: '#f093fb',
    description: 'Ending gradient color',
  },
};

export function GradientText({ children, settings, isPreview }: TextEffectComponentProps) {
  const {
    speed = 2,
    angle = 45,
    animated = true,
    colorFrom = '#667eea',
    colorVia = '#764ba2',
    colorTo = '#f093fb',
  } = settings;

  const { ref, shouldRender, reducedMotion, animationFactor, flags, gpuStyle } = useEffectOptimization<HTMLDivElement>({
    lazy: !isPreview,
    rootMargin: '140px',
  });

  if (!shouldRender && !isPreview) {
    return (
      <div ref={ref} className="inline-block font-bold" style={{ color: colorFrom, ...gpuStyle }}>
        {children}
      </div>
    );
  }

  if (reducedMotion) {
    return (
      <div ref={ref} className="inline-block font-bold" style={{ color: colorFrom, ...gpuStyle }}>
        {children}
      </div>
    );
  }

  const animationDuration = 4 / Math.max(0.6, speed * animationFactor);
  const shouldAnimateGradient = animated && !flags.isLowEndDevice;
  
  return (
    <motion.div
      ref={ref}
      className="inline-block font-bold"
      style={gpuStyle}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      data-testid="effect-gradient-text"
    >
      <div
        style={{
          background: `linear-gradient(${angle}deg, ${colorFrom}, ${colorVia}, ${colorTo})`,
          backgroundSize: shouldAnimateGradient ? '200% 200%' : '100% 100%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: shouldAnimateGradient ? `gradient-text ${animationDuration}s ease infinite` : 'none',
        }}
      >
        {children}
      </div>
      
      {shouldAnimateGradient && (
        <style>{`
          @keyframes gradient-text {
            0%, 100% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
          }
        `}</style>
      )}
    </motion.div>
  );
}

// Register this effect
const gradientTextEffect: TextEffect = {
  id: 'gradient-text',
  name: 'Gradient Text',
  type: 'text',
  library: 'framer',
  description: 'Animated gradient text with customizable colors',
  tags: ['gradient', 'colorful', 'animated', 'vibrant'],
  performanceModes: ['low', 'medium', 'high'],
  component: GradientText,
  defaultSettings: {
    speed: 2,
    angle: 45,
    animated: true,
    colorFrom: '#667eea',
    colorVia: '#764ba2',
    colorTo: '#f093fb',
  },
  settingsSchema,
};

effectsRegistry.register(gradientTextEffect);

export default gradientTextEffect;


