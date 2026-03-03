import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Sparkles, TrendingUp } from 'lucide-react';
import { AchievementStats as Stats, ACHIEVEMENT_TIERS } from '@/services/achievementService';
import { cn } from '@/lib/utils';

interface AchievementStatsProps {
  stats: Stats | null;
  isLoading?: boolean;
}

export const AchievementStats: React.FC<AchievementStatsProps> = ({
  stats,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card className="glass-effect border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievement Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const tierStats = [
    { tier: 'bronze', count: stats.bronze_count },
    { tier: 'silver', count: stats.silver_count },
    { tier: 'gold', count: stats.gold_count },
    { tier: 'platinum', count: stats.platinum_count },
  ];

  return (
    <Card className="glass-effect border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Achievement Stats
        </CardTitle>
        <CardDescription>
          Your overall achievement progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Completion</span>
            <span className="text-2xl font-bold text-gradient">
              {stats.completion_percentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={stats.completion_percentage} className="h-3" />
          <div className="text-xs text-muted-foreground text-right">
            {stats.unlocked_achievements} of {stats.total_achievements} unlocked
          </div>
        </div>

        {/* Tier Breakdown */}
        <div className="space-y-3">
          <div className="text-sm font-medium mb-3">Achievements by Tier</div>
          {tierStats.map(({ tier, count }) => {
            const tierConfig = ACHIEVEMENT_TIERS.find(t => t.value === tier);
            if (!tierConfig) return null;

            return (
              <div
                key={tier}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  tierConfig.bgColor,
                  tierConfig.borderColor
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'h-3 w-3 rounded-full',
                    tierConfig.bgColor
                  )} />
                  <span className="text-sm font-medium">{tierConfig.label}</span>
                </div>
                <span className={cn('font-bold', tierConfig.color)}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Rewards Earned */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Total XP</span>
            </div>
            <div className="text-xl font-bold text-purple-600">
              {stats.total_xp_from_achievements}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Total Points</span>
            </div>
            <div className="text-xl font-bold text-blue-600">
              {stats.total_points_from_achievements}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
