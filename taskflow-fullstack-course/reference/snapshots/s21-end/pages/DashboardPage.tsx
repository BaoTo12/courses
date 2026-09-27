import { useAppSelector } from '../app/hooks';
import { selectTaskCount, selectTasksStatus } from '../features/tasks/tasksSlice';
import {
  CompletionWidget,
  OverdueWidget,
  PriorityWidget,
  StatusWidget,
} from '../features/dashboard/DashboardWidgets';
import styles from '../features/dashboard/Dashboard.module.scss';
import { useToday } from '../hooks/useToday';

/**
 * Loaded lazily (12.09). The page selects only two primitives; each widget selects its own data (21.17),
 * so an action that doesn't change the tasks re-renders nothing here.
 */
export function DashboardPage() {
  const count = useAppSelector(selectTaskCount);
  const status = useAppSelector(selectTasksStatus);
  const today = useToday();
  if (status !== 'succeeded' && count === 0) return <p className="text-muted">Loading…</p>;

  return (
    <>
      <h1 className="page__title">Dashboard</h1>
      <div className={styles.grid}>
        <CompletionWidget />
        <StatusWidget />
        <PriorityWidget />
        <OverdueWidget today={today} />
      </div>
    </>
  );
}
