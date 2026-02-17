// Competition Page - Main hub for competition features
import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCompetition } from '@/contexts/CompetitionContext';
import { TeamSetupModal } from '@/components/competition/TeamSetupModal';
import { TeamInfoCard } from '@/components/competition/TeamInfoCard';
import { TeamInfoCardSkeleton } from '@/components/competition/TeamInfoCardSkeleton';
import { ProgressCard } from '@/components/competition/ProgressCard';
import { ProgressCardSkeleton } from '@/components/competition/ProgressCardSkeleton';
import { LeaderboardTable } from '@/components/competition/LeaderboardTable';
import { SubmissionHistory } from '@/components/competition/SubmissionHistory';
import {
  getTopScorersLeaderboard,
  getConsistencyLeaderboard,
  getTeamLeaderboard,
  getMySubmissions,
  type Submission,
} from '@/services/competitionService';
import { Trophy, Users, TrendingUp, Award, Plus } from 'lucide-react';
import { PageLoading } from '@/components/ui/loading';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';

const Competition: React.FC = () => {
  const {
    isCompetitionMode,
    teamInfo,
    userProgress,
    isLoading: contextLoading,
    refreshAll,
  } = useCompetition();

  const [showTeamSetup, setShowTeamSetup] = useState(false);
  const [activeTab, setActiveTab] = useState('team');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isGuest } = useAuth();

  // Leaderboard data
  const [topScorers, setTopScorers] = useState<any[]>([]);
  const [consistency, setConsistency] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  // Submission history
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    if (isCompetitionMode && activeTab === 'leaderboard') {
      loadLeaderboards();
    }
  }, [isCompetitionMode, activeTab]);

  useEffect(() => {
    if (isCompetitionMode && activeTab === 'history') {
      loadSubmissions();
    }
  }, [isCompetitionMode, activeTab]);

  const loadLeaderboards = async () => {
    setIsLoadingData(true);
    try {
      const [scorers, cons, teamData] = await Promise.all([
        getTopScorersLeaderboard(20),
        getConsistencyLeaderboard(20),
        getTeamLeaderboard(20),
      ]);
      setTopScorers(scorers);
      setConsistency(cons);
      setTeams(teamData);
    } catch (error) {
      console.error('Error loading leaderboards:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadSubmissions = async () => {
    setIsLoadingData(true);
    try {
      const subs = await getMySubmissions();
      setSubmissions(subs);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleTeamSetupSuccess = () => {
    refreshAll();
    setActiveTab('team');
  };

  const handleJoinClick = () => {
    if (isGuest) {
      setShowLoginModal(true);
    } else {
      setShowTeamSetup(true);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl" data-testid="competition-page">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Trophy className="h-10 w-10 text-yellow-500" />
                Competition
              </h1>
              <p className="text-muted-foreground text-lg">
                {isCompetitionMode
                  ? 'Track your progress and compete with your team'
                  : 'Join a team to start competing'}
              </p>
            </div>
            {!isCompetitionMode && (
              <Button
                size="lg"
                onClick={handleJoinClick}
                data-testid="join-competition-button"
              >
                <Plus className="h-5 w-5 mr-2" />
                Join Competition
              </Button>
            )}
          </div>
        </div>

        {isCompetitionMode ? (
          /* Competition Mode - Show tabs */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="team" className="flex items-center gap-2" data-testid="team-tab">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Team</span>
              </TabsTrigger>
              <TabsTrigger
                value="leaderboard"
                className="flex items-center gap-2"
                data-testid="leaderboard-tab"
              >
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Leaderboard</span>
              </TabsTrigger>
              <TabsTrigger value="progress" className="flex items-center gap-2" data-testid="progress-tab">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Progress</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2" data-testid="history-tab">
                <Award className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
              </TabsTrigger>
            </TabsList>

            {/* Team Tab */}
            <TabsContent value="team" className="space-y-6">
              {contextLoading ? (
                <TeamInfoCardSkeleton />
              ) : teamInfo ? (
                <TeamInfoCard teamInfo={teamInfo} onLeave={() => refreshAll()} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No team information available</p>
                </div>
              )}
            </TabsContent>

            {/* Leaderboard Tab */}
            <TabsContent value="leaderboard" className="space-y-6">
              {isLoadingData ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="mt-4 text-muted-foreground">Loading leaderboards...</p>
                </div>
              ) : (
                <>
                  <LeaderboardTable
                    type="scorers"
                    data={topScorers}
                    title="Top Scorers"
                    description="Students with the most points"
                  />
                  <LeaderboardTable
                    type="consistency"
                    data={consistency}
                    title="Most Consistent"
                    description="Students with the longest streaks"
                  />
                  <LeaderboardTable
                    type="teams"
                    data={teams}
                    title="Team Rankings"
                    description="Teams with the highest combined scores"
                  />
                </>
              )}
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="space-y-6">
              {contextLoading ? (
                <ProgressCardSkeleton />
              ) : userProgress ? (
                <ProgressCard progress={userProgress} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No progress data available</p>
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              {isLoadingData ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="mt-4 text-muted-foreground">Loading submissions...</p>
                </div>
              ) : (
                <SubmissionHistory submissions={submissions} />
              )}
            </TabsContent>
          </Tabs>
        ) : (
          /* Solo Mode - Show invitation to join */
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-12 text-center space-y-6">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-3xl font-bold">Join the Competition!</h2>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Enter a team code from your teacher to unlock competition mode and start earning
                points for your ideas
              </p>

              <div className="bg-white/80 dark:bg-gray-900/80 rounded-xl p-6 space-y-3 text-left">
                <p className="font-semibold text-sm text-blue-800 dark:text-blue-200">
                  What you'll get:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    ✅ Earn points for each submission
                  </li>
                  <li className="flex items-center gap-2">
                    ✅ Level up from Explorer to Visionary
                  </li>
                  <li className="flex items-center gap-2">
                    ✅ Compete on team leaderboards
                  </li>
                  <li className="flex items-center gap-2">
                    ✅ Build submission streaks
                  </li>
                  <li className="flex items-center gap-2">
                    ✅ Get upvotes from peers
                  </li>
                </ul>
              </div>

              <Button
                size="lg"
                onClick={handleJoinClick}
                className="text-lg px-8 py-6"
                data-testid="join-competition-cta"
              >
                <Plus className="h-5 w-5 mr-2" />
                Join Competition Now
              </Button>

              <p className="text-sm text-muted-foreground">
                Don't have a team code? Ask your teacher to create a team first.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Team Setup Modal */}
      <TeamSetupModal
        open={showTeamSetup}
        onClose={() => setShowTeamSetup(false)}
        onSuccess={handleTeamSetupSuccess}
      />

      {/* Login Modal for Guest Users */}
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        feature="competitions"
        message="Sign in to join teams, submit projects, and compete on leaderboards with your classmates."
      />
    </Layout>
  );
};

export default Competition;
