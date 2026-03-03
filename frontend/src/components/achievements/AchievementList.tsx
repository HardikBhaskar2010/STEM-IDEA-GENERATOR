import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy, Sparkles, Filter } from 'lucide-react';
import { Achievement, groupAchievementsByCategory, getAchievementsByTier, ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_TIERS } from '@/services/achievementService';
import { AchievementCard } from './AchievementCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AchievementListProps {
  achievements: Achievement[];
  showFilters?: boolean;
}

export const AchievementList: React.FC<AchievementListProps> = ({
  achievements,
  showFilters = true
}) => {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter achievements by tier if selected
  const filteredByTier = selectedTier
    ? getAchievementsByTier(achievements, selectedTier)
    : achievements;

  // Group by category
  const groupedAchievements = groupAchievementsByCategory(filteredByTier);

  // Get achievements for selected category
  const displayAchievements = selectedCategory === 'all'
    ? filteredByTier
    : groupedAchievements[selectedCategory] || [];

  // Count achievements by tier
  const tierCounts = ACHIEVEMENT_TIERS.map(tier => ({
    ...tier,
    count: achievements.filter(a => a.tier === tier.value && a.is_unlocked).length,
    total: achievements.filter(a => a.tier === tier.value).length
  }));

  return (
    <div className="space-y-6">
      {/* Tier Filter Buttons */}
      {showFilters && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" />
            Filter by Tier
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedTier === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTier(null)}
              className="gap-2"
            >
              <Trophy className="h-3.5 w-3.5" />
              All Tiers
              <Badge variant="secondary" className="ml-1">
                {achievements.length}
              </Badge>
            </Button>
            {tierCounts.map(tier => (
              <Button
                key={tier.value}
                variant={selectedTier === tier.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTier(tier.value)}
                className={cn(
                  'gap-2',
                  selectedTier === tier.value && `${tier.bgColor} ${tier.borderColor}`
                )}
              >
                <span className={tier.color}>●</span>
                {tier.label}
                <Badge variant="secondary" className="ml-1">
                  {tier.count}/{tier.total}
                </Badge>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-6 mb-6">
          <TabsTrigger value="all" className="gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            All
          </TabsTrigger>
          {ACHIEVEMENT_CATEGORIES.map(category => (
            <TabsTrigger key={category.value} value={category.value}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-4">
          {displayAchievements.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No achievements found in this category
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayAchievements.map((achievement, index) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  animationDelay={index * 0.05}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
