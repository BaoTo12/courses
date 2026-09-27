import { createContext, useContext } from 'react';
import type { User } from '../domain/types';

export interface AuthContextValue {
  /** The logged-in user, or null. Comes from GET /api/auth/me (24.12). */
  user: User | null;
  /** True until the first "who am I?" answer: don't redirect to /login before we know (24.12). */
  isChecking: boolean;
  /** Resolves with the user; rejects with the API error payload (401 → bad credentials). */
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
