// 📦 Provided tests for task-utils.js (run: npm test)
import { describe, it, expect } from 'vitest';
import {
  addTask,
  removeTask,
  toggleTask,
  filterTasks,
  sortTasks,
  updateTaskField,
  groupByStatus,
} from './task-utils.js';

// deepFreeze makes accidental mutation THROW (ES modules run in strict mode).
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

const makeTasks = () =>
  deepFreeze([
    { id: 1, title: 'Write report', status: 'TODO', priority: 'HIGH', dueDate: '2026-10-03' },
    { id: 2, title: 'fix login bug', status: 'IN_PROGRESS', priority: 'MEDIUM', dueDate: null },
    { id: 3, title: 'Plan offsite', status: 'DONE', priority: 'LOW', dueDate: '2026-09-30' },
  ]);

describe('addTask', () => {
  it('returns a new array with the task at the end', () => {
    const tasks = makeTasks();
    const next = addTask(tasks, { id: 4, title: 'New', status: 'TODO', priority: 'LOW', dueDate: null });
    expect(next).toHaveLength(4);
    expect(next).not.toBe(tasks);
    expect(next[3].id).toBe(4);
  });
});

describe('removeTask', () => {
  it('removes by id without mutating', () => {
    const tasks = makeTasks();
    expect(removeTask(tasks, 2).map((t) => t.id)).toEqual([1, 3]);
    expect(tasks).toHaveLength(3);
  });
});

describe('toggleTask', () => {
  it('toggles DONE <-> TODO and keeps other references', () => {
    const tasks = makeTasks();
    const next = toggleTask(tasks, 3);
    expect(next[2].status).toBe('TODO');
    expect(next[2]).not.toBe(tasks[2]); // changed task: new object
    expect(next[0]).toBe(tasks[0]); // unchanged task: SAME object
  });
});

describe('filterTasks', () => {
  it('filters by status, priority and query (case-insensitive)', () => {
    const tasks = makeTasks();
    expect(filterTasks(tasks, { status: 'DONE' }).map((t) => t.id)).toEqual([3]);
    expect(filterTasks(tasks, { priority: 'HIGH' }).map((t) => t.id)).toEqual([1]);
    expect(filterTasks(tasks, { q: '  LOGIN ' }).map((t) => t.id)).toEqual([2]);
    expect(filterTasks(tasks)).toHaveLength(3);
  });
});

describe('sortTasks', () => {
  it('sorts by priority desc without mutating', () => {
    const tasks = makeTasks();
    expect(sortTasks(tasks, 'priority', 'desc').map((t) => t.id)).toEqual([1, 2, 3]);
  });
  it('puts tasks without due date last', () => {
    const tasks = makeTasks();
    expect(sortTasks(tasks, 'dueDate').map((t) => t.id)).toEqual([3, 1, 2]);
    expect(sortTasks(tasks, 'dueDate', 'desc').map((t) => t.id)).toEqual([1, 3, 2]);
  });
});

describe('updateTaskField (04.14)', () => {
  it('replaces one field of one task immutably', () => {
    const tasks = makeTasks();
    const next = updateTaskField(tasks, 1, 'title', 'Write Q3 report');
    expect(next[0].title).toBe('Write Q3 report');
    expect(tasks[0].title).toBe('Write report');
    expect(next[1]).toBe(tasks[1]);
  });
});

describe('groupByStatus (04.14)', () => {
  it('groups tasks by status, always with all three keys', () => {
    const tasks = makeTasks();
    const groups = groupByStatus(tasks);
    expect(Object.keys(groups)).toEqual(['TODO', 'IN_PROGRESS', 'DONE']);
    expect(groups.DONE.map((t) => t.id)).toEqual([3]);
    expect(groupByStatus([])).toEqual({ TODO: [], IN_PROGRESS: [], DONE: [] });
  });
});
