/**
 * ParallaxLayers.tsx — Multi-layer scroll-driven parallax container.
 *
 * Uses Framer Motion useScroll + useTransform. Each <ParallaxLayer depth={n}>
 * child translates vertically at `depth × scroll %`.
 *
 * depth guide:
 *   0.05 = almost frozen (background stars)
 *   0.15 = slow drift (nebula clouds)
 *   0.35 = medium (planet)
 *   0.70 = fast (foreground debris)
 *
 * Usage:
 *   <ParallaxLayers scrollTargetRef={heroRef}>
 *     <ParallaxLayer depth={0.05}><StarField /></ParallaxLayer>
 *     <ParallaxLayer depth={0.30}><Planet /></ParallaxLayer>
 *     <ParallaxLayer depth={0.60}><ConsolePanel /></ParallaxLayer>
 *   </ParallaxLayers>
 */

import React, { createContext, useContext, RefObject } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';

// ─── Context: share scroll progress with all child layers ────────────────────
const ScrollCtx = createContext<MotionValue<number> | null>(null);

// ─── ParallaxLayers ───────────────────────────────────────────────────────────
export interface ParallaxLayersProps {
  /** Ref attached to the scroll container (or the hero section itself). */
  scrollTargetRef: RefObject<HTMLElement>;
  children: React.ReactNode;
  className?: string;
}

export const ParallaxLayers: React.FC<ParallaxLayersProps> = ({
  scrollTargetRef,
  children,
  className = '',
}) => {
  const { scrollYProgress } = useScroll({
    target: scrollTargetRef,
    offset: ['start start', 'end start'],
  });

  return (
    <ScrollCtx.Provider value={scrollYProgress}>
      <div className={`relative overflow-hidden ${className}`}>
        {children}
      </div>
    </ScrollCtx.Provider>
  );
};

// ─── ParallaxLayer ────────────────────────────────────────────────────────────
export interface ParallaxLayerProps {
  /**
   * Parallax depth: 0 = no movement, 1 = moves full scroll height (100%).
   * Negative values move the layer in the opposite direction (towards viewer).
   */
  depth: number;
  children: React.ReactNode;
  className?: string;
  /** Override the Y range. Default: ['0%', `${depth * -100}%`] */
  yRange?: [string, string];
}

export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({
  depth,
  children,
  className = '',
  yRange,
}) => {
  const scrollYProgress = useContext(ScrollCtx);

  // If no parent context (standalone use), show children without effect.
  if (!scrollYProgress) {
    return <div className={className}>{children}</div>;
  }

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    yRange ?? ['0%', `${depth * -100}%`]
  );

  return (
    <motion.div
      className={`${className}`}
      style={{ y, willChange: 'transform' }}
    >
      {children}
    </motion.div>
  );
};

// ─── Convenience: pre-built star field layer ─────────────────────────────────
/**
 * StarField — pure CSS animated star background layer.
 * Drop inside a <ParallaxLayer depth={0.05}> for subtle drift.
 */
export const StarField: React.FC<{ starCount?: number }> = ({
  starCount = 120,
}) => {
  // Generate star positions once (stable across re-renders with useMemo ignored
  // — we seed from a deterministic pattern instead to avoid hydration issues).
  const stars = React.useMemo(
    () =>
      Array.from({ length: starCount }, (_, i) => ({
        id: i,
        x: ((i * 137.508) % 100).toFixed(2),  // golden-angle distribution
        y: ((i * 97.3) % 100).toFixed(2),
        size: 1 + (i % 3) * 0.5,
        opacity: 0.3 + (i % 5) * 0.1,
        delay: (i % 7) * 0.5,
      })),
    [starCount]
  );

  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.opacity,
            animation: `star-twinkle 3s ease-in-out ${s.delay}s infinite alternate`,
          }}
        />
      ))}

      {/* Keyframes injected inline to avoid global CSS dependency */}
      <style>{`
        @keyframes star-twinkle {
          from { opacity: var(--from-op, 0.2); transform: scale(1); }
          to   { opacity: var(--to-op, 0.8);   transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
};

export default ParallaxLayers;
