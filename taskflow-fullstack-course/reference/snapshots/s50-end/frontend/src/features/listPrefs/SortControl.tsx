import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { Button } from '../../components/Button';
import type { SortKey } from '../../domain/types';
import { selectSort } from '../tasks/taskListSelectors';
import { sortChanged } from './listPrefsSlice';

const SORT_KEYS: readonly SortKey[] = ['dueDate', 'priority', 'title']; // labels: tasks:sort.<key> (S27)

const isSortKey = (value: string): value is SortKey => SORT_KEYS.some((key) => key === value);

/** The sort PREFERENCE lives in Redux (listPrefs, 15.12), not in the URL: it's the user's habit, not a view. */
export function SortControl() {
  const id = useId();
  const { t } = useTranslation('tasks');
  const sort = useAppSelector(selectSort);
  const dispatch = useAppDispatch();
  const flipped = sort.direction === 'asc' ? 'desc' : 'asc';

  return (
    <div className="form-field form-field--inline">
      <label className="form-field__label" htmlFor={id}>
        {t('sort.label')}
      </label>
      <select
        id={id}
        className="form-field__input"
        value={sort.key}
        onChange={(e) => {
          if (isSortKey(e.target.value)) dispatch(sortChanged(e.target.value, sort.direction));
        }}
      >
        {SORT_KEYS.map((key) => (
          <option key={key} value={key}>
            {t(`sort.${key}`)}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant="secondary"
        aria-label={t('sort.direction', { dir: t(`sort.${sort.direction}`) })}
        onClick={() => dispatch(sortChanged(sort.key, flipped))}
      >
        {sort.direction === 'asc' ? '↑' : '↓'}
      </Button>
    </div>
  );
}
