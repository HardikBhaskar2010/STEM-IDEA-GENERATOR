/**
 * Advanced Particle Background Effect - NeuralStormCore v1
 *
 * Interactive "neural storm from the future" particle system with:
 * - 240+ particles with 3-layer parallax depth
 * - Real-time cursor interaction (repulsion/attraction/ripple)
 * - Glow effects and blend modes
 * - Subtle camera drift for cinematic feel
 * - Adaptive quality for performance
 */

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type {
  BackgroundEffectComponentProps,
  BackgroundEffectSettings,
  EffectSettingsSchema,
} from "@/types/effects";
import { NeuralStormEngine } from "./NeuralStormEngine";

/**
 * Settings Schema for Inspector Panel
 * 
 * Defines all configurable parameters for the Advanced Particle Background.
 * This schema is used to dynamically generate UI controls in the inspector.
 */
const settingsSchema: EffectSettingsSchema = {
  particleCount: {
    type: 'range',
    label: 'Particle Count',
    defaultValue: 240,
    min: 80,
    max: 400,
    step: 20,
    description: '3x density for immersive experience'
  },
  particleSpeed: {
    type: 'range',
    label: 'Movement Speed',
    defaultValue: 1,
    min: 0.5,
    max: 3,
    step: 0.1
  },
  connectionDistance: {
    type: 'range',
    label: 'Connection Distance',
    defaultValue: 150,
    min: 50,
    max: 300,
    step: 10,
    description: 'Max distance for particle connections'
  },
  interactionMode: {
    type: 'select',
    label: 'Cursor Interaction',
    defaultValue: 'repulsion',
    options: [
      { value: 'none', label: 'None' },
      { value: 'repulsion', label: 'Repulsion' },
      { value: 'attraction', label: 'Attraction' },
      { value: 'ripple', label: 'Ripple' }
    ]
  },
  interactionRadius: {
    type: 'range',
    label: 'Interaction Radius',
    defaultValue: 200,
    min: 100,
    max: 400,
    step: 20
  },
  interactionStrength: {
    type: 'range',
    label: 'Interaction Strength',
    defaultValue: 0.5,
    min: 0,
    max: 1,
    step: 0.1
  },
  enableGlow: {
    type: 'boolean',
    label: 'Enable Glow Effect',
    defaultValue: true
  },
  glowIntensity: {
    type: 'range',
    label: 'Glow Intensity',
    defaultValue: 0.6,
    min: 0,
    max: 1,
    step: 0.1
  },
  blendMode: {
    type: 'select',
    label: 'Blend Mode',
    defaultValue: 'screen',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'screen', label: 'Screen' },
      { value: 'lighten', label: 'Lighten' },
      { value: 'add', label: 'Add' }
    ]
  },
  enableDrift: {
    type: 'boolean',
    label: 'Enable Camera Drift',
    defaultValue: true,
    description: 'Subtle breathing effect'
  },
  adaptiveQuality: {
    type: 'boolean',
    label: 'Adaptive Quality',
    defaultValue: true,
    description: 'Auto-reduce quality if FPS drops'
  }
};

/**
 * Extended settings interface for Advanced Particle Background
 */
export interface AdvancedParticleSettings extends BackgroundEffectSettings {
  // Core settings
  particleCount: number;        // 240 default (3x current)
  particleSpeed: number;        // 0.5-3 range
  connectionDistance: number;   // 150px default
  
  // Cursor interaction
  interactionMode: 'repulsion' | 'attraction' | 'ripple' | 'none';
  interactionRadius: number;    // 200px default
  interactionStrength: number;  // 0-1 force multiplier
  
  // Visual effects
  enableGlow: boolean;          // Blur-based glow
  glowIntensity: number;        // 0-1
  blendMode: 'normal' | 'screen' | 'lighten' | 'add';
  
  // Camera drift
  enableDrift: boolean;
  
  // Performance
  adaptiveQuality: boolean;     // Auto-reduce quality if FPS drops
}

/**
 * Component props extending base BackgroundEffectComponentProps
 */
interface AdvancedParticleBackgroundProps extends BackgroundEffectComponentProps {
  settings: AdvancedParticleSettings;
  isActive: boolean;
}

/**
 * AdvancedParticleBackground Component
 * 
 * React wrapper for NeuralStormEngine - handles canvas setup, lifecycle,
 * and settings propagation. NO LOGIC - pure orchestration.
 */
export function AdvancedParticleBackground({
  settings,
  isActive,
}: AdvancedParticleBackgroundProps) {
  // Canvas ref for rendering
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Engine instance ref (persists across renders)
  const engineRef = useRef<NeuralStormEngine | null>(null);
  
  // Animation frame ID ref for cleanup
  const animationFrameRef = useRef<number | null>(null);

  // Component lifecycle: mount/unmount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set initial canvas dimensions to match container
    const updateCanvasSize = () => {
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Set display size (CSS pixels)
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      // Set actual size in memory (scaled for device pixel ratio)
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Scale context to match device pixel ratio
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      
      // Update engine with new dimensions
      if (engineRef.current) {
        engineRef.current.updateSettings({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    // Set initial size
    updateCanvasSize();

    // Create engine instance
    engineRef.current = new NeuralStormEngine(canvas, settings);

    // Start animation loop
    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      if (engineRef.current) {
        engineRef.current.update(deltaTime);
        engineRef.current.render();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Mouse move listener for cursor tracking
    const handleMouseMove = (event: MouseEvent) => {
      if (!canvas || !engineRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      engineRef.current.setCursorPosition({ x, y });
    };

    // Mouse leave listener to clear cursor position
    const handleMouseLeave = () => {
      if (engineRef.current) {
        engineRef.current.setCursorPosition(null);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Add resize listener to update canvas size
    window.addEventListener('resize', updateCanvasSize);

    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', updateCanvasSize);

      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  // Settings propagation: update engine when settings change
  useEffect(() => {
    if (engineRef.current) {
      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      if (prefersReducedMotion) {
        // Apply reduced motion settings
        const reducedMotionSettings = {
          ...settings,
          enableDrift: false,              // Disable camera drift
          interactionMode: 'none' as const, // Disable cursor interaction
          particleSpeed: 0.2,              // Reduce particle speed
        };
        engineRef.current.updateSettings(reducedMotionSettings);
      } else {
        // Use normal settings
        engineRef.current.updateSettings(settings);
      }
    }
  }, [settings]);

  if (!isActive) return null;

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: settings.opacity ?? 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          mixBlendMode: settings.blendMode ?? 'normal',
        }}
      />
    </motion.div>
  );
}

/**
 * Effect Registration Object
 * 
 * Registers the Advanced Particle Background effect with the effects registry.
 * This makes the effect discoverable and usable throughout the application.
 */
import type { BackgroundEffect } from "@/types/effects";
import { effectsRegistry } from "@/effects/core/EffectsRegistry";

const advancedParticleBackgroundEffect: BackgroundEffect = {
  id: "advanced-particle-background",
  name: "Neural Storm",
  type: "background",
  library: "custom",
  description: "Interactive particle system with depth and cursor interaction",
  tags: ["particles", "interactive", "3d-depth"],
  performanceModes: ["medium", "high"],
  component: AdvancedParticleBackground,
  defaultSettings: {
    particleCount: 240,
    particleSpeed: 1,
    connectionDistance: 150,
    interactionMode: 'repulsion',
    interactionRadius: 200,
    interactionStrength: 0.5,
    enableGlow: true,
    glowIntensity: 0.6,
    blendMode: 'screen',
    enableDrift: true,
    adaptiveQuality: true,
  },
  settingsSchema,
  heavyLoad: true,
};

effectsRegistry.register(advancedParticleBackgroundEffect);

export default advancedParticleBackgroundEffect;
