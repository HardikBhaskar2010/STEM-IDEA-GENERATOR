/**
 * Typewriter Text Effect
 * 
 * Classic typewriter animation with optional cursor
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { TextEffectComponentProps, TextEffect, EffectSettingsSchema } from '@/types/effects';
import { effectsRegistry } from '@/effects/core/EffectsRegistry';
import { useMemoryCleanup } from '@/hooks/useMemoryCleanup';
import { useEffectOptimization } from '@/hooks/useEffectOptimization';

const settingsSchema: EffectSettingsSchema = {
  speed: {
    type: 'range',
    label: 'Typing Speed',
    defaultValue: 50,
    min: 20,
    max: 200,
    step: 10,
    description: 'Speed of typing in milliseconds per character',
  },
  typewriterCursor: {
    type: 'boolean',
    label: 'Show Cursor',
    defaultValue: true,
    description: 'Display blinking cursor',
  },
  color: {
    type: 'color',
    label: 'Text Color',
    defaultValue: '#ffffff',
    description: 'Color of the text',
  },
  loop: {
    type: 'boolean',
    label: 'Loop Animation',
    defaultValue: false,
    description: 'Repeat the typing animation',
  },
};

export function Typewriter({ children, settings, isPreview }: TextEffectComponentProps) {
  const {
    speed = 50,
    typewriterCursor = true,
    color = '#ffffff',
    loop = false,
  } = settings;
  
  const text = typeof children === 'string' ? children : String(children);
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const memoryManager = useMemoryCleanup();
  const { ref, shouldRender, reducedMotion, animationFactor, gpuStyle } = useEffectOptimization<HTMLDivElement>({
    lazy: !isPreview,
    rootMargin: '140px',
  });

  const adaptiveSpeed = Math.max(20, Math.round(speed / Math.max(0.4, animationFactor)));

  useEffect(() => {
    if (reducedMotion) {
      setDisplayText(text);
      setCurrentIndex(text.length);
      setIsComplete(true);
      return;
    }

    setDisplayText('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text, reducedMotion]);

  if (!shouldRender && !isPreview) {
    return (
      <div ref={ref} className="inline-block" style={{ color, ...gpuStyle }}>
        {children}
      </div>
    );
  }

  if (reducedMotion) {
    return (
      <div ref={ref} className="inline-block" style={{ color, ...gpuStyle }} data-testid="effect-typewriter-reduced-motion">
        {children}
      </div>
    );
  }
  
  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = memoryManager.setTimeout(() => {
        setDisplayText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, adaptiveSpeed);
      
      return () => memoryManager.clearTimeout(timeout);
    } else {
      setIsComplete(true);
      
      if (loop) {
        const resetTimeout = memoryManager.setTimeout(() => {
          setDisplayText('');
          setCurrentIndex(0);
          setIsComplete(false);
        }, 2000);
        
        return () => memoryManager.clearTimeout(resetTimeout);
      }
    }
  }, [currentIndex, text, adaptiveSpeed, loop, memoryManager]);
  
  return (
    <motion.div
      ref={ref}
      className="inline-block"
      style={{ color, ...gpuStyle }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      data-testid="effect-typewriter"
    >
      <span>{displayText}</span>
      {typewriterCursor && (
        <motion.span
          className="inline-block w-[2px] h-[1em] ml-1 align-middle"
          style={{ backgroundColor: color }}
          animate={{ opacity: [1, 0, 1] }}
          transition={{
            duration: Math.max(0.45, 0.8 / Math.max(0.6, animationFactor)),
            repeat: isComplete && !loop ? 0 : Infinity,
            ease: 'steps(1)',
          }}
        />
      )}
    </motion.div>
  );
}

// Register this effect
const typewriterEffect: TextEffect = {
  id: 'typewriter',
  name: 'Typewriter',
  type: 'text',
  library: 'framer',
  description: 'Classic typewriter animation with optional cursor',
  tags: ['typewriter', 'typing', 'cursor', 'sequential'],
  performanceModes: ['low', 'medium', 'high'],
  component: Typewriter,
  defaultSettings: {
    speed: 50,
    typewriterCursor: true,
    color: '#ffffff',
    loop: false,
  },
  settingsSchema,
};

effectsRegistry.register(typewriterEffect);

export default typewriterEffect;


