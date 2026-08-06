/**
 * GlowPulse Component
 * Wrapper that adds pulsing glow effect
 */

import type { ReactNode } from 'react';
import React from 'react';
import { usePerf } from '@/contexts/PerfContext';
import { cn } from '@/lib/utils';

export interface GlowPulseProps {
  children: ReactNode;
  color?: 'primary' | 'secondary' | 'accent' | 'cyan';
  intensity?: 'low' | 'medium' | 'high';
  speed?: 'slow' | 'normal' | 'fast';
  className?: string;
  enabled?: boolean;
}

export const GlowPulse: React.FC<GlowPulseProps> = ({
  children,
  color = 'primary',
  intensity = 'medium',
  speed = 'normal',
  className = '',
  enabled = true,
}) => {
  const { mode } = usePerf();
  const shouldGlow = enabled && mode === 'high';

  const colorClasses = {
    primary: 'shadow-primary/50',
    secondary: 'shadow-blue-500/50',
    accent: 'shadow-pink-500/50',
    cyan: 'shadow-cyan-500/50',
  };

  const intensityClasses = {
    low: 'shadow-sm',
    medium: 'shadow-md',
    high: 'shadow-lg',
  };

  const speedClasses = {
    slow: 'animate-[glow-pulse_4s_ease-in-out_infinite]',
    normal: 'animate-[glow-pulse_3s_ease-in-out_infinite]',
    fast: 'animate-[glow-pulse_2s_ease-in-out_infinite]',
  };

  return (
    <div
      className={cn(
        shouldGlow && [
          colorClasses[color],
          intensityClasses[intensity],
          speedClasses[speed],
        ],
        className
      )}
    >
      {children}
    </div>
  );
};
