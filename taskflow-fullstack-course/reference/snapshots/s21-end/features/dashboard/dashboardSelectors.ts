// S21 (21.17 exercise): the dashboard's derived data. Each selector is memoised on the task list only,
// so actions that don't touch tasks (toasts, sort, quick find) return the SAME results → no re-render.
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/rootReducer';
import { countByPriority, groupByStatus, isOverdue } from '../../domain/task-utils';
import type { IsoDate, Priority, Task, TaskStatus } from '../../domain/types';
import { selectTasks } from '../tasks/tasksSlice';

/** { TODO: 7, IN_PROGRESS: 5, DONE: 10 } */
export const selectStatusCounts = createSelector([selectTasks], (tasks): Record<TaskStatus, number> => {
  const groups = groupByStatus(tasks);
  return { TODO: groups.TODO.length, IN_PROGRESS: groups.IN_PROGRESS.length, DONE: groups.DONE.length };
});

/** { LOW: 4, MEDIUM: 11, HIGH: 7 } */
export const selectPriorityCounts = createSelector([selectTasks], (tasks): Record<Priority, number> => countByPriority(tasks));

/**
 * 0–100. Returns a NUMBER: useSelector compares it with ===, so it needs no memoisation of its own
 * (it reuses the memoised counts only to avoid counting twice).
 */
export const selectCompletionRate = (state: RootState): number => {
  const counts = selectStatusCounts(state);
  const total = counts.TODO + counts.IN_PROGRESS + counts.DONE;
  return total === 0 ? 0 : Math.round((counts.DONE / total) * 100);
};

/**
 * Open tasks due before `today`, oldest first. `today` is an ARGUMENT: a selector must not read the
 * clock (the same state must always give the same result, 15.04), so the component passes the date.
 */
export const selectOverdueTasks = createSelector(
  [selectTasks, (_state: RootState, today: IsoDate) => today],
  (tasks, today): Task[] =>
    tasks.filter((task) => isOverdue(task, today)).sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')),
);
