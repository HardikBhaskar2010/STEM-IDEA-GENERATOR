/**
 * NeuralStormEngine - Core particle system engine
 * 
 * Single unified engine for advanced particle background with:
 * - Three-layer parallax depth system
 * - Real-time cursor interaction (repulsion/attraction/ripple)
 * - Connection lines between nearby particles
 * - Glow effects and blend modes
 * - Subtle camera drift
 * - Adaptive quality management
 */

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * 2D vector for position and velocity calculations
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Individual particle entity with depth layer support
 */
export interface Particle {
  id: string;
  position: Vector2;
  velocity: Vector2;
  size: number;
  color: string;
  opacity: number;
  layer: 0 | 1 | 2;              // Depth layer (0=back, 1=middle, 2=front)
  speedMultiplier: number;       // Based on layer (0.5, 1.0, 1.5)
  sizeMultiplier: number;        // Based on layer (0.7, 1.0, 1.3)
  brightnessMultiplier: number;  // Based on layer (0.6, 1.0, 1.4)
  flickerSeed: number;           // For micro flicker effect
}

/**
 * Connection line between two particles
 */
export interface Connection {
  particleA: string;
  particleB: string;
  distance: number;
  opacity: number;  // Inversely proportional to distance
}

/**
 * Configuration settings for the particle system
 */
export interface AdvancedParticleSettings {
  // Core settings
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

// ============================================================================
// Engine Class
// ============================================================================

/**
 * NeuralStormEngine - Single core engine for particle system
 * 
 * Handles all particle logic, rendering, and interactions in one unified loop.
 * Uses Reactbits as math utility for initialization and connection calculations.
 */
export class NeuralStormEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private settings: AdvancedParticleSettings;
  
  // Internal state
  private particles: Particle[] = [];
  private connections: Connection[] = [];
  private cursorPosition: Vector2 | null = null;
  private driftOffset: Vector2 = { x: 0, y: 0 };
  private time: number = 0;
  private fpsHistory: number[] = [];
  private maxConnectionsPerParticle: number = 5;
  private lowFpsStartTime: number | null = null;
  
  constructor(canvas: HTMLCanvasElement, settings: AdvancedParticleSettings) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;
    this.settings = settings;
    
    // Apply blend mode to canvas element
    this.applyBlendMode();
    
    // Initialize particles with uniform distribution
    this.initializeParticles();
  }
  
  /**
   * Initialize particles with uniform distribution across viewport
   * Assigns particles to 3 layers with even split (80/80/80 for 240 particles)
   */
  private initializeParticles(): void {
    this.particles = [];
    const particlesPerLayer = Math.floor(this.settings.particleCount / 3);
    
    // Layer configuration
    const layerConfigs = [
      { layer: 0 as const, speed: 0.5, size: 0.7, brightness: 0.6 },  // Background
      { layer: 1 as const, speed: 1.0, size: 1.0, brightness: 1.0 },  // Middle
      { layer: 2 as const, speed: 1.5, size: 1.3, brightness: 1.4 },  // Foreground
    ];
    
    for (let layerIndex = 0; layerIndex < 3; layerIndex++) {
      const config = layerConfigs[layerIndex];
      const particleCount = layerIndex === 2 
        ? this.settings.particleCount - (particlesPerLayer * 2)  // Remaining particles go to last layer
        : particlesPerLayer;
      
      for (let i = 0; i < particleCount; i++) {
        const particle: Particle = {
          id: `particle-${layerIndex}-${i}`,
          position: {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
          },
          velocity: {
            x: (Math.random() - 0.5) * this.settings.particleSpeed,
            y: (Math.random() - 0.5) * this.settings.particleSpeed,
          },
          size: 2,  // Base size
          color: '#ffffff',  // Default white color
          opacity: 0.8,
          layer: config.layer,
          speedMultiplier: config.speed,
          sizeMultiplier: config.size,
          brightnessMultiplier: config.brightness,
          flickerSeed: Math.random() * Math.PI * 2,
        };
        
        this.particles.push(particle);
      }
    }
  }

  /**
   * Clean up resources and reset all state
   */
  destroy(): void {
    // Clear arrays
    this.particles = [];
    this.connections = [];
    
    // Reset all state
    this.cursorPosition = null;
    this.driftOffset = { x: 0, y: 0 };
    this.time = 0;
    this.fpsHistory = [];
  }

  /**
   * Apply blend mode to canvas element
   * Called once on initialization and when blend mode setting changes
   */
  private applyBlendMode(): void {
    this.canvas.style.mixBlendMode = this.settings.blendMode;
  }

  /**
   * Update settings dynamically
   * Handles changes to particle count, connection distance, interaction config, and blend mode
   */
  updateSettings(settings: Partial<AdvancedParticleSettings>): void {
    const previousParticleCount = this.settings.particleCount;
    const previousBlendMode = this.settings.blendMode;
    
    // Merge with current settings
    this.settings = { ...this.settings, ...settings };
    
    // If particleCount changed, reinitialize particles
    if (settings.particleCount !== undefined && settings.particleCount !== previousParticleCount) {
      this.initializeParticles();
    }
    
    // If connectionDistance changed, update connection threshold
    // (automatically handled by merge above - updateConnections uses this.settings.connectionDistance)
    
    // If interactionMode/radius/strength changed, update interaction config
    // (automatically handled by merge above - applyCursorForces uses these settings)
    
    // If blendMode changed, update canvas style
    if (settings.blendMode !== undefined && settings.blendMode !== previousBlendMode) {
      this.applyBlendMode();
    }
  }
  
  /**
   * Set cursor position for interaction
   */
  setCursorPosition(position: Vector2 | null): void {
    this.cursorPosition = position;
  }

  /**
   * Main update loop - called every frame
   * Updates particle positions, connections, and applies forces
   */
  update(deltaTime: number): void {
    this.time += deltaTime;
    
    // 1. Apply subtle camera drift (breathing effect)
    if (this.settings.enableDrift) {
      this.applyDrift();
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
      this.autoAdjustQuality(deltaTime);
    }
  }
  
  /**
   * Apply subtle camera drift for breathing effect
   * Creates a gentle "breathing" motion using sinusoidal functions
   */
  private applyDrift(): void {
    // Calculate drift offset using sin/cos with time
    // Keep drift subtle (2px max) - breathing effect
    this.driftOffset.x = Math.sin(this.time * 0.2) * 2;
    this.driftOffset.y = Math.cos(this.time * 0.15) * 2;
  }
  
  /**
   * Apply cursor forces (repulsion/attraction/ripple)
   * Implements three interaction modes:
   * - repulsion: Pushes particles away from cursor (force decreases with distance)
   * - attraction: Pulls particles toward cursor (force increases with distance)
   * - ripple: Creates expanding wave effect from cursor
   */
  private applyCursorForces(): void {
    if (!this.cursorPosition) return;
    
    const { interactionRadius, interactionStrength, interactionMode } = this.settings;
    const dampingFactor = 0.95; // Smooth movement to avoid jitter
    
    for (const particle of this.particles) {
      // Calculate distance from particle to cursor
      const dx = particle.position.x - this.cursorPosition.x;
      const dy = particle.position.y - this.cursorPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Only apply force if within interaction radius
      if (distance < interactionRadius && distance > 0) {
        // Normalized direction vector
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        let forceX = 0;
        let forceY = 0;
        
        switch (interactionMode) {
          case 'repulsion': {
            // Push away - force decreases with distance
            // Stronger when closer to cursor
            const forceMagnitude = (1 - distance / interactionRadius) * interactionStrength * 2;
            forceX = dirX * forceMagnitude;
            forceY = dirY * forceMagnitude;
            break;
          }
          
          case 'attraction': {
            // Pull toward - force increases with distance
            // Stronger when farther from cursor (up to radius boundary)
            const forceMagnitude = (distance / interactionRadius) * interactionStrength * 2;
            forceX = -dirX * forceMagnitude;
            forceY = -dirY * forceMagnitude;
            break;
          }
          
          case 'ripple': {
            // Create expanding wave effect
            // Use time-based ripple that pushes particles outward in waves
            const ripplePhase = (this.time * 2) % (Math.PI * 2);
            const rippleStrength = Math.sin(ripplePhase + distance * 0.05);
            const forceMagnitude = rippleStrength * interactionStrength * 1.5;
            forceX = dirX * forceMagnitude;
            forceY = dirY * forceMagnitude;
            break;
          }
        }
        
        // Apply force to particle velocity with damping
        particle.velocity.x += forceX;
        particle.velocity.y += forceY;
        
        // Apply damping factor to smooth movement and avoid jitter
        particle.velocity.x *= dampingFactor;
        particle.velocity.y *= dampingFactor;
      }
    }
  }
  
  /**
   * Update all particles (position, velocity, flicker)
   * Updates particle positions based on velocity, wraps around viewport edges,
   * and applies subtle random drift to velocity for organic movement
   */
  private updateParticles(deltaTime: number): void {
    for (const particle of this.particles) {
      // Update position based on velocity * speedMultiplier * deltaTime
      particle.position.x += particle.velocity.x * particle.speedMultiplier * deltaTime;
      particle.position.y += particle.velocity.y * particle.speedMultiplier * deltaTime;
      
      // Wrap particles around viewport edges (seamless looping)
      if (particle.position.x < 0) {
        particle.position.x = this.canvas.width;
      } else if (particle.position.x > this.canvas.width) {
        particle.position.x = 0;
      }
      
      if (particle.position.y < 0) {
        particle.position.y = this.canvas.height;
      } else if (particle.position.y > this.canvas.height) {
        particle.position.y = 0;
      }
      
      // Apply subtle random drift to velocity for organic movement
      // Small random adjustments to create natural, unpredictable motion
      const driftAmount = 0.02;
      particle.velocity.x += (Math.random() - 0.5) * driftAmount;
      particle.velocity.y += (Math.random() - 0.5) * driftAmount;
      
      // Clamp velocity to prevent particles from moving too fast
      const maxVelocity = this.settings.particleSpeed * 2;
      const velocityMagnitude = Math.sqrt(
        particle.velocity.x * particle.velocity.x + 
        particle.velocity.y * particle.velocity.y
      );
      
      if (velocityMagnitude > maxVelocity) {
        const scale = maxVelocity / velocityMagnitude;
        particle.velocity.x *= scale;
        particle.velocity.y *= scale;
      }
    }
  }
  
  /**
   * Update connections between nearby particles
   * Creates connection lines between particles within connectionDistance
   * Limits to max 5 connections per particle for performance
   */
  private updateConnections(): void {
    // Clear existing connections
    this.connections = [];
    
    const { connectionDistance } = this.settings;
    const maxConnectionsPerParticle = this.maxConnectionsPerParticle;
    
    // Track connection count per particle for performance limit
    const connectionCounts = new Map<string, number>();
    
    // Loop through particles (i)
    for (let i = 0; i < this.particles.length; i++) {
      const particleA = this.particles[i];
      
      // Skip if this particle already has max connections
      if ((connectionCounts.get(particleA.id) || 0) >= maxConnectionsPerParticle) {
        continue;
      }
      
      // Check distance to other particles (j > i to avoid duplicate connections)
      for (let j = i + 1; j < this.particles.length; j++) {
        const particleB = this.particles[j];
        
        // Skip if particleB already has max connections
        if ((connectionCounts.get(particleB.id) || 0) >= maxConnectionsPerParticle) {
          continue;
        }
        
        // Calculate distance between particles
        const dx = particleA.position.x - particleB.position.x;
        const dy = particleA.position.y - particleB.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If distance < connectionDistance, add connection
        if (distance < connectionDistance) {
          // Calculate opacity inversely proportional to distance
          // Closer particles = higher opacity (1.0), farther = lower opacity (0.0)
          const opacity = 1 - (distance / connectionDistance);
          
          // Create connection
          const connection: Connection = {
            particleA: particleA.id,
            particleB: particleB.id,
            distance,
            opacity,
          };
          
          this.connections.push(connection);
          
          // Update connection counts
          connectionCounts.set(particleA.id, (connectionCounts.get(particleA.id) || 0) + 1);
          connectionCounts.set(particleB.id, (connectionCounts.get(particleB.id) || 0) + 1);
          
          // Break if particleA reached max connections
          if ((connectionCounts.get(particleA.id) || 0) >= maxConnectionsPerParticle) {
            break;
          }
        }
      }
    }
  }

  
  /**
   * Auto-adjust quality if FPS drops
   * To be implemented in task 2.6
   */
  private autoAdjustQuality(deltaTime: number): void {
    // Calculate current FPS from deltaTime
    // deltaTime is in seconds, so FPS = 1 / deltaTime
    const currentFPS = deltaTime > 0 ? 1 / deltaTime : 60;
    
    // Record current frame time in FPS history (keep last 60 frames)
    this.fpsHistory.push(currentFPS);
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift(); // Remove oldest frame
    }
    
    // Need at least 60 frames to calculate average
    if (this.fpsHistory.length < 60) {
      return;
    }
    
    // Calculate average FPS from history
    const avgFPS = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
    
    // Check if avgFPS < 30
    if (avgFPS < 30) {
      // Track how long FPS has been low
      if (this.lowFpsStartTime === null) {
        this.lowFpsStartTime = this.time;
      }
      
      // Check if low FPS has persisted for 2 seconds
      const lowFpsDuration = this.time - this.lowFpsStartTime;
      if (lowFpsDuration >= 2) {
        // Reduce particleCount by 15% (min 80)
        const newParticleCount = Math.max(80, Math.floor(this.settings.particleCount * 0.85));
        
        // Reduce connectionDistance by 15% (min 50)
        const newConnectionDistance = Math.max(50, Math.floor(this.settings.connectionDistance * 0.85));
        
        // Reduce max connections per particle by 1 (min 3)
        const newMaxConnections = Math.max(3, this.maxConnectionsPerParticle - 1);
        
        // Apply adjustments
        this.settings.particleCount = newParticleCount;
        this.settings.connectionDistance = newConnectionDistance;
        this.maxConnectionsPerParticle = newMaxConnections;
        
        // Reinitialize particles with new count
        this.initializeParticles();
        
        // Reset low FPS timer
        this.lowFpsStartTime = null;
        
        // Clear FPS history to get fresh measurements after adjustment
        this.fpsHistory = [];
      }
    } else {
      // FPS is good, reset low FPS timer
      this.lowFpsStartTime = null;
    }
  }

  /**
   * Main render loop - called every frame
   * Draws particles and connections to canvas
   */
  render(): void {
      // Get 2D context from canvas
      const ctx = this.ctx;

      // Clear canvas
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Save context state
      ctx.save();

      // Apply camera drift offset (translate)
      ctx.translate(this.driftOffset.x, this.driftOffset.y);

      // Sort particles by layer (back-to-front: 0, 1, 2)
      const sortedParticles = [...this.particles].sort((a, b) => a.layer - b.layer);

      // Call drawParticles()
      this.drawParticles(sortedParticles);

      // Call drawConnections()
      this.drawConnections();

      // Restore context state
      ctx.restore();
    }

    private drawParticles(particles: Particle[]): void {
        const ctx = this.ctx;

        // Loop through sorted particles
        for (const particle of particles) {
          // Calculate micro flicker: sin(time + flickerSeed) * 0.05
          const flicker = Math.sin(this.time + particle.flickerSeed) * 0.05;

          // Set globalAlpha = opacity * brightnessMultiplier + flicker
          ctx.globalAlpha = particle.opacity * particle.brightnessMultiplier + flicker;

          // If enableGlow, set shadowBlur and shadowColor
          if (this.settings.enableGlow) {
            ctx.shadowBlur = this.settings.glowIntensity * 10;
            ctx.shadowColor = particle.color;
          }

          // Set fillStyle to particle color
          ctx.fillStyle = particle.color;

          // Draw circle at position with size * sizeMultiplier
          ctx.beginPath();
          ctx.arc(
            particle.position.x,
            particle.position.y,
            particle.size * particle.sizeMultiplier,
            0,
            Math.PI * 2
          );
          ctx.fill();

          // Reset shadowBlur to 0
          ctx.shadowBlur = 0;
        }

        // Reset globalAlpha to 1
        ctx.globalAlpha = 1;
      }


    private drawConnections(): void {
      // Loop through all connections
      for (const connection of this.connections) {
        // Get particleA and particleB by ID
        const particleA = this.particles.find(p => p.id === connection.particleA);
        const particleB = this.particles.find(p => p.id === connection.particleB);
        
        // Skip if either particle not found
        if (!particleA || !particleB) continue;
        
        // Set strokeStyle with connection opacity
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${connection.opacity})`;
        this.ctx.lineWidth = 1;
        
        // Draw line between particles
        this.ctx.beginPath();
        this.ctx.moveTo(particleA.position.x, particleA.position.y);
        this.ctx.lineTo(particleB.position.x, particleB.position.y);
        this.ctx.stroke();
      }
    }

}
