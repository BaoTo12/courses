// S21 (21.17): each widget selects ONLY what it shows, so each re-renders only when that data changes.
import { Link } from 'react-router';
import { useAppSelector } from '../../app/hooks';
import { PriorityBadge } from '../../components/Badge';
import { ProgressRing } from '../../components/styled/ProgressRing';
import { statusLabel } from '../../domain/labels';
import { PRIORITIES, TASK_STATUSES } from '../../domain/types';
import type { IsoDate } from '../../domain/types';
import { selectCompletionRate, selectOverdueTasks, selectPriorityCounts, selectStatusCounts } from './dashboardSelectors';
import styles from './Dashboard.module.scss';

export function CompletionWidget() {
  const counts = useAppSelector(selectStatusCounts);
  const rate = useAppSelector(selectCompletionRate); // a number: compared with ===
  const total = counts.TODO + counts.IN_PROGRESS + counts.DONE;
  return (
    <section className={styles.widget} aria-labelledby="completion-heading">
      <h2 id="completion-heading" className={styles.heading}>
        Completion
      </h2>
      <ProgressRing done={counts.DONE} total={total} />
      <p className="text-muted">{rate}% of {total} tasks done</p>
    </section>
  );
}

export function StatusWidget() {
  const counts = useAppSelector(selectStatusCounts); // memoised: the same object until tasks change
  return (
    <section className={styles.widget} aria-labelledby="status-heading">
      <h2 id="status-heading" className={styles.heading}>
        By status
      </h2>
      <dl className={styles.counts}>
        {TASK_STATUSES.map((status) => (
          <div key={status}>
            <dt>{statusLabel(status)}</dt>
            <dd>{counts[status]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function PriorityWidget() {
  const counts = useAppSelector(selectPriorityCounts);
  return (
    <section className={styles.widget} aria-labelledby="priority-heading">
      <h2 id="priority-heading" className={styles.heading}>
        By priority
      </h2>
      <dl className={styles.counts}>
        {PRIORITIES.map((priority) => (
          <div key={priority}>
            <dt>
              <PriorityBadge priority={priority} />
            </dt>
            <dd>{counts[priority]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function OverdueWidget({ today }: { today: IsoDate }) {
  const overdue = useAppSelector((state) => selectOverdueTasks(state, today));
  return (
    <section className={styles.widget} aria-labelledby="overdue-heading">
      <h2 id="overdue-heading" className={styles.heading}>
        Overdue <span className={styles.badge}>{overdue.length}</span>
      </h2>
      {overdue.length === 0 ? (
        <p className="text-muted">Nothing overdue. 🎉</p>
      ) : (
        <ul className={styles.overdue}>
          {overdue.map((task) => (
            <li key={task.id}>
              <Link to={`/tasks/${task.id}`}>{task.title}</Link>
              <span className="text-danger"> due {task.dueDate}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
