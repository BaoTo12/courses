import type { Priority, TaskStatus } from '../domain/types';
import { toKebab } from '../domain/format';
import { statusLabel } from '../domain/labels';

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`badge badge--${toKebab(status)}`}>{statusLabel(status)}</span>;
}

const PRIORITY_TEXT: Record<Priority, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`badge badge--priority-${toKebab(priority)}`}>{PRIORITY_TEXT[priority]}</span>
  );
}
