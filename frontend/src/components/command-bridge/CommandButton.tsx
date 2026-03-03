/**
 * CommandButton Component
 * Futuristic button with energy effects and spark animations
 */

import React, { MouseEvent } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { clickSpark } from '@/lib/commandAnimations';
import { usePerf } from '@/contexts/PerfContext';
import { cn } from '@/lib/utils';

export interface CommandButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'neural';
  energySpark?: boolean;
  pulseGlow?: boolean;
}

export const CommandButton = React.forwardRef<HTMLButtonElement, CommandButtonProps>(
  (
    {
      variant = 'primary',
      energySpark = false,
      pulseGlow = false,
      className,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const { mode } = usePerf();
    const shouldSparkle = energySpark && mode === 'high';

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      // Create spark effect on click
      if (shouldSparkle) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        const color = {
          primary: 'hsl(270, 100%, 65%)',
          secondary: 'hsl(210, 100%, 60%)',
          danger: 'hsl(0, 84%, 60%)',
          neural: 'hsl(180, 100%, 50%)',
        }[variant];

        clickSpark(x, y, color);
      }

      // Call original onClick
      if (onClick) {
        onClick(e);
      }
    };

    // Variant styles
    const variantStyles = {
      primary: 'bg-gradient-to-r from-purple-500 to-violet-600 text-white hover:from-purple-600 hover:to-violet-700',
      secondary: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700',
      danger: 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700',
      neural: 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white hover:from-cyan-600 hover:to-teal-700',
    };

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        className={cn(
          'relative overflow-hidden transition-all duration-300',
          'shadow-lg hover:shadow-xl',
          variantStyles[variant],
          pulseGlow && mode === 'high' && 'animate-glow-pulse',
          className
        )}
        {...props}
      >
        {/* Background shimmer effect */}
        {mode === 'high' && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" />
        )}
        
        <span className="relative z-10">{children}</span>
      </Button>
    );
  }
);

CommandButton.displayName = 'CommandButton';
