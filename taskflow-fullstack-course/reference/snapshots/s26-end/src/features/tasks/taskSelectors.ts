// S22: the tasks now live in RTK Query's CACHE (state.api), not in a slice. These selectors read the
// cache entry of the main list query, so every S19–S21 selector, component and test that used
// `selectTasks` / `selectTaskById` keeps working unchanged.
import { createSelector } from '@reduxjs/toolkit';
import type { TaskQuery } from '../../api/tasks';
import type { RootState } from '../../app/rootReducer';
import type { Task } from '../../domain/types';
import { apiSlice } from '../api/apiSlice';

/**
 * THE argument of the app's main list query. Every `useGetTasksQuery(LIST_QUERY)` shares one cache entry
 * (arguments are compared by value), and the selectors below read that same entry.
 * Until pagination arrives (S23), the list loads the first 100 tasks: the API's maximum page size.
 */
export const LIST_QUERY: TaskQuery = { size: 100 };

const NO_TASKS: Task[] = []; // one constant empty array: "no data yet" must be a STABLE reference (21.02)

/** The whole cache entry: data, status flags, error. */
export const selectTasksResult = apiSlice.endpoints.getTasks.select(LIST_QUERY);

/** The tasks, in the server's order. Same array until the cache entry's data changes (structural sharing, 22.06). */
export const selectTasks = createSelector([selectTasksResult], (result) => result.data?.items ?? NO_TASKS);

/** id → task, for O(1) lookups (the S19 `entities`, derived now instead of stored). */
export const selectTaskEntities = createSelector([selectTasks], (tasks) => {
  const entities: Record<number, Task> = {};
  for (const task of tasks) entities[task.id] = task;
  return entities;
});

/** Returns the task object from the cache: the same reference while that task is unchanged. */
export const selectTaskById = (state: RootState, id: number): Task | undefined => selectTaskEntities(state)[id];

/** A task from the main list, or else from its own `getTask(id)` entry (23.05). Not memoized: for effects, not for rendering. */
export const selectCachedTask = (state: RootState, id: number): Task | undefined =>
  selectTaskById(state, id) ?? apiSlice.endpoints.getTask.select(id)(state).data;

export const selectTaskCount =(state: RootState): number => selectTasks(state).length;

/** A number (a primitive): `useSelector` compares it with ===, so no memoization needed (21.09). */
export const selectOpenTaskCount = (state: RootState): number =>
  selectTasks(state).filter((task) => task.status !== 'DONE').length;
