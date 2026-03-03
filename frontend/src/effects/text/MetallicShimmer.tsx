/**
 * Metallic Shimmer Text Effect
 * 
 * Creates a metallic shimmer effect with reflective highlights
 */

import { motion } from 'framer-motion';
import type { TextEffectComponentProps, TextEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';

const settingsSchema: EffectSettingsSchema = {
  speed: {
    type: 'range',
    label: 'Shimmer Speed',
    defaultValue: 3,
    min: 0.5,
    max: 8,
    step: 0.5,
    description: 'Speed of the shimmer animation',
  },
  intensity: {
    type: 'range',
    label: 'Shimmer Intensity',
    defaultValue: 0.8,
    min: 0.3,
    max: 1,
    step: 0.1,
    description: 'Intensity of the metallic reflection',
  },
  baseColor: {
    type: 'color',
    label: 'Base Color',
    defaultValue: '#c0c0c0',
    description: 'Base metallic color',
  },
  highlightColor: {
    type: 'color',
    label: 'Highlight Color',
    defaultValue: '#ffffff',
    description: 'Highlight shimmer color',
  },
};

export function MetallicShimmer({ children, settings, isPreview }: TextEffectComponentProps) {
  const {
    speed = 3,
    intensity = 0.8,
    baseColor = '#c0c0c0',
    highlightColor = '#ffffff',
  } = settings;

  const { ref, shouldRender, reducedMotion, animationFactor, gpuStyle } = useEffectOptimization<HTMLDivElement>({
    lazy: !isPreview,
    rootMargin: '140px',
  });

  if (!shouldRender && !isPreview) {
    return (
      <div ref={ref} className="relative inline-block" style={{ color: baseColor, ...gpuStyle }}>
        {children}
      </div>
    );
  }

  if (reducedMotion) {
    return (
      <div ref={ref} className="relative inline-block" style={{ color: baseColor, ...gpuStyle }}>
        {children}
      </div>
    );
  }

  const animationDuration = 4 / Math.max(0.6, speed * animationFactor);

  return (
    <motion.div
      ref={ref}
      className="relative inline-block"
      style={gpuStyle}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      data-testid="effect-metallic-shimmer"
    >
      <div
        className="relative font-bold"
        style={{
          background: `linear-gradient(110deg, ${baseColor} 0%, ${highlightColor} 45%, ${baseColor} 50%, ${highlightColor} 55%, ${baseColor} 100%)`,
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: `metallic-shimmer ${animationDuration}s ease-in-out infinite`,
          filter: `brightness(${1 + intensity * 0.5}) contrast(${1 + intensity * 0.3})`,
        }}
      >
        {children}
      </div>
      
      <style>{`
        @keyframes metallic-shimmer {
          0% {
            background-position: 200% center;
          }
          100% {
            background-position: -200% center;
          }
        }
      `}</style>
    </motion.div>
  );
}

// Register this effect
const metallicShimmerEffect: TextEffect = {
  id: 'metallic-shimmer',
  name: 'Metallic Shimmer',
  type: 'text',
  library: 'framer',
  description: 'Metallic shimmer effect with reflective highlights',
  tags: ['metallic', 'shimmer', 'reflection', 'bold'],
  performanceModes: ['medium', 'high'],
  component: MetallicShimmer,
  defaultSettings: {
    speed: 3,
    intensity: 0.8,
    baseColor: '#c0c0c0',
    highlightColor: '#ffffff',
  },
  settingsSchema,
};

effectsRegistry.register(metallicShimmerEffect);

export default metallicShimmerEffect;


