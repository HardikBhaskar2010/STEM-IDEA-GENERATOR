// Success Animation - Floating XP and Level Up notifications
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Confetti from 'react-confetti';

interface SuccessAnimationProps {
  show: boolean;
  type: 'submission' | 'levelup';
  points?: number;
  newLevel?: string;
  onComplete?: () => void;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  show,
  type,
  points = 10,
  newLevel,
  onComplete,
}) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (show && type === 'levelup') {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
        onComplete?.();
      }, 4000);
      return () => clearTimeout(timer);
    } else if (show && type === 'submission') {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, type, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <>
          {type === 'submission' && (
            /* Floating Points Animation */
            <motion.div
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: [0, 1, 1, 0], y: -100, scale: [0.5, 1.2, 1, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
              data-testid="floating-xp-animation"
            >
              <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-2xl shadow-2xl">
                <Award className="h-8 w-8" />
                <div className="text-2xl font-bold">+{points} XP</div>
                <Sparkles className="h-6 w-6 animate-pulse" />
              </div>
            </motion.div>
          )}

          {type === 'levelup' && newLevel && (
            <>
              {/* Subtle Confetti */}
              {showConfetti && (
                <Confetti
                  width={window.innerWidth}
                  height={window.innerHeight}
                  recycle={false}
                  numberOfPieces={200}
                  gravity={0.3}
                  colors={['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981']}
                />
              )}

              {/* Level Up Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -50 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
                data-testid="level-up-modal"
              >
                <Card className="w-[400px] border-4 border-yellow-500 shadow-2xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30">
                  <CardContent className="p-8 text-center space-y-4">
                    <motion.div
                      animate={{
                        rotate: [0, -10, 10, -10, 10, 0],
                        scale: [1, 1.1, 1, 1.1, 1],
                      }}
                      transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                    >
                      <Trophy className="h-20 w-20 mx-auto text-yellow-500" />
                    </motion.div>

                    <div className="space-y-2">
                      <h2 className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">
                        Level Up!
                      </h2>
                      <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-6 py-3 rounded-full text-2xl font-bold inline-block">
                        {newLevel}
                      </div>
                      <p className="text-sm text-muted-foreground mt-4">
                        Keep up the great work! 🚀
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-yellow-600">
                      <Sparkles className="h-5 w-5 animate-pulse" />
                      <Sparkles className="h-4 w-4 animate-pulse delay-75" />
                      <Sparkles className="h-5 w-5 animate-pulse delay-150" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </>
      )}
    </AnimatePresence>
  );
};
