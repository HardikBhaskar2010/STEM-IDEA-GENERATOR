import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, type AuthProvider } from '@/services/authService';
import { User } from '@supabase/supabase-js';
import { GuestUser } from '@/services/guestService';

// Owner email for admin access
const OWNER_EMAIL = 'hardik.bhaskar2010@gmail.com';

// Auth modes
export type AuthMode = 'unauthenticated' | 'guest' | 'authenticated';
export type { AuthProvider } from '@/services/authService';

interface AuthContextType {
  user: User | GuestUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  mode: AuthMode;
  provider: AuthProvider;
  isGuest: boolean;
  isAdmin: boolean;
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
    const subscription = authService.onAuthStateChange(async (newUser, newProvider) => {
      // If user logs out (newUser is null), automatically create a guest
      if (!newUser) {
        const guestResult = await authService.continueAsGuest();
        setUser(guestResult.user);
        setProvider('guest');
      } else {
        setUser(newUser);
        setProvider(newProvider || null);
      }
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

  // Check if user is admin (owner)
  const isAdmin = !isGuest && isAuthenticated && (user as User)?.email === OWNER_EMAIL;

  // Debug logging
  useEffect(() => {
    console.log('🔐 Auth State:', { 
      hasUser: !!user, 
      isGuest, 
      isAuthenticated, 
      mode,
      isAdmin,
      userId: user?.id,
      userEmail: (user as User)?.email 
    });
  }, [user, isGuest, isAuthenticated, mode, isAdmin]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        mode,
        provider,
        isGuest,
        isAdmin,
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
