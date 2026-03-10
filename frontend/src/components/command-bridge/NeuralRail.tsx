import React from 'react';
import { usePerformanceAnimations } from '@/hooks/usePerformanceAnimations';
import { cn } from '@/lib/utils';

interface NeuralRailProps {
  children: React.ReactNode;
  className?: string;
}

export const NeuralRail: React.FC<NeuralRailProps> = ({ children, className }) => {
  const { shouldAnimate } = usePerformanceAnimations();

  return (
    <div className={cn("relative flex flex-col w-full h-full", className)}>
      {/* Vertical neural line container hidden inside padding/margin typically */}
      <div className="absolute left-[21px] top-2 bottom-2 w-px bg-white/10 rounded-full overflow-hidden hidden md:block z-0 pointer-events-none">
        {shouldAnimate && (
          <div 
            className="w-full h-[150px] bg-gradient-to-b from-transparent via-purple-500 to-transparent opacity-80"
            style={{
              animation: 'neural-flow 4s ease-in-out infinite'
            }}
          />
        )}
      </div>
      <div className="relative z-10 flex flex-col gap-1 w-full pl-0">
        {children}
      </div>
      <style>
        {`
          @keyframes neural-flow {
            0% { transform: translateY(-100px); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(800px); opacity: 0; }
          }
        `}
      </style>
    </div>
  );
};
