import { describe, expect, it, vi } from 'vitest';
import * as realApi from '../../api';
import { makeStore } from '../../app/store';
import { normalize } from '../../domain/normalize';
import { pickFormErrors } from '../../domain/task-form';
import type { Category, Task } from '../../domain/types';
import { taskUpdated } from '../tasks/tasksSlice';
import { toastShown } from '../ui/uiSlice';
import { selectCategories, selectCategoryById, selectTaskCountsByCategory } from './categoriesSlice';
import { fetchCategoriesIfNeeded } from './categoriesThunks';

vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});

const categories: Category[] = [
  { id: 1, name: 'Work', color: '#2563eb' },
  { id: 2, name: 'Personal', color: '#d97706' },
];
const task = (id: number, categoryId: number | null): Task => ({
  id,
  title: `Task ${id}`,
  description: '',
  status: 'TODO',
  priority: 'LOW',
  dueDate: null,
  categoryId,
  ownerId: 1,
  createdAt: 'x',
  updatedAt: 'x',
});

describe('categories', () => {
  it('fetchCategoriesIfNeeded loads once, normalised', async () => {
    const getCategories = vi.fn(async () => categories);
    const store = makeStore(undefined, { api: { ...realApi, getCategories } });
    await store.dispatch(fetchCategoriesIfNeeded());
    await store.dispatch(fetchCategoriesIfNeeded()); // already loaded: skipped
    expect(getCategories).toHaveBeenCalledTimes(1);
    expect(store.getState().categories).toMatchObject({ ids: [1, 2], status: 'succeeded' });
    expect(selectCategoryById(store.getState(), 2)?.name).toBe('Personal');
    expect(selectCategoryById(store.getState(), null)).toBeUndefined();
    expect(selectCategories(store.getState()).map((c) => c.name)).toEqual(['Work', 'Personal']);
  });

  it('selectTaskCountsByCategory counts per category, and is memoised on the task list', () => {
    const store = makeStore({
      tasks: { ...normalize([task(1, 1), task(2, 1), task(3, 2), task(4, null)]), status: 'succeeded', error: null, currentRequestId: null, fetchedAt: 1 },
    });
    const counts = selectTaskCountsByCategory(store.getState());
    expect(counts).toEqual({ byCategory: { 1: 2, 2: 1 }, uncategorized: 1 });

    store.dispatch(toastShown({ tone: 'info', message: 'unrelated' }));
    expect(selectTaskCountsByCategory(store.getState())).toBe(counts); // same object: no re-render

    store.dispatch(taskUpdated(task(4, 2)));
    expect(selectTaskCountsByCategory(store.getState())).toEqual({ byCategory: { 1: 2, 2: 2 }, uncategorized: 0 });
  });
});

describe('pickFormErrors (19.09)', () => {
  it('keeps only the form fields, and formats the message', () => {
    expect(pickFormErrors({ title: 'a task with this title already exists', ownerId: 'nope', categoryId: 'x' })).toEqual({
      title: 'A task with this title already exists.',
    });
  });
});
