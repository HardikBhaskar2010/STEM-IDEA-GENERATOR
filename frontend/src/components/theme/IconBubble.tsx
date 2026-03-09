import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconBubbleProps {
  icon: LucideIcon;
  color: 'purple' | 'green' | 'blue' | 'orange' | 'red' | 'yellow' | 'teal';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12'
};

const iconSizeMap = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
};

const colorBgMap = {
  purple: 'bg-[hsl(var(--accent-purple))]/10',
  green: 'bg-[hsl(var(--accent-green))]/10',
  blue: 'bg-[hsl(var(--accent-blue))]/10',
  orange: 'bg-[hsl(var(--accent-orange))]/10',
  red: 'bg-[hsl(var(--accent-red))]/10',
  yellow: 'bg-[hsl(var(--accent-yellow))]/10',
  teal: 'bg-[hsl(var(--accent-teal))]/10'
};

const colorTextMap = {
  purple: 'text-[hsl(var(--accent-purple))]',
  green: 'text-[hsl(var(--accent-green))]',
  blue: 'text-[hsl(var(--accent-blue))]',
  orange: 'text-[hsl(var(--accent-orange))]',
  red: 'text-[hsl(var(--accent-red))]',
  yellow: 'text-[hsl(var(--accent-yellow))]',
  teal: 'text-[hsl(var(--accent-teal))]'
};

export const IconBubble: React.FC<IconBubbleProps> = ({
  icon: Icon,
  color,
  size = 'md',
  className
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg',
        sizeMap[size],
        colorBgMap[color],
        className
      )}
    >
      <Icon className={cn(iconSizeMap[size], colorTextMap[color])} />
    </div>
  );
};

export default IconBubble;
