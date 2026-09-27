import { memo, useMemo } from 'react';
import type { TaskStatus } from '../domain/types';
import { TASK_STATUSES } from '../domain/types';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../app/hooks';
import { makeSelectTaskIdsByStatus } from '../features/tasks/taskListSelectors';
import { TaskListItem } from '../features/tasks/TaskListItem';
import styles from './Board.module.scss';

interface BoardProps {
  onToggle: (id: number) => void;
  onEditTitle: (id: number, title: string) => void;
}

export function Board({ onToggle, onEditTitle }: BoardProps) {
  return (
    <div className={styles.board}>
      {TASK_STATUSES.map((status) => (
        <BoardColumn key={status} status={status} onToggle={onToggle} onEditTitle={onEditTitle} />
      ))}
    </div>
  );
}

interface BoardColumnProps {
  status: TaskStatus;
  onToggle: (id: number) => void;
  onEditTitle: (id: number, title: string) => void;
}

const BoardColumn = memo(function BoardColumn({ status, onToggle, onEditTitle }: BoardColumnProps) {
  // One selector INSTANCE per column (21.07): created once per mounted column, never shared.
  const selectTaskIdsByStatus = useMemo(() => makeSelectTaskIdsByStatus(), []);
  const taskIds = useAppSelector((state) => selectTaskIdsByStatus(state, status));
  const headingId = `column-${status}`;
  const { t } = useTranslation(['tasks', 'common']);

  return (
    <section className={styles.column} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        {t(`common:status.${status}`)} <span className={styles.count}>{taskIds.length}</span>
      </h2>
      {taskIds.length === 0 ? (
        <p className={styles.empty}>{t('board.empty')}</p>
      ) : (
        <div className={styles.cards}>
          {taskIds.map((id) => (
            <TaskListItem key={id} taskId={id} onToggle={onToggle} onEditTitle={onEditTitle} />
          ))}
        </div>
      )}
    </section>
  );
});
