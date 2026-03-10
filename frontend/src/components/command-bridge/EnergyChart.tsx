import React from 'react';
import { usePerformanceAnimations } from '@/hooks/usePerformanceAnimations';
import { cn } from '@/lib/utils';
import { GlowPulse } from '@/components/animations/GlowPulse';

interface EnergyChartProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const EnergyChart: React.FC<EnergyChartProps> = ({ children, className, title }) => {
  const { shouldAnimate } = usePerformanceAnimations();

  return (
    <div className={cn("relative p-4 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md overflow-hidden group flex flex-col", className)}>
      {shouldAnimate && (
        <>
          {/* Subtle background glow that reacts to hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          {/* Energy spark effect when hovering */}
          <div className="absolute top-0 left-0 w-full h-[1px] overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
            <div 
              className="h-full w-[50px] bg-white shadow-[0_0_10px_2px_rgba(168,85,247,0.8)]"
              style={{ animation: 'slide-right 3s ease-in-out infinite' }}
            />
          </div>
        </>
      )}
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white/90 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">{title}</h3>
        </div>
      )}
      <div className="relative z-10 w-full flex-1">
        {children}
      </div>
      <style>
        {`
          @keyframes slide-right {
            0% { transform: translateX(-100px); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateX(800px); opacity: 0; }
          }
        `}
      </style>
    </div>
  );
};
