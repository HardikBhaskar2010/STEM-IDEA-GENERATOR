/**
 * useFPSMonitor Hook
 * Phase 9: Performance & Accessibility
 * 
 * Monitors frames per second and provides performance metrics
 */

import { useEffect, useState, useRef } from 'react';

export interface FPSMetrics {
  currentFPS: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  isLowPerformance: boolean;
}

export function useFPSMonitor(enabled: boolean = true): FPSMetrics {
  const [metrics, setMetrics] = useState<FPSMetrics>({
    currentFPS: 60,
    averageFPS: 60,
    minFPS: 60,
    maxFPS: 60,
    isLowPerformance: false,
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const rafIdRef = useRef<number>();

  useEffect(() => {
    if (!enabled) {return;}

    const measure = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;

      // Calculate FPS
      const fps = Math.round(1000 / deltaTime);
      
      // Store frame time (keep last 60 frames)
      frameTimesRef.current.push(fps);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Calculate metrics every 60 frames
      if (frameTimesRef.current.length === 60) {
        const validFrameTimes = frameTimesRef.current.filter(f => f > 0 && f < 200);
        const sum = validFrameTimes.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / validFrameTimes.length);
        const min = Math.min(...validFrameTimes);
        const max = Math.max(...validFrameTimes);
        
        setMetrics({
          currentFPS: fps,
          averageFPS: avg,
          minFPS: min,
          maxFPS: max,
          isLowPerformance: avg < 30,
        });
        
        // Log warning if performance is low
        if (avg < 30) {
          console.warn('[Performance] Low FPS detected:', avg, 'fps');
        }
      }

      rafIdRef.current = requestAnimationFrame(measure);
    };

    rafIdRef.current = requestAnimationFrame(measure);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled]);

  return metrics;
}


