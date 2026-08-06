/**
 * LivingCard Component
 * Card component with floating animation, glow pulse, and energy effects
 */

import React, { useEffect, useRef } from 'react';
import type { CardProps } from '@/components/ui/card';
import { Card } from '@/components/ui/card';
import { floatingAnimation, glowPulse } from '@/lib/commandAnimations';
import { usePerf } from '@/contexts/PerfContext';
import { cn } from '@/lib/utils';

export interface LivingCardProps extends CardProps {
  floating?: boolean;
  floatDistance?: number;
  floatDuration?: number;
  glowPulse?: boolean;
  energyBorder?: boolean;
  variant?: 'default' | 'energy' | 'neural' | 'holographic';
  children?: React.ReactNode;
}

export const LivingCard = React.forwardRef<HTMLDivElement, LivingCardProps>(
  (
    {
      floating = false,
      floatDistance = 4,
      floatDuration = 3000,
      glowPulse: enableGlowPulse = false,
      energyBorder = false,
      variant = 'default',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const { lowPerf } = usePerf();

    // Determine if animations should run
    const shouldAnimate = !lowPerf && floating;
    const shouldGlow = !lowPerf && enableGlowPulse;

    useEffect(() => {
      if (!cardRef.current || !shouldAnimate) {return;}

      const animation = floatingAnimation(
        cardRef.current,
        floatDistance,
        floatDuration
      );

      return () => {
        if (animation) {
          animation.pause();
        }
      };
    }, [shouldAnimate, floatDistance, floatDuration]);

    // Variant styles
    const variantStyles = {
      default: '',
      energy: 'border-primary/30 bg-gradient-to-br from-primary/5 to-background',
      neural: 'border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-background',
      holographic: 'border-purple-500/30 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-background',
    };

    return (
      <Card
        ref={(node) => {
          // @ts-ignore
          cardRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={cn(
          'relative overflow-hidden transition-all duration-300',
          variantStyles[variant],
          energyBorder && 'border-2',
          shouldGlow && 'animate-glow-pulse',
          className
        )}
        {...props}
      >
        {/* Energy border effect */}
        {energyBorder && !lowPerf && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-shimmer" />
          </div>
        )}

        {/* HUD Scanline effect */}
        {!lowPerf && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
            <div className="w-full h-[2px] bg-primary/40 shadow-[0_0_15px_rgba(168,85,247,0.5)] absolute -top-[10%] animate-scanline" />
          </div>
        )}

        {children}
      </Card>
    );
  }
);

LivingCard.displayName = 'LivingCard';
