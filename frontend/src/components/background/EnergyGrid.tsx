import React, { useEffect, useRef } from 'react';
import { usePerformanceAnimations } from '@/hooks/usePerformanceAnimations';
import { cn } from '@/lib/utils';

export const EnergyGrid: React.FC<{ className?: string }> = ({ className }) => {
  const { shouldAnimate, isHighPerf } = usePerformanceAnimations();

  if (!shouldAnimate || !isHighPerf) {return null;}

  return (
    <div className={cn("fixed inset-0 pointer-events-none z-[-1] overflow-hidden", className)}>
      <div 
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(168, 85, 247, 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(168, 85, 247, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black, transparent 80%)'
        }}
      />
      <div 
        className="absolute left-0 right-0 h-[100px] bg-gradient-to-b from-transparent via-purple-500/10 to-transparent"
        style={{
          animation: 'scan-vertical 8s linear infinite',
        }}
      />
      <style>
        {`
          @keyframes scan-vertical {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100vh); }
          }
        `}
      </style>
    </div>
  );
};
