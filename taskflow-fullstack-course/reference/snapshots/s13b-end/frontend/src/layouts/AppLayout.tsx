import { NavLink, Outlet, useNavigate } from 'react-router';
import { ThemeToggle } from '../components/ThemeToggle';
import { Avatar } from '../components/styled/Avatar';
import { Stack } from '../components/styled/Stack';
import { Button } from '../components/Button';
import { useAuth } from '../auth/auth-context';

/** NavLink passes { isActive } so the active link gets the design system's modifier class. */
const navClass = ({ isActive }: { isActive: boolean }) =>
  `page__nav-link${isActive ? ' page__nav-link--active' : ''}`;

/** The shell shared by every page: header + nav, the current page (<Outlet/>), footer. */
export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/tasks', { replace: true });
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
          <ThemeToggle />
          {user ? (
            <>
              <Avatar name={user.displayName} size="sm" />
              <Button size="sm" onClick={handleLogout}>
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
