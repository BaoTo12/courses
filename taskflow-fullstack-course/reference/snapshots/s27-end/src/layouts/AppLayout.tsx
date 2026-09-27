import { skipToken } from '@reduxjs/toolkit/query/react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { reportRenderError } from '../app/middleware/crash-reporter';
import { ThemeToggle } from '../components/ThemeToggle';
import { Avatar } from '../components/styled/Avatar';
import { Stack } from '../components/styled/Stack';
import { Button } from '../components/Button';
import { useAuth } from '../auth/auth-context';
import { useGetCategoriesQuery, useGetTasksQuery } from '../features/api/apiSlice';
import { LIST_QUERY } from '../features/tasks/taskSelectors';
import { OpenTasksBadge } from '../features/tasks/OpenTasksBadge';
import { QuickFind } from '../features/search/QuickFind';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../i18n/LanguageSwitcher';

/** NavLink passes { isActive } so the active link gets the design system's modifier class. */
const navClass = ({ isActive }: { isActive: boolean }) =>
  `page__nav-link${isActive ? ' page__nav-link--active' : ''}`;

/** The shell shared by every page: header + nav, the current page (<Outlet/>), footer. */
export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // App-wide SUBSCRIPTIONS (22.06): the list and the categories stay cached while the layout is mounted,
  // so the header badge, the sidebar and every page's selectors can read them. Replaces S18's
  // fetchTasksIfNeeded effect: RTK Query deduplicates (22.02), and StrictMode's double mount is harmless.
  // S24: only with a session. Anonymous requests would answer 401 → sessionExpired (24.13).
  useGetTasksQuery(user ? LIST_QUERY : skipToken);
  useGetCategoriesQuery(user ? undefined : skipToken);

  async function handleLogout() {
    await logout(); // the server session ends, then slices, cache and user cookies are cleared (24.12)
    navigate('/login', { replace: true });
  }

  return (
    <div className="page">
      <header className="page__header">
        <span className="page__brand">{t('brand')}</span>
        <nav className="page__nav" aria-label={t('nav.main')}>
          <NavLink className={navClass} to="/tasks">
            {t('nav.tasks')}
          </NavLink>
          <NavLink className={navClass} to="/dashboard">
            {t('nav.dashboard')}
          </NavLink>
        </nav>
        <Stack $direction="row" $gap={3} $align="center" style={{ marginLeft: 'auto' }}>
          {user && <QuickFind />}
          {user && <OpenTasksBadge />}
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <>
              <Avatar name={user.displayName} size="sm" />
              <Button size="sm" onClick={() => void handleLogout()}>
                {t('nav.logout')}
              </Button>
            </>
          ) : (
            <NavLink className={navClass} to="/login">
              {t('nav.login')}
            </NavLink>
          )}
        </Stack>
      </header>
      <main className="page__main">
        {/* S27: a render error breaks one page, not the app; a new path gets a fresh boundary (key). */}
        <ErrorBoundary key={location.pathname} onError={reportRenderError}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <footer className="page__footer">{t('footer')}</footer>
    </div>
  );
}
