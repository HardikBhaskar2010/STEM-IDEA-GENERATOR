// Progress Card Component - Show user level and XP
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { UserProgress, getLevelProgress, LEVELS } from '@/services/competitionService';
import { LevelBadge } from './LevelBadge';
import { Trophy, Flame, Star, TrendingUp } from 'lucide-react';

interface ProgressCardProps {
  progress: UserProgress;
}

// Hook for counting animation
const useCountUp = (end: number, duration: number = 1000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
};

export const ProgressCard: React.FC<ProgressCardProps> = ({ progress }) => {
  const levelProgress = getLevelProgress(progress.total_xp);
  const isMaxLevel = progress.level_number === 5;

  // Animated counts
  const animatedPoints = useCountUp(progress.total_points, 1500);
  const animatedXP = useCountUp(progress.total_xp, 1500);
  const animatedStreak = useCountUp(progress.streak_days, 1000);
  const animatedSubmissions = useCountUp(progress.submissions_count, 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card data-testid="progress-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Trophy className="h-5 w-5" />
            </motion.div>
            Your Progress
          </span>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            <LevelBadge level={progress.current_level} size="lg" />
          </motion.div>
        </CardTitle>
        <CardDescription>
          {isMaxLevel
            ? 'You\'ve reached the maximum level!'
            : `${progress.xp_to_next_level} XP to next level`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* XP Progress Bar */}
        <motion.div 
          className="space-y-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Level Progress</span>
            <motion.span 
              className="font-semibold"
              key={levelProgress}
              initial={{ scale: 1.5, color: "#3b82f6" }}
              animate={{ scale: 1, color: "inherit" }}
              transition={{ duration: 0.5 }}
            >
              {levelProgress}%
            </motion.span>
          </div>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            style={{ transformOrigin: "left" }}
          >
            <Progress value={levelProgress} className="h-3" data-testid="xp-progress-bar" />
          </motion.div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress.total_xp} XP</span>
            {!isMaxLevel && (
              <span>
                {LEVELS[progress.level_number]?.maxXP + 1} XP
              </span>
            )}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div 
            className="space-y-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Star className="h-4 w-4" />
              <span className="text-xs">Total Points</span>
            </div>
            <p className="text-2xl font-bold">{animatedPoints}</p>
          </motion.div>

          <motion.div 
            className="space-y-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Total XP</span>
            </div>
            <p className="text-2xl font-bold">{animatedXP}</p>
          </motion.div>

          <motion.div 
            className="space-y-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-xs">Streak</span>
            </div>
            <p className="text-2xl font-bold">{animatedStreak}</p>
            <p className="text-xs text-muted-foreground">days</p>
          </motion.div>

          <motion.div 
            className="space-y-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Trophy className="h-4 w-4" />
              <span className="text-xs">Submissions</span>
            </div>
            <p className="text-2xl font-bold">{animatedSubmissions}</p>
          </motion.div>
        </div>

        {/* Level Journey */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Level Journey</p>
          <div className="flex items-center justify-between gap-2">
            {LEVELS.map((level) => (
              <div
                key={level.number}
                className={`flex-1 text-center space-y-1 ${
                  level.number <= progress.level_number
                    ? 'opacity-100'
                    : 'opacity-30'
                }`}
              >
                <div
                  className={`w-full h-2 rounded-full ${
                    level.number < progress.level_number
                      ? 'bg-green-500'
                      : level.number === progress.level_number
                      ? 'bg-blue-500'
                      : 'bg-muted'
                  }`}
                />
                <p className="text-xs font-medium">{level.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            🏆 Recent Achievements
          </p>
          <div className="space-y-1.5">
            {progress.submissions_count > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Submitted {progress.submissions_count} ideas</span>
              </div>
            )}
            {progress.votes_received > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Received {progress.votes_received} upvotes</span>
              </div>
            )}
            {progress.streak_days >= 3 && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span>{progress.streak_days} day streak!</span>
              </div>
            )}
            {progress.level_number >= 3 && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Reached {progress.current_level} level</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
