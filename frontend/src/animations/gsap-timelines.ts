/**
 * gsap-timelines.ts — GSAP ScrollTrigger + Lenis integration for STEM landing.
 *
 * Exports:
 *  • initLenis()         — smooth scroller with GSAP ticker sync
 *  • createHeroTimeline()— pinned, scrubbed ScrollTrigger timeline
 *
 * ⚠️  Peer deps (add to package.json if missing):
 *     gsap@^3.12   lenis@^1.1   @studio-freight/lenis (alt)
 *
 * Usage in a React component:
 *   useEffect(() => {
 *     const lenis = initLenis();
 *     const tl = createHeroTimeline('#hero-pin-target', camera);
 *     return () => { tl.kill(); lenis.destroy(); ScrollTrigger.getAll().forEach(t => t.kill()); };
 *   }, []);
 */

// Dynamically import to avoid SSR / tree-shake issues in Vite environments.
// Replace with direct imports if using a bundler that handles tree-shaking well.
// import gsap from 'gsap';
// import { ScrollTrigger } from 'gsap/ScrollTrigger';
// import Lenis from 'lenis';
// gsap.registerPlugin(ScrollTrigger);

// ─── Type stubs (so TS doesn't complain if deps aren't installed yet) ─────────
type AnyCamera = { position: { x: number; y: number; z: number } };
type LenisInstance = { raf: (t: number) => void; destroy: () => void };

// ─── initLenis ────────────────────────────────────────────────────────────────
/**
 * Creates a Lenis smooth-scroll instance and wires it to GSAP's ticker **and**
 * ScrollTrigger.scrollerProxy so both libraries see the same scroll position.
 *
 * CSS ScrollTimeline note:
 *   If `CSS.supports('animation-timeline', 'scroll()')` is true (Chrome 115+),
 *   you can skip Lenis and use native CSS:
 *
 *   @keyframes parallax { to { transform: translateY(-30%) } }
 *   .layer { animation: parallax linear; animation-timeline: scroll(); }
 *
 *   MDN ref: https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline
 */
export async function initLenis(): Promise<LenisInstance> {
  // ─── Dynamic import guards (deps not yet installed show a helpful error) ────
  let gsap: any, ScrollTrigger: any, Lenis: any;
  try {
    const gsapMod = await import('gsap');
    const stMod = await import('gsap/ScrollTrigger');
    const lenisMod = await import('lenis');
    gsap = gsapMod.default;
    ScrollTrigger = stMod.ScrollTrigger;
    Lenis = lenisMod.default;
    gsap.registerPlugin(ScrollTrigger);
  } catch {
    console.warn('[gsap-timelines] gsap / lenis not installed. Run: npm i gsap lenis');
    // Return a no-op stub so callers don't crash.
    return { raf: () => {}, destroy: () => {} };
  }

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 2,
  });

  // Wire Lenis RAF to GSAP ticker for correct scroll ordering.
  gsap.ticker.add((time: number) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Let ScrollTrigger read Lenis's virtual scroll position.
  ScrollTrigger.scrollerProxy(document.body, {
    scrollTop(value?: number) {
      if (arguments.length && value !== undefined) {
        lenis.scrollTo(value, { immediate: true });
      }
      return lenis.scroll;
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    },
    pinType: document.body.style.transform ? 'transform' : 'fixed',
  });

  lenis.on('scroll', ScrollTrigger.update);
  ScrollTrigger.refresh();

  return lenis;
}

// ─── createHeroTimeline ───────────────────────────────────────────────────────
/**
 * Pinned ScrollTrigger timeline that scrubs the hero section.
 *
 * @param triggerSelector — CSS selector for the pin target (e.g. '#hero-section')
 * @param camera          — optional three.js camera; if provided, its Z is animated
 *                          from 8 → 2 as scroll progress goes 0 → 1.
 * @returns gsap Timeline (call .kill() on unmount)
 *
 * Choreography (0 → 0.33 → 0.66 → 1):
 *   0.00 → 0.33 : console panel fades out, star field scales up
 *   0.33 → 0.66 : image sequence canvas fades in (frame scrub handled separately)
 *   0.66 → 1.00 : camera flies in (Z 8→2), planet grows, overlay fades
 */
export async function createHeroTimeline(
  triggerSelector: string,
  camera?: AnyCamera
) {
  let gsap: any, ScrollTrigger: any;
  try {
    const gsapMod = await import('gsap');
    const stMod = await import('gsap/ScrollTrigger');
    gsap = gsapMod.default;
    ScrollTrigger = stMod.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);
  } catch {
    console.warn('[gsap-timelines] gsap not installed.');
    return { kill: () => {} };
  }

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: triggerSelector,
      start: 'top top',
      end: '+=200%',          // pin for 200vh of scroll
      pin: true,
      scrub: 1.2,             // scrub lag in seconds — smoother handoff
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  // Phase 1 — console panel exits
  tl.to('.hero-console-panel', { opacity: 0, y: -40, duration: 0.33 }, 0);
  tl.to('.hero-star-field', { scale: 1.3, opacity: 0.6, duration: 0.33 }, 0);

  // Phase 2 — image sequence overlay appears
  tl.fromTo(
    '.hero-seq-canvas',
    { opacity: 0, scale: 0.95 },
    { opacity: 1, scale: 1, duration: 0.33 },
    0.33
  );

  // Phase 3 — 3D camera fly-in (if camera present)
  if (camera) {
    tl.to(
      camera.position,
      {
        z: 2,
        duration: 0.34,
        onUpdate: () => {
          // Notify R3F that the camera changed (it reads position reactively).
        },
      },
      0.66
    );
  }

  // Phase 3 — planet scale-up overlay
  tl.to('.hero-planet-wrapper', { scale: 1.15, duration: 0.34 }, 0.66);
  tl.to('.hero-overlay-gradient', { opacity: 0, duration: 0.34 }, 0.66);

  return tl;
}
