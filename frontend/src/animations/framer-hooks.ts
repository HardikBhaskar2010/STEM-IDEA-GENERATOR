/**
 * framer-hooks.ts — Custom Framer Motion hooks for STEM Idea Adventure landing.
 *
 * Patterns covered:
 *  • useParallax        — scroll-driven Y translation per depth
 *  • useScrollProgress  — normalised 0→1 for a scrollable ref
 *  • useCursorSpring    — spring-smoothed cursor position (CSS vars)
 *  • useReducedMotion   — prefers-reduced-motion gate
 */

import type {
  MotionValue} from 'framer-motion';
import {
  useScroll,
  useTransform,
  useMotionValue,
  useSpring
} from 'framer-motion';
import type { RefObject} from 'react';
import { useEffect } from 'react';

// ─── Reduced-motion guard ────────────────────────────────────────────────────
export function useReducedMotion(): boolean {
  if (typeof window === 'undefined') {return false;}
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ─── useScrollProgress ───────────────────────────────────────────────────────
/**
 * Returns a normalised MotionValue (0 → 1) as the user scrolls through
 * the element pointed to by `ref`.
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   const progress = useScrollProgress(ref);
 *   const y = useTransform(progress, [0, 1], ['0%', '-30%']);
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement>
): MotionValue<number> {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  return scrollYProgress;
}

// ─── useParallax ─────────────────────────────────────────────────────────────
/**
 * Scroll-driven vertical parallax. `depth` controls how fast the layer moves
 * relative to the scroll; typically 0.1 (slow) → 1.0 (1:1).
 *
 * Usage:
 *   const y = useParallax(scrollContainerRef, 0.3);
 *   <motion.div style={{ y }} />
 */
export function useParallax(
  ref: RefObject<HTMLElement>,
  depth: number
): MotionValue<string> {
  const progress = useScrollProgress(ref);
  // Map 0→1 scroll to e.g. 0%→-30% (depth 0.3 × 100)
  return useTransform(progress, [0, 1], ['0%', `${-depth * 100}%`]);
}

// ─── useCursorSpring ─────────────────────────────────────────────────────────
/**
 * Spring-smoothed cursor position returned as MotionValues (normalised −0.5 → 0.5).
 * Also writes CSS variables `--cursor-x` / `--cursor-y` on <body> for non-Framer
 * consumers (e.g. the glow shader).
 *
 * Usage:
 *   const { cursorX, cursorY } = useCursorSpring();
 *   const rotateX = useTransform(cursorY, [-0.5, 0.5], ['10deg', '-10deg']);
 *
 * springConfig: lower stiffness = more lag / smoother feel.
 */
export function useCursorSpring(springConfig = { stiffness: 60, damping: 18 }) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const cursorX = useSpring(rawX, springConfig);
  const cursorY = useSpring(rawY, springConfig);

  useEffect(() => {
    const isTouchDevice =
      typeof window !== 'undefined' &&
      (navigator.maxTouchPoints > 0 || !window.matchMedia('(hover: hover)').matches);

    // On touch devices keep values at 0 — let the static fallback handle it.
    if (isTouchDevice) {return;}

    const onMove = (e: MouseEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;   // −0.5 → 0.5
      const ny = e.clientY / window.innerHeight - 0.5;  // −0.5 → 0.5
      rawX.set(nx);
      rawY.set(ny);

      // Write CSS vars for non-Framer consumers
      document.body.style.setProperty('--cursor-x', String(nx + 0.5)); // 0 → 1
      document.body.style.setProperty('--cursor-y', String(ny + 0.5)); // 0 → 1
      document.body.style.setProperty('--glow-intensity', '1');
    };

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [rawX, rawY]);

  return { cursorX, cursorY };
}

// ─── useImageSequenceProgress ────────────────────────────────────────────────
/**
 * Derives a 0-based frame index from a scroll progress MotionValue and total
 * frame count. Pass the result to <ImageSeqCanvas scrollProgress={…} />.
 *
 * Usage:
 *   const progress = useScrollProgress(ref);
 *   const frame = useImageSequenceProgress(progress, 60);
 */
export function useImageSequenceProgress(
  progress: MotionValue<number>,
  totalFrames: number
): MotionValue<number> {
  return useTransform(progress, [0, 1], [0, totalFrames - 1]);
}
