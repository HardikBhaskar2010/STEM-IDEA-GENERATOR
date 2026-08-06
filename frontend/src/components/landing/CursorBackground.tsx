/**
 * CursorBackground.tsx — Cursor-reactive neon glow background layer.
 *
 * Mechanism:
 *  • Desktop: a gaussian-blur "light orb" follows the cursor with spring lag
 *    (via Framer Motion useMotionValue + useSpring). Writes CSS vars
 *    --glow-x / --glow-y / --glow-intensity on <html> so neon card edges
 *    can react without re-rendering.
 *  • Touch / mobile: stays centred at 50 50% with reduced opacity — no JS
 *    motion tracking, just a static ambient glow.
 *  • prefers-reduced-motion: glow rendered but frozen in place.
 *
 * Usage:
 *   <CursorBackground />   ← place near the top of your page, position:fixed
 */

import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

// Detect touch-only / hover-less devices once at module level.
const isHoverDevice =
  typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const CursorBackground: React.FC = () => {
  // Raw mouse position (0→1) — updated in the event listener.
  const rawX = useMotionValue(0.5);
  const rawY = useMotionValue(0.5);

  // Spring smoothing — stiffness/damping control lag feel.
  const springX = useSpring(rawX, { stiffness: 50, damping: 20 });
  const springY = useSpring(rawY, { stiffness: 50, damping: 20 });

  // Write CSS vars on every spring tick so card edges can react.
  const htmlRef = useRef(document.documentElement);

  useEffect(() => {
    const unsubX = springX.on('change', (v) => {
      htmlRef.current.style.setProperty('--glow-x', `${v * 100}%`);
    });
    const unsubY = springY.on('change', (v) => {
      htmlRef.current.style.setProperty('--glow-y', `${v * 100}%`);
    });
    return () => {
      unsubX();
      unsubY();
    };
  }, [springX, springY]);

  useEffect(() => {
    if (!isHoverDevice || prefersReducedMotion) {return;}

    const onMove = (e: MouseEvent) => {
      const nx = e.clientX / window.innerWidth;
      const ny = e.clientY / window.innerHeight;
      rawX.set(nx);
      rawY.set(ny);
      htmlRef.current.style.setProperty('--glow-intensity', '1');
    };

    const onLeave = () => {
      htmlRef.current.style.setProperty('--glow-intensity', '0.3');
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, [rawX, rawY]);

  if (!isHoverDevice || prefersReducedMotion) {
    // ─── Static centred glow for touch/mobile ────────────────────────────────
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        {/* Primary ambient blob */}
        <div
          className="absolute rounded-full opacity-20"
          style={{
            width: '60vmax',
            height: '60vmax',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background:
              'radial-gradient(circle, rgba(168,85,247,0.6) 0%, rgba(59,130,246,0.3) 50%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        {/* Secondary cyan accent blob */}
        <div
          className="absolute rounded-full opacity-10"
          style={{
            width: '40vmax',
            height: '40vmax',
            bottom: '10%',
            right: '5%',
            background:
              'radial-gradient(circle, rgba(34,211,238,0.5) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>
    );
  }

  // ─── Desktop: spring-driven orb ──────────────────────────────────────────
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* rAF-driven orb — correct positioning via _CursorOrb below */}
      <_CursorOrb springX={springX} springY={springY} />

      {/* Static secondary cyan blob */}
      <div
        className="absolute rounded-full opacity-10 bottom-[8%] right-[8%]"
        style={{
          width: '35vmax',
          height: '35vmax',
          background:
            'radial-gradient(circle, rgba(34,211,238,0.5) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
    </div>
  );
};

// ─── Internal: rAF-driven orb (avoids Framer px/% unit conflicts) ────────────
const _CursorOrb: React.FC<{
  springX: ReturnType<typeof useSpring>;
  springY: ReturnType<typeof useSpring>;
}> = ({ springX, springY }) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      if (divRef.current) {
        const x = (springX.get() * 100).toFixed(2);
        const y = (springY.get() * 100).toFixed(2);
        divRef.current.style.left = `${x}%`;
        divRef.current.style.top = `${y}%`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [springX, springY]);

  return (
    <div
      ref={divRef}
      aria-hidden="true"
      className="absolute rounded-full pointer-events-none"
      style={{
        width: '55vmax',
        height: '55vmax',
        transform: 'translate(-50%, -50%)',
        background:
          'radial-gradient(circle at 40% 40%, rgba(168,85,247,0.45) 0%, rgba(59,130,246,0.2) 50%, transparent 70%)',
        filter: 'blur(80px)',
        opacity: 0.6,
        willChange: 'left, top',
      }}
    />
  );
};

export default CursorBackground;
