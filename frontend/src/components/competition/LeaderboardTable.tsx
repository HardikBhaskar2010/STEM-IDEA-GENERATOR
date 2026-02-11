// Leaderboard Table Component
import React from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LevelBadge } from './LevelBadge';
import { Trophy, Medal, Award } from 'lucide-react';
import type {
  LeaderboardEntry,
  ConsistencyLeaderboardEntry,
  TeamLeaderboardEntry,
} from '@/services/competitionService';

interface LeaderboardTableProps {
  type: 'scorers' | 'consistency' | 'teams';
  data: LeaderboardEntry[] | ConsistencyLeaderboardEntry[] | TeamLeaderboardEntry[];
  title: string;
  description: string;
}

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
  return null;
};

const getRankBadge = (rank: number) => {
  const baseClass = 'font-bold text-sm px-2 py-1 rounded-md';
  if (rank === 1) return `${baseClass} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400`;
  if (rank === 2) return `${baseClass} bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300`;
  if (rank === 3) return `${baseClass} bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400`;
  return `${baseClass} bg-muted text-muted-foreground`;
};

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  type,
  data,
  title,
  description,
}) => {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No data available yet</p>
            <p className="text-sm mt-2">Be the first to make submissions!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Animation variants for staggered row appearance
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <Card data-testid="leaderboard-table">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
            >
              <Trophy className="h-5 w-5" />
            </motion.div>
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                {type === 'teams' ? (
                  <>
                    <TableHead>Team Name</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Submissions</TableHead>
                    <TableHead className="text-right">Total Points</TableHead>
                    <TableHead className="text-right">Avg/Member</TableHead>
                  </>
                ) : type === 'consistency' ? (
                  <>
                    <TableHead>Student</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Streak</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Student</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Submissions</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry: any) => {
                const isTopThree = entry.rank <= 3;
                return (
                  <motion.tr
                    key={entry.user_id || entry.team_id}
                    variants={rowVariants}
                    className={isTopThree ? 'bg-muted/50 font-medium' : ''}
                    data-testid={`leaderboard-row-${entry.rank}`}
                    whileHover={{ 
                      scale: 1.01, 
                      backgroundColor: isTopThree ? 'rgba(var(--muted), 0.7)' : 'rgba(var(--muted), 0.3)',
                      transition: { duration: 0.2 }
                    }}
                  >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRankIcon(entry.rank)}
                      <span className={getRankBadge(entry.rank)}>
                        #{entry.rank}
                      </span>
                    </div>
                  </TableCell>

                  {type === 'teams' ? (
                    <>
                      <TableCell className="font-medium">{entry.team_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.school_name || '-'}
                      </TableCell>
                      <TableCell className="text-right">{entry.member_count}</TableCell>
                      <TableCell className="text-right">{entry.total_submissions}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {entry.total_team_points}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {entry.avg_points_per_member.toFixed(1)}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">
                        {entry.username || 'Anonymous'}
                      </TableCell>
                      <TableCell>
                        <LevelBadge level={entry.current_level} size="sm" />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.team_name || '-'}
                      </TableCell>
                      {type === 'consistency' ? (
                        <>
                          <TableCell className="text-right">
                            <span className="flex items-center justify-end gap-1">
                              <span className="text-lg">🔥</span>
                              <span className="font-semibold">{entry.streak_days}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {entry.total_points}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-right">
                            {entry.submission_count}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {entry.total_points}
                          </TableCell>
                        </>
                      )}
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
