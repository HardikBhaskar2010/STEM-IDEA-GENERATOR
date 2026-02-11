// Level Badge Component
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Hammer, Lightbulb, Rocket, Crown } from 'lucide-react';

interface LevelBadgeProps {
  level: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const LEVEL_CONFIG = {
  Explorer: {
    icon: Sparkles,
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    gradient: 'from-blue-500 to-cyan-500',
  },
  Builder: {
    icon: Hammer,
    color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
    gradient: 'from-green-500 to-emerald-500',
  },
  Innovator: {
    icon: Lightbulb,
    color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
    gradient: 'from-yellow-500 to-amber-500',
  },
  Inventor: {
    icon: Rocket,
    color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    gradient: 'from-purple-500 to-pink-500',
  },
  Visionary: {
    icon: Crown,
    color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
    gradient: 'from-orange-500 to-red-500',
  },
};

export const LevelBadge: React.FC<LevelBadgeProps> = ({ 
  level, 
  size = 'md', 
  showIcon = true 
}) => {
  const config = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG.Explorer;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge 
      className={`${config.color} ${sizeClasses[size]} font-semibold border flex items-center gap-1.5`}
      data-testid="level-badge"
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{level}</span>
    </Badge>
  );
};
