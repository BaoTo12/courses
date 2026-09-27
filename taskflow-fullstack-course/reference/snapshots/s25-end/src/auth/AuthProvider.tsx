import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useGetMeQuery, useLoginMutation, useLogoutMutation } from '../features/auth/authApi';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';

/**
 * S24: REAL session-cookie authentication (24.09). The context keeps the S12 shape, so the components that
 * call `useAuth()` barely changed. Behind it: RTK Query's `getMe` (who am I?) and the login/logout mutations.
 * The session id is an HttpOnly cookie the browser sends by itself; this code never sees it (24.07).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useGetMeQuery();
  const [login] = useLoginMutation();
  const [logout] = useLogoutMutation();

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      isChecking: isLoading,
      login: (username, password) => login({ username, password }).unwrap(),
      // logout's onQueryStarted clears slices, cache and user cookies, even if the request fails (24.12).
      logout: () => logout().unwrap().catch(() => undefined),
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
