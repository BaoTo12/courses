import { useAppSelector } from '../app/hooks';
import { selectTasks, selectTasksStatus } from '../features/tasks/tasksSlice';
import { groupByStatus } from '../domain/task-utils';
import { statusLabel } from '../domain/labels';
import { TASK_STATUSES } from '../domain/types';
import { ProgressRing } from '../components/styled/ProgressRing';
import { Stack } from '../components/styled/Stack';

/** Loaded lazily (12.09): its code is a separate chunk, downloaded on first visit. */
export function DashboardPage() {
  const items = useAppSelector(selectTasks);
  const status = useAppSelector(selectTasksStatus);
  if (status !== 'succeeded' && items.length === 0) return <p className="text-muted">Loading…</p>;

  const groups = groupByStatus(items);
  return (
    <>
      <h1 className="page__title">Dashboard</h1>
      <Stack $direction="row" $gap={6} $align="center" $wrap>
        <ProgressRing done={groups.DONE.length} total={items.length} />
        <dl>
          {TASK_STATUSES.map((s) => (
            <div key={s}>
              <dt className="text-muted">{statusLabel(s)}</dt>
              <dd>{groups[s].length}</dd>
            </div>
          ))}
        </dl>
      </Stack>
    </>
  );
}
