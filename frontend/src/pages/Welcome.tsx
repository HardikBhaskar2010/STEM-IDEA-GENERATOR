/**
 * Welcome.tsx — STEM Idea Adventure landing page (cinematic redesign).
 *
 * This file now wraps the new HeroLanding component and its fallbacks.
 * The route stays at "/" so no App.tsx change is required.
 *
 * Fallback logic (in priority order):
 *  1. prefers-reduced-motion  → HeroFallback (CSS + IntersectionObserver)
 *  2. Low-end device          → HeroFallback
 *  3. Otherwise               → HeroLanding (full Framer + Three.js stack)
 */

import React, { Suspense, lazy } from 'react';
import { PageLoading } from '@/components/ui/loading';
import { HeroFallback } from '@/components/landing/HeroFallback';

// Lazy-load the heavy landing stack
const HeroLanding = lazy(() => import('@/components/landing/HeroLanding'));

// ─── Device / motion checks (run once at module level) ────────────────────────
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isLowEndDevice =
  typeof navigator !== 'undefined' &&
  ((navigator.hardwareConcurrency ?? 8) < 2 ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((navigator as any).deviceMemory ?? 8) < 2);

const useLightFallback = prefersReducedMotion || isLowEndDevice;

// ─── Welcome ──────────────────────────────────────────────────────────────────
const Welcome: React.FC = () => {
  if (useLightFallback) {
    return <HeroFallback />;
  }

  return (
    <Suspense fallback={<PageLoading />}>
      <HeroLanding />
    </Suspense>
  );
};

export default Welcome;
