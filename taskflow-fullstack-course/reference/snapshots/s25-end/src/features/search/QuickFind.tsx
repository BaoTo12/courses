import { useId } from 'react';
import type { KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { statusLabel } from '../../domain/labels';
import { QUICK_FIND_MIN_LENGTH, quickFindChanged, quickFindClosed, selectQuickFind } from './quickFindSlice';
import styles from './QuickFind.module.scss';

/**
 * Header search across ALL tasks on the server (21.15). The component only dispatches what the user
 * does; debouncing, cancelling and fetching live in a listener (quickFindListener.ts).
 */
export function QuickFind() {
  const id = useId();
  const { query, status, results, error } = useAppSelector(selectQuickFind);
  const dispatch = useAppDispatch();
  const open = query.trim().length >= QUICK_FIND_MIN_LENGTH;

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') dispatch(quickFindClosed());
  }

  return (
    <div className={styles.quickFind}>
      <label className="visually-hidden" htmlFor={id}>
        Quick find
      </label>
      <input
        id={id}
        className="form-field__input"
        type="search"
        placeholder="Quick find…"
        autoComplete="off"
        value={query}
        onChange={(e) => dispatch(quickFindChanged(e.target.value))}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <div className={styles.panel}>
          <p className={styles.status} role="status">
            {status === 'loading' && 'Searching…'}
            {status === 'failed' && error}
            {status === 'succeeded' && results.length === 0 && 'No matching tasks.'}
          </p>
          {status === 'succeeded' && results.length > 0 && (
            <ul className={styles.results}>
              {results.map((result) => (
                <li key={result.id}>
                  <Link to={`/tasks/${result.id}`} onClick={() => dispatch(quickFindClosed())}>
                    {result.title}
                  </Link>{' '}
                  <span className="text-muted">{statusLabel(result.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
