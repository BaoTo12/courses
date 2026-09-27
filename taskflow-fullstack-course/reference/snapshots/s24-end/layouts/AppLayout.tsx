import { skipToken } from '@reduxjs/toolkit/query/react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { ThemeToggle } from '../components/ThemeToggle';
import { Avatar } from '../components/styled/Avatar';
import { Stack } from '../components/styled/Stack';
import { Button } from '../components/Button';
import { useAuth } from '../auth/auth-context';
import { useGetCategoriesQuery, useGetTasksQuery } from '../features/api/apiSlice';
import { LIST_QUERY } from '../features/tasks/taskSelectors';
import { OpenTasksBadge } from '../features/tasks/OpenTasksBadge';
import { QuickFind } from '../features/search/QuickFind';

/** NavLink passes { isActive } so the active link gets the design system's modifier class. */
const navClass = ({ isActive }: { isActive: boolean }) =>
  `page__nav-link${isActive ? ' page__nav-link--active' : ''}`;

/** The shell shared by every page: header + nav, the current page (<Outlet/>), footer. */
export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
        <span className="page__brand">TaskFlow</span>
        <nav className="page__nav" aria-label="Main">
          <NavLink className={navClass} to="/tasks">
            Tasks
          </NavLink>
          <NavLink className={navClass} to="/dashboard">
            Dashboard
          </NavLink>
        </nav>
        <Stack $direction="row" $gap={3} $align="center" style={{ marginLeft: 'auto' }}>
          {user && <QuickFind />}
          {user && <OpenTasksBadge />}
          <ThemeToggle />
          {user ? (
            <>
              <Avatar name={user.displayName} size="sm" />
              <Button size="sm" onClick={() => void handleLogout()}>
                Log out
              </Button>
            </>
          ) : (
            <NavLink className={navClass} to="/login">
              Log in
            </NavLink>
          )}
        </Stack>
      </header>
      <main className="page__main">
        <Outlet />
      </main>
      <footer className="page__footer">TaskFlow Web</footer>
    </div>
  );
}
