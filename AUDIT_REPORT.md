"# STEM Idea Adventure — Full Functional & Stability Audit Report

**Date:** January 2026
**Scope:** Welcome Page, Motion Studio, Architecture Integrity
**Type:** Diagnostic (read-only — no code modifications)
**Assumes:** Phase 8 implemented, Phase 9 partially implemented

---

## Table of Contents

1. [Welcome Page Audit](#1-welcome-page-audit)
2. [Motion Studio Audit](#2-motion-studio-audit)
3. [Architecture Integrity Check](#3-architecture-integrity-check)
4. [Performance Bottleneck Summary](#4-performance-bottleneck-summary)
5. [Prioritized Fix Plan](#5-prioritized-fix-plan)

---

## 1. Welcome Page Audit

### What is Working Correctly

- **Lazy loading of page components** — `Welcome` is loaded via `React.lazy()` in `App.tsx` (line 32).
- **Reduced motion detection** — `ScrollDrivenHero` correctly checks `prefers-reduced-motion` and halts `useFrame` animation when true (lines 123, 167).
- **Scroll listener uses `{ passive: true }`** — Correct for scroll performance (line 404).
- **Text effect integration** — `Welcome.tsx` correctly checks `effectsEnabled` and `activeTextEffect` before rendering dynamic text effects (line 19).
- **Auth-aware CTA** — Properly gates buttons between authenticated/unauthenticated state.
- **GPU acceleration hint** on the hero container via `translate3d(0, 0, 0)`.

---

### W-1: Scroll Listener Re-registration Loop

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **File** | `ScrollDrivenHero.tsx` lines 387–411 |
| **Category** | Performance / Event Listeners |

**Root Cause:** The `useEffect` that attaches the scroll listener has `scrollVh` in its dependency array (line 411). Inside the scroll handler, `setScrollVh()` is called (line 399), which triggers a re-render, which re-runs the `useEffect`, which removes and re-adds both `scroll` and `resize` listeners.

**Impact:** Continuous listener churn during scroll. The 0.5 threshold mitigates frequency but doesn't eliminate the fundamental problem — the useEffect should NOT depend on `scrollVh`.

**Risk:** FPS drops during scroll, potential event listener pile-up during rapid scroll.

---

### W-2: Object Allocation Inside `useFrame` (Per-frame GC Pressure)

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM-HIGH |
| **File** | `ScrollDrivenHero.tsx` lines 207–209 |
| **Category** | Performance / Memory |

**Root Cause:** Inside `useFrame`, `new THREE.Vector3()` and `.clone()` are called per-child per-frame. With 4 interactive nodes, that's 8+ object allocations per frame.

**Impact:** Garbage collection pressure in the animation loop. On low-end devices, this causes micro-stutter spikes.

---

### W-3: Two `useFrame` Hooks — One Performs Unthrottled Raycasting

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM-HIGH |
| **File** | `ScrollDrivenHero.tsx` lines 122–146 (hover detection) and 161–308 (main loop) |
| **Category** | Performance / CPU |

**Root Cause:** The hover-detection `useFrame` runs `raycaster.setFromCamera()` and `raycaster.intersectObjects()` on EVERY frame, regardless of whether the pointer has moved.

**Impact:** Raycasting is a CPU-expensive operation. Running it 60x/sec without pointer-movement guard wastes resources.

---

### W-4: ScrollDrivenHero Canvas Has No Mobile DPR Adaptation

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `ScrollDrivenHero.tsx` line 442 |
| **Category** | Mobile / Performance |

**Root Cause:** `dpr={[1, 2]}` is hardcoded — no adaptive DPR based on device detection. Compare with `R3FScene.tsx` lines 138–142 which properly adapts DPR.

**Impact:** Mobile devices render at high DPR unnecessarily, draining battery and reducing FPS.

---

### W-5: Sections Below Fold Animate on Mount, Not on Intersection

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `Welcome.tsx` lines 126–128, 148–178 |
| **Category** | Performance / UX / CLS |

**Root Cause:** All sections use `isVisible` state which is set 100ms after mount. Sections 2 and 3 (below fold) animate immediately even though the user hasn't scrolled to them. No `IntersectionObserver` is used.

**Impact:** Wasted animation work. User never sees the entrance animations for below-fold content. Potential CLS if content jumps from `opacity-0` to `opacity-100`.

---

### W-6: Debug `console.log` in Production Paths

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **File** | `ScrollDrivenHero.tsx` line 99 (inside `useMemo`), lines 422–425 (in `useEffect`) |
| **Category** | Performance / Cleanup |

**Root Cause:** `console.log` statements with `[LUNA V3]` prefix run unconditionally in production.

**Impact:** Minor perf tax; log noise. The useEffect on line 421 re-fires on every integer `scrollVh` change.

---

### W-7: Canvas `frameloop` Not Set to `demand` for Reduced Motion

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `ScrollDrivenHero.tsx` lines 440–444 |
| **Category** | Accessibility / Performance |

**Root Cause:** Unlike `R3FScene.tsx` (line 157) which uses `frameloop={flags.reducedMotion ? 'demand' : 'always'}`, ScrollDrivenHero's Canvas always uses `frameloop=\"always\"` even when `prefersReducedMotion=true`. The `useFrame` hooks check and return early, but the R3F loop itself still runs.

**Impact:** Wasted frames when reduced motion is preferred.

---

### W-8: Fixed 500vh Scroll Container with Permanent Fixed Canvas

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM-HIGH |
| **File** | `ScrollDrivenHero.tsx` lines 437–438 |
| **Category** | Performance / Memory |

**Root Cause:** The hero section is `h-[500vh]` with a `fixed` Canvas overlay. This means:
1. The WebGL Canvas is permanently composited even after scrolling past the hero section
2. No cleanup or removal of the Canvas when it's no longer visible
3. The R3F render loop continues indefinitely (useFrame hooks keep running)

**Impact:** If the user scrolls to Section 2 or 3, the Three.js scene is still rendering behind the opaque sections, consuming GPU resources invisibly.

---

## 2. Motion Studio Audit

### What is Working Correctly

- **Effect selection flow** — `handleSelectEffect` correctly retrieves from registry and dispatches to the right context setter based on type (lines 52–75).
- **Compatibility warnings** — Properly displayed when `getEffectsCompatibilityReport()` detects issues.
- **Mobile detection** — `useMobileOptimization()` correctly gates cursor effects and shows mobile warning.
- **Inspector panel** — Dynamic control rendering from `settingsSchema` is well-implemented with switch/case for each setting type.
- **Preset save validation** — Checks for empty name and no active effects before allowing save.
- **Memory cleanup hook** — `useMemoryCleanup` properly creates a `MemoryManager` per component lifecycle.

---

### M-1: EffectsContext Value Object Not Memoized — Global Re-render Storm

| Field | Value |
|-------|-------|
| **Severity** | HIGH (P0) |
| **File** | `EffectsContext.tsx` lines 149–177 |
| **Category** | Performance / Re-renders |

**Root Cause:** The `value` object passed to `EffectsContext.Provider` is re-created on EVERY render of `EffectsProvider`. Even though individual callbacks are wrapped in `useCallback`, the containing object is a new reference each time. EVERY consumer of `useEffects()` re-renders whenever ANY state in the provider changes.

**Impact:** Since `BackgroundLayer`, `CursorLayer`, `LivePreview`, `InspectorPanel`, `EffectsBrowser`, `SpecialsDrawer`, `PresetManager`, and `Welcome.tsx` all consume `useEffects()`, a single state change (e.g. updating one setting slider) causes all of them to re-render simultaneously.

**This is the most critical performance issue in the system.**

---

### M-2: Event Listener Stacking on Cursor Effects When Settings Change

| Field | Value |
|-------|-------|
| **Severity** | HIGH (P0) |
| **Files** | `DotTrail.tsx` lines 59–93, `BlobCursor.tsx` lines 76–85, `GlowRing.tsx` lines 72–81, `PixelTrail.tsx` lines 79–117, `SparkRipple.tsx` lines 68–115 |
| **Category** | Memory Leak / Event Listeners |

**Root Cause:** All cursor effects use `memoryManager.addEventListener()` inside `useEffect`. The `MemoryManager.cleanup()` only fires on component unmount (via `useMemoryCleanup` hook). When useEffect dependencies change (e.g. `adaptiveTrailLength`, `moveThrottleMs`, `flags.isLowEndDevice`), the effect re-runs and **adds new listeners without removing old ones**.

The `MemoryManager` appends listeners to its internal array but there's no mechanism to remove individual listeners on effect cleanup — only bulk cleanup on unmount.

**Impact:** If a user adjusts slider settings in the Inspector, each change adds duplicate event listeners. On rapid adjustment, 10+ `pointermove` listeners can stack up on `window`.

---

### M-3: `clearPreset` Doesn't Reset Settings Objects

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `EffectsContext.tsx` lines 130–136 |
| **Category** | Functional Bug / State |

**Root Cause:** `clearPreset` sets all active effect IDs to `null` but does NOT reset `activeTextSettings`, `activeCursorSettings`, `activeBackgroundSettings`, or `activeUISettings`. When a new effect is later activated without explicit settings, it inherits stale settings from the previously cleared preset.

**Impact:** Unexpected visual behavior after clearing presets.

---

### M-4: `setPerformanceMode` Is a No-op

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `EffectsContext.tsx` lines 143–147 |
| **Category** | Broken Feature / Dead Code |

**Root Cause:** `setPerformanceModeLocal` only logs to console. The actual `performanceMode` is derived from `PerfContext.lowPerf` (line 28) and cannot be changed through the EffectsContext API.

**Impact:** The \"Performance mode switching\" feature in Motion Studio is broken. Any UI that calls `setPerformanceMode()` has no effect.

---

### M-5: EffectsBrowser Search Ignores Active Type Filter

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `EffectsBrowser.tsx` lines 33–46 |
| **Category** | Functional Bug |

**Root Cause:** When both `selectedType !== 'all'` AND `searchQuery` is non-empty, the code first filters by type (line 37–39), then reassigns `filtered` to `effectsRegistry.search(searchQuery)` (line 43) which searches ALL effects, overwriting the type filter.

**Impact:** Functional bug — searching while a type tab is active returns results from all types.

---

### M-6: Background Effect Component Not Keyed — Stale State on Switch

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `BackgroundLayer.tsx` lines 62–77 |
| **Category** | State Management |

**Root Cause:** When switching between background effects, the component rendered changes (e.g. from `AnimatedGradient` to `ParticleBackground`) but no `key` prop is set on the `EffectComponent`. React may attempt to reconcile rather than remount.

The lazy path (isR3F/isParticle) does use `<LazyHeavyComponent>` but the non-lazy path (line 73) renders `<EffectComponent>` without a key.

**Impact:** Potential stale internal state when switching between effects of the same structure.

---

### M-7: `useFPSMonitor` Runs RAF Loop Even When Metrics Aren't Consumed

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `useFPSMonitor.ts` lines 31–80 |
| **Category** | Performance / Battery |

**Root Cause:** The RAF loop runs continuously whenever `enabled=true`, calling `setMetrics` every 60 frames. In `LivePreview`, this is always enabled in interactive mode.

**Impact:** Continuous RAF loop and periodic state updates cause re-renders of LivePreview even when the user isn't looking at FPS metrics.

---

### M-8: `useMobileOptimization` Resize Handler Not Throttled

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **File** | `useMobileOptimization.ts` lines 22–32 |
| **Category** | Performance |

**Root Cause:** `handleOrientationChange` calls `getDeviceCapabilities()` on every resize event without throttle. `getDeviceCapabilities()` queries multiple navigator APIs.

**Impact:** Resize spam during window resize causes excessive computation and state updates.

---

### M-9: Preset Loading Fires 8 State Updates Non-atomically

| Field | Value |
|-------|-------|
| **Severity** | LOW-MEDIUM |
| **File** | `EffectsContext.tsx` lines 105–128 |
| **Category** | Performance / UX |

**Root Cause:** `loadPreset` calls up to 8 individual `setState` functions. React 18 batches these inside event handlers, but there's no deep equality check — loading the same preset twice fires all 8 setters again. Combined with ISSUE M-1, this triggers a global re-render storm.

**Impact:** UI flicker on preset load; doubled work on re-loading same preset.

---

### M-10: All 26 Effects Eagerly Imported at App Startup

| Field | Value |
|-------|-------|
| **Severity** | HIGH (P0) |
| **File** | `App.tsx` line 28: `import '@/effects'` → `effects/index.ts` |
| **Category** | Bundle Size / First Paint |

**Root Cause:** Every effect module (text, cursor, background, UI) is imported and registered at app initialization. This includes:
- `ParticleBackground` (imports `framer-motion`, references `@tsparticles`)
- `R3FScene` (imports `@react-three/fiber`, `@react-three/drei`, `three`)
- All 6 cursor effects, all 8 text effects, all 5 UI effects

Even though `ParticleBackground` dynamically imports tsparticles at runtime, its module code (schemas, registration) still runs at startup.

**Impact:** Main bundle includes all effect registrations, component definitions, and their static imports. This defeats the lazy loading strategy in `BackgroundLayer`.

---

### M-11: Global Cursor Style Injection Without Cleanup Guard

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM-HIGH |
| **Files** | `BlobCursor.tsx` lines 94–98, `GlowRing.tsx` lines 91–95 |
| **Category** | Accessibility / Resilience |

**Root Cause:** Both inject `<style>* { cursor: none !important; }</style>` into the DOM. If the effect component crashes (error boundary catches it), the `<style>` tag remains but the visual cursor replacement is gone. The user is left with **no visible cursor**.

**Impact:** Accessibility violation; unrecoverable state on error.

---

## 3. Architecture Integrity Check

### Bundle Size Concerns

| Concern | Severity | Detail |
|---------|----------|--------|
| `import '@/effects'` eagerly loads ALL effects | **HIGH** | 26 modules + their deps loaded on first paint |
| `FloatingLinesBackground` imports raw Three.js + GLSL shaders | **MEDIUM** | WebGL shader compiled on every non-`/` page |
| `ScrollDrivenHero` imports full Three.js + R3F + drei | **MEDIUM** | Heavy deps pulled into Welcome chunk |
| `BackgroundLayer` + `CursorLayer` imported at App level | **LOW** | Import code is lightweight but subscriptions are not |

### Re-render Analysis

| Trigger | Affected Components | Cause |
|---------|-------------------|-------|
| Any EffectsContext state change | BackgroundLayer, CursorLayer, LivePreview, InspectorPanel, EffectsBrowser, SpecialsDrawer, PresetManager, Welcome | M-1: Context value not memoized |
| Inspector slider drag | All above + re-render storm | `updateTextSettings` etc. create new state -> new context value -> global re-render |
| Effect selection | All above | `handleSelectEffect` fires `setActiveXEffect` + `setActiveXSettings` |
| Resize event | All `useMobileOptimization` consumers | M-8: No throttle |
| Scroll on Welcome | ScrollDrivenHero re-mounts listener | W-1: scrollVh in deps |

### Cleanup & Memory Risks

| Risk | Severity | File | Detail |
|------|----------|------|--------|
| Event listener stacking | **HIGH** | All cursor effects | M-2: MemoryManager only cleans on unmount |
| ScrollDrivenHero Canvas never unmounts | **MEDIUM-HIGH** | `ScrollDrivenHero.tsx` | W-8: R3F loop runs indefinitely |
| FPSMonitor RAF loop | **MEDIUM** | `useFPSMonitor.ts` | Runs continuously in LivePreview |
| Three.js Vector3 allocations per frame | **MEDIUM** | `ScrollDrivenHero.tsx` | W-2: GC pressure |
| `lazyLoadOnIntersection` orphan DOM elements | **LOW** | `lazyEffects.ts` lines 72–100 | Div appended to body, may not be removed if component unmounts early |

### Mobile-Specific Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| ScrollDrivenHero DPR not adaptive | **MEDIUM** | W-4: Always `dpr={[1, 2]}` |
| FloatingLinesBackground has no mobile guard | **HIGH** | No performance guard, reduced motion check, or mobile optimization on WebGL shader |
| `useMobileOptimization` resize handler unthrottled | **MEDIUM** | M-8 |
| Cursor effects hidden on touch, but `cursor: none` style may briefly inject | **LOW** | BlobCursor/GlowRing check `isTouchDevice` but the component may briefly render before the check |

### Accessibility Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| Global `cursor: none !important` | **MEDIUM-HIGH** | M-11: No recovery on error |
| No `aria-label` on effect cards in EffectsBrowser | **LOW** | Button elements have visual content but no accessible name |
| Reduced motion: Canvas `frameloop` not demand mode | **MEDIUM** | W-7 |
| `FloatingLinesBackground` has no reduced motion check | **HIGH** | WebGL shader animation runs regardless of `prefers-reduced-motion` |

### Architectural Inconsistencies

| Inconsistency | Severity | Detail |
|----------------|----------|--------|
| `BackgroundLayer` lazy-loads heavy effects but `import '@/effects'` defeats it | **HIGH** | M-10 |
| `setPerformanceMode` exposed in context but is a no-op | **MEDIUM** | M-4 |
| `clearPreset` partial — clears IDs but not settings | **MEDIUM** | M-3 |
| `FloatingLinesBackground` bypasses EffectsContext entirely | **HIGH** | Hardcoded Three.js animation outside effects engine |
| `ScrollDrivenHero` duplicates device detection instead of using hooks | **LOW** | Uses `viewport.width < 768` instead of `useMobileOptimization` |
| Dual `FPSMonitor` classes | **LOW** | `PerformanceGuard.ts` has `FPSMonitor` class, `performanceMetrics.ts` also has `FPSMonitor` class — different implementations |
| `FocusedNodeOverlay` has stale closure on `displayNode` | **MEDIUM** | Missing dependency in useEffect (line 43) reads `displayNode` but it's not in deps array |

---

## 4. Performance Bottleneck Summary (Priority Order)

| Priority | ID | Issue | Impact | Effort |
|----------|----|-------|--------|--------|
| **P0** | M-1 | EffectsContext value not memoized | Global re-render on any state change | Low |
| **P0** | M-2 | Cursor effect listener stacking | Memory leak + duplicate event handlers | Medium |
| **P0** | M-10 | Eager import of all 26 effects | Bundle size bloat, slow first paint | Medium |
| **P1** | W-1 | Scroll listener re-registration | Scroll perf degradation | Low |
| **P1** | W-2 | Per-frame Vector3 allocations | GC pressure in animation loop | Medium |
| **P1** | W-3 | Unthrottled raycasting every frame | CPU waste | Medium |
| **P1** | — | FloatingLinesBackground: No perf/motion guard | WebGL shader on all pages, no escape | Low |
| **P2** | W-8 | ScrollDrivenHero Canvas never stops | GPU waste after scroll-past | Medium |
| **P2** | M-5 | EffectsBrowser search overwrites type filter | Functional bug | Low |
| **P2** | M-3 | clearPreset doesn't reset settings | Stale visual state | Low |
| **P2** | M-4 | setPerformanceMode no-op | Broken feature | Medium |
| **P2** | M-11 | Global cursor:none without cleanup guard | Accessibility risk | Low |
| **P3** | W-5 | Below-fold sections animate on mount | Wasted animation, possible CLS | Low |
| **P3** | W-6 | Debug console.log in production | Log noise | Trivial |
| **P3** | M-7 | FPSMonitor RAF loop always running | Battery drain | Low |
| **P3** | M-8 | Resize handler not throttled | Resize spam | Low |
| **P3** | M-9 | Preset load: no deep equality check | Redundant re-renders | Low |

---

## 5. Prioritized Fix Plan

### Phase A — Critical (P0) — Do First

1. **Memoize EffectsContext value** — Wrap the `value` object in `useMemo` with all state dependencies. This single fix will eliminate the global re-render storm.

2. **Fix cursor effect listener cleanup** — Either:
   - Return a proper cleanup function from each cursor effect's `useEffect` that calls `removeEventListener` for the specific listeners added, OR
   - Refactor `MemoryManager` to support per-effect-run cleanup (not just per-component-unmount)

3. **Defer effect registration** — Replace `import '@/effects'` with a lazy/deferred registration pattern. Effects should register when their category is first accessed (e.g., when MotionStudio opens or when a preset references them).

### Phase B — High (P1) — Do Next

4. **Fix scroll listener deps** — Remove `scrollVh` from the `useEffect` dependency array in `ScrollDrivenHero`. Use a ref for scrollVh tracking and only call `setScrollVh` via `requestAnimationFrame` batching.

5. **Pool Vector3 objects** — Create reusable `THREE.Vector3` instances outside the `useFrame` callback. Reuse them each frame instead of allocating.

6. **Throttle raycasting** — Only run `raycaster.intersectObjects()` when the pointer has actually moved. Track pointer delta and skip raycast if delta is zero.

7. **Add guards to FloatingLinesBackground** — Check `prefersReducedMotion`, `isLowEndDevice`, and `isMobile` before rendering the WebGL shader.

### Phase C — Medium (P2) — Stabilize

8. Fix `clearPreset` to reset settings objects
9. Fix `EffectsBrowser` search to respect type filter
10. Wire `setPerformanceMode` to `PerfContext`
11. Add `key={activeBackgroundEffect}` to BackgroundLayer effect component
12. Add cleanup guard for cursor `cursor: none` injection
13. Add visibility-based cleanup for ScrollDrivenHero Canvas

### Phase D — Polish (P3) — Finalize

14. Add `IntersectionObserver`-based entrance animations for Welcome sections 2–3
15. Remove debug `console.log` statements or gate behind `NODE_ENV`
16. Add throttle to `useMobileOptimization` resize handler
17. Add deep equality check to `loadPreset`
18. Add on-demand mode for `useFPSMonitor` (only run when panel is visible)

---

*End of audit report. No code was modified.*
"
