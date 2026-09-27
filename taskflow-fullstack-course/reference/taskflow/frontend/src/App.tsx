import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AppLayout } from './layouts/AppLayout';
import { RequireAuth } from './auth/RequireAuth';
import { TasksPage } from './pages/TasksPage';
import { TaskDetailsPage } from './pages/TaskDetailsPage';
import { NewTaskPage } from './pages/NewTaskPage';
import { EditTaskPage } from './pages/EditTaskPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RemindersPage } from './pages/RemindersPage';
import { ProfilePage } from './pages/ProfilePage';

// Code splitting (12.09): the dashboard's code is downloaded on first visit.
// React.lazy expects a default export; our modules use named exports, so we adapt it.
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="login" element={<LoginPage />} />
        {/* S24: every page below needs a session (the API answers 401 otherwise). One guard for all. */}
        <Route element={<RequireAuth />}>
          <Route index element={<Navigate to="/tasks" replace />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="tasks/new" element={<NewTaskPage />} />
          <Route path="tasks/:id" element={<TaskDetailsPage />} />
          <Route path="tasks/:id/edit" element={<EditTaskPage />} />
          <Route path="reminders" element={<RemindersPage />} /> {/* S51 */}
          <Route path="profile" element={<ProfilePage />} /> {/* S51 */}
          <Route
            path="dashboard"
            element={
              <Suspense fallback={<p className="text-muted">Loading dashboard…</p>}>
                <DashboardPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
