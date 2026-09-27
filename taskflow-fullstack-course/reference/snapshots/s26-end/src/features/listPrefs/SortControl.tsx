import { useId } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { Button } from '../../components/Button';
import type { SortKey } from '../../domain/types';
import { selectSort } from '../tasks/taskListSelectors';
import { sortChanged } from './listPrefsSlice';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'dueDate', label: 'Due date' },
  { key: 'priority', label: 'Priority' },
  { key: 'title', label: 'Title' },
];

const isSortKey = (value: string): value is SortKey => SORT_OPTIONS.some((option) => option.key === value);

/** The sort PREFERENCE lives in Redux (listPrefs, 15.12), not in the URL: it's the user's habit, not a view. */
export function SortControl() {
  const id = useId();
  const sort = useAppSelector(selectSort);
  const dispatch = useAppDispatch();
  const flipped = sort.direction === 'asc' ? 'desc' : 'asc';

  return (
    <div className="form-field form-field--inline">
      <label className="form-field__label" htmlFor={id}>
        Sort by
      </label>
      <select
        id={id}
        className="form-field__input"
        value={sort.key}
        onChange={(e) => {
          if (isSortKey(e.target.value)) dispatch(sortChanged(e.target.value, sort.direction));
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant="secondary"
        aria-label={`Sort direction: ${sort.direction === 'asc' ? 'ascending' : 'descending'}`}
        onClick={() => dispatch(sortChanged(sort.key, flipped))}
      >
        {sort.direction === 'asc' ? '↑' : '↓'}
      </Button>
    </div>
  );
}
