// Test helpers (S22): put tasks into RTK Query's cache WITHOUT a request (`util.upsertQueryData`, 22.04),
// so selector and component tests work on the same state shape as the app.
import { makeStore } from '../app/store';
import type { Page } from '../domain/api-types';
import type { Task } from '../domain/types';
import { apiSlice } from '../features/api/apiSlice';
import { LIST_QUERY } from '../features/tasks/taskSelectors';

export const task = (id: number, overrides: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: null,
  categoryId: null,
  ownerId: 1,
  createdAt: 'x',
  updatedAt: 'x',
  ...overrides,
});

export const pageOf = (items: Task[]): Page<Task> => ({
  items,
  page: 0,
  size: 100,
  totalItems: items.length,
  totalPages: 1,
});

type AppTestStore = ReturnType<typeof makeStore>;

/** Replaces the main list's cache entry (what `useGetTasksQuery(LIST_QUERY)` would have loaded). */
export async function setCachedTasks(store: AppTestStore, items: Task[]): Promise<void> {
  await store.dispatch(apiSlice.util.upsertQueryData('getTasks', LIST_QUERY, pageOf(items)));
}

/** A fresh app store whose list cache already holds these tasks. */
export async function storeWithTasks(...items: Task[]): Promise<AppTestStore> {
  const store = makeStore();
  await setCachedTasks(store, items);
  return store;
}
