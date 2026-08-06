/**
 * Particle System Utilities
 * Helpers for creating and managing energy particles
 */

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  lifetime: number;
  age: number;
}

export interface ParticleSystemConfig {
  maxParticles: number;
  spawnRate: number;  // particles per second
  minSize: number;
  maxSize: number;
  minLifetime: number;  // milliseconds
  maxLifetime: number;
  colors: string[];
  velocity: { min: number; max: number };
}

export const DEFAULT_PARTICLE_CONFIG: ParticleSystemConfig = {
  maxParticles: 50,
  spawnRate: 5,
  minSize: 2,
  maxSize: 6,
  minLifetime: 2000,
  maxLifetime: 4000,
  colors: [
    'hsl(270, 100%, 65%)',  // Purple
    'hsl(210, 100%, 60%)',  // Blue
    'hsl(180, 100%, 50%)',  // Cyan
  ],
  velocity: { min: 0.5, max: 2 },
};

/**
 * Generate random value between min and max
 */
const random = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

/**
 * Generate random color from array
 */
const randomColor = (colors: string[]): string => {
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Create a new particle
 */
export const createParticle = (
  x: number,
  y: number,
  config: Partial<ParticleSystemConfig> = {}
): Particle => {
  const cfg = { ...DEFAULT_PARTICLE_CONFIG, ...config };

  return {
    id: Math.random().toString(36).substr(2, 9),
    x,
    y,
    vx: random(-cfg.velocity.max, cfg.velocity.max),
    vy: random(-cfg.velocity.max, cfg.velocity.max),
    size: random(cfg.minSize, cfg.maxSize),
    opacity: 1,
    color: randomColor(cfg.colors),
    lifetime: random(cfg.minLifetime, cfg.maxLifetime),
    age: 0,
  };
};

/**
 * Update particle position and lifetime
 */
export const updateParticle = (
  particle: Particle,
  deltaTime: number
): Particle => {
  const age = particle.age + deltaTime;
  const progress = age / particle.lifetime;

  return {
    ...particle,
    x: particle.x + particle.vx * deltaTime * 0.1,
    y: particle.y + particle.vy * deltaTime * 0.1,
    opacity: Math.max(0, 1 - progress),  // Fade out over lifetime
    age,
  };
};

/**
 * Check if particle is still alive
 */
export const isParticleAlive = (particle: Particle): boolean => {
  return particle.age < particle.lifetime;
};

/**
 * Particle system manager
 */
export class ParticleManager {
  private particles: Particle[] = [];
  private config: ParticleSystemConfig;
  private lastSpawnTime = 0;
  private isRunning = false;
  private animationFrameId: number | null = null;

  constructor(config: Partial<ParticleSystemConfig> = {}) {
    this.config = { ...DEFAULT_PARTICLE_CONFIG, ...config };
  }

  /**
   * Add particle at specific position
   */
  spawn(x: number, y: number): void {
    if (this.particles.length < this.config.maxParticles) {
      this.particles.push(createParticle(x, y, this.config));
    }
  }

  /**
   * Update all particles
   */
  update(deltaTime: number): Particle[] {
    // Update existing particles
    this.particles = this.particles
      .map((p) => updateParticle(p, deltaTime))
      .filter(isParticleAlive);

    return this.particles;
  }

  /**
   * Get all active particles
   */
  getParticles(): Particle[] {
    return this.particles;
  }

  /**
   * Clear all particles
   */
  clear(): void {
    this.particles = [];
  }

  /**
   * Start automatic particle spawning
   */
  start(spawnArea: { x: number; y: number; width: number; height: number }): void {
    this.isRunning = true;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      if (!this.isRunning) {return;}

      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Spawn new particles
      const spawnInterval = 1000 / this.config.spawnRate;
      if (currentTime - this.lastSpawnTime > spawnInterval) {
        const x = spawnArea.x + Math.random() * spawnArea.width;
        const y = spawnArea.y + Math.random() * spawnArea.height;
        this.spawn(x, y);
        this.lastSpawnTime = currentTime;
      }

      // Update particles
      this.update(deltaTime);

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stop automatic spawning
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Destroy particle system
   */
  destroy(): void {
    this.stop();
    this.clear();
  }
}

/**
 * Create particle burst effect at position
 */
export const createParticleBurst = (
  x: number,
  y: number,
  count: number = 10,
  config: Partial<ParticleSystemConfig> = {}
): Particle[] => {
  const particles: Particle[] = [];
  const cfg = { ...DEFAULT_PARTICLE_CONFIG, ...config };

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const velocity = random(cfg.velocity.min, cfg.velocity.max) * 5;
    const particle = createParticle(x, y, cfg);
    particle.vx = Math.cos(angle) * velocity;
    particle.vy = Math.sin(angle) * velocity;
    particles.push(particle);
  }

  return particles;
};
