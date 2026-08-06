/**
 * HeroFallback.tsx — Lightweight hero for reduced-motion / low-end devices.
 *
 * ZERO heavy deps: no three.js, no GSAP, no Framer Motion.
 * Uses only CSS + IntersectionObserver for reveal animations.
 *
 * Reveals: title, sub-copy, feature pills, CTA — all staggered via
 * data-reveal attributes toggled by a single IntersectionObserver.
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Zap, Rocket, ArrowRight, LogIn } from 'lucide-react';

export interface HeroFallbackProps {
  onEnter?: () => void;
}

export const HeroFallback: React.FC<HeroFallbackProps> = ({ onEnter }) => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const sectionRef = useRef<HTMLDivElement>(null);

  // ─── IntersectionObserver reveal ────────────────────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) {return;}

    const targets = section.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!targets.length) {return;}

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = '1';
            (entry.target as HTMLElement).style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    targets.forEach((el) => {
      // Prime the starting state inline (no initial class needed).
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = `opacity 0.6s ease ${el.dataset.delay ?? '0ms'}, transform 0.6s ease ${el.dataset.delay ?? '0ms'}`;
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleCTA = () => {
    onEnter?.();
    navigate(isAuthenticated ? '/dashboard' : '/signup');
  };

  const handleSignIn = () => navigate('/login');

  return (
    <div
      ref={sectionRef}
      className="relative min-h-screen bg-[#0d0d14] overflow-x-hidden"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(168,85,247,0.18) 0%, #0d0d14 70%)',
      }}
    >
      {/* ── Static ambient glow ── */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[60vmax] h-[60vmax] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* ══════════ SECTION 1: HERO ══════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
        {/* Badge */}
        <div
          data-reveal
          data-delay="0ms"
          className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm font-medium"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          AI-Powered STEM Platform
        </div>

        {/* Headline */}
        <h1
          data-reveal
          data-delay="80ms"
          className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tight leading-none mb-4"
        >
          <span
            className="block"
            style={{
              background:
                'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #22d3ee 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            STEM
          </span>
          <span className="block text-white">Idea Adventure</span>
        </h1>

        {/* Taglines */}
        <p
          data-reveal
          data-delay="160ms"
          className="mt-4 text-xl md:text-2xl text-gray-400 max-w-2xl"
        >
          Build. Explore. Invent.
        </p>
        <p
          data-reveal
          data-delay="220ms"
          className="mt-2 text-lg text-gray-500 max-w-xl"
        >
          Embark on immersive AI-powered project creation — from concept to build plan in seconds.
        </p>

        {/* CTA */}
        {!isLoading && (
          <div
            data-reveal
            data-delay="320ms"
            className="mt-10 flex flex-col sm:flex-row items-center gap-4"
          >
            <button
              onClick={handleCTA}
              data-testid="cta-enter-fallback"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-full text-white font-semibold text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all duration-300 shadow-[0_0_32px_rgba(168,85,247,0.4)] hover:shadow-[0_0_48px_rgba(168,85,247,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              {isAuthenticated ? (
                <>Enter Dashboard <ArrowRight className="w-5 h-5" aria-hidden="true" /></>
              ) : (
                <>Get Started <Rocket className="w-5 h-5" aria-hidden="true" /></>
              )}
            </button>

            {!isAuthenticated && (
              <button
                onClick={handleSignIn}
                data-testid="sign-in-fallback"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-gray-300 font-semibold text-lg border border-white/10 hover:border-white/25 hover:text-white transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                Sign In <LogIn className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Scroll hint */}
        <div
          data-reveal
          data-delay="500ms"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-600 text-sm"
        >
          <span>Scroll to explore</span>
          <div className="w-px h-12 bg-gradient-to-b from-gray-600 to-transparent" />
        </div>
      </section>

      {/* ══════════ SECTION 2: FEATURES ══════════ */}
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2
            data-reveal
            className="text-4xl md:text-5xl font-bold text-center text-white mb-4"
          >
            Where Innovation Begins
          </h2>
          <p
            data-reveal
            data-delay="80ms"
            className="text-center text-gray-400 mb-16 max-w-2xl mx-auto"
          >
            STEM Idea Adventure combines cutting-edge AI with immersive visuals
            to inspire creativity at every step.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Sparkles className="h-10 w-10" aria-hidden="true" />,
                color: '#a855f7',
                borderColor: 'rgba(168,85,247,0.25)',
                bg: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(139,92,246,0.05))',
                title: 'AI-Powered Ideas',
                desc: 'Generate unique STEM project concepts tailored to your skill level and interests with our advanced AI engine.',
                delay: '0ms',
              },
              {
                icon: <Zap className="h-10 w-10" aria-hidden="true" />,
                color: '#3b82f6',
                borderColor: 'rgba(59,130,246,0.25)',
                bg: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.05))',
                title: '500+ Components',
                desc: 'Explore a vast library of electronic components with 3D previews, detailed specs, and project recommendations.',
                delay: '100ms',
              },
              {
                icon: <Rocket className="h-10 w-10" aria-hidden="true" />,
                color: '#22d3ee',
                borderColor: 'rgba(34,211,238,0.25)',
                bg: 'linear-gradient(135deg, rgba(34,211,238,0.08), rgba(6,182,212,0.04))',
                title: 'Learn By Doing',
                desc: 'Access hands-on tutorials, interactive lessons, and step-by-step guides to master STEM through practice.',
                delay: '200ms',
              },
            ].map((card) => (
              <div
                key={card.title}
                data-reveal
                data-delay={card.delay}
                className="group relative overflow-hidden rounded-2xl p-8 hover:scale-[1.03] transition-transform duration-500"
                style={{
                  background: card.bg,
                  border: `1px solid ${card.borderColor}`,
                  backdropFilter: 'blur(10px)',
                  // Neon edge glow driven by --glow-intensity CSS var
                  boxShadow: `0 0 0 0 ${card.color}`,
                  transition:
                    'transform 0.5s ease, box-shadow 0.5s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 32px 2px ${card.color}33`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 0 transparent';
                }}
              >
                {/* Top glow orb */}
                <div
                  aria-hidden="true"
                  className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-25 group-hover:opacity-45 transition-opacity duration-500"
                  style={{ background: card.color }}
                />
                <div className="relative z-10">
                  <div className="mb-4" style={{ color: card.color }}>
                    {card.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{card.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ SECTION 3: CTA ══════════ */}
      <section
        className="relative py-32 px-6"
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgba(168,85,247,0.08) 50%, transparent)',
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2
            data-reveal
            className="text-5xl md:text-6xl font-black text-white mb-6"
          >
            {isAuthenticated ? 'Welcome Back!' : 'Ready to Create?'}
          </h2>
          <p
            data-reveal
            data-delay="80ms"
            className="text-xl text-gray-400 mb-10"
          >
            {isAuthenticated
              ? 'Continue your journey of innovation and discovery.'
              : 'Start your adventure into the world of STEM creativity.'}
          </p>

          {!isLoading && (
            <div
              data-reveal
              data-delay="160ms"
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={handleCTA}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full text-white font-semibold text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all duration-300 shadow-[0_0_32px_rgba(168,85,247,0.4)] hover:shadow-[0_0_48px_rgba(168,85,247,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                Enter the Adventure <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HeroFallback;
