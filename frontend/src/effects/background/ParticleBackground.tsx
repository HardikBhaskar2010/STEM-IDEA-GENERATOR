/**
 * Particle Background Effect
 *
 * Animated particle systems using tsparticles
 * Dynamically loaded to avoid bundle bloat & build failures
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Engine } from "@tsparticles/engine";
import type {
  BackgroundEffectComponentProps,
  BackgroundEffect,
  EffectSettingsSchema,
} from "@/types/effects";
import { effectsRegistry } from "@/effects/core/EffectsRegistry";

const settingsSchema: EffectSettingsSchema = {
  particleCount: {
    type: "range",
    label: "Particle Count",
    defaultValue: 80,
    min: 20,
    max: 200,
    step: 20,
  },
  particleSize: {
    type: "range",
    label: "Particle Size",
    defaultValue: 3,
    min: 1,
    max: 10,
    step: 1,
  },
  particleSpeed: {
    type: "range",
    label: "Movement Speed",
    defaultValue: 1,
    min: 0.5,
    max: 5,
    step: 0.5,
  },
  particleColor: {
    type: "color",
    label: "Particle Color",
    defaultValue: "#a855f7",
  },
  connectParticles: {
    type: "boolean",
    label: "Connect Particles",
    defaultValue: true,
  },
  opacity: {
    type: "range",
    label: "Opacity",
    defaultValue: 0.8,
    min: 0.1,
    max: 1,
    step: 0.1,
  },
};

export function ParticleBackground({
  settings,
  isActive,
}: BackgroundEffectComponentProps) {
  const [ParticlesComponent, setParticlesComponent] = useState<any>(null);
  const [loadSlimFn, setLoadSlimFn] = useState<any>(null);

  const {
    particleCount = 80,
    particleSize = 3,
    particleSpeed = 1,
    particleColor = "#a855f7",
    connectParticles = true,
    opacity = 0.8,
  } = settings;

  /**
   * Dynamically load tsparticles ONLY when effect is active
   */
  useEffect(() => {
    if (!isActive) return;

    let mounted = true;

    const loadParticles = async () => {
      try {
        const [{ default: Particles }, { loadSlim }] = await Promise.all([
          import("@tsparticles/react"),
          import("@tsparticles/slim"),
        ]);

        if (mounted) {
          setParticlesComponent(() => Particles);
          setLoadSlimFn(() => loadSlim);
        }
      } catch (err) {
        console.warn("tsparticles failed to load:", err);
      }
    };

    loadParticles();

    return () => {
      mounted = false;
    };
  }, [isActive]);

  const particlesInit = useCallback(
    async (engine: Engine) => {
      if (loadSlimFn) {
        await loadSlimFn(engine);
      }
    },
    [loadSlimFn]
  );

  const particlesConfig = useMemo(
    () => ({
      fullScreen: false,
      fpsLimit: 60,
      particles: {
        number: {
          value: particleCount,
          density: {
            enable: true,
            width: 1920,
            height: 1080,
          },
        },
        color: { value: particleColor },
        shape: { type: "circle" },
        opacity: { value: { min: 0.1, max: 0.5 } },
        size: { value: { min: 1, max: particleSize } },
        move: {
          enable: true,
          speed: particleSpeed,
          direction: "none",
          random: true,
          straight: false,
          outModes: { default: "bounce" },
        },
        links: connectParticles
          ? {
              enable: true,
              distance: 150,
              color: particleColor,
              opacity: 0.4,
              width: 1,
            }
          : undefined,
      },
      interactivity: {
        events: {
          onHover: {
            enable: true,
            mode: "grab",
          },
        },
        modes: {
          grab: {
            distance: 140,
            links: { opacity: 0.5 },
          },
        },
      },
      detectRetina: true,
    }),
    [particleCount, particleSize, particleSpeed, particleColor, connectParticles]
  );

  if (!isActive || !ParticlesComponent) return null;

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <ParticlesComponent
        id="particle-background"
        init={particlesInit}
        options={particlesConfig as any}
        className="absolute inset-0 w-full h-full"
      />
    </motion.div>
  );
}

/**
 * Register this effect
 */
const particleBackgroundEffect: BackgroundEffect = {
  id: "particle-background",
  name: "Particle Background",
  type: "background",
  library: "custom",
  description: "Animated particle systems with connection lines",
  tags: ["particles", "interactive", "dots", "network"],
  performanceModes: ["medium", "high"],
  component: ParticleBackground,
  defaultSettings: {
    particleCount: 80,
    particleSize: 3,
    particleSpeed: 1,
    particleColor: "#a855f7",
    connectParticles: true,
    opacity: 0.8,
  },
  settingsSchema,
  heavyLoad: true,
};

effectsRegistry.register(particleBackgroundEffect);

export default particleBackgroundEffect;
