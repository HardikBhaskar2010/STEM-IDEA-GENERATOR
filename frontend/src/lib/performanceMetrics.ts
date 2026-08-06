/**
 * Performance Metrics Tracking
 * Phase 9: Performance & Accessibility
 * 
 * Collects and analyzes performance metrics
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'fps' | 'memory' | 'load' | 'interaction' | 'custom';
}

export interface PerformanceBudget {
  fps: number;
  memoryMB: number;
  loadTimeMs: number;
  interactionTimeMs: number;
}

/**
 * Performance Metrics Tracker
 */
export class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private budget: PerformanceBudget;
  private listeners: ((metric: PerformanceMetric) => void)[] = [];

  constructor(budget: PerformanceBudget = {
    fps: 60,
    memoryMB: 50,
    loadTimeMs: 2000,
    interactionTimeMs: 100,
  }) {
    this.budget = budget;
  }

  /**
   * Record a metric
   */
  record(name: string, value: number, category: PerformanceMetric['category']): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category,
    };

    this.metrics.push(metric);
    this.notifyListeners(metric);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Get metrics by category
   */
  getMetrics(category?: PerformanceMetric['category']): PerformanceMetric[] {
    if (!category) {return [...this.metrics];}
    return this.metrics.filter((m) => m.category === category);
  }

  /**
   * Get average metric value
   */
  getAverage(name: string, timeWindowMs: number = 5000): number {
    const now = Date.now();
    const relevantMetrics = this.metrics.filter(
      (m) => m.name === name && now - m.timestamp <= timeWindowMs
    );

    if (relevantMetrics.length === 0) {return 0;}

    const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / relevantMetrics.length;
  }

  /**
   * Check if performance is within budget
   */
  isWithinBudget(): { ok: boolean; violations: string[] } {
    const violations: string[] = [];

    const avgFPS = this.getAverage('fps', 5000);
    if (avgFPS > 0 && avgFPS < this.budget.fps) {
      violations.push(`FPS: ${avgFPS.toFixed(1)} < ${this.budget.fps}`);
    }

    const avgMemory = this.getAverage('memory', 5000);
    if (avgMemory > this.budget.memoryMB) {
      violations.push(`Memory: ${avgMemory.toFixed(1)}MB > ${this.budget.memoryMB}MB`);
    }

    return {
      ok: violations.length === 0,
      violations,
    };
  }

  /**
   * Subscribe to metric updates
   */
  subscribe(listener: (metric: PerformanceMetric) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(metric: PerformanceMetric): void {
    this.listeners.forEach((listener) => {
      try {
        listener(metric);
      } catch (error) {
        console.error('Metric listener error:', error);
      }
    });
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

/**
 * FPS Monitor
 */
export class FPSMonitor {
  private frames: number[] = [];
  private lastTime = performance.now();
  private animationFrameId: number | null = null;
  private callback?: (fps: number) => void;

  /**
   * Start monitoring FPS
   */
  start(callback?: (fps: number) => void): void {
    this.callback = callback;
    this.tick();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Tick function
   */
  private tick = (): void => {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    const fps = 1000 / delta;
    this.frames.push(fps);

    // Keep last 60 frames
    if (this.frames.length > 60) {
      this.frames.shift();
    }

    if (this.callback) {
      this.callback(this.getAverageFPS());
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  /**
   * Get current FPS
   */
  getCurrentFPS(): number {
    if (this.frames.length === 0) {return 0;}
    return this.frames[this.frames.length - 1];
  }

  /**
   * Get average FPS
   */
  getAverageFPS(): number {
    if (this.frames.length === 0) {return 0;}
    const sum = this.frames.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.frames.length);
  }

  /**
   * Reset
   */
  reset(): void {
    this.frames = [];
    this.lastTime = performance.now();
  }
}

/**
 * Global performance tracker instance
 */
export const performanceTracker = new PerformanceTracker();

/**
 * Record Web Vitals
 */
export function recordWebVitals(): void {
  if (typeof window === 'undefined' || !performance) {return;}

  // First Contentful Paint
  const fcp = performance.getEntriesByName('first-contentful-paint')[0];
  if (fcp) {
    performanceTracker.record('FCP', fcp.startTime, 'load');
  }

  // Largest Contentful Paint
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      performanceTracker.record('LCP', lastEntry.startTime, 'load');
    });
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  }
}
