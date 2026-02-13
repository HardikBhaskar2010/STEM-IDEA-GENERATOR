import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import { User } from '@supabase/supabase-js';
import { GuestUser } from '@/services/guestService';

// Auth modes
export type AuthMode = 'unauthenticated' | 'guest' | 'authenticated';
export type AuthProvider = 'guest' | 'google' | 'email' | null;

interface AuthContextType {
  user: User | GuestUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  mode: AuthMode;
  provider: AuthProvider;
  isGuest: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | GuestUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [provider, setProvider] = useState<AuthProvider>(null);

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        let currentUser = await authService.getCurrentUser();
        
        // If no user exists (not logged in and not guest), automatically create guest
        if (!currentUser) {
          const guestResult = await authService.continueAsGuest();
          currentUser = guestResult.user;
        }
        
        setUser(currentUser);
        
        if (currentUser && authService.isGuestUser(currentUser)) {
          setProvider('guest');
        } else if (currentUser) {
          setProvider('email');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const subscription = authService.onAuthStateChange((newUser, newProvider) => {
      setUser(newUser);
      setProvider(newProvider || null);
    });

    // Listen for guest login events
    const unsubscribeGuest = authService.onGuestLogin((guestUser) => {
      setUser(guestUser);
      setProvider('guest');
    });

    return () => {
      subscription?.unsubscribe?.();
      unsubscribeGuest();
    };
  }, []);

  // Determine auth mode
  const isGuest = user ? authService.isGuestUser(user) : false;
  const isAuthenticated = !!user;
  const mode: AuthMode = !user
    ? 'unauthenticated'
    : isGuest
    ? 'guest'
    : 'authenticated';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        mode,
        provider,
        isGuest,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
