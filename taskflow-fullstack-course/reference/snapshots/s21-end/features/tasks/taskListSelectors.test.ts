import { describe, expect, it, vi } from 'vitest';
import { makeStore } from '../../app/store';
import type { Task } from '../../domain/types';
import { sortChanged } from '../listPrefs/listPrefsSlice';
import { toastShown } from '../ui/toastActions';
import { initialTasksState } from './tasksSlice';
import type { TasksState } from './tasksSlice';
import { toggleTaskOnServer, saveTaskChanges } from './tasksThunks';
import { makeSelectTaskIdsByStatus, selectSortedTasks, selectTaskStats, selectVisibleTaskIds } from './taskListSelectors';

vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});

const task = (id: number, overrides: Partial<Task> = {}): Task => ({
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

const loaded = (...items: Task[]): TasksState => ({
  ...initialTasksState,
  ids: items.map((t) => t.id),
  entities: Object.fromEntries(items.map((t) => [t.id, t])),
  status: 'succeeded',
  fetchedAt: 1,
});

const sample = () =>
  makeStore({
    tasks: loaded(
      task(1, { title: 'Write report', dueDate: '2026-10-03', priority: 'HIGH' }),
      task(2, { title: 'Book flights', dueDate: '2026-09-30', status: 'DONE' }),
      task(3, { title: 'Review PR', dueDate: null, categoryId: 2 }),
    ),
  });

describe('list selectors (21.05)', () => {
  it('sorts by the preference and filters by the URL arguments', () => {
    const store = sample();
    expect(selectSortedTasks(store.getState()).map((t) => t.id)).toEqual([2, 1, 3]); // dueDate asc, nulls last
    expect(selectVisibleTaskIds(store.getState(), { status: 'TODO' })).toEqual([1, 3]);
    expect(selectVisibleTaskIds(store.getState(), { q: 're' })).toEqual([1, 3]); // "Write REport", "REview PR"
    expect(selectVisibleTaskIds(store.getState(), { categoryId: 2 })).toEqual([3]);

    store.dispatch(sortChanged('title', 'asc'));
    expect(selectVisibleTaskIds(store.getState(), {})).toEqual([2, 3, 1]); // Book, Review, Write
  });

  it('a new filter object with the same values hits the cache (inputs extract primitives)', () => {
    const store = sample();
    const first = selectVisibleTaskIds(store.getState(), { status: 'TODO' });
    const before = selectVisibleTaskIds.recomputations();
    expect(selectVisibleTaskIds(store.getState(), { status: 'TODO' })).toBe(first);
    store.dispatch(toastShown({ tone: 'info', message: 'unrelated' }));
    expect(selectVisibleTaskIds(store.getState(), { status: 'TODO' })).toBe(first);
    expect(selectVisibleTaskIds.recomputations()).toBe(before);
  });

  it('resultEqualityCheck: a change that keeps the same ids returns the SAME ids array', () => {
    const store = sample();
    const first = selectVisibleTaskIds(store.getState(), {});
    store.dispatch(saveTaskChanges.fulfilled(task(3, { title: 'Review PR #42', categoryId: 2 }), 'r', { id: 3, changes: {} }));
    expect(selectVisibleTaskIds(store.getState(), {})).toBe(first); // recomputed, but same ids → cached array
  });

  it('makeSelectTaskIdsByStatus: one instance per column, no thrashing, same array for unrelated changes', () => {
    const store = sample();
    const selectTodo = makeSelectTaskIdsByStatus();
    const selectDone = makeSelectTaskIdsByStatus();
    const todo = selectTodo(store.getState(), 'TODO');
    const done = selectDone(store.getState(), 'DONE');
    expect([todo, done]).toEqual([[1, 3], [2]]);
    store.dispatch(toastShown({ tone: 'info', message: 'x' }));
    expect(selectTodo(store.getState(), 'TODO')).toBe(todo);
    expect(selectDone(store.getState(), 'DONE')).toBe(done);
    expect(selectTodo.recomputations() + selectDone.recomputations()).toBe(2);
  });

  it('selectTaskStats: counts and a rounded percentage; the same object for unrelated actions', async () => {
    const store = sample();
    const stats = selectTaskStats(store.getState());
    expect(stats).toEqual({ total: 3, done: 1, open: 2, completionPercent: 33 });
    store.dispatch(sortChanged('title', 'desc'));
    expect(selectTaskStats(store.getState())).toBe(stats);
    store.dispatch(toggleTaskOnServer.fulfilled(task(1, { status: 'DONE' }), 'r', 1));
    expect(selectTaskStats(store.getState())).toEqual({ total: 3, done: 2, open: 1, completionPercent: 67 });
  });
});
