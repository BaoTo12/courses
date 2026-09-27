// S51: due-date reminders, derived from the app-wide list (22.09) with ONE memoised selector (21.04).
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/rootReducer';
import type { IsoDate, Task } from '../../domain/types';
import { selectTasks } from '../tasks/taskSelectors';

export const REMINDER_DAYS = 7;

export interface ReminderDay {
  date: IsoDate;
  tasks: Task[];
}

export interface Reminders {
  /** Not done, due before today: oldest first. */
  overdue: Task[];
  /** Not done, due today … today + 7 days: one group per day that has tasks, in date order. */
  days: ReminderDay[];
}

/** '2026-10-01' + 3 → '2026-10-04', in UTC so no daylight-saving day is ever 23 or 25 hours. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const byDueThenId = (a: Task, b: Task) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || a.id - b.id;

/**
 * `today` is an ARGUMENT (the component's useToday()), not state: the selector stays pure and testable.
 * Recomputes only when the tasks or `today` change; otherwise returns the same object (no re-render).
 */
export const selectReminders = createSelector(
  [selectTasks, (_state: RootState, today: IsoDate) => today],
  (tasks, today): Reminders => {
    const last = addDays(today, REMINDER_DAYS);
    const open = tasks.filter((task) => task.status !== 'DONE' && task.dueDate !== null);
    const overdue = open.filter((task) => (task.dueDate as IsoDate) < today).sort(byDueThenId);
    const upcoming = open.filter((task) => (task.dueDate as IsoDate) >= today && (task.dueDate as IsoDate) <= last).sort(byDueThenId);
    const days: ReminderDay[] = [];
    for (const task of upcoming) {
      const group = days.at(-1);
      if (group && group.date === task.dueDate) group.tasks.push(task);
      else days.push({ date: task.dueDate as IsoDate, tasks: [task] });
    }
    return { overdue, days };
  },
);