import { useGetTasksQuery } from '../features/api/apiSlice';
import { LIST_QUERY } from '../features/tasks/taskSelectors';
import {
  CompletionWidget,
  OverdueWidget,
  PriorityWidget,
  StatusWidget,
} from '../features/dashboard/DashboardWidgets';
import styles from '../features/dashboard/Dashboard.module.scss';
import { useToday } from '../hooks/useToday';
import { useTranslation } from 'react-i18next';
import { ActivityFeed } from '../features/activity/ActivityFeed';

/**
 * Loaded lazily (12.09). The page subscribes to one flag; each widget selects its own data (21.17),
 * so an action that doesn't change the tasks re-renders nothing here.
 */
export function DashboardPage() {
  // Only the FLAG: `isLoading` changes once. Selecting `data` here would re-render the page (and all
  // widgets) whenever any task changes; the widgets select what they need themselves (21.17).
  const { isLoading } = useGetTasksQuery(LIST_QUERY, { selectFromResult: ({ isLoading }) => ({ isLoading }) });
  const today = useToday();
  const { t } = useTranslation(['dashboard', 'common']);
  if (isLoading) return <p className="text-muted">{t('common:loading')}</p>;

  return (
    <>
      <h1 className="page__title">{t('title')}</h1>
      <div className={styles.grid}>
        <CompletionWidget />
        <StatusWidget />
        <PriorityWidget />
        <OverdueWidget today={today} />
      </div>
      <ActivityFeed />
    </>
  );
}
