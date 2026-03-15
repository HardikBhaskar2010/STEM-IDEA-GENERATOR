# README-integration.md — STEM Idea Adventure Landing

> **Dev checklist** — follow top-to-bottom on first integration.

---

## ✅ Quick-Start Checklist

### 1. Install New Dependencies

```bash
cd frontend
npm install framer-motion gsap lenis @react-three/fiber @react-three/drei three
npm install -D @types/three
```

> **Already installed?** Check `package.json` — the project already has
> `three`, `@react-three/fiber`, `@react-three/drei`.
> Add `gsap` and `lenis` if missing.

### 2. No Route Changes Needed

`Welcome.tsx` at `/` now wraps the new `HeroLanding` automatically.
`App.tsx` is unchanged.

### 3. Add CSS shimmer keyframe (ImageSeqCanvas)

In `frontend/src/index.css` add inside `@layer utilities`:

```css
@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}
```

### 4. GLB Placeholder

The planet falls back to **procedural geometry** when
`/public/models/planet.glb` is absent — no action needed for dev.
Add a real GLB later; see `src/three/README.md`.

---

## 📦 Component Import Map

```tsx
// pages/Welcome.tsx (already wired — no changes needed)
import HeroLanding  from '@/components/landing/HeroLanding';
import HeroFallback from '@/components/landing/HeroFallback';

// Individually if composing a custom page:
import { CTAButton }        from '@/components/landing/CTAButton';
import { CursorBackground } from '@/components/landing/CursorBackground';
import { ParallaxLayers, ParallaxLayer, StarField } from '@/components/landing/ParallaxLayers';
import { ImageSeqCanvas }   from '@/components/landing/ImageSeqCanvas';
import ThreeHero            from '@/three/ThreeHero'; // lazy-load this!
```

---

## 🚀 Lazy-Loading Heavy Pieces

### ThreeHero (react-three-fiber)

Already lazy-loaded inside `HeroLanding.tsx`:

```tsx
const ThreeHero = React.lazy(() => import('@/three/ThreeHero'));

<Suspense fallback={<CSS3DPlanetFallback />}>
  <ThreeHero />
</Suspense>
```

### ImageSeqCanvas

Also lazy-load if frame array is large:

```tsx
const ImageSeqCanvas = React.lazy(() => import('@/components/landing/ImageSeqCanvas'));
```

### Next.js projects (if you migrate)

```tsx
import dynamic from 'next/dynamic';
const ThreeHero = dynamic(() => import('../three/ThreeHero'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});
```

---

## 🌀 Portal CTA → Route Transition

`CTAButton` plays a 700ms `clip-path` radial expand, then calls
`onPortalComplete`. In `HeroLanding.tsx` that navigates to:
- `/dashboard` — if authenticated  
- `/generator` — if guest

To change the destination:
```tsx
<CTAButton
  onPortalComplete={() => navigate('/your-route')}
  label="Enter the Adventure"
/>
```

The portal overlay is a full-screen `position: fixed` div — it will
occlude everything during the 700ms and then unmount automatically.

---

## 📱 Disabling Heavy Pieces on Mobile / Low-End

### Detection pattern (already applied in Welcome.tsx + HeroLanding.tsx)

```ts
const cores  = navigator.hardwareConcurrency ?? 8;
const memory = (navigator as any).deviceMemory ?? 8;   // GB, Chrome only
const touch  = navigator.maxTouchPoints > 0;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isLowEnd = cores < 4 || memory < 4;
const useFallback = isLowEnd || touch || reduce;
```

| Condition                    | Behaviour                                |
|------------------------------|------------------------------------------|
| `prefers-reduced-motion`     | `HeroFallback` (CSS + IO only)           |
| `hardwareConcurrency < 2`    | `HeroFallback`                           |
| `deviceMemory < 2`           | `HeroFallback`                           |
| Touch device (mobile/tablet) | 3D hidden, CSS planet shown              |
| Desktop, capable             | Full stack (Three.js + Framer + GSAP)    |

---

## 🖼️ Image Sequence Pipeline

### Record / export frames

```bash
# Extract 60 frames from a video at 1280×720
ffmpeg -i input.mp4 -vf "fps=24,scale=1280:-1" -frames:v 60 frames/frame_%04d.jpg

# Convert to WebP (quality 75 = good balance of size vs fidelity)
for f in frames/*.jpg; do
  cwebp -q 75 -resize 1280 720 "$f" -o "${f%.jpg}.webp"
done
```

### Recommended settings

| Setting      | Desktop     | Mobile       |
|-------------|-------------|--------------|
| Resolution  | 1280 × 720  | 640 × 360    |
| Quality     | WebP q=75   | WebP q=60    |
| Frame count | 60 frames   | 30 frames    |
| Total size  | < 4 MB      | < 1.5 MB    |

### Wire frames into HeroLanding.tsx

```tsx
// In HeroLanding.tsx, replace DEMO_FRAMES with:
const DEMO_FRAMES = Array.from({ length: 60 }, (_, i) =>
  `/frames/frame_${String(i + 1).padStart(4, '0')}.webp`
);
```

---

## 🔧 GSAP + Lenis Wiring

To activate the GSAP timeline (smooth scroll + pinned scrub):

```tsx
// In HeroLanding.tsx useEffect:
import { initLenis, createHeroTimeline } from '@/animations/gsap-timelines';

useEffect(() => {
  let cleanup: (() => void) | undefined;

  (async () => {
    const lenis = await initLenis();
    const tl = await createHeroTimeline('#hero-pin-container');
    cleanup = () => {
      tl.kill?.();
      lenis.destroy?.();
    };
  })();

  return () => cleanup?.();
}, []);
```

> **Note**: GSAP ScrollTrigger and Framer Motion's `useScroll` both detect
> scroll events. They coexist fine — GSAP drives pinning, Framer drives
> per-element transforms. Do NOT set `smooth` in both simultaneously.

---

## 🎨 CSS `ScrollTimeline` (Progressive Enhancement)

Chrome 115+ supports native CSS scroll-driven animations:

```css
/* Progressively enhance a parallax layer — no JS needed */
@keyframes parallax-y {
  to { transform: translateY(-30%); }
}

.parallax-layer-slow {
  animation: parallax-y linear;
  animation-timeline: scroll();            /* native scroll timeline */
  animation-range: entry 0% exit 100%;
}
```

**Polyfill** for older browsers:
```html
<script src="https://flackr.github.io/scroll-timeline/dist/scroll-timeline.js"></script>
```

MDN reference: https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline

---

## 📚 Reference Links

| Topic                           | Link |
|---------------------------------|------|
| Framer Motion `useScroll`       | https://www.framer.com/motion/use-scroll/ |
| GSAP ScrollTrigger              | https://gsap.com/docs/v3/Plugins/ScrollTrigger/ |
| Lenis smooth scroll             | https://github.com/darkroomengineering/lenis |
| CSS `animation-timeline` (MDN)  | https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline |
| `@react-three/fiber`            | https://r3f.docs.pmnd.rs/ |
| `@react-three/drei`             | https://github.com/pmndrs/drei |
| WebP compression (cwebp)        | https://developers.google.com/speed/webp/docs/cwebp |
| `prefers-reduced-motion` (MDN)  | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion |
