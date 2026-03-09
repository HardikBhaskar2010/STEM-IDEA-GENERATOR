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
  
  const variantStyles = {
    default: 'bg-card border-border shadow-sm hover:shadow-md',
    accent: 'bg-card border-border shadow-sm',
    hover: 'bg-card border-border shadow-sm hover:shadow-lg hover:-translate-y-0.5'
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
