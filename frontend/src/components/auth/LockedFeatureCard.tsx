import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

interface LockedFeatureCardProps {
  title?: string;
  description?: string;
  feature?: string;
  className?: string;
}

/**
 * LockedFeatureCard Component
 * 
 * Displays a card with lock icon and CTA for locked features
 * 
 * @param title - Card title (default: "Unlock this feature")
 * @param description - Card description
 * @param feature - Feature name for context
 * @param className - Additional CSS classes
 */
export const LockedFeatureCard: React.FC<LockedFeatureCardProps> = ({
  title = 'Unlock this feature',
  description = 'Sign in to save projects, join competitions, and track your progress.',
  feature,
  className = ''
}) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card className="glass-effect border-purple-500/20 bg-gradient-to-br from-purple-900/10 via-black/50 to-violet-900/10">
        <CardContent className="p-12 text-center space-y-6">
          {/* Lock Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.8 }}
            className="inline-block"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center border-2 border-purple-400/30 shadow-lg shadow-purple-500/50">
                <Lock className="w-10 h-10 text-white" />
              </div>
            </div>
          </motion.div>

          {/* Text Content */}
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-gradient">
              {title}
            </h2>
            <p className="text-gray-300 text-lg max-w-md mx-auto">
              {description}
            </p>
            {feature && (
              <p className="text-sm text-purple-400">
                Feature: <span className="font-semibold">{feature}</span>
              </p>
            )}
          </div>

          {/* CTA Button */}
          <Button
            onClick={() => navigate('/login')}
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-medium px-10 py-6 rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105"
          >
            Start Your Adventure
            <Sparkles className="ml-2 w-5 h-5" />
          </Button>

          {/* Info Text */}
          <p className="text-xs text-gray-500 pt-4">
            It's free and takes less than a minute
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};
