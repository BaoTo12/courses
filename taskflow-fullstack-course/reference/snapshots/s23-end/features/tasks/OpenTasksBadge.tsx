import { useAppSelector } from '../../app/hooks';
import { selectOpenTaskCount } from './taskSelectors';

/**
 * "N open" in the header. Selects a NUMBER, so it re-renders only when the count changes:
 * not when a title is edited, not when the sort preference changes, not on toasts (17.13).
 */
export function OpenTasksBadge() {
  const openCount = useAppSelector(selectOpenTaskCount);
  return (
    <span className="badge badge--todo" aria-live="polite" title="Open tasks (to do + in progress)">
      {openCount} open
    </span>
  );
}
