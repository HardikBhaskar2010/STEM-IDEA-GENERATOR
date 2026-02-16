import React from 'react';
import { Trophy, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AchievementBadge } from './AchievementBadge';
import { getTierConfig } from '@/services/achievementService';
import { cn } from '@/lib/utils';

interface AchievementNotificationProps {
  title: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  icon_emoji: string;
  xp_reward: number;
  points_reward: number;
  onClose?: () => void;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  title,
  description,
  tier,
  icon_emoji,
  xp_reward,
  points_reward,
  onClose
}) => {
  const tierConfig = getTierConfig(tier);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border-2 p-4 shadow-lg backdrop-blur-sm animate-in slide-in-from-top-5',
        tierConfig.borderColor,
        tierConfig.bgColor
      )}
    >
      {/* Background glow effect */}
      <div className={cn(
        'absolute inset-0 opacity-10',
        tierConfig.bgColor
      )} />

      {/* Content */}
      <div className="relative space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-4xl animate-bounce">{icon_emoji}</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy className={cn('h-4 w-4', tierConfig.color)} />
                <span className="text-sm font-semibold text-muted-foreground">Achievement Unlocked!</span>
              </div>
              <h4 className={cn('font-bold text-lg', tierConfig.color)}>
                {title}
              </h4>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground">{description}</p>

        {/* Rewards & Tier */}
        <div className="flex items-center gap-2 flex-wrap">
          <AchievementBadge tier={tier} size="sm" />
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/30">
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              <span className="font-semibold text-purple-600">+{xp_reward} XP</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/30">
              <Trophy className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-semibold text-blue-600">+{points_reward} Points</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sparkle animation overlay */}
      <div className="absolute top-2 right-2 opacity-50">
        <Sparkles className={cn('h-5 w-5 animate-pulse', tierConfig.color)} />
      </div>
    </div>
  );
};
