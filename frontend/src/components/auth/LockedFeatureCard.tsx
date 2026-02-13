import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoginModal } from './LoginModal';

interface LockedFeatureCardProps {
  feature?: string;
  message?: string;
}

/**
 * LockedFeatureCard - Reusable lock UI that appears over locked features
 * Shows adventure-themed messaging and opens login modal
 */
export const LockedFeatureCard: React.FC<LockedFeatureCardProps> = ({
  feature = 'this feature',
  message
}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);

  const defaultMessage = 'Sign in to save projects, join competitions, and track your progress.';

  return (
    <>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="max-w-md mx-auto"
        data-testid="locked-feature-card"
      >
        <Card className="glass-effect border-white/10 bg-black/40 backdrop-blur-xl p-8 text-center space-y-6">
          {/* Lock Icon */}
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="flex justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center border border-purple-400/30">
                <Lock className="w-10 h-10 text-white" />
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white">
              Unlock {feature}
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              {message || defaultMessage}
            </p>
          </div>

          {/* CTA Button */}
          <Button
            onClick={() => setShowLoginModal(true)}
            className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-medium py-6 rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02]"
            data-testid="unlock-feature-button"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Start Your Adventure
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          {/* Subtitle */}
          <p className="text-xs text-gray-400">
            Free account • No credit card required
          </p>
        </Card>
      </motion.div>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </>
  );
};