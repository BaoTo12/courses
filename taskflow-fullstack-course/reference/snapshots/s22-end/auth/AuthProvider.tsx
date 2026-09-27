import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../domain/types';
import { useAppDispatch } from '../app/hooks';
import { loggedOut } from '../features/auth/authActions';
import { apiSlice } from '../features/api/apiSlice';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';

/**
 * ⚠️ FAKE authentication for S12 (routing lessons only). Nothing here is secure:
 * the "user" is just client state. Real sessions come in S24 (client) and S41/S47 (server).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const dispatch = useAppDispatch(); // this provider is inside the Redux <Provider> (main.tsx)

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: (username) =>
        setUser({ id: 1, username, displayName: username, role: 'USER', locale: 'en' }),
      logout: () => {
        setUser(null);
        dispatch(loggedOut()); // every slice resets: the next user must not see this user's data (20.11)
        dispatch(apiSlice.util.resetApiState()); // …and so does RTK Query's cache: tasks live there now (22.09, 23.10)
      },
    }),
    [user, dispatch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
