import React from 'react';
import { Button } from '@/components/ui/button';
import { LogIn, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface NavbarAuthButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

/**
 * NavbarAuthButton Component
 * 
 * Shows "Sign In" button for guests or profile button for authenticated users
 * 
 * @param className - Additional CSS classes
 * @param variant - Button variant
 */
export const NavbarAuthButton: React.FC<NavbarAuthButtonProps> = ({
  className = '',
  variant = 'outline'
}) => {
  const navigate = useNavigate();
  const { isGuest, isAuthenticated } = useAuth();

  // Show profile button for authenticated users
  if (isAuthenticated && !isGuest) {
    return (
      <Button
        onClick={() => navigate('/profile')}
        variant={variant}
        className={`${className} rounded-full`}
      >
        <User className="w-4 h-4 mr-2" />
        Profile
      </Button>
    );
  }

  // Show sign in button for guests
  return (
    <Button
      onClick={() => navigate('/login')}
      variant={variant}
      className={`${className} bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white border-none rounded-full shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300`}
    >
      <LogIn className="w-4 h-4 mr-2" />
      Sign In
    </Button>
  );
};
