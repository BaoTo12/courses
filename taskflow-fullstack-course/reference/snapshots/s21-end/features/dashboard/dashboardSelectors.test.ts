import { describe, expect, it, vi } from 'vitest';
import { makeStore } from '../../app/store';
import type { Task } from '../../domain/types';
import { toLocalIsoDate } from '../../hooks/useToday';
import { sortChanged } from '../listPrefs/listPrefsSlice';
import { quickFindChanged } from '../search/quickFindSlice';
import { initialTasksState } from '../tasks/tasksSlice';
import { toggleTaskOnServer } from '../tasks/tasksThunks';
import { toastShown } from '../ui/toastActions';
import { selectCompletionRate, selectOverdueTasks, selectPriorityCounts, selectStatusCounts } from './dashboardSelectors';

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

const storeWith = (...items: Task[]) =>
  makeStore({
    tasks: {
      ...initialTasksState,
      ids: items.map((t) => t.id),
      entities: Object.fromEntries(items.map((t) => [t.id, t])),
      status: 'succeeded',
      fetchedAt: 1,
    },
  });

const TODAY = '2026-09-26';

describe('dashboard selectors (21.17)', () => {
  const sample = () =>
    storeWith(
      task(1, { status: 'DONE', priority: 'HIGH', dueDate: '2026-09-01' }), // done: never overdue
      task(2, { status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2026-09-20' }), // overdue
      task(3, { dueDate: '2026-09-10' }), // overdue, older
      task(4, { dueDate: TODAY }), // due today: not overdue
      task(5, { priority: 'LOW' }), // no due date
    );

  it('computes counts, the completion rate and the overdue list (oldest first)', () => {
    const state = sample().getState();
    expect(selectStatusCounts(state)).toEqual({ TODO: 3, IN_PROGRESS: 1, DONE: 1 });
    expect(selectPriorityCounts(state)).toEqual({ LOW: 1, MEDIUM: 2, HIGH: 2 });
    expect(selectCompletionRate(state)).toBe(20);
    expect(selectOverdueTasks(state, TODAY).map((t) => t.id)).toEqual([3, 2]);
    expect(selectCompletionRate(storeWith().getState())).toBe(0);
  });

  it('returns the SAME results after actions that don’t touch tasks (toast, sort, quick find)', () => {
    const store = sample();
    const before = [
      selectStatusCounts(store.getState()),
      selectPriorityCounts(store.getState()),
      selectOverdueTasks(store.getState(), TODAY),
    ];
    store.dispatch(toastShown({ tone: 'info', message: 'unrelated' }));
    store.dispatch(sortChanged('title', 'desc'));
    store.dispatch(quickFindChanged('x'));
    const after = [
      selectStatusCounts(store.getState()),
      selectPriorityCounts(store.getState()),
      selectOverdueTasks(store.getState(), TODAY),
    ];
    after.forEach((result, index) => expect(result).toBe(before[index]));
  });

  it('recomputes when a task changes', () => {
    const store = sample();
    const overdue = selectOverdueTasks(store.getState(), TODAY);
    store.dispatch(toggleTaskOnServer.fulfilled(task(3, { status: 'DONE', dueDate: '2026-09-10' }), 'r', 3));
    expect(selectOverdueTasks(store.getState(), TODAY).map((t) => t.id)).toEqual([2]);
    expect(selectOverdueTasks(store.getState(), TODAY)).not.toBe(overdue);
    expect(selectCompletionRate(store.getState())).toBe(40);
  });
});

describe('toLocalIsoDate', () => {
  it('formats the LOCAL date, zero-padded', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
