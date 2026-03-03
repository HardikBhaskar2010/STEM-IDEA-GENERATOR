# Design Document: Advanced Particle Background System (NeuralStormCore v1)

## Overview

This design document specifies a simplified, high-performance architecture for transforming the current static particle background into a "neural storm from the future" experience. The system provides interactive particle visualization with real-time cursor interaction, three-layer parallax depth, visual effects (glow, blend modes), and subtle camera drift.

The implementation uses a single, powerful NeuralStormEngine that handles all particle logic, rendering, and interactions in one unified update/render loop. Reactbits is used as a math utility for particle initialization and connection calculations, but we maintain full control over rendering, interaction, and performance.

Key design goals:
- Maintain 30+ FPS on standard hardware with 240+ particles
- Single engine loop - no over-abstraction
- Brutal simplicity with maximum visual impact
- Seamless integration with existing effects architecture
- Ship strong defaults first, expose advanced controls later

## Architecture

### System Components

The system consists of two clean layers:

1. **AdvancedParticleBackground Component** (React Wrapper)
   - Canvas setup and resize handling
   - Lifecycle management (mount/unmount)
   - Settings propagation to engine
   - Respects reduced motion and performance modes
   - NO LOGIC - pure orchestration

2. **NeuralStormEngine** (Single Engine Core)
   - ONE update loop: drift → cursor forces → particles → connections → quality adjustment
   - ONE render loop: particles → connections
   - Handles all particle logic, interaction, rendering, and performance
   - Uses Reactbits as math utility only (initialization, connection calculations)

### Component Interaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    EffectsContext                           │
│  (Global state: activeBackgroundEffect, settings)           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          AdvancedParticleBackground Component               │
│  - Canvas setup                                             │
│  - Lifecycle (mount/unmount)                                │
│  - Settings → Engine                                        │
│  - Reduced motion check                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              NeuralStormEngine (SINGLE CORE)                │
│                                                             │
│  update(deltaTime) {                                        │
│    applyDrift()           // Subtle camera breathing        │
│    applyCursorForces()    // Repulsion/attraction/ripple    │
│    updateParticles()      // Position, velocity, layer      │
│    updateConnections()    // Distance-based lines           │
│    autoAdjustQuality()    // FPS < 30? Reduce load          │
│  }                                                          │
│                                                             │
│  render(ctx) {                                              │
│    drawParticles()        // With glow, layer depth         │
│    drawConnections()      // Distance-based opacity         │
│  }                                                          │
│                                                             │
│  Reactbits used as utility for:                            │
│  - Particle initialization                                  │
│  - Connection distance calculations                         │
│  WE control: rendering, interaction, performance            │
└─────────────────────────────────────────────────────────────┘
```

### Integration with Existing Architecture

- **EffectsRegistry**: Register as BackgroundEffect with id "advanced-particle-background"
- **EffectsContext**: Use existing state management for settings and activation
- **InspectorPanel**: Leverage existing dynamic control rendering via settingsSchema
- **PerformanceGuard**: Respect reduced motion preferences and performance modes

## Components and Interfaces

### AdvancedParticleBackground Component (React Wrapper)

```typescript
interface AdvancedParticleBackgroundProps extends BackgroundEffectComponentProps {
  settings: AdvancedParticleSettings;
  isActive: boolean;
}

interface AdvancedParticleSettings extends BackgroundEffectSettings {
  // Core settings (v1 - ship these first)
  particleCount: number;        // 240 default (3x current)
  particleSpeed: number;        // 0.5-3 range
  connectionDistance: number;   // 150px default
  
  // Cursor interaction
  interactionMode: 'repulsion' | 'attraction' | 'ripple' | 'none';
  interactionRadius: number;    // 200px default
  interactionStrength: number;  // 0-1 force multiplier
  
  // Visual effects
  enableGlow: boolean;          // Blur-based glow
  glowIntensity: number;        // 0-1
  blendMode: 'normal' | 'screen' | 'lighten' | 'add';
  
  // Camera drift
  enableDrift: boolean;
  
  // Performance
  adaptiveQuality: boolean;     // Auto-reduce quality if FPS drops
}
```

### NeuralStormEngine (Single Core)

```typescript
interface NeuralStormEngine {
  // Initialization
  constructor(canvas: HTMLCanvasElement, settings: AdvancedParticleSettings);
  destroy(): void;
  
  // Settings update
  updateSettings(settings: Partial<AdvancedParticleSettings>): void;
  
  // Main loops (called by React component)
  update(deltaTime: number): void;
  render(): void;
  
  // Internal state (private)
  private particles: Particle[];
  private connections: Connection[];
  private cursorPosition: Vector2 | null;
  private driftOffset: Vector2;
  private time: number;
  private fpsHistory: number[];
}

interface Particle {
  id: string;
  position: Vector2;
  velocity: Vector2;
  size: number;
  color: string;
  opacity: number;
  layer: 0 | 1 | 2;              // Depth layer
  speedMultiplier: number;       // Based on layer (0.5, 1.0, 1.5)
  sizeMultiplier: number;        // Based on layer (0.7, 1.0, 1.3)
  brightnessMultiplier: number;  // Based on layer (0.6, 1.0, 1.4)
  flickerSeed: number;           // For micro flicker effect
}

interface Connection {
  particleA: string;
  particleB: string;
  distance: number;
  opacity: number;  // Inversely proportional to distance
}

interface Vector2 {
  x: number;
  y: number;
}
```

### Engine Update Loop (Internal Logic)

```typescript
// Inside NeuralStormEngine.update(deltaTime)
update(deltaTime: number) {
  this.time += deltaTime;
  
  // 1. Apply subtle camera drift (breathing effect)
  if (this.settings.enableDrift) {
    this.driftOffset.x = Math.sin(this.time * 0.2) * 2;
    this.driftOffset.y = Math.cos(this.time * 0.15) * 2;
  }
  
  // 2. Apply cursor forces (repulsion/attraction/ripple)
  if (this.cursorPosition && this.settings.interactionMode !== 'none') {
    this.applyCursorForces();
  }
  
  // 3. Update all particles (position, velocity, flicker)
  this.updateParticles(deltaTime);
  
  // 4. Update connections (distance-based)
  this.updateConnections();
  
  // 5. Auto-adjust quality if FPS drops
  if (this.settings.adaptiveQuality) {
    this.autoAdjustQuality();
  }
}
```

### Engine Render Loop (Internal Logic)

```typescript
// Inside NeuralStormEngine.render()
render() {
  const ctx = this.canvas.getContext('2d');
  ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  
  // Apply camera drift offset
  ctx.save();
  ctx.translate(this.driftOffset.x, this.driftOffset.y);
  
  // 1. Draw particles (back-to-front by layer)
  const sortedParticles = this.particles.sort((a, b) => a.layer - b.layer);
  for (const particle of sortedParticles) {
    this.drawParticle(ctx, particle);
  }
  
  // 2. Draw connections
  for (const connection of this.connections) {
    this.drawConnection(ctx, connection);
  }
  
  ctx.restore();
}

// Glow effect using shadowBlur (cheap and effective)
drawParticle(ctx: CanvasRenderingContext2D, particle: Particle) {
  if (this.settings.enableGlow) {
    ctx.shadowBlur = this.settings.glowIntensity * 10;
    ctx.shadowColor = particle.color;
  }
  
  // Micro flicker for "alive" feeling
  const flicker = Math.sin(this.time + particle.flickerSeed) * 0.05;
  ctx.globalAlpha = particle.opacity * particle.brightnessMultiplier + flicker;
  
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(particle.position.x, particle.position.y, 
          particle.size * particle.sizeMultiplier, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}
```

## Data Models

### Particle Data Structure

```typescript
interface Particle {
  // Identity
  id: string;
  
  // Position and movement
  position: Vector2;
  velocity: Vector2;
  acceleration: Vector2;
  
  // Visual properties
  size: number;
  color: string;
  opacity: number;
  
  // Depth system
  layer: 0 | 1 | 2;
  
  // Connection tracking (optimization)
  connections: string[];        // IDs of connected particles
  lastConnectionUpdate: number; // Timestamp
}
```

### Connection Data Structure

```typescript
interface Connection {
  particleA: string;
  particleB: string;
  distance: number;
  opacity: number;  // Calculated from distance
}
```

### Ripple Data Structure

```typescript
interface Ripple {
  id: string;
  origin: Vector2;
  currentRadius: number;
  maxRadius: number;
  age: number;
  duration: number;
  strength: number;
}
```

### Settings Schema for Inspector (v1 - Trimmed)

```typescript
const advancedParticleSettingsSchema: EffectSettingsSchema = {
  particleCount: {
    type: 'range',
    label: 'Particle Count',
    defaultValue: 240,
    min: 80,
    max: 400,
    step: 20,
    description: '3x density for immersive experience'
  },
  particleSpeed: {
    type: 'range',
    label: 'Movement Speed',
    defaultValue: 1,
    min: 0.5,
    max: 3,
    step: 0.1
  },
  connectionDistance: {
    type: 'range',
    label: 'Connection Distance',
    defaultValue: 150,
    min: 50,
    max: 300,
    step: 10,
    description: 'Max distance for particle connections'
  },
  interactionMode: {
    type: 'select',
    label: 'Cursor Interaction',
    defaultValue: 'repulsion',
    options: [
      { value: 'none', label: 'None' },
      { value: 'repulsion', label: 'Repulsion' },
      { value: 'attraction', label: 'Attraction' },
      { value: 'ripple', label: 'Ripple' }
    ]
  },
  interactionRadius: {
    type: 'range',
    label: 'Interaction Radius',
    defaultValue: 200,
    min: 100,
    max: 400,
    step: 20
  },
  interactionStrength: {
    type: 'range',
    label: 'Interaction Strength',
    defaultValue: 0.5,
    min: 0,
    max: 1,
    step: 0.1
  },
  enableGlow: {
    type: 'boolean',
    label: 'Enable Glow Effect',
    defaultValue: true
  },
  glowIntensity: {
    type: 'range',
    label: 'Glow Intensity',
    defaultValue: 0.6,
    min: 0,
    max: 1,
    step: 0.1
  },
  blendMode: {
    type: 'select',
    label: 'Blend Mode',
    defaultValue: 'screen',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'screen', label: 'Screen' },
      { value: 'lighten', label: 'Lighten' },
      { value: 'add', label: 'Add' }
    ]
  },
  enableDrift: {
    type: 'boolean',
    label: 'Enable Camera Drift',
    defaultValue: true,
    description: 'Subtle breathing effect'
  },
  adaptiveQuality: {
    type: 'boolean',
    label: 'Adaptive Quality',
    defaultValue: true,
    description: 'Auto-reduce quality if FPS drops'
  }
};
```

## Visual Upgrade Layer

### Layer Design (Hardcoded Defaults)

```typescript
// Layer 0 (Background): Small, dim, slow
const LAYER_0_CONFIG = {
  speedMultiplier: 0.5,
  sizeMultiplier: 0.7,
  brightnessMultiplier: 0.6
};

// Layer 1 (Middle): Medium everything
const LAYER_1_CONFIG = {
  speedMultiplier: 1.0,
  sizeMultiplier: 1.0,
  brightnessMultiplier: 1.0
};

// Layer 2 (Foreground): Bigger, brighter, faster
const LAYER_2_CONFIG = {
  speedMultiplier: 1.5,
  sizeMultiplier: 1.3,
  brightnessMultiplier: 1.4
};
```

### Micro Flicker (Alive Feeling)

```typescript
// Each particle gets unique flicker seed on initialization
particle.flickerSeed = Math.random() * Math.PI * 2;

// In render loop:
const flicker = Math.sin(time + particle.flickerSeed) * 0.05;
particle.opacity = baseOpacity + flicker;
```

### Camera Drift (Breathing Effect)

```typescript
// Very subtle - user shouldn't consciously notice
const DRIFT_AMOUNT = 2; // pixels

driftOffset.x = Math.sin(time * 0.2) * DRIFT_AMOUNT;
driftOffset.y = Math.cos(time * 0.15) * DRIFT_AMOUNT;
```

### Adaptive Quality (Surgical Adjustments)

```typescript
// If avgFPS < 30 for 2 seconds:
if (avgFPS < 30) {
  // Reduce by 15% each time
  particleCount = Math.floor(particleCount * 0.85);
  connectionDistance = Math.floor(connectionDistance * 0.85);
  maxConnectionsPerParticle = Math.max(3, maxConnectionsPerParticle - 1);
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Minimum Particle Density

*For any* valid particle system configuration, the actual rendered particle count should be at least 3 times the baseline count (240 particles minimum when baseline is 80).

**Validates: Requirements 1.1**

### Property 2: Uniform Particle Distribution

*For any* viewport dimensions, particles should be dist