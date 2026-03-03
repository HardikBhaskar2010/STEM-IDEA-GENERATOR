/**
 * Memory Manager
 * Phase 9: Performance & Accessibility
 * 
 * Utilities for memory cleanup and leak prevention
 */

export type CleanupFunction = () => void;

/**
 * Memory Manager Class
 * Tracks and cleans up resources to prevent memory leaks
 */
export class MemoryManager {
  private cleanupFunctions: Set<CleanupFunction> = new Set();
  private eventListeners: Map<EventTarget, Map<string, EventListener[]>> = new Map();
  private animationFrames: Set<number> = new Set();
  private intervals: Set<number> = new Set();
  private timeouts: Set<number> = new Set();

  /**
   * Register a cleanup function
   */
  registerCleanup(cleanup: CleanupFunction): void {
    this.cleanupFunctions.add(cleanup);
  }

  /**
   * Track event listener for cleanup
   */
  addEventListener(
    target: EventTarget,
    event: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ): void {
    target.addEventListener(event, listener, options);

    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, new Map());
    }

    const targetListeners = this.eventListeners.get(target)!;
    if (!targetListeners.has(event)) {
      targetListeners.set(event, []);
    }

    targetListeners.get(event)!.push(listener);
  }

  /**
   * Track animation frame for cleanup
   */
  requestAnimationFrame(callback: FrameRequestCallback): number {
    const id = window.requestAnimationFrame(callback);
    this.animationFrames.add(id);
    return id;
  }

  /**
   * Cancel tracked animation frame
   */
  cancelAnimationFrame(id: number): void {
    window.cancelAnimationFrame(id);
    this.animationFrames.delete(id);
  }

  /**
   * Track interval for cleanup
   */
  setInterval(callback: () => void, ms: number): number {
    const id = window.setInterval(callback, ms) as unknown as number;
    this.intervals.add(id);
    return id;
  }

  /**
   * Clear tracked interval
   */
  clearInterval(id: number): void {
    window.clearInterval(id);
    this.intervals.delete(id);
  }

  /**
   * Track timeout for cleanup
   */
  setTimeout(callback: () => void, ms: number): number {
    const id = window.setTimeout(callback, ms) as unknown as number;
    this.timeouts.add(id);
    return id;
  }

  /**
   * Clear tracked timeout
   */
  clearTimeout(id: number): void {
    window.clearTimeout(id);
    this.timeouts.delete(id);
  }

  /**
   * Clean up all tracked resources
   */
  cleanup(): void {
    // Clean up event listeners
    this.eventListeners.forEach((events, target) => {
      events.forEach((listeners, event) => {
        listeners.forEach((listener) => {
          target.removeEventListener(event, listener);
        });
      });
    });
    this.eventListeners.clear();

    // Cancel animation frames
    this.animationFrames.forEach((id) => window.cancelAnimationFrame(id));
    this.animationFrames.clear();

    // Clear intervals
    this.intervals.forEach((id) => window.clearInterval(id));
    this.intervals.clear();

    // Clear timeouts
    this.timeouts.forEach((id) => window.clearTimeout(id));
    this.timeouts.clear();

    // Execute cleanup functions
    this.cleanupFunctions.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        console.error('Cleanup function failed:', error);
      }
    });
    this.cleanupFunctions.clear();
  }
}

/**
 * Canvas cleanup utility
 */
export function cleanupCanvas(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Reset canvas size to free memory
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * WebGL context cleanup
 */
export function cleanupWebGL(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return;

  const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
  if (gl) {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  canvas.width = 0;
  canvas.height = 0;
}

/**
 * Three.js cleanup utility
 */
export function cleanupThreeJS(scene: any): void {
  if (!scene) return;

  scene.traverse((object: any) => {
    if (object.geometry) {
      object.geometry.dispose();
    }

    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((material: any) => material.dispose());
      } else {
        object.material.dispose();
      }
    }

    if (object.texture) {
      object.texture.dispose();
    }
  });
}

/**
 * Memory usage monitoring
 */
export function getMemoryUsage(): { used: number; total: number; percentage: number } | null {
  if (typeof window === 'undefined' || !(performance as any).memory) {
    return null;
  }

  const memory = (performance as any).memory;
  return {
    used: Math.round(memory.usedJSHeapSize / 1048576), // MB
    total: Math.round(memory.totalJSHeapSize / 1048576), // MB
    percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
  };
}

/**
 * Detect potential memory leaks
 */
export function detectMemoryLeak(threshold: number = 80): boolean {
  const usage = getMemoryUsage();
  if (!usage) return false;

  return usage.percentage > threshold;
}
