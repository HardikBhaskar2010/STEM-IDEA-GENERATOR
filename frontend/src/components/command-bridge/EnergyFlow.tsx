/**
 * EnergyFlow Component
 * Renders animated SVG energy paths with glowing effects
 */

import React, { useEffect, useRef } from 'react';
import { animateEnergyPath, generatePathString, type PathPoint } from '@/lib/energyPath';
import { usePerf } from '@/contexts/PerfContext';

export interface EnergyFlowProps {
  points?: PathPoint[];
  pathData?: string;  // Custom SVG path
  duration?: number;
  strokeColor?: string;
  strokeWidth?: number;
  glowIntensity?: number;
  loop?: boolean;
  className?: string;
  autoStart?: boolean;
}

export const EnergyFlow: React.FC<EnergyFlowProps> = ({
  points,
  pathData,
  duration = 2000,
  strokeColor = 'hsl(270, 100%, 65%)',
  strokeWidth = 2,
  glowIntensity = 8,
  loop = true,
  className = '',
  autoStart = true,
}) => {
  const pathRef = useRef<SVGPathElement>(null);
  const { mode } = usePerf();

  // Determine if animations should run based on performance mode
  const shouldAnimate = mode === 'high' || mode === 'medium';

  useEffect(() => {
    if (!pathRef.current || !autoStart || !shouldAnimate) return;

    const animation = animateEnergyPath(pathRef.current, {
      duration,
      loop,
    });

    return () => {
      if (animation) {
        animation.pause();
      }
    };
  }, [duration, loop, autoStart, shouldAnimate]);

  // Generate path from points if provided
  const finalPathData = pathData || (points ? generatePathString(points) : '');

  if (!finalPathData) {
    console.warn('EnergyFlow: No path data or points provided');
    return null;
  }

  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Glow filter */}
        <filter id="energy-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={glowIntensity} />
        </filter>
      </defs>
      
      {/* Main energy path */}
      <path
        ref={pathRef}
        d={finalPathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={shouldAnimate ? 'url(#energy-glow)' : 'none'}
        opacity={shouldAnimate ? 0.8 : 0.3}
        className="transition-opacity duration-500"
      />
    </svg>
  );
};
