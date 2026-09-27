import type { Priority, TaskStatus } from './types';
import { assertNever } from './guards';

/** Exhaustive switch: adding a status to TASK_STATUSES breaks the build here. (06.12) */
export function statusLabel(status: TaskStatus): string {
  switch (status) {
    case 'TODO':
      return 'To do';
    case 'IN_PROGRESS':
      return 'In progress';
    case 'DONE':
      return 'Done';
    default:
      return assertNever(status);
  }
}

/** Alternative: a Record lookup table. Also exhaustive (missing key = compile error). */
export const PRIORITY_COLOR: Record<Priority, string> = {
  LOW: '#14b8a6',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
};

export function priorityColor(priority: Priority): string {
  return PRIORITY_COLOR[priority];
}
