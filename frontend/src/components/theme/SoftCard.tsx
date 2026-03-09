import React from 'react';
import { cn } from '@/lib/utils';

interface SoftCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent' | 'hover';
  accentColor?: 'purple' | 'green' | 'blue' | 'orange' | 'red' | 'yellow' | 'teal';
  children: React.ReactNode;
}

const accentColorMap = {
  purple: 'hsl(var(--accent-purple))',
  green: 'hsl(var(--accent-green))',
  blue: 'hsl(var(--accent-blue))',
  orange: 'hsl(var(--accent-orange))',
  red: 'hsl(var(--accent-red))',
  yellow: 'hsl(var(--accent-yellow))',
  teal: 'hsl(var(--accent-teal))'
};

export const SoftCard: React.FC<SoftCardProps> = ({
  variant = 'default',
  accentColor,
  children,
  className,
  ...props
}) => {
  const baseStyles = 'rounded-xl border transition-all duration-150';
  
  // Priority 1: Production-grade layered shadow system for depth & elevation
  const variantStyles = {
    default: 'bg-card border-border shadow-[0px_1px_2px_rgba(0,0,0,0.05),0px_8px_24px_rgba(0,0,0,0.08)]',
    accent: 'bg-card border-border shadow-[0px_1px_2px_rgba(0,0,0,0.05),0px_8px_24px_rgba(0,0,0,0.08)]',
    hover: 'bg-card border-border shadow-[0px_1px_2px_rgba(0,0,0,0.05),0px_8px_24px_rgba(0,0,0,0.08)] hover:shadow-[0px_2px_4px_rgba(0,0,0,0.06),0px_14px_36px_rgba(0,0,0,0.12)] hover:-translate-y-1'
  };

  const style = accentColor && variant === 'accent' ? {
    borderLeft: `3px solid ${accentColorMap[accentColor]}`
  } : undefined;

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};

export default SoftCard;


