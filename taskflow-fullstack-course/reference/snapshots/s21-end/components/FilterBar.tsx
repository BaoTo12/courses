import { TASK_STATUSES } from '../domain/types';
import type { TaskStatus } from '../domain/types';
import { statusLabel } from '../domain/labels';
import { Button } from './Button';
import styles from './FilterBar.module.scss';

interface FilterBarProps {
  value: TaskStatus | null;
  onChange: (status: TaskStatus | null) => void;
}

export function FilterBar({ value, onChange }: FilterBarProps) {
  return (
    <div className={styles.bar} role="group" aria-label="Filter by status">
      <Button
        size="sm"
        variant={value === null ? 'primary' : 'secondary'}
        aria-pressed={value === null}
        onClick={() => onChange(null)}
      >
        All
      </Button>
      {TASK_STATUSES.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={value === status ? 'primary' : 'secondary'}
          aria-pressed={value === status}
          onClick={() => onChange(status)}
        >
          {statusLabel(status)}
        </Button>
      ))}
    </div>
  );
}
