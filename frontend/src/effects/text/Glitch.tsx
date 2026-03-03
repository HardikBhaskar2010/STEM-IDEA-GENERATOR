/**
 * Glitch Text Effect
 * 
 * Digital glitch effect with RGB split and jitter
 */

import { motion } from 'framer-motion';
import type { TextEffectComponentProps, TextEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';

const settingsSchema: EffectSettingsSchema = {
  glitchIntensity: {
    type: 'range',
    label: 'Glitch Intensity',
    defaultValue: 0.5,
    min: 0.1,
    max: 1,
    step: 0.1,
    description: 'Intensity of the glitch effect',
  },
  speed: {
    type: 'range',
    label: 'Animation Speed',
    defaultValue: 2,
    min: 0.5,
    max: 5,
    step: 0.5,
    description: 'Speed of glitch animation',
  },
  color: {
    type: 'color',
    label: 'Base Color',
    defaultValue: '#ffffff',
    description: 'Base text color',
  },
  continuous: {
    type: 'boolean',
    label: 'Continuous Glitch',
    defaultValue: true,
    description: 'Glitch continuously or intermittently',
  },
};

export function Glitch({ children, settings, isPreview }: TextEffectComponentProps) {
  const {
    glitchIntensity = 0.5,
    speed = 2,
    color = '#ffffff',
    continuous = true,
  } = settings;

  const { ref, shouldRender, reducedMotion, animationFactor, flags, gpuStyle } = useEffectOptimization<HTMLDivElement>({
    lazy: !isPreview,
    rootMargin: '140px',
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

  const animationDuration = 2 / Math.max(0.6, speed * animationFactor);
  const offset = 3 * glitchIntensity * (flags.isMobile ? 0.65 : 1);
  
  return (
    <motion.div
      ref={ref}
      className="relative inline-block"
      style={gpuStyle}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      data-testid="effect-glitch-text"
    >
      <div className="relative" style={{ color }}>
        {/* Main text */}
        <span className="relative z-10">{children}</span>
        
        {/* Red glitch layer */}
        <span
          className="absolute top-0 left-0 z-0"
          style={{
            color: '#ff0000',
            mixBlendMode: 'screen',
            animation: continuous 
              ? `glitch-red ${animationDuration}s infinite` 
              : `glitch-red-intermittent ${animationDuration * 3}s infinite`,
          }}
          aria-hidden="true"
        >
          {children}
        </span>
        
        {/* Blue glitch layer */}
        <span
          className="absolute top-0 left-0 z-0"
          style={{
            color: '#00ffff',
            mixBlendMode: 'screen',
            animation: continuous 
              ? `glitch-blue ${animationDuration}s infinite` 
              : `glitch-blue-intermittent ${animationDuration * 3}s infinite`,
          }}
          aria-hidden="true"
        >
          {children}
        </span>
      </div>
      
      <style>{`
        @keyframes glitch-red {
          0%, 100% {
            transform: translate(0, 0);
            opacity: 0.8;
          }
          20% {
            transform: translate(-${offset}px, ${offset}px);
            opacity: 1;
          }
          40% {
            transform: translate(-${offset}px, -${offset}px);
            opacity: 0.8;
          }
          60% {
            transform: translate(${offset}px, ${offset}px);
            opacity: 1;
          }
          80% {
            transform: translate(${offset}px, -${offset}px);
            opacity: 0.8;
          }
        }
        
        @keyframes glitch-blue {
          0%, 100% {
            transform: translate(0, 0);
            opacity: 0.8;
          }
          20% {
            transform: translate(${offset}px, -${offset}px);
            opacity: 1;
          }
          40% {
            transform: translate(${offset}px, ${offset}px);
            opacity: 0.8;
          }
          60% {
            transform: translate(-${offset}px, -${offset}px);
            opacity: 1;
          }
          80% {
            transform: translate(-${offset}px, ${offset}px);
            opacity: 0.8;
          }
        }
        
        @keyframes glitch-red-intermittent {
          0%, 30%, 100% {
            transform: translate(0, 0);
            opacity: 0;
          }
          31%, 35% {
            transform: translate(-${offset}px, ${offset}px);
            opacity: 1;
          }
          36%, 40% {
            transform: translate(-${offset}px, -${offset}px);
            opacity: 0.8;
          }
        }
        
        @keyframes glitch-blue-intermittent {
          0%, 30%, 100% {
            transform: translate(0, 0);
            opacity: 0;
          }
          31%, 35% {
            transform: translate(${offset}px, -${offset}px);
            opacity: 1;
          }
          36%, 40% {
            transform: translate(${offset}px, ${offset}px);
            opacity: 0.8;
          }
        }
      `}</style>
    </motion.div>
  );
}

// Register this effect
const glitchEffect: TextEffect = {
  id: 'glitch',
  name: 'Glitch',
  type: 'text',
  library: 'framer',
  description: 'Digital glitch effect with RGB split and jitter',
  tags: ['glitch', 'digital', 'rgb', 'cyberpunk'],
  performanceModes: ['medium', 'high'],
  component: Glitch,
  defaultSettings: {
    glitchIntensity: 0.5,
    speed: 2,
    color: '#ffffff',
    continuous: true,
  },
  settingsSchema,
};

effectsRegistry.register(glitchEffect);

export default glitchEffect;

