import { useTranslation } from 'react-i18next';
import styles from './TaskListSkeleton.module.scss';

/**
 * S27: placeholder cards while the FIRST page loads (isLoading, 22.05). Same grid as the real list, so nothing
 * jumps when the data arrives. Screen readers get one "Loading tasks…" status instead of empty boxes.
 */
export function TaskListSkeleton({ count = 3 }: { count?: number }) {
  const { t } = useTranslation('tasks');
  return (
    <div className="task-grid" aria-busy="true">
      <span role="status" className="visually-hidden">
        {t('loadingList')}
      </span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`card ${styles.skeleton}`} aria-hidden="true">
          <div className={styles.line} style={{ width: '60%' }} />
          <div className={styles.line} />
          <div className={styles.line} style={{ width: '40%' }} />
        </div>
      ))}
    </div>
  );
}
