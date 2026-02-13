import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

/**
 * NavbarAuthButton - Shows Sign In button for guests, User menu for authenticated
 * Placed in top-right corner of navbar
 */
export const NavbarAuthButton: React.FC = () => {
  const navigate = useNavigate();
  const { mode } = useAuth();

  // For authenticated users, show user menu (handled elsewhere)
  if (mode === 'authenticated') {
    return null; // Profile dropdown already exists in navbar
  }

  // For guest users, show Sign In button
  return (
    <Button
      onClick={() => navigate('/login')}
      className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-medium px-6 rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40"
      data-testid="navbar-signin-button"
    >
      <LogIn className="w-4 h-4 mr-2" />
      Sign In
    </Button>
  );
};