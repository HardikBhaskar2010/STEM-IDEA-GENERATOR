import React, { createContext, useContext, useState } from 'react';

// Auth modes
export type AuthMode = 'unauthenticated' | 'guest' | 'authenticated';
export type AuthProvider = 'guest' | 'google' | 'email' | null;

interface AuthContextType {
  user: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  mode: AuthMode;
  provider: AuthProvider;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user] = useState<any>({ id: 'default-user', email: 'stem-user@example.com' });
  const [isLoading] = useState(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: true,
        mode: 'authenticated',
        provider: 'email',
        isGuest: false,
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
