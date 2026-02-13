import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LockedFeatureCard } from './LockedFeatureCard';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showBlur?: boolean;
  message?: string;
  feature?: string;
}

/**
 * AuthGuard - Wraps protected features and shows lock overlay for guest users
 * 
 * Usage:
 * <AuthGuard feature="save projects">
 *   <SaveButton />
 * </AuthGuard>
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
  showBlur = true,
  message,
  feature = 'this feature'
}) => {
  const { mode } = useAuth();

  // If authenticated, show children normally
  if (mode === 'authenticated') {
    return <>{children}</>;
  }

  // If guest and fallback provided, show fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default: Show blurred content with lock card
  if (showBlur) {
    return (
      <div className="relative" data-testid="auth-guard-locked">
        {/* Blurred content */}
        <div className="blur-sm pointer-events-none select-none">
          {children}
        </div>
        
        {/* Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <LockedFeatureCard feature={feature} message={message} />
        </div>
      </div>
    );
  }

  // Just show lock card without blur
  return <LockedFeatureCard feature={feature} message={message} />;
};