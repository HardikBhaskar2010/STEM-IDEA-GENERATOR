/**
 * useMemoryCleanup Hook
 * Phase 9: Performance & Accessibility
 * 
 * Automatic memory cleanup and leak prevention
 */

import { useEffect, useRef } from 'react';
import { MemoryManager } from '@/lib/memoryManager';

/**
 * Hook that provides a memory manager for automatic cleanup
 */
export function useMemoryCleanup() {
  const managerRef = useRef<MemoryManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = new MemoryManager();
  }

  useEffect(() => {
    const manager = managerRef.current!;

    // Cleanup on unmount
    return () => {
      manager.cleanup();
    };
  }, []);

  return managerRef.current;
}

/**
 * Hook for event listener with automatic cleanup
 */
export function useEventListener<K extends keyof WindowEventMap>(
  event: K,
  handler: (e: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const eventListener = (e: Event) => savedHandler.current(e as WindowEventMap[K]);
    window.addEventListener(event, eventListener, options);

    return () => {
      window.removeEventListener(event, eventListener, options);
    };
  }, [event, options]);
}

/**
 * Hook for animation frame with automatic cleanup
 */
export function useAnimationFrame(callback: (time: number) => void, enabled: boolean = true) {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  useEffect(() => {
    if (!enabled) return;

    const animate = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        callback(time - previousTimeRef.current);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [callback, enabled]);
}

/**
 * Hook for interval with automatic cleanup
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);

    return () => clearInterval(id);
  }, [delay]);
}

/**
 * Hook for canvas cleanup
 */
export function useCanvasCleanup(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    return () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      canvas.width = 0;
      canvas.height = 0;
    };
  }, [canvasRef]);
}
