/**
 * CTAButton.tsx — "Enter the Adventure" portal-transition CTA.
 *
 * Animation: clip-path radial expand (0% → 150% in 700ms) simulating a portal
 * rip-through, then calls onPortalComplete() so the parent can navigate.
 *
 * Falls back to a plain fade + navigate on prefers-reduced-motion.
 */

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket } from 'lucide-react';

export interface CTAButtonProps {
  /** Called once the portal overlay animation finishes. Route here. */
  onPortalComplete?: () => void;
  /** Called immediately on click (before animation). */
  onEnter?: () => void;
  /** Text label; defaults to "Enter the Adventure" */
  label?: string;
  className?: string;
}

const preferredReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const CTAButton: React.FC<CTAButtonProps> = ({
  onPortalComplete,
  onEnter,
  label = 'Enter the Adventure',
  className = '',
}) => {
  const [portalActive, setPortalActive] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    onEnter?.();

    if (preferredReducedMotion) {
      // Immediate transition — no drama
      onPortalComplete?.();
      return;
    }

    setPortalActive(true);
  };

  return (
    <>
      {/* ─── Portal full-screen overlay ─── */}
      <AnimatePresence>
        {portalActive && (
          <motion.div
            key="portal-overlay"
            aria-hidden="true"
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, #a855f7 0%, #0d0d14 70%)',
            }}
            initial={{ clipPath: 'circle(0% at 50% 50%)' }}
            animate={{ clipPath: 'circle(150% at 50% 50%)' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => {
              setPortalActive(false);
              onPortalComplete?.();
            }}
          >
            {/* Inner neon ring */}
            <motion.div
              className="absolute w-32 h-32 rounded-full border-4 border-cyan-400/70"
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Button ─── */}
      <motion.button
        ref={btnRef}
        className={[
          'group relative inline-flex items-center gap-3 px-8 py-4 rounded-full text-white font-semibold text-lg',
          'bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600',
          'shadow-[0_0_32px_rgba(168,85,247,0.55)] hover:shadow-[0_0_48px_rgba(168,85,247,0.8)]',
          'border border-white/10 backdrop-blur-sm',
          'transition-shadow duration-300 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          className,
        ].join(' ')}
        onClick={handleClick}
        disabled={portalActive}
        whileHover={preferredReducedMotion ? {} : { scale: 1.06 }}
        whileTap={preferredReducedMotion ? {} : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        data-testid="cta-enter"
      >
        {/* Animated neon border sweep on hover */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-cyan-400/0 group-hover:border-cyan-400/60 transition-all duration-500 group-hover:shadow-[0_0_24px_rgba(34,211,238,0.35)]"
        />

        <Rocket className="w-5 h-5 transition-transform duration-300 group-hover:-rotate-12" aria-hidden="true" />
        <span>{label}</span>

        {/* Subtle shimmer sweep */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full overflow-hidden"
        >
          <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </span>
      </motion.button>
    </>
  );
};

export default CTAButton;
