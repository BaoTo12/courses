// S51: the reminders selector: grouping, bounds, and memoisation (same input → same object).
import { describe, expect, it } from 'vitest';
import { makeStore } from '../../app/store';
import type { Task } from '../../domain/types';
import { apiSlice } from '../api/apiSlice';
import { LIST_QUERY } from '../tasks/taskSelectors';
import { addDays, selectReminders } from './reminderSelectors';

const task = (id: number, dueDate: string | null, status: Task['status'] = 'TODO'): Task => ({
  id, title: `Task ${id}`, description: '', status, priority: 'MEDIUM', dueDate, categoryId: null, ownerId: 1,
  createdAt: '2026-09-01T08:00:00Z', updatedAt: '2026-09-01T08:00:00Z',
});

async function storeWith(tasks: Task[]) {
  const store = makeStore();
  await store.dispatch(
    apiSlice.util.upsertQueryData('getTasks', LIST_QUERY, { items: tasks, page: 0, size: 100, totalItems: tasks.length, totalPages: 1 }),
  );
  return store;
}

describe('reminders (S51)', () => {
  it('adds days across a month end', () => {
    expect(addDays('2026-09-28', 7)).toBe('2026-10-05');
  });

  it('groups open tasks by due day within 7 days, and lists overdue ones first', async () => {
    const store = await storeWith([
      task(1, '2026-10-03'),
      task(2, '2026-10-01'),
      task(3, '2026-10-03'),
      task(4, '2026-09-20'),               // overdue
      task(5, '2026-10-09'),               // today + 8: out
      task(6, '2026-10-02', 'DONE'),       // done: out
      task(7, null),                       // no due date: out
      task(8, '2026-10-08'),               // today + 7: in
    ]);
    const reminders = selectReminders(store.getState(), '2026-10-01');
    expect(reminders.overdue.map((t) => t.id)).toEqual([4]);
    expect(reminders.days.map((d) => [d.date, d.tasks.map((t) => t.id)])).toEqual([
      ['2026-10-01', [2]],
      ['2026-10-03', [1, 3]],
      ['2026-10-08', [8]],
    ]);
  });

  it('returns the same object while neither the tasks nor today change', async () => {
    const store = await storeWith([task(1, '2026-10-03')]);
    const first = selectReminders(store.getState(), '2026-10-01');
    expect(selectReminders(store.getState(), '2026-10-01')).toBe(first);
    expect(selectReminders(store.getState(), '2026-10-02')).not.toBe(first);
  });
});