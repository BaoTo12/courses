import type { Task, TaskStatus } from '../domain/types';
import { TASK_STATUSES } from '../domain/types';
import { groupByStatus } from '../domain/task-utils';
import { statusLabel } from '../domain/labels';
import { TaskCard } from './TaskCard';
import styles from './Board.module.scss';

interface BoardProps {
  tasks: readonly Task[];
  onToggle: (id: number) => void;
  onEditTitle: (id: number, title: string) => void;
}

export function Board({ tasks, onToggle, onEditTitle }: BoardProps) {
  const groups = groupByStatus(tasks);

  return (
    <div className={styles.board}>
      {TASK_STATUSES.map((status) => (
        <BoardColumn key={status} status={status} tasks={groups[status]} onToggle={onToggle} onEditTitle={onEditTitle} />
      ))}
    </div>
  );
}

interface BoardColumnProps {
  status: TaskStatus;
  tasks: readonly Task[];
  onToggle: (id: number) => void;
  onEditTitle: (id: number, title: string) => void;
}

function BoardColumn({ status, tasks, onToggle, onEditTitle }: BoardColumnProps) {
  const headingId = `column-${status}`;

  return (
    <section className={styles.column} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        {statusLabel(status)} <span className={styles.count}>{tasks.length}</span>
      </h2>
      {tasks.length === 0 ? (
        <p className={styles.empty}>Nothing here.</p>
      ) : (
        <div className={styles.cards}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onToggle={onToggle} onEditTitle={onEditTitle} />
          ))}
        </div>
      )}
    </section>
  );
}
