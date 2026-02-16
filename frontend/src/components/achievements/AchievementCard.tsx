import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Achievement, getTierConfig, getCategoryConfig } from '@/services/achievementService';
import { AchievementBadge } from './AchievementBadge';

interface AchievementCardProps {
  achievement: Achievement;
  animationDelay?: number;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  animationDelay = 0
}) => {
  const tierConfig = getTierConfig(achievement.tier);
  const categoryConfig = getCategoryConfig(achievement.category);
  const isUnlocked = achievement.is_unlocked;
  const isLocked = achievement.is_locked;
  const hasProgress = achievement.progress && achievement.progress.current > 0;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300 animate-fade-in',
        isUnlocked
          ? `${tierConfig.bgColor} ${tierConfig.borderColor} border-2 hover:scale-105 hover:shadow-lg cursor-pointer`
          : isLocked
          ? 'bg-muted/30 border-muted opacity-50'
          : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
      )}
      style={{ animationDelay: `${animationDelay}s` }}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header with Tier Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
              {isUnlocked && <Check className="h-4 w-4 text-green-500" />}
              <span className="text-2xl">{achievement.icon_emoji}</span>
            </div>
          </div>
          <AchievementBadge tier={achievement.tier} size="sm" />
        </div>

        {/* Title and Description */}
        <div>
          <h4 className={cn(
            'font-semibold mb-1 text-sm',
            isUnlocked && tierConfig.color
          )}>
            {achievement.title}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {achievement.description}
          </p>
        </div>

        {/* Progress Bar (for locked achievements with progress) */}
        {!isUnlocked && !isLocked && achievement.progress && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {achievement.progress.current} / {achievement.progress.target}
              </span>
            </div>
            <Progress 
              value={achievement.progress.percentage} 
              className="h-1.5"
            />
            <div className="text-xs text-muted-foreground text-right">
              {achievement.progress.percentage}%
            </div>
          </div>
        )}

        {/* Lock Reason */}
        {isLocked && achievement.lock_reason && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3" />
            {achievement.lock_reason}
          </div>
        )}

        {/* Rewards */}
        <div className="flex items-center gap-3 text-xs">
          <Badge variant="secondary" className="gap-1">
            <span className="font-semibold">{achievement.xp_reward}</span>
            <span className="text-muted-foreground">XP</span>
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <span className="font-semibold">{achievement.points_reward}</span>
            <span className="text-muted-foreground">Points</span>
          </Badge>
          <Badge 
            variant="outline" 
            className={cn('text-xs', categoryConfig.color)}
          >
            {categoryConfig.label}
          </Badge>
        </div>

        {/* Unlocked Date */}
        {isUnlocked && achievement.unlocked_at && (
          <div className="text-xs text-muted-foreground">
            Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
          </div>
        )}
      </CardContent>

      {/* Glow effect for unlocked achievements */}
      {isUnlocked && (
        <div className={cn(
          'absolute inset-0 opacity-20 pointer-events-none',
          tierConfig.bgColor
        )} />
      )}
    </Card>
  );
};
