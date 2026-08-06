// Team Setup Modal - Create or Join Team
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createTeam, joinTeam, validateTeamCode } from '@/services/competitionService';
import { Users, School, Code, Check, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAchievements } from '@/contexts/AchievementContext';

interface TeamSetupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TeamSetupModal: React.FC<TeamSetupModalProps> = ({ open, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('join');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated, isGuest } = useAuth();
  const navigate = useNavigate();
  const { checkForNewAchievements } = useAchievements();

  // Join Team State
  const [teamCode, setTeamCode] = useState('');
  const [codeValidation, setCodeValidation] = useState<{ valid: boolean; teamName?: string } | null>(null);

  // Create Team State
  const [teamName, setTeamName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  // Check if user needs to login
  const requiresAuth = !isAuthenticated || isGuest;

  const handleLoginRequired = () => {
    toast({
      title: 'Login Required',
      description: 'Please create an account or login to join competitions',
    });
    onClose();
    navigate('/login');
  };

  const handleValidateCode = async () => {
    if (!teamCode.trim()) {return;}
    const result = await validateTeamCode(teamCode.trim());
    setCodeValidation(result);
  };

  const handleJoinTeam = async () => {
    if (requiresAuth) {
      handleLoginRequired();
      return;
    }

    try {
      setLoading(true);
      await joinTeam(teamCode.trim());
      toast({
        title: '🎉 Joined Team!',
        description: `You are now part of ${codeValidation?.teamName || 'the team'}`,
      });
      
      // Check for achievement unlocks after joining team
      await checkForNewAchievements();
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: '❌ Failed to Join',
        description: error.message || 'Could not join team',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (requiresAuth) {
      handleLoginRequired();
      return;
    }

    try {
      setLoading(true);
      const result = await createTeam(teamName, schoolName || undefined);
      setCreatedCode(result.team_code);
      toast({
        title: '✅ Team Created!',
        description: `Team code: ${result.team_code}`,
      });
      
      // Check for achievement unlocks after creating team
      await checkForNewAchievements();
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: '❌ Failed to Create Team',
        description: error.message || 'Could not create team',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="team-setup-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl">🏆 Join Competition Mode</DialogTitle>
          <DialogDescription>
            Join a team to participate in the STEM Idea Adventure competition
          </DialogDescription>
        </DialogHeader>

        {requiresAuth && (
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              You need to <strong>create an account or login</strong> to join competitions.
              Click any action below to be redirected to login.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="join" data-testid="join-team-tab">Join Team</TabsTrigger>
            <TabsTrigger value="create" data-testid="create-team-tab">Create Team</TabsTrigger>
          </TabsList>

          <TabsContent value="join" className="space-y-4 mt-4">
            {/* Join Team Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-code">Team Code</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Code className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="team-code"
                      data-testid="team-code-input"
                      placeholder="STEM-ABC123"
                      value={teamCode}
                      onChange={(e) => {
                        setTeamCode(e.target.value.toUpperCase());
                        setCodeValidation(null);
                      }}
                      onBlur={handleValidateCode}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleValidateCode}
                    data-testid="validate-code-button"
                  >
                    Check
                  </Button>
                </div>
                {codeValidation && (
                  <div className={`flex items-center gap-2 text-sm ${
                    codeValidation.valid ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {codeValidation.valid ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Valid code for: {codeValidation.team_name}</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4" />
                        <span>Invalid team code</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Tip:</strong> Get the team code from your teacher
                </p>
                <p className="text-xs text-muted-foreground">
                  Format: STEM-XXX123 (example: STEM-DEL01)
                </p>
              </div>

              <Button
                onClick={handleJoinTeam}
                disabled={!codeValidation?.valid || loading}
                className="w-full"
                data-testid="join-team-button"
              >
                {loading ? 'Joining...' : 'Join Team'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="create" className="space-y-4 mt-4">
            {createdCode ? (
              /* Team Created Success */
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center space-y-4">
                  <div className="text-4xl">🎉</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Team Created!</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Share this code with your students
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border-2 border-green-500">
                    <p className="text-xs text-muted-foreground mb-1">Team Code</p>
                    <p className="text-3xl font-bold text-green-600">{createdCode}</p>
                  </div>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(createdCode);
                      toast({ title: 'Copied to clipboard!' });
                    }}
                    variant="outline"
                    className="w-full"
                    data-testid="copy-code-button"
                  >
                    Copy Code
                  </Button>
                </div>
                <Button onClick={onClose} className="w-full" data-testid="close-modal-button">
                  Done
                </Button>
              </div>
            ) : (
              /* Create Team Form */
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team Name *</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="team-name"
                      data-testid="team-name-input"
                      placeholder="Innovators 2024"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school-name">School Name (Optional)</Label>
                  <div className="relative">
                    <School className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="school-name"
                      data-testid="school-name-input"
                      placeholder="Lincoln High School"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    🏫 <strong>For Teachers:</strong>
                  </p>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4">
                    <li>• You'll get a unique team code</li>
                    <li>• Share it with your students</li>
                    <li>• Track team progress on leaderboards</li>
                  </ul>
                </div>

                <Button
                  onClick={handleCreateTeam}
                  disabled={!teamName.trim() || loading}
                  className="w-full"
                  data-testid="create-team-button"
                >
                  {loading ? 'Creating...' : 'Create Team'}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
