import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link, useLocation } from 'react-router';
import type { Task } from '../domain/types';
import { Button } from './Button';
import { ButtonLink } from './ButtonLink';
import { PriorityBadge, StatusBadge } from './Badge';
import { toKebab } from '../domain/format';
import { PriorityBar } from './styled/PriorityBar';
import styles from './TaskCard.module.scss';

interface TaskCardProps {
  task: Task;
  onToggle: (id: number) => void;
  onEditTitle: (id: number, title: string) => void;
}

export function TaskCard({ task, onToggle, onEditTitle }: TaskCardProps) {
  const location = useLocation();
  // Remember the list URL (with its filters) so the details page can link back to it (12.10).
  const linkState = { listSearch: location.search };
  const isDone = task.status === 'DONE';
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // When editing starts, focus the input (a DOM side effect → an effect with a ref).
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.select();
    }
  }, [isEditing]);

  function startEditing() {
    setDraft(task.title); // start from the current title, not a stale draft
    setIsEditing(true);
  }

  function save() {
    onEditTitle(task.id, draft);
    setIsEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') setIsEditing(false);
  }

  return (
    <article className={`card card--priority-${toKebab(task.priority)}`}>
      {isEditing ? (
        <input
          ref={inputRef}
          className="form-field__input"
          aria-label="Task title"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={save}
        />
      ) : (
        <h3 className="card__title" onDoubleClick={startEditing}>
          <Link to={`/tasks/${task.id}`} state={linkState}>
            {task.title}
          </Link>
        </h3>
      )}
      <p className="card__body">{task.description}</p>
      <footer className="card__meta">
        <div className={styles.badges}>
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          <PriorityBar priority={task.priority} />
        </div>
        <div className={styles.badges}>
          {!isEditing && (
            <ButtonLink size="sm" to={`/tasks/${task.id}/edit`} state={linkState}>
              Edit
            </ButtonLink>
          )}
          <Button size="sm" onClick={() => onToggle(task.id)}>
            {isDone ? 'Reopen' : 'Mark done'}
          </Button>
        </div>
      </footer>
      {task.dueDate && <p className={styles.due}>Due {task.dueDate}</p>}
    </article>
  );
}
