import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface AuthGuardProps {
  children: React.ReactNode;
  feature?: string;
  message?: string;
}

/**
 * AuthGuard Component
 * 
 * Wraps content and shows a blur overlay with lock for guest users
 * 
 * @param children - Content to protect
 * @param feature - Name of the feature being locked (optional)
 * @param message - Custom message (optional)
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  feature = 'this feature',
  message 
}) => {
  const { isGuest, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // If user is authenticated (not guest), show content normally
  if (isAuthenticated && !isGuest) {
    return <>{children}</>;
  }

  // For guests, show blurred content with lock overlay
  return (
    <div className="relative">
      {/* Blurred Content */}
      <div className="filter blur-md pointer-events-none select-none">
        {children}
      </div>

      {/* Lock Overlay */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md"
      >
        <div className="text-center space-y-4 px-6 max-w-md">
          {/* Lock Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.8, delay: 0.2 }}
            className="inline-block"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-xl animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center border border-purple-400/30">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
          </motion.div>

          {/* Text */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">
              Unlock {feature}
            </h3>
            <p className="text-gray-300 text-sm">
              {message || 'Sign in to save projects, join competitions, and track your progress.'}
            </p>
          </div>

          {/* CTA Button */}
          <Button
            onClick={() => navigate('/login')}
            className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-medium px-8 py-6 rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105"
          >
            Start Your Adventure
            <Sparkles className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
