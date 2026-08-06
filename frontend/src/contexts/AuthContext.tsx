import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, type AuthProvider } from '@/services/authService';
import type { User } from '@supabase/supabase-js';
import type { GuestUser } from '@/services/guestService';
import { userProfileService, type UserRow } from '@/services/userProfileService';
import { migrateGuestData } from '@/lib/supabase';
import { UserIdManager } from '@/utils/userIdManager';

import { identifyUser, resetUser } from '@/lib/posthog';

// Owner email for admin access
const OWNER_EMAIL = 'hardik.bhaskar2010@gmail.com';

// Auth modes
export type AuthMode = 'unauthenticated' | 'guest' | 'authenticated';
export type { AuthProvider } from '@/services/authService';

interface AuthContextType {
  user: User | GuestUser | null;
  userRow: UserRow | null;   // Persisted row from public.users (null for guests)
  isLoading: boolean;
  isAuthenticated: boolean;
  mode: AuthMode;
  provider: AuthProvider;
  isGuest: boolean;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
  refreshUserRow: () => Promise<void>;  // Force re-fetch from public.users
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// How often to silently re-fetch the profile row from Supabase (ms)
const PROFILE_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | GuestUser | null>(null);
  const [userRow, setUserRow] = useState<UserRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [provider, setProvider] = useState<AuthProvider>(null);

  // Track current auth user ID in a ref so intervals/event listeners
  // never capture a stale closure value.
  const authUserIdRef = React.useRef<string | null>(null);

  const identifyAuthenticatedUser = (authenticatedUser: User) => {
    if (authUserIdRef.current === authenticatedUser.id) return;

    if (authUserIdRef.current) {
      resetUser();
    }

    authUserIdRef.current = authenticatedUser.id;
    identifyUser(authenticatedUser.id, { email: authenticatedUser.email });
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      if (currentUser && !authService.isGuestUser(currentUser)) {
        const row = await userProfileService.getProfile(currentUser.id);
        setUserRow(row);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
      setUserRow(null);
    }
  };

  const refreshUserRow = async () => {
    const uid = authUserIdRef.current;
    if (!uid) {return;}
    const row = await userProfileService.getProfile(uid);
    if (row) {setUserRow(row);}
  };

  // ── Initialize auth state + auth listener ────────────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      try {
        let currentUser = await authService.getCurrentUser();

        if (!currentUser) {
          const guestResult = await authService.continueAsGuest();
          currentUser = guestResult.user;
        }

        setUser(currentUser);

        if (currentUser && !authService.isGuestUser(currentUser)) {
          identifyAuthenticatedUser(currentUser);

          // Migrate guest data if applicable
          if (UserIdManager.hasGuestId()) {
            await migrateGuestData(UserIdManager.getGuestId(), currentUser.id);
          }

          // syncOnLogin fetches existing row first, then upserts — safe for
          // users who were already logged in before these changes shipped.
          const row = await userProfileService.syncOnLogin(currentUser as User);
          setUserRow(row);
        }

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

    const subscription = authService.onAuthStateChange(async (newUser, newProvider) => {
      if (!newUser) {
        resetUser();
        const guestResult = await authService.continueAsGuest();
        setUser(guestResult.user);
        setUserRow(null);
        authUserIdRef.current = null;
        setProvider('guest');
      } else {
        setUser(newUser);
        setProvider(newProvider || null);

        if (!authService.isGuestUser(newUser)) {
          identifyAuthenticatedUser(newUser);

          // Migrate guest data on active login transition
          if (UserIdManager.hasGuestId()) {
            await migrateGuestData(UserIdManager.getGuestId(), newUser.id);
          }

          const row = await userProfileService.syncOnLogin(newUser as User);
          setUserRow(row);
        }
      }
    });

    const unsubscribeGuest = authService.onGuestLogin((guestUser) => {
      setUser(guestUser);
      setUserRow(null);
      authUserIdRef.current = null;
      setProvider('guest');
    });

    return () => {
      subscription?.unsubscribe?.();
      unsubscribeGuest();
    };
  }, []);

  // ── Periodic background re-fetch (every 5 min) ───────────────────────────
  // Silently keeps userRow up-to-date for users who stay logged in for hours.
  // Uses authUserIdRef so it never has a stale closure. Does nothing for guests.
  useEffect(() => {
    const tick = async () => {
      const uid = authUserIdRef.current;
      if (!uid) {return;}
      const row = await userProfileService.getProfile(uid);
      if (row) {
        setUserRow(row);
        console.debug('🔄 [AuthContext] Periodic profile refresh', uid);
      }
    };

    const interval = setInterval(tick, PROFILE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // ── Tab-focus re-fetch ────────────────────────────────────────────────────
  // Immediately re-fetches userRow when the user returns to this tab.
  // Catches profile changes made in another tab or device.
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') {return;}
      const uid = authUserIdRef.current;
      if (!uid) {return;}
      const row = await userProfileService.getProfile(uid);
      if (row) {
        setUserRow(row);
        console.debug('👁️ [AuthContext] Tab refocus — profile refreshed');
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Determine auth mode
  const isGuest = user ? authService.isGuestUser(user) : false;
  const isAuthenticated = !!user;
  const mode: AuthMode = !user
    ? 'unauthenticated'
    : isGuest
    ? 'guest'
    : 'authenticated';

  const isAdmin = !isGuest && isAuthenticated && (user as User)?.email === OWNER_EMAIL;

  useEffect(() => {
    console.log('🔐 Auth State:', {
      hasUser: !!user,
      isGuest,
      isAuthenticated,
      mode,
      isAdmin,
      userId: user?.id,
      userEmail: (user as User)?.email,
      hasUserRow: !!userRow,
    });
  }, [user, userRow, isGuest, isAuthenticated, mode, isAdmin]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userRow,
        isLoading,
        isAuthenticated,
        mode,
        provider,
        isGuest,
        isAdmin,
        refreshUser,
        refreshUserRow,
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
