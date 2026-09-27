import type { Priority, SortDirection, SortKey, Task, TaskFilter, TaskStatus } from './types';

export function addTask(tasks: readonly Task[], task: Task): Task[] {
  return [...tasks, task];
}

export function removeTask(tasks: readonly Task[], id: number): Task[] {
  return tasks.filter((task) => task.id !== id);
}

export function toggleTask(tasks: readonly Task[], id: number): Task[] {
  return tasks.map((task) =>
    task.id === id ? { ...task, status: task.status === 'DONE' ? 'TODO' : 'DONE' } : task,
  );
}

export function filterTasks(tasks: readonly Task[], { status, priority, categoryId, q }: TaskFilter = {}): Task[] {
  const query = q?.trim().toLowerCase();
  return tasks.filter(
    (task) =>
      (!status || task.status === status) &&
      (!priority || task.priority === priority) &&
      (categoryId === undefined || task.categoryId === categoryId) &&
      (!query || task.title.toLowerCase().includes(query)),
  );
}

const PRIORITY_RANK: Record<Priority, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

export function sortTasks(
  tasks: readonly Task[],
  key: SortKey,
  direction: SortDirection = 'asc',
): Task[] {
  const factor = direction === 'desc' ? -1 : 1;
  return tasks.toSorted((a, b) => {
    let result: number;
    if (key === 'priority') {
      result = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    } else if (key === 'dueDate') {
      if (a.dueDate === b.dueDate) return 0;
      if (a.dueDate === null) return 1;
      if (b.dueDate === null) return -1;
      result = a.dueDate.localeCompare(b.dueDate);
    } else {
      result = a.title.localeCompare(b.title);
    }
    return result * factor;
  });
}

export function updateTaskField<K extends keyof Task>(
  tasks: readonly Task[],
  id: number,
  field: K,
  value: Task[K],
): Task[] {
  return tasks.map((task) => (task.id === id ? { ...task, [field]: value } : task));
}

export function groupByStatus(tasks: readonly Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
  for (const task of tasks) {
    groups[task.status].push(task);
  }
  return groups;
}

/** A task is overdue if it has a due date before `today` and is not DONE. */
export function isOverdue(task: Task, today: string): boolean {
  return task.status !== 'DONE' && task.dueDate !== null && task.dueDate < today;
}

export function countByPriority(tasks: readonly Task[]): Record<Priority, number> {
  const counts: Record<Priority, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  for (const task of tasks) {
    counts[task.priority] += 1;
  }
  return counts;
}
