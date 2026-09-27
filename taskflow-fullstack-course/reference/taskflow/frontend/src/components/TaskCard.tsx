import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { formatDue } from '../i18n/format';
import { useToday } from '../hooks/useToday';
import type { Task } from '../domain/types';
import { Button } from './Button';
import { PriorityBadge, StatusBadge } from './Badge';
import { toKebab } from '../domain/format';
import { PriorityBar } from './styled/PriorityBar';
import { TaskCategoryTag } from '../features/categories/TaskCategoryTag';
import styles from './TaskCard.module.scss';

interface TaskCardProps {
  task: Task;
  onToggle: (id: number) => void;
  onEditTitle: (id: number, title: string) => void;
  /** S27 bulk actions: present only in the list view. */
  selected?: boolean;
  onSelect?: (id: number) => void;
  /** S51: a task shared with the user: no toggle, no edit, a "shared" badge instead. */
  readOnly?: boolean;
}

export function TaskCard({ task, onToggle, onEditTitle, selected, onSelect, readOnly = false }: TaskCardProps) {
  const { t, i18n } = useTranslation('tasks');
  const today = useToday();
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
    setIsEditing(false);
    const title = draft.trim();
    // Nothing to save. Checked HERE, where the current title is known, so the parent's callback
    // doesn't need the task list and can stay stable for React.memo (21.11).
    if (title === '' || title === task.title) return;
    onEditTitle(task.id, title);
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
          aria-label={t('card.titleInput')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={save}
        />
      ) : (
        <h3 className="card__title" onDoubleClick={readOnly ? undefined : startEditing}>
          {onSelect && (
            <input
              type="checkbox"
              checked={selected ?? false}
              onChange={() => onSelect(task.id)}
              aria-label={t('card.select', { title: task.title })}
            />
          )}{' '}
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
          <TaskCategoryTag categoryId={task.categoryId} />
        </div>
        {readOnly ? (
          <span className="badge">{t('card.shared')}</span>
        ) : (
          <div className={styles.badges}>
            {!isEditing && (
              <Link className="btn btn--secondary btn--sm" to={`/tasks/${task.id}/edit`} state={linkState}>
                {t('card.edit')}
              </Link>
            )}
            <Button size="sm" onClick={() => onToggle(task.id)}>
              {isDone ? t('card.reopen') : t('card.markDone')}
            </Button>
          </div>
        )}
      </footer>
      {task.dueDate && <p className={styles.due}>{t('card.due', { date: formatDue(task.dueDate, today, i18n.language) })}</p>}
    </article>
  );
}
