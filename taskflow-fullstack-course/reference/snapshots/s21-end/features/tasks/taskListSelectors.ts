// S21: selectors for the task list and board. They combine the tasks slice with the listPrefs slice
// (the sort preference) and with ARGUMENTS from the URL (filters), so they live beside, not in, the slice.
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/rootReducer';
import { filterTasks, sortTasks } from '../../domain/task-utils';
import type { TaskFilter, TaskStatus } from '../../domain/types';
import { selectTasks } from './tasksSlice';

/** Two arrays with the same items in the same order (compared with ===). */
function sameItems(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/**
 * For selectors returning id arrays: when the NEW result has the same ids as the cached one,
 * return the cached array. Toggling one task then doesn't give the list a new `ids` prop (21.08).
 */
const keepSameIds = { memoizeOptions: { resultEqualityCheck: sameItems } };

export const selectSort = (state: RootState) => state.listPrefs.sort;

/** All tasks, sorted by the user's preference. Recomputes only when the tasks or the sort change. */
export const selectSortedTasks = createSelector([selectTasks, selectSort], (tasks, sort) =>
  sortTasks(tasks, sort.key, sort.direction),
);

/**
 * The ids of the tasks the list shows, for the URL's filters (passed as an ARGUMENT, 21.06).
 * The input selectors extract PRIMITIVES from the filter object, so a new `{ … }` literal on every
 * render still hits the cache when the values are the same (21.09).
 */
export const selectVisibleTaskIds = createSelector(
  [
    selectSortedTasks,
    (_state: RootState, filter: TaskFilter) => filter.status,
    (_state: RootState, filter: TaskFilter) => filter.categoryId,
    (_state: RootState, filter: TaskFilter) => filter.q,
  ],
  (tasks, status, categoryId, q) => filterTasks(tasks, { status, categoryId, q }).map((task) => task.id),
  keepSameIds,
);

/**
 * A selector FACTORY (21.07): each board column creates its own instance with useMemo, so each
 * instance caches its own column, whatever memoizer the project uses.
 */
export const makeSelectTaskIdsByStatus = () =>
  createSelector(
    [selectSortedTasks, (_state: RootState, status: TaskStatus) => status],
    (tasks, status) => tasks.filter((task) => task.status === status).map((task) => task.id),
    keepSameIds,
  );

export interface TaskStats {
  total: number;
  done: number;
  open: number;
  /** 0–100, rounded; 0 when there are no tasks. */
  completionPercent: number;
}

/** Counts for the list header's progress ring. The same object until the tasks change. */
export const selectTaskStats = createSelector([selectTasks], (tasks): TaskStats => {
  const done = tasks.filter((task) => task.status === 'DONE').length;
  return {
    total: tasks.length,
    done,
    open: tasks.length - done,
    completionPercent: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100),
  };
});
