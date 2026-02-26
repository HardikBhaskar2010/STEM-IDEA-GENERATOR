# 🎮 3D Scroll Engine Implementation Plan (V2)

## 📋 Overview

**Status**: 🟡 READY FOR IMPLEMENTATION
**Philosophy**: Clean rewrite. No legacy compatibility. Pure evolution.
**Author**: Luna (Hardik Bhaskar)
**Version**: 2.0 – Performance-Refined Architecture

**Objective**: Replace the frame-based cinematic hero with a real-time 3D scroll-driven system using React Three Fiber and Framer Motion, optimized for performance, scalability, and long-term product growth.

---

# 🎯 Strategic Vision

## What We're Building

A scroll-controlled 3D environment that feels like **entering a creative universe** — subtle, intentional, premium.

### Core Principles

* Subtle motion > Flashy motion
* Restraint-driven animation
* Scroll = timeline scrub
* 60fps performance target
* Mobile-aware degradation
* Brand-aligned aesthetic
* Minimal React re-renders

---

# 🔁 Migration Philosophy

## What We're Removing

* Frame-based animation system
* useScrollFrameAnimation hook
* 120 WebP frame assets
* Canvas image swapping logic
* Any legacy redirect animation coupling

## Why We Are Migrating

* Reduce asset payload (~30MB → near zero asset cost)
* Eliminate preload complexity
* Gain real-time animation control
* Improve scalability
* Enable infinite design iteration

---

# 📦 Technology Stack

## Core Dependencies

* @react-three/fiber
* @react-three/drei
* three
* framer-motion

## Rationale

React Three Fiber:

* Declarative 3D in React
* High-performance render loop
* Mature ecosystem

Drei:

* Reduces boilerplate
* Provides helpers & abstractions

Framer Motion:

* Smooth UI overlay transitions
* Declarative animation model

---

# 🏗️ Architecture Design

## File Structure

```
/app/frontend/src/
├── components/
│   ├── ThreeHeroScene.tsx
│   ├── ScrollDrivenHero.tsx
│   └── ui/
│       └── AnimatedHeroOverlay.tsx
├── hooks/
│   └── useScrollProgress.ts
└── pages/
    └── Welcome.tsx
```

## Separation of Concerns

| Component           | Responsibility                       |
| ------------------- | ------------------------------------ |
| ScrollDrivenHero    | 300vh container, scroll math binding |
| ThreeHeroScene      | 3D objects, lighting, camera logic   |
| AnimatedHeroOverlay | UI animations & fade logic           |
| useScrollProgress   | Scroll normalization logic           |

---

# ⚡ Performance Architecture Refinement

## Critical Improvement: Avoid React Re-renders on Scroll

Instead of updating scrollProgress using React state on every scroll tick:

* Store scroll progress in a `useRef`
* Update the ref inside scroll handler
* Read the ref inside `useFrame`

This prevents:

* 60 re-renders per second
* Layout thrashing
* Jitter

### Pattern

```
const scrollProgressRef = useRef(0);
```

Inside scroll handler:

```
scrollProgressRef.current = calculatedProgress;
```

Inside useFrame:

```
const progress = scrollProgressRef.current;
```

---

# 🎨 Scene Design Specification

## Aesthetic Direction

Stylized floating block world:

* Clean
* Game-inspired
* Controlled vibrancy
* Not chaotic
* Not hyper-realistic

## Object Mix (Intentional)

### Cubes

* 5–7 floating blocks
* Varied size & depth
* Subtle metalness

### Spheres

* 2–3 soft contrast shapes
* Gentle scale breathing

### Torus Rings

* 1–2 depth cues
* Semi-transparent accent

---

# 🎨 Brand Color System

```
Primary: #8B5CF6
Secondary: #3B82F6
Accent: #EC4899
Highlight: #A78BFA
Soft: #C4B5FD
```

Assignments:

* Cubes: primary/secondary/accent
* Spheres: highlight/soft
* Torus: accent @ 60% opacity
* Ambient lighting: soft tone

---

# 💡 Lighting Strategy

Ambient Light (global softness)
Directional Light (main key light)
Point Light (brand accent fill)

Shadows enabled on desktop only.
Reduced shadow map size on mobile.

---

# 🎯 Scroll Mapping Logic

## Scroll Height

300vh (balanced pacing)

## Animation Mapping

Camera Movement:

* Z: 8 → 5
* Y: +0.5 max
* Slight tilt

Scene Rotation:

* Y rotation: 0 → 0.3π
* X rotation: subtle sine wave

Object Motion:

* Max scale shift: ±10%
* Max rotation: 180°

---

# 🌊 Motion Restraint Rules

| Property         | Maximum   |
| ---------------- | --------- |
| Camera Z shift   | 3 units   |
| Camera Y shift   | 0.5 units |
| Scene Y rotation | 54°       |
| Object scale     | ±10%      |

Restraint prevents:

* Motion sickness
* Visual fatigue
* Cheap animation feel

---

# 🎨 UI Overlay System

AnimatedHeroOverlay responsibilities:

* Headline fade-in
* Subheadline stagger
* Scroll indicator bounce
* Opacity fade tied to scroll progress

Overlay opacity logic:

```
opacity = 1 - scrollProgress
```

---

# 📱 Responsive Strategy

Mobile (<768px):

* Fewer objects
* Lower shadow resolution
* Reduced geometry detail

Tablet:

* Medium density

Desktop:

* Full scene

Respect `prefers-reduced-motion`.

---

# 🧪 Testing Checklist

Visual:

* No jitter
* Smooth interpolation
* Overlay sync accurate

Performance:

* 60fps desktop
* 30fps+ mobile
* No memory leaks

Accessibility:

* Reduced motion fallback
* Keyboard navigation intact

---

# 🚀 Implementation Phases

1. Remove legacy files
2. Install dependencies
3. Implement useScrollProgress (ref-based)
4. Build ThreeHeroScene
5. Build ScrollDrivenHero wrapper
6. Add AnimatedHeroOverlay
7. Optimize performance
8. Test across devices
9. Update documentation

Estimated Time: 6–8 focused hours

---

# 🧹 Cleanup Checklist

* Remove ScrollCinematicHero.tsx
* Remove useScrollFrameAnimation.ts
* Remove frames folder
* Update Welcome.tsx imports
* Update previous implementation documentation

---

# 🏁 Final Outcome

The Welcome page becomes:

* Experience-first
* Real-time interactive
* Lightweight
* Scalable
* Technically impressive
* Emotionally intentional

This is no longer an animation.

This is a render engine for brand identity.

---

**Last Updated**: January 2026
**Version**: 2.0
**Author**: Luna
**Status**: Awaiting Execution Credits
