# Implementation Plan: NeuralStormCore v1

## Overview

This plan implements a brutal, simplified "neural storm from the future" particle background system. ONE engine loop. NO over-abstraction. Maximum visual impact with minimum code complexity.

The system uses a single NeuralStormEngine that handles all particle logic, rendering, and interactions in one unified update/render loop. Reactbits is used as a math utility only - we maintain full control over rendering, interaction, and performance.

Target: 240+ particles at 30+ FPS with cinematic depth, cursor interaction, and subtle camera drift.

## Phase 1: NeuralStormCore Engine

- [ ] 1. Create NeuralStormEngine core class
  - [x] 1.1 Set up engine file and basic structure
    - Create frontend/src/effects/background/NeuralStormEngine.ts
    - Define Vector2 interface for position/velocity
    - Define Particle interface with layer, multipliers, flickerSeed
    - Define Connection interface for particle connections
    - Define AdvancedParticleSettings interface
    - _Requirements: 1.1, 2.1, 5.1_
  
  - [x] 1.2 Implement engine constructor and initialization
    - Accept canvas and settings in constructor
    - Initialize 240 particles with uniform distribution
    - Assign particles to 3 layers (even split: 80/80/80)
    - Set layer multipliers (speed, size, brightness) based on layer
    - Assign random flicker seed to each particle
    - Initialize empty connections array
    - Initialize cursor position as null
    - Initialize drift offset to {x: 0, y: 0}
    - Initialize time to 0
    - Initialize FPS history array
    - _Requirements: 1.1, 1.3, 5.1, 5.2, 5.3, 5.4_
  
  - [x] 1.3 Implement destroy method
    - Clear particles array
    - Clear connections array
    - Reset all state
    - _Requirements: 10.1_

- [ ] 2. Implement engine update loop
  - [x] 2.1 Create main update method
    - Accept deltaTime parameter
    - Increment time by deltaTime
    - Call applyDrift() if enableDrift is true
    - Call applyCursorForces() if cursor exists and mode !== 'none'
    - Call updateParticles(deltaTime)
    - Call updateConnections()
    - Call autoAdjustQuality() if adaptiveQuality is true
    - _Requirements: 6.1, 7.1, 8.1, 9.1, 12.1_
  
  - [x] 2.2 Implement applyDrift method
    - Calculate drift offset using sin/cos with time
    - driftOffset.x = sin(time * 0.2) * 2
    - driftOffset.y = cos(time * 0.15) * 2
    - Keep drift subtle (2px max) - breathing effect
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 2.3 Implement applyCursorForces method
    - Loop through all particles
    - Calculate distance from particle to cursor
    - If distance < interactionRadius, apply force based on mode:
      - repulsion: push away (force decreases with distance)
      - attraction: pull toward (force increases with distance)
      - ripple: create expanding wave effect
    - Apply force to particle velocity
    - Smooth movement to avoid jitter (damping factor)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 8.1, 8.2, 8.3_
  
  - [x] 2.4 Implement updateParticles method
    - Loop through all particles
    - Update position based on velocity * speedMultiplier * deltaTime
    - Wrap particles around viewport edges (seamless looping)
    - Apply subtle random drift to velocity
    - _Requirements: 1.1, 5.2, 5.3, 5.4_
  
  - [x] 2.5 Implement updateConnections method
    - Clear connections array
    - Loop through particles (i)
    - For each particle, check distance to other particles (j > i)
    - If distance < connectionDistance, add connection
    - Calculate opacity inversely proportional to distance
    - Limit to max 5 connections per particle for performance
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 2.6 Implement autoAdjustQuality method
    - Record current frame time in FPS history (keep last 60 frames)
    - Calculate average FPS from history
    - If avgFPS < 30 for 2 seconds:
      - Reduce particleCount by 15% (min 80)
      - Reduce connectionDistance by 15% (min 50)
      - Reduce max connections per particle by 1 (min 3)
    - _Requirements: 1.2, 12.1, 12.2, 12.3_

- [ ] 3. Implement engine render loop
  - [x] 3.1 Create main render method
    - Get 2D context from canvas
    - Clear canvas
    - Save context state
    - Apply camera drift offset (translate)
    - Sort particles by layer (back-to-front: 0, 1, 2)
    - Call drawParticles()
    - Call drawConnections()
    - Restore context state
    - _Requirements: 4.1, 5.5, 9.1_
  
  - [x] 3.2 Implement drawParticles method
    - Loop through sorted particles
    - For each particle:
      - Calculate micro flicker: sin(time + flickerSeed) * 0.05
      - Set globalAlpha = opacity * brightnessMultiplier + flicker
      - If enableGlow, set shadowBlur and shadowColor
      - Set fillStyle to particle color
      - Draw circle at position with size * sizeMultiplier
      - Reset shadowBlur to 0
    - _Requirements: 3.1, 4.1, 4.2, 4.3, 5.5_
  
  - [x] 3.3 Implement drawConnections method
    - Loop through connections
    - For each connection:
      - Get particleA and particleB positions
      - Set strokeStyle with connection opacity
      - Draw line between particles
    - _Requirements: 2.1, 2.3_
  
  - [x] 3.4 Apply blend mode to canvas
    - Set canvas.style.mixBlendMode based on settings.blendMode
    - Apply once on canvas element (not in render loop)
    - _Requirements: 4.2_

- [ ] 4. Implement settings update
  - [x] 4.1 Create updateSettings method
    - Accept partial settings object
    - Merge with current settings
    - If particleCount changed, reinitialize particles
    - If connectionDistance changed, update connection threshold
    - If interactionMode/radius/strength changed, update interaction config
    - If blendMode changed, update canvas style
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [x] 4.2 Implement cursor position tracking
    - Add setCursorPosition(position: Vector2 | null) method
    - Store cursor position in engine state
    - Used by applyCursorForces in update loop
    - _Requirements: 6.1, 7.1, 8.1_

- [x] 5. Checkpoint - Engine validation
  - Test engine initialization with 240 particles
  - Test update loop runs without errors
  - Test render loop draws particles and connections
  - Test cursor interaction (repulsion/attraction)
  - Test adaptive quality reduces load when FPS drops
  - Ask the user if questions arise

## Phase 2: React Component Integration

- [ ] 6. Create AdvancedParticleBackground React component
  - [x] 6.1 Create component file and basic structure
    - Create frontend/src/effects/background/AdvancedParticleBackground.tsx
    - Import NeuralStormEngine
    - Define component props (extends BackgroundEffectComponentProps)
    - Set up canvas ref
    - Set up engine state (useRef to hold engine instance)
    - _Requirements: 10.1, 10.4_
  
  - [x] 6.2 Implement component lifecycle
    - On mount (useEffect):
      - Get canvas element from ref
      - Create new NeuralStormEngine(canvas, settings)
      - Start animation loop with requestAnimationFrame
      - Add mousemove listener to track cursor position
    - On unmount:
      - Cancel animation frame
      - Remove mousemove listener
      - Call engine.destroy()
    - _Requirements: 10.1, 10.2_
  
  - [x] 6.3 Implement animation loop
    - Calculate deltaTime from previous frame
    - Call engine.update(deltaTime)
    - Call engine.render()
    - Request next frame
    - _Requirements: 1.2, 6.3, 9.1_
  
  - [x] 6.4 Implement cursor tracking
    - On mousemove event:
      - Get mouse position relative to canvas
      - Call engine.setCursorPosition(position)
    - On mouseleave event:
      - Call engine.setCursorPosition(null)
    - _Requirements: 6.1, 7.1, 8.1_
  
  - [x] 6.5 Implement settings propagation
    - Watch settings prop with useEffect
    - When settings change, call engine.updateSettings(settings)
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [x] 6.6 Implement reduced motion support
    - Check prefers-reduced-motion media query
    - If reduced motion preferred:
      - Disable drift
      - Disable cursor interaction
      - Reduce particle speed to 0.2
    - _Requirements: 1.2_
  
  - [x] 6.7 Implement canvas setup and resize
    - Set canvas dimensions to match container
    - Add resize listener to update canvas size
    - Call engine.updateSettings with new dimensions
    - _Requirements: 1.1, 1.3_

- [ ] 7. Define settings schema for inspector
  - [x] 7.1 Create settings schema object
    - Define particleCount control (80-400, default 240)
    - Define particleSpeed control (0.5-3, default 1)
    - Define connectionDistance control (50-300, default 150)
    - Define interactionMode select (none/repulsion/attraction/ripple)
    - Define interactionRadius control (100-400, default 200)
    - Define interactionStrength control (0-1, default 0.5)
    - Define enableGlow toggle (default true)
    - Define glowIntensity control (0-1, default 0.6)
    - Define blendMode select (normal/screen/lighten/add, default screen)
    - Define enableDrift toggle (default true)
    - Define adaptiveQuality toggle (default true)
    - _Requirements: 11.1, 11.2_

- [ ] 8. Register effect with effects system
  - [x] 8.1 Create effect registration object
    - Define effect metadata:
      - id: "advanced-particle-background"
      - name: "Neural Storm"
      - description: "Interactive particle system with depth and cursor interaction"
      - tags: ["particles", "interactive", "3d-depth"]
    - Set performanceModes to ["medium", "high"]
    - Set heavyLoad to true for lazy loading
    - Link component and settings schema
    - Define default settings
    - _Requirements: 10.3, 10.4_
  
  - [x] 8.2 Register with EffectsRegistry
    - Call effectsRegistry.register() with effect object
    - Export effect as default
    - Add to frontend/src/effects/background/index.ts
    - _Requirements: 10.3, 10.4_

- [-] 9. Checkpoint - Full system validation
  - Test effect appears in inspector
  - Test effect activates and renders 240 particles
  - Test all inspector controls update in real-time
  - Test cursor repulsion/attraction/ripple modes
  - Test glow effect and blend modes
  - Test camera drift (subtle breathing)
  - Test adaptive quality reduces load when needed
  - Verify 30+ FPS on standard hardware
  - Ask the user if questions arise

## Phase 3: Performance Optimization (Optional)

- [ ]* 10. Add spatial partitioning for connections
  - Implement grid-based spatial partitioning
  - Only check connections within same/adjacent grid cells
  - Reduces O(n²) to O(n) for connection calculations
  - _Requirements: 1.2, 2.4_

- [ ]* 11. Add object pooling for particles
  - Reuse particle objects instead of creating new ones
  - Reduces garbage collection overhead
  - _Requirements: 1.2_

- [ ]* 12. Add off-screen culling
  - Don't render particles outside viewport
  - Reduces draw calls
  - _Requirements: 1.2, 4.3_

## Phase 4: UI Atmosphere (Future Enhancement)

- [ ]* 13. Add sidebar particle animation
  - Create simplified version with 30-50 particles
  - Sync visual style with main system
  - Integrate with sidebar component
  - _Requirements: 13.1, 13.2, 13.3_

- [ ]* 14. Add glow border for selected effect
  - Add glow styling to selected effect in inspector
  - Animate on selection change
  - _Requirements: 14.1, 14.2, 14.3_

- [ ]* 15. Add animated tab indicator
  - Animate tab indicator with 300ms duration
  - Use easing for smooth motion
  - _Requirements: 15.1, 15.2, 15.3_

- [ ]* 16. Add inspector panel slide animation
  - Use spring physics for panel open/close
  - Complete within 500ms
  - _Requirements: 16.1, 16.2, 16.3_

- [ ]* 17. Add ambient background light
  - Create radial gradient layer behind canvas
  - Set opacity 10-30% for subtle effect
  - _Requirements: 17.1, 17.2, 17.3_

## Notes

- Tasks marked with `*` are optional for v1 MVP
- Focus on Phase 1 & 2 first - get the core engine brutal and fast
- Phase 3 optimizations only if needed (target is already 30+ FPS)
- Phase 4 UI atmosphere is polish for later
- Each task references requirements for traceability
- Checkpoints ensure validation at key milestones
- ONE engine loop. NO over-abstraction. Maximum impact.
