import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './auth-context';

/**
 * Redirects anonymous users to /login?returnTo=<current path>. Used as a LAYOUT route (S24): it guards every
 * page below it, so a new page can't be forgotten. With `children`, it guards just those.
 * 🛡 This is UX, not security: the API refuses anonymous requests with 401 (12.07, S38).
 */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { user, isChecking } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  // A reload: the session cookie may well be valid, we just haven't asked /auth/me yet. Don't bounce to /login.
  if (isChecking) return <p className="text-muted">{t('auth.checking')}</p>;
  if (user === null) {
    const returnTo = location.pathname + location.search;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }
  return children ?? <Outlet />;
}
