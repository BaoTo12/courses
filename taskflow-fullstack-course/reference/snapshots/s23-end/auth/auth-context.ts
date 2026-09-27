import { createContext, useContext } from 'react';
import type { User } from '../domain/types';

export interface AuthContextValue {
  user: User | null;
  /** FAKE for S12: accepts any username. Real login against the API arrives in S24/S48. */
  login: (username: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
