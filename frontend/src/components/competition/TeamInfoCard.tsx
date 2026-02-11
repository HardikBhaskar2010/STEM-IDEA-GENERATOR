// Team Info Card Component
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TeamInfo } from '@/services/competitionService';
import { Users, School, Code, LogOut, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { leaveTeam } from '@/services/competitionService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TeamInfoCardProps {
  teamInfo: TeamInfo;
  onLeave: () => void;
}

export const TeamInfoCard: React.FC<TeamInfoCardProps> = ({ teamInfo, onLeave }) => {
  const { toast } = useToast();
  const [isLeaving, setIsLeaving] = React.useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(teamInfo.team_code);
    toast({
      title: '✅ Copied!',
      description: 'Team code copied to clipboard',
    });
  };

  const handleLeaveTeam = async () => {
    try {
      setIsLeaving(true);
      await leaveTeam();
      toast({
        title: '👋 Left Team',
        description: 'You have left the team successfully',
      });
      onLeave();
    } catch (error: any) {
      toast({
        title: '❌ Error',
        description: error.message || 'Failed to leave team',
        variant: 'destructive',
      });
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <Card data-testid="team-info-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-6 w-6" />
              {teamInfo.team_name}
            </CardTitle>
            <CardDescription className="mt-2">
              {teamInfo.school_name && (
                <span className="flex items-center gap-1 text-sm">
                  <School className="h-3 w-3" />
                  {teamInfo.school_name}
                </span>
              )}
            </CardDescription>
          </div>
          <Badge variant="outline" className="capitalize">
            {teamInfo.role}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Team Code</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg font-mono font-bold text-lg">
                <Code className="h-4 w-4" />
                {teamInfo.team_code}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
                data-testid="copy-team-code-button"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Team Members</p>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-lg font-semibold">
              <Users className="h-5 w-5" />
              {teamInfo.member_count} {teamInfo.member_count === 1 ? 'member' : 'members'}
            </div>
          </div>
        </div>

        {teamInfo.role === 'teacher' ? (
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
              🏫 Teacher Dashboard
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4">
              <li>• Share team code: {teamInfo.team_code}</li>
              <li>• {teamInfo.member_count} students in your team</li>
              <li>• Track progress in leaderboards</li>
            </ul>
          </div>
        ) : (
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 Your submissions will be counted towards your team's score
            </p>
          </div>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full text-destructive hover:bg-destructive/10"
              data-testid="leave-team-button"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Leave Team
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave Team?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave {teamInfo.team_name}? You'll return to Solo Mode and won't be able to submit to competitions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLeaveTeam}
                disabled={isLeaving}
                className="bg-destructive hover:bg-destructive/90"
                data-testid="confirm-leave-button"
              >
                {isLeaving ? 'Leaving...' : 'Leave Team'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
