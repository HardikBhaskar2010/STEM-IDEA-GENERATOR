/**
 * Shiny Text Effect - React Bits Style
 *
 * Animated shine/shimmer effect that travels across text
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
    step: 0.1,
    description: 'How fast the shine effect moves',
  },
  shineWidth: {
    type: 'range',
    label: 'Shine Width',
    defaultValue: 100,
    min: 50,
    max: 200,
    step: 10,
    description: 'Width of the shine effect in pixels',
  },
  color: {
    type: 'color',
    label: 'Base Color',
    defaultValue: '#ffffff',
    description: 'Base text color',
  },
  shineColor: {
    type: 'color',
    label: 'Shine Color',
    defaultValue: '#ffffff',
    description: 'Color of the shine effect',
  },
};

export function ShinyText({ children, settings, isPreview }: TextEffectComponentProps) {
  const {
    speed = 2,
    shineWidth = 100,
    color = '#ffffff',
    shineColor = '#ffffff',
  } = settings;

  const { ref, shouldRender, reducedMotion, animationFactor, gpuStyle } = useEffectOptimization<HTMLDivElement>({
    lazy: !isPreview,
    rootMargin: '140px',
  });

  if (!shouldRender && !isPreview) {
    return (
      <div ref={ref} className="relative inline-block" style={{ color, ...gpuStyle }}>
        {children}
      </div>
    );
  }

  if (reducedMotion) {
    return (
      <div ref={ref} className="relative inline-block" style={{ color, ...gpuStyle }}>
        {children}
      </div>
    );
  }

  const animationDuration = 3 / Math.max(0.6, speed * animationFactor);

  return (
    <motion.div
      ref={ref}
      className="relative inline-block"
      style={{ color, ...gpuStyle }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      data-testid="effect-shiny-text"
    >
      <div
        className="relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(90deg, transparent, ${shineColor}, transparent)`,
          backgroundSize: `${shineWidth}px 100%`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: `-${shineWidth}px 0`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          animation: `shiny-text-shine ${animationDuration}s ease-in-out infinite`,
        }}
      >
        {children}
      </div>
      
      <style>{`
        @keyframes shiny-text-shine {
          0% {
            background-position: -${shineWidth}px 0;
          }
          100% {
            background-position: calc(100% + ${shineWidth}px) 0;
          }
        }
      `}</style>
    </motion.div>
  );
}

// Register this effect
const shinyTextEffect: TextEffect = {
  id: 'shiny-text',
  name: 'Shiny Text',
  type: 'text',
  library: 'framer',
  description: 'Animated shine effect that travels across the text',
  tags: ['shine', 'shimmer', 'animated', 'gradient'],
  performanceModes: ['medium', 'high'],
  component: ShinyText,
  defaultSettings: {
    speed: 2,
    shineWidth: 100,
    color: '#ffffff',
    shineColor: '#ffffff',
  },
  settingsSchema,
};

effectsRegistry.register(shinyTextEffect);

export default shinyTextEffect;


