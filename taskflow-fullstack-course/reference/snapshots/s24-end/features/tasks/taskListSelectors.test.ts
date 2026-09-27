import { describe, expect, it, vi } from 'vitest';
import { setCachedTasks, storeWithTasks, task } from '../../test/task-cache';
import { sortChanged } from '../listPrefs/listPrefsSlice';
import { toastShown } from '../ui/toastActions';
import { makeSelectTaskIdsByStatus, selectCompletedTaskIds, selectSortedTasks, selectTaskStats } from './taskListSelectors';

vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});

// Since S22 the tasks come from RTK Query's cache; the helpers fill it without HTTP (upsertQueryData).
const tasks = [
  task(1, { title: 'Write report', dueDate: '2026-10-03', priority: 'HIGH' }),
  task(2, { title: 'Book flights', dueDate: '2026-09-30', status: 'DONE' }),
  task(3, { title: 'Review PR', dueDate: null, categoryId: 2 }),
];
const sample = () => storeWithTasks(...tasks);

describe('list selectors (21.05)', () => {
  it('sorts by the preference (filtering moved to the server with paging in S23)', async () => {
    const store = await sample();
    expect(selectSortedTasks(store.getState()).map((t) => t.id)).toEqual([2, 1, 3]); // dueDate asc, nulls last
    store.dispatch(sortChanged('title', 'asc'));
    expect(selectSortedTasks(store.getState()).map((t) => t.id)).toEqual([2, 3, 1]); // Book, Review, Write
  });

  it('resultEqualityCheck: a change that keeps the same ids returns the SAME ids array', async () => {
    const store = await sample();
    const selectTodo = makeSelectTaskIdsByStatus();
    const first = selectTodo(store.getState(), 'TODO');
    await setCachedTasks(store, [tasks[0]!, tasks[1]!, task(3, { title: 'Review PR #42', categoryId: 2 })]);
    expect(selectTodo(store.getState(), 'TODO')).toBe(first); // recomputed, but same ids → cached array
  });

  it('makeSelectTaskIdsByStatus: one instance per column, no thrashing, same array for unrelated changes', async () => {
    const store = await sample();
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
    const store = await sample();
    const stats = selectTaskStats(store.getState());
    expect(stats).toEqual({ total: 3, done: 1, open: 2, completionPercent: 33 });
    store.dispatch(sortChanged('title', 'desc'));
    expect(selectTaskStats(store.getState())).toBe(stats);
    await setCachedTasks(store, [task(1, { ...tasks[0], status: 'DONE' }), tasks[1]!, tasks[2]!]);
    expect(selectTaskStats(store.getState())).toEqual({ total: 3, done: 2, open: 1, completionPercent: 67 });
  });

  it('selectCompletedTaskIds: the DONE ids; the same array while they don’t change', async () => {
    const store = await sample();
    const done = selectCompletedTaskIds(store.getState());
    expect(done).toEqual([2]);
    await setCachedTasks(store, [task(1, { ...tasks[0], title: 'Renamed' }), tasks[1]!, tasks[2]!]);
    expect(selectCompletedTaskIds(store.getState())).toBe(done);
  });
});
