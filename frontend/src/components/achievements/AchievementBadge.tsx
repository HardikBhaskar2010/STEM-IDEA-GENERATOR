import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getTierConfig } from '@/services/achievementService';

interface AchievementBadgeProps {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  tier,
  size = 'md',
  showLabel = true,
  className
}) => {
  const tierConfig = getTierConfig(tier);
  
  const sizeClasses = {
    sm: 'h-4 w-4 text-xs',
    md: 'h-6 w-6 text-sm',
    lg: 'h-8 w-8 text-base'
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1.5 font-semibold',
        tierConfig.bgColor,
        tierConfig.borderColor,
        tierConfig.color,
        className
      )}
    >
      <div className={cn(
        'rounded-full',
        tierConfig.bgColor,
        sizeClasses[size]
      )} />
      {showLabel && tierConfig.label}
    </Badge>
  );
};
