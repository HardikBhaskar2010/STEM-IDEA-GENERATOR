/**
 * EnergyParticle Component
 * Single glowing particle that can follow paths or move freely
 */

import React from 'react';
import { usePerf } from '@/contexts/PerfContext';

export interface EnergyParticleProps {
  x: number;
  y: number;
  size?: number;
  color?: string;
  opacity?: number;
  glow?: boolean;
  className?: string;
}

export const EnergyParticle: React.FC<EnergyParticleProps> = ({
  x,
  y,
  size = 4,
  color = 'hsl(270, 100%, 65%)',
  opacity = 1,
  glow = true,
  className = '',
}) => {
  const { mode } = usePerf();
  const shouldGlow = glow && mode === 'high';

  return (
    <div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        opacity,
        transform: 'translate(-50%, -50%)',
        boxShadow: shouldGlow ? `0 0 ${size * 3}px ${color}, 0 0 ${size * 6}px ${color}` : 'none',
        transition: 'opacity 0.3s ease',
      }}
    />
  );
};
