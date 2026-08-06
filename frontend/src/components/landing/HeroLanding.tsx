/**
 * HeroLanding.tsx — Cinematic dark sci-fi hero for STEM Idea Adventure.
 *
 * Layout:
 *   LEFT  — ThreeHero planet (desktop) or CSS planet fallback (mobile / no-3D)
 *   RIGHT — Glassmorphism console panel with typed micro-interaction
 *
 * Scroll choreography (wired to GSAP ScrollTrigger via gsap-timelines.ts):
 *   0 → 33%   : console fades, star field scales
 *   33 → 66%  : ImageSeqCanvas scrubbed frame sequence fades in
 *   66 → 100% : Camera fly-in, planet grows
 *
 * Props:
 *   onEnter          — called when CTA is clicked
 *   scrollTargetRef  — optional external ref to override the hero ref
 */

import type {
  RefObject} from 'react';
import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  lazy,
  Suspense
} from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { CTAButton } from './CTAButton';
import { CursorBackground } from './CursorBackground';
import { ParallaxLayers, ParallaxLayer, StarField } from './ParallaxLayers';
import { ImageSeqCanvas } from './ImageSeqCanvas';
import { ArrowRight, Cpu, Zap, Globe } from 'lucide-react';

// Lazy-load the heavy Three.js scene
const ThreeHero = lazy(() => import('@/three/ThreeHero'));

// ─── Fixed planet overlay ─────────────────────────────────────────────────────
// Lives OUTSIDE the sticky hero so it persists as user scrolls into the
// feature section — the planet appears to "land" in the left column.
const FixedPlanetOverlay: React.FC<{ show3D: boolean }> = ({ show3D }) => {
  // window.innerHeight measured once at mount (SSR-safe default 900)
  const vh = useRef(typeof window !== 'undefined' ? window.innerHeight : 900);
  const { scrollY } = useScroll();
  const h = vh.current;
  const heroTotal = h * 6; // 600vh pinned section in px

  // Opacity schedule across the full-page scroll:
  //  0         → visible in hero
  //  0.22*600vh → starts to fade OUT (frames begin)
  //  0.32*600vh → fully hidden (frame sequence active)
  //  0.63*600vh → starts to fade back IN
  //  0.73*600vh → fully visible again, travels with hero
  //  600vh     → still visible in feature section left col
  //  600vh+200 → starts to fade out
  //  600vh+400 → fully gone (before CTA section)
  const opacity = useTransform(
    scrollY,
    [0, h*1.32, h*1.92, h*3.78, h*4.38, heroTotal, heroTotal + 200, heroTotal + 400],
    [1,  1,      0,      0,      1,       1,          1,              0]
  );

  // LCP optimization: delay raw 3D WebGL mount. Paint CSS fallback instantly.
  const [mounted3D, setMounted3D] = useState(false);
  useEffect(() => {
    if (show3D && typeof window !== 'undefined') {
      const t = setTimeout(() => setMounted3D(true), 1200);
      return () => clearTimeout(t);
    }
  }, [show3D]);

  if (prefersReducedMotion || isLowEnd || isMobileScreen) {return null;}

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-y-0 left-0 w-1/2"
      style={{ opacity, zIndex: 2 }}
    >
      {show3D && mounted3D ? (
        <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><CSS3DPlanetFallback /></div>}>
          <ThreeHero glbPath="/planet.glb" className="w-full h-full" />
        </Suspense>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <CSS3DPlanetFallback />
        </div>
      )}
    </motion.div>
  );
};


// ─── Device / motion guards ───────────────────────────────────────────────────
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isLowEnd =
  typeof navigator !== 'undefined' &&
  ((navigator.hardwareConcurrency ?? 4) < 2 ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((navigator as any).deviceMemory ?? 4) < 2);

// Use screen width as mobile proxy — maxTouchPoints is unreliable on Windows
// (Windows always reports touch capability even without a touchscreen).
const isMobileScreen =
  typeof window !== 'undefined' && window.innerWidth < 768;

// ─── Typed console lines ──────────────────────────────────────────────────────
const CONSOLE_LINES = [
  '> Initializing STEM Idea Adventure...',
  '> Loading AI synthesis engine...',
  '> Scanning 500+ component catalog...',
  '> Ready. Build. Explore. Invent.',
];

// ─── Typed line hook ──────────────────────────────────────────────────────────
function useTypedConsole(lines: string[], speed = 35) {
  const [displayed, setDisplayed] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState('');
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayed(lines);
      setDone(true);
      return;
    }
    if (lineIdx >= lines.length) { setDone(true); return; }

    const target = lines[lineIdx];
    if (charIdx < target.length) {
      const id = setTimeout(() => {
        setCurrentLine(target.slice(0, charIdx + 1));
        setCharIdx((c) => c + 1);
      }, speed);
      return () => clearTimeout(id);
    } else {
      // Line complete — pause then advance
      const id = setTimeout(() => {
        setDisplayed((prev) => [...prev, target]);
        setCurrentLine('');
        setCharIdx(0);
        setLineIdx((l) => l + 1);
      }, 420);
      return () => clearTimeout(id);
    }
  }, [lineIdx, charIdx, lines, speed]);

  return { displayed, currentLine, done };
}

// ─── HeroLanding ─────────────────────────────────────────────────────────────
export interface HeroLandingProps {
  onEnter?: () => void;
  scrollTargetRef?: RefObject<HTMLDivElement>;
}

export const HeroLanding: React.FC<HeroLandingProps> = ({
  onEnter,
  scrollTargetRef,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const internalRef = useRef<HTMLDivElement>(null);
  const heroRef = (scrollTargetRef ?? internalRef) as RefObject<HTMLDivElement>;

  // ── Scroll-driven values ──────────────────────────────────────────────────
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const seqProgress        = useTransform(scrollYProgress, [0.33, 0.66], [0, 1]);
  const seqOpacity         = useTransform(scrollYProgress, [0.25, 0.35, 0.62, 0.72], [0, 1, 1, 0]);
  const consoleOpacity     = useTransform(scrollYProgress, [0, 0.22], [1, 0]);
  const consoleY           = useTransform(scrollYProgress, [0, 0.30], ['0%', '-14%']);
  const purpleWashOpacity  = useTransform(scrollYProgress, [0.58, 0.72], [0, 1]);


  // Local scroll progress state for ImageSeqCanvas (needs a number, not MotionValue)
  const [seqProgressValue, setSeqProgressValue] = useState(0);
  useEffect(() => {
    const unsubscribe = seqProgress.on('change', (v) =>
      setSeqProgressValue(Math.max(0, Math.min(1, v)))
    );
    return unsubscribe;
  }, [seqProgress]);

  const { displayed, currentLine } = useTypedConsole(CONSOLE_LINES);

  const show3D = !isLowEnd && !isMobileScreen && !prefersReducedMotion;

  // 96 WebP frames — memoized so array isn't recreated on every render
  const DEMO_FRAMES = useMemo(
    () => Array.from({ length: 96 }, (_, i) => `/frames/frame_${String(i + 1).padStart(4, '0')}.webp`),
    []
  );

  // Stabilize callback to prevent FinalCTASection re-renders
  const handlePortalComplete = useCallback(() => {
    navigate(isAuthenticated ? '/dashboard' : '/veronica-ai');
  }, [isAuthenticated, navigate]);

  return (
    <div
      className="relative"
      style={{ background: '#0d0d14' }}
    >
      {/* ─── Fixed planet — persists across hero + feature section ─── */}
      <FixedPlanetOverlay show3D={show3D} />

      {/* ─── Fixed cursor reactive background ─── */}
      <CursorBackground />

      {/* ══════════ SECTION 1: PINNED HERO ══════════
          The outer wrapper is the scroll target for the scrub.
          Height = 300vh so pinning holds for 2x the viewport. */}
      <div
        ref={heroRef as React.RefObject<HTMLDivElement>}
        className="hero-pin-container relative"
        style={{ height: prefersReducedMotion ? '100vh' : '600vh' }}
      >
        {/* Sticky inner so it pins while outer scrolls */}
        <div className="sticky top-0 h-screen overflow-hidden flex flex-col">

          {/* ── Background layers ── */}
          <ParallaxLayers
            scrollTargetRef={heroRef}
            className="absolute inset-0"
          >
            {/* Slowest: star field */}
            <ParallaxLayer depth={0.05} className="absolute inset-0">
              <div className="hero-star-field absolute inset-0">
                <StarField starCount={160} />
              </div>
            </ParallaxLayer>

            {/* Nebula gradients */}
            <ParallaxLayer depth={0.12} className="absolute inset-0 pointer-events-none">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse 70% 50% at 20% 50%, rgba(168,85,247,0.12) 0%, transparent 70%),' +
                    'radial-gradient(ellipse 50% 60% at 80% 40%, rgba(34,211,238,0.07) 0%, transparent 60%)',
                }}
              />
            </ParallaxLayer>
          </ParallaxLayers>

          {/* ── Main hero content grid ── */}
          <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 items-center px-6 lg:px-16 max-w-screen-xl mx-auto w-full pt-16">

            {/* ────── LEFT: empty — real earth comes from FixedPlanetOverlay ────── */}
            <div className="hero-planet-wrapper hidden lg:block h-full min-h-[320px] lg:min-h-0" aria-hidden="true" />
            {/* Mobile fallback: inline CSS planet (fixed overlay is desktop-only) */}
            {isMobileScreen && (
              <div className="flex lg:hidden items-center justify-center py-8">
                <CSS3DPlanetFallback />
              </div>
            )}

            {/* ────── RIGHT: Glassmorphism console + CTA ────── */}
            <motion.div
              className="hero-console-panel flex flex-col gap-6 py-10 lg:py-0"
              style={{ opacity: consoleOpacity, y: consoleY }}
            >
              {/* Badge */}
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium tracking-wide"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                AI-POWERED · STEM PLATFORM
              </motion.div>

              {/* Headline */}
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.7 }}
              >
                <h1 className="text-5xl md:text-6xl xl:text-7xl font-black leading-none tracking-tight">
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
                    STEM Idea
                  </span>
                  <span className="block text-white">Adventure</span>
                </h1>
                <p className="mt-3 text-lg text-gray-400 font-normal">
                  Build. Explore. Invent.
                </p>
              </motion.div>

              {/* Glass console terminal */}
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.6 }}
                className="rounded-xl border border-white/8 p-4 font-mono text-sm"
                style={{
                  background: 'rgba(13,13,20,0.65)',
                  backdropFilter: 'blur(20px)',
                  // Neon edge glow driven by CursorBackground CSS vars
                  boxShadow:
                    '0 0 1px 1px rgba(168,85,247,0.15),' +
                    'inset 0 0 40px rgba(34,211,238,0.03)',
                }}
                aria-label="Initialisation log"
                role="log"
                aria-live="polite"
              >
                {/* Terminal title bar */}
                <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-white/8">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  <span className="ml-2 text-xs text-gray-500 tracking-wider">STEM_ADVENTURE_INIT.sh</span>
                </div>

                {/* Typed lines */}
                <div className="space-y-1">
                  {displayed.map((line, i) => (
                    <p key={i} className="text-green-400/90 text-xs leading-relaxed">
                      {line}
                    </p>
                  ))}
                  {currentLine && (
                    <p className="text-cyan-300 text-xs leading-relaxed">
                      {currentLine}
                      <span className="inline-block w-0.5 h-3.5 bg-cyan-400 ml-0.5 animate-pulse" aria-hidden="true" />
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Micro-stat pills */}
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="flex flex-wrap gap-3"
              >
                {[
                  { icon: <Cpu className="w-3.5 h-3.5" />, label: 'AI-Powered', color: 'text-purple-400' },
                  { icon: <Zap className="w-3.5 h-3.5" />, label: '500+ Components', color: 'text-blue-400' },
                  { icon: <Globe className="w-3.5 h-3.5" />, label: '3D Immersive', color: 'text-cyan-400' },
                ].map((pill) => (
                  <div
                    key={pill.label}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-white/8 bg-white/4 ${pill.color}`}
                  >
                    {pill.icon}
                    <span className="text-gray-300">{pill.label}</span>
                  </div>
                ))}
              </motion.div>

              {/* CTA */}
              {!isLoading && (
                <motion.div
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85, duration: 0.6 }}
                  className="flex flex-col sm:flex-row items-start gap-3"
                >
                  <CTAButton
                    onEnter={onEnter}
                    onPortalComplete={handlePortalComplete}
                    label={isAuthenticated ? 'Enter Dashboard' : 'Enter the Adventure'}
                  />
                  {!isAuthenticated && (
                    <button
                      onClick={() => navigate('/login')}
                      className="inline-flex items-center gap-2 px-6 py-4 rounded-full text-gray-400 hover:text-white text-base border border-white/10 hover:border-white/25 transition-all duration-300"
                      data-testid="sign-in-hero"
                    >
                      Sign In <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* ── Scrubbed Image Sequence Overlay ── */}
          {DEMO_FRAMES.length > 0 && (
            <motion.div
              className="hero-seq-canvas absolute inset-0 pointer-events-none"
              style={{ opacity: seqOpacity }}
              aria-hidden="true"
            >
              <ImageSeqCanvas
                frames={DEMO_FRAMES}
                scrollProgress={seqProgressValue}
                className="w-full h-full"
              />

              {/* Purple wash — fades in at end of sequence before planet returns */}
              <motion.div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: purpleWashOpacity,
                  background:
                    'linear-gradient(to bottom, rgba(59,7,100,0.85) 0%, rgba(13,13,20,0.97) 100%)',
                }}
              />
            </motion.div>
          )}

          {/* ── Scroll hint ── */}
          <motion.div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-600 text-xs"
            style={{ opacity: consoleOpacity }}
            aria-hidden="true"
          >
            <span className="tracking-widest uppercase text-[10px]">Scroll to explore</span>
            <div className="w-px h-10 bg-gradient-to-b from-gray-600 to-transparent" />
          </motion.div>
        </div>
      </div>

      {/* ══════════ SECTION 2: FEATURE CARDS ══════════ */}
      <div className="relative" style={{ zIndex: 10 }}>
        <FeatureSection />
      </div>

      {/* ══════════ SECTION 3: FINAL CTA ══════════ */}
      <div className="relative" style={{ zIndex: 10 }}>
        <FinalCTASection isAuthenticated={isAuthenticated} isLoading={isLoading} />
      </div>
    </div>
  );
};

// ─── CSS planet fallback (no three.js) ────────────────────────────────────────
const CSS3DPlanetFallback: React.FC = () => (
  <div className="relative w-[280px] h-[280px] md:w-[360px] md:h-[360px] flex items-center justify-center">
    {/* Outer glow */}
    <div
      className="absolute inset-0 rounded-full"
      style={{
        background:
          'radial-gradient(circle at 35% 35%, #6366f1 0%, #3730a3 45%, #1e1b4b 75%, transparent 100%)',
        boxShadow: '0 0 80px 20px rgba(99,102,241,0.25)',
        animation: prefersReducedMotion ? 'none' : 'planet-spin 18s linear infinite',
      }}
    />
    {/* Ring */}
    <div
      className="absolute"
      style={{
        width: '130%',
        height: '22%',
        border: '2px solid rgba(34,211,238,0.5)',
        borderRadius: '50%',
        transform: 'rotateX(75deg)',
        boxShadow: '0 0 12px rgba(34,211,238,0.3)',
        animation: prefersReducedMotion ? 'none' : 'planet-spin 18s linear infinite reverse',
      }}
    />
    {/* Atmosphere */}
    <div
      className="absolute inset-[-8px] rounded-full"
      style={{
        background:
          'radial-gradient(circle at 60% 40%, rgba(168,85,247,0.15) 0%, transparent 60%)',
        filter: 'blur(8px)',
      }}
    />
    <style>{`
      @keyframes planet-spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// ─── Feature section (2-col: planet LEFT, title + cards RIGHT) ───────────────
const FEATURE_CARDS = [
  {
    icon: '🤖',
    color: '#a855f7',
    border: 'rgba(168,85,247,0.25)',
    bg: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(139,92,246,0.04))',
    title: 'AI-Powered Ideas',
    desc: 'Generate tailored STEM project concepts with complete roadmaps, bill of materials, and skill-matched steps.',
    delay: 0.05,
  },
  {
    icon: '⚡',
    color: '#3b82f6',
    border: 'rgba(59,130,246,0.25)',
    bg: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.04))',
    title: '500+ Components',
    desc: 'Explore a rich catalog with 3D previews, detailed specs, price comparison, and real project examples.',
    delay: 0.15,
  },
  {
    icon: '🚀',
    color: '#22d3ee',
    border: 'rgba(34,211,238,0.25)',
    bg: 'linear-gradient(135deg, rgba(34,211,238,0.08), rgba(6,182,212,0.03))',
    title: 'Learn By Doing',
    desc: '20+ interactive chapters — from circuit design to machine learning — with hands-on exercises.',
    delay: 0.25,
  },
];

const FeatureSection: React.FC = React.memo(() => (
  <section className="relative py-24 px-6 overflow-hidden">
    {/* Ambient blobs */}
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/2 left-[18%] -translate-y-1/2 w-[40vmax] h-[40vmax] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)', filter: 'blur(60px)' }} />
    </div>

    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

      {/* LEFT col: empty on desktop — FixedPlanetOverlay fills this visual space.
           On mobile, show a compact CSS planet since fixed overlay is hidden. */}
      <div className="hidden lg:flex items-center justify-center min-h-[320px]" aria-hidden="true">
        {/* Subtle ambient glow so the column isn't pitch-black */}
        <div className="w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>
      <div className="flex lg:hidden items-center justify-center py-6">
        <CSS3DPlanetFallback />
      </div>

      {/* RIGHT: heading + stacked feature cards */}
      <div className="flex flex-col gap-6">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Where Innovation
            <span style={{
              background: 'linear-gradient(90deg, #a855f7, #22d3ee)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}> Begins</span>
          </h2>
          <p className="text-gray-400 max-w-xl">
            An immersive platform that turns curiosity into creation — powered by advanced AI and stunning 3D visuals.
          </p>
        </motion.div>

        <div className="flex flex-col gap-4">
          {FEATURE_CARDS.map((card) => (
            <motion.div
              key={card.title}
              initial={prefersReducedMotion ? {} : { opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: card.delay }}
              className="group relative overflow-hidden rounded-2xl p-5 flex items-start gap-4"
              style={{
                background: card.bg,
                border: `1px solid ${card.border}`,
                backdropFilter: 'blur(12px)',
              }}
              whileHover={prefersReducedMotion ? {} : { x: 6 }}
            >
              {/* Hover glow edge */}
              <div aria-hidden="true" className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ border: `1px solid ${card.color}50`, boxShadow: `0 0 20px ${card.color}18` }} />
              <div className="text-3xl shrink-0" role="img" aria-hidden="true">{card.icon}</div>
              <div className="relative z-10">
                <h3 className="text-base font-bold text-white mb-1">{card.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{card.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
));
FeatureSection.displayName = 'FeatureSection';

// ─── Final CTA section ────────────────────────────────────────────────────────
const FinalCTASection: React.FC<{
  isAuthenticated: boolean;
  isLoading: boolean;
}> = React.memo(({ isAuthenticated, isLoading }) => {
  const navigate = useNavigate();

  const handlePortalComplete = useCallback(() => {
    navigate(isAuthenticated ? '/dashboard' : '/veronica-ai');
  }, [isAuthenticated, navigate]);

  return (
    <section
      className="relative py-36 px-6 text-center overflow-hidden"
      style={{
        background:
          'linear-gradient(to bottom, transparent, rgba(99,102,241,0.06) 40%, rgba(168,85,247,0.06) 60%, transparent)',
      }}
    >
      {/* Centred glow */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vmax] h-[50vmax] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative max-w-3xl mx-auto">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
            {isAuthenticated ? 'Welcome Back, Explorer.' : 'Ready to Create?'}
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            {isAuthenticated
              ? 'Continue your journey of innovation and discovery.'
              : 'Join thousands of makers, students, and educators building the future.'}
          </p>

          {!isLoading && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <CTAButton
                onPortalComplete={handlePortalComplete}
                label={isAuthenticated ? 'Enter Dashboard' : 'Enter the Adventure'}
              />
              {!isAuthenticated && (
                <button
                  onClick={() => navigate('/login')}
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm underline-offset-4 hover:underline"
                  data-testid="sign-in-cta-section"
                >
                  Already have an account? Sign in
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
});
FinalCTASection.displayName = 'FinalCTASection';

export default React.memo(HeroLanding);
