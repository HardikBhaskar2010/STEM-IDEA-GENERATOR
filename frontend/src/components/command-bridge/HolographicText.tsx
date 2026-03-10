import React from 'react';
import { cn } from '@/lib/utils';
import { usePerf } from '@/contexts/PerfContext';

export interface HolographicTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  glitch?: boolean;
}

export const HolographicText: React.FC<HolographicTextProps> = ({
  children,
  variant = 'primary',
  glitch = false,
  className,
  ...props
}) => {
  const { mode } = usePerf();
  const isHighPerf = mode === 'high';

  const baseStyle = "font-bold tracking-tight bg-clip-text text-transparent inline-block";
  
  const variantStyles = {
    primary: "bg-gradient-to-r from-primary via-purple-400 to-primary",
    secondary: "bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400",
    accent: "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400",
    danger: "bg-gradient-to-r from-red-400 via-rose-500 to-red-400",
  };

  const glowStyles = {
    primary: "drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]",
    secondary: "drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]",
    accent: "drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]",
    danger: "drop-shadow-[0_0_12px_rgba(248,113,113,0.6)]",
  };

  return (
    <span
      className={cn(
        baseStyle,
        variantStyles[variant],
        isHighPerf && glowStyles[variant],
        isHighPerf && glitch ? "animate-pulse" : "",
        isHighPerf && "bg-[length:200%_auto] animate-shimmer",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
