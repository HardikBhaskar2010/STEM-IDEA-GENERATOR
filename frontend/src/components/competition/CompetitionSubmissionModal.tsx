// Competition Submission Modal - Submit generated ideas to competition
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES, createSubmission, type Category } from '@/services/competitionService';
import { Trophy, Award, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCompetition } from '@/contexts/CompetitionContext';
import { useAchievements } from '@/contexts/AchievementContext';

interface CompetitionSubmissionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (pointsAwarded: number, newLevel?: string) => void;
  project: {
    title: string;
    description: string;
    projectType: string;
  };
}

// Auto-detect category from project type
const detectCategory = (projectType: string): Category => {
  const typeMap: Record<string, Category> = {
    'robotics': 'Robotics',
    'iot': 'IoT',
    'electronics': 'General STEM',
    'automation': 'IoT',
    'sensors': 'IoT',
    'web-development': 'AI/Software',
    'mobile-apps': 'AI/Software',
    'desktop-software': 'AI/Software',
    'game-development': 'AI/Software',
    'ai-ml': 'AI/Software',
  };
  
  return typeMap[projectType] || 'General STEM';
};

export const CompetitionSubmissionModal: React.FC<CompetitionSubmissionModalProps> = ({
  open,
  onClose,
  onSuccess,
  project,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>(
    detectCategory(project.projectType)
  );
  const { toast } = useToast();
  const { teamInfo, refreshUserProgress } = useCompetition();
  const { checkForNewAchievements } = useAchievements();

  const handleSubmit = async () => {
    if (!teamInfo) {
      toast({
        title: '❌ Not in Competition Mode',
        description: 'You need to join a team first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const result = await createSubmission(
        teamInfo.team_id,
        project.title,
        project.description,
        selectedCategory,
        undefined, // generatedProject details can be added if needed
        false // not manual
      );

      // Refresh user progress to update XP/level
      await refreshUserProgress();

      onSuccess(result.points_awarded, result.new_level);
      onClose();
    } catch (error: any) {
      toast({
        title: '❌ Submission Failed',
        description: error.message || 'Could not submit to competition',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="competition-submission-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Submit to Competition
          </DialogTitle>
          <DialogDescription>
            Submit your idea and earn points for your team!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Preview */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-lg">{project.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value as Category)}
            >
              <SelectTrigger id="category" data-testid="category-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              We've auto-detected the category, but you can change it if needed
            </p>
          </div>

          {/* Points Info */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <Award className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-800 dark:text-blue-200">
                Submission Rewards
              </span>
            </div>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 ml-8">
              <li>• Earn <strong>10 points</strong> for submission</li>
              <li>• Gain <strong>10 XP</strong> toward next level</li>
              <li>• Peers can upvote for +5 points each</li>
              <li>• Build your submission streak</li>
            </ul>
          </div>

          {/* Team Info */}
          {teamInfo && (
            <div className="text-sm text-muted-foreground">
              Submitting for: <strong>{teamInfo.team_name}</strong>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white"
            data-testid="submit-button"
          >
            {loading ? (
              'Submitting...'
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Submit
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
