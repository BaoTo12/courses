import { TASK_STATUSES } from '../domain/types';
import type { TaskStatus } from '../domain/types';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import styles from './FilterBar.module.scss';

interface FilterBarProps {
  value: TaskStatus | null;
  onChange: (status: TaskStatus | null) => void;
}

export function FilterBar({ value, onChange }: FilterBarProps) {
  const { t } = useTranslation(['tasks', 'common']);
  return (
    <div className={styles.bar} role="group" aria-label={t('filter.label')}>
      <Button
        size="sm"
        variant={value === null ? 'primary' : 'secondary'}
        aria-pressed={value === null}
        onClick={() => onChange(null)}
      >
        {t('filter.all')}
      </Button>
      {TASK_STATUSES.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={value === status ? 'primary' : 'secondary'}
          aria-pressed={value === status}
          onClick={() => onChange(status)}
        >
          {t(`common:status.${status}`)}
        </Button>
      ))}
    </div>
  );
}
