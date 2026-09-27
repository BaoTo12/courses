# S06 Reference: the TypeScript Playground at the End of S06

> Verified: `tsc --noEmit` (TypeScript 7.0) with **no errors**; Vitest 5: **4 test files, 22 tests passed**.
> These files move into the React app (`frontend/src/…`) in S07.

---

## `playground/ts/tsconfig.json`

```json
{
  "compilerOptions": {
    /* Language & environment */
    "target": "es2023",
    "lib": ["es2023", "dom", "dom.iterable"],

    /* Modules: we use a bundler (Vite) / test runner (Vitest), not tsc, to run code */
    "module": "esnext",
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noEmit": true,

    /* Type-checking strictness */
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,

    "skipLibCheck": true
  },
  "include": ["src"]
}
```

---

## `playground/ts/package.json`

```json
{
  "name": "playground-ts",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
  "devDependencies": {
    "typescript": "^7.0.2",
    "vite": "^8.3.1",
    "vitest": "^5.0.1"
  }
}
```

---

## `playground/ts/src/domain.ts`

```ts
// TaskFlow domain model = the JSON contract of the API (02-project-spec.md §5).
// Values first (usable at runtime), types derived from them (06.05).

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type Priority = (typeof PRIORITIES)[number];

export type Role = 'USER' | 'ADMIN';

/** '2026-10-03' */
export type IsoDate = string;
/** '2026-10-01T09:30:00Z' */
export type IsoDateTime = string;

export interface HasId {
  id: number;
}

export interface Task extends HasId {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: IsoDate | null;
  categoryId: number | null;
  ownerId: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Category extends HasId {
  name: string;
  color: string;
}

export interface User extends HasId {
  username: string;
  displayName: string;
  role: Role;
  locale: 'en' | 'vi';
}

export interface Comment extends HasId {
  taskId: number;
  authorId: number;
  body: string;
  createdAt: IsoDateTime;
}

export interface TaskFilter {
  status?: TaskStatus;
  priority?: Priority;
  categoryId?: number;
  q?: string;
}

export type SortKey = 'title' | 'priority' | 'dueDate';
export type SortDirection = 'asc' | 'desc';
```

---

## `playground/ts/src/api-types.ts`

```ts
import type { Task } from './domain';

// ── Requests: what the client SENDS ─────────────────────────────────────────

/** Fields the server generates or controls are excluded: the client can't set them. */
export type CreateTaskRequest = Omit<Task, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;

/** PATCH semantics: any subset of the editable fields. */
export type UpdateTaskRequest = Partial<CreateTaskRequest>;

// ── Responses: what the server RETURNS ──────────────────────────────────────

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

/** Standard error body for every non-2xx response. */
export interface ApiError {
  status: number;
  error: string;
  message: string;
  fieldErrors?: Record<string, string>;
  path: string;
  timestamp: string;
}

// ── Client-side request lifecycle ──────────────────────────────────────────

export type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'succeeded'; data: T }
  | { status: 'failed'; error: string };
```

---

## `playground/ts/src/guards.ts`

```ts
import { PRIORITIES, TASK_STATUSES } from './domain';
import type { Priority, Task, TaskStatus } from './domain';
import type { ApiError } from './api-types';

/** Compile-time exhaustiveness helper: only callable with `never`. */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value);
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value);
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

export function isTask(value: unknown): value is Task {
  return (
    isObject(value) &&
    typeof value.id === 'number' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    isTaskStatus(value.status) &&
    isPriority(value.priority) &&
    isStringOrNull(value.dueDate) &&
    (value.categoryId === null || typeof value.categoryId === 'number') &&
    typeof value.ownerId === 'number' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

export function isApiError(value: unknown): value is ApiError {
  return (
    isObject(value) &&
    typeof value.status === 'number' &&
    typeof value.error === 'string' &&
    typeof value.message === 'string'
  );
}

/** Assertion function: returns normally only if value is a Task; narrows the caller's variable. */
export function assertIsTask(value: unknown): asserts value is Task {
  if (!isTask(value)) {
    throw new Error('Invalid task payload');
  }
}

/** Turn anything thrown into a readable message. `catch (e)` gives `unknown` under strict. */
export function toErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unexpected error';
}
```

---

## `playground/ts/src/generic-utils.ts`

```ts
import type { HasId } from './domain';

/** Find an entity by id in any list of things that have an id. */
export function findById<T extends HasId>(items: readonly T[], id: number): T | undefined {
  return items.find((item) => item.id === id);
}

/** Index a list by id: [{id:1,…}] → { 1: {id:1,…} } */
export function indexById<T extends HasId>(items: readonly T[]): Record<number, T> {
  const byId: Record<number, T> = {};
  for (const item of items) {
    byId[item.id] = item;
  }
  return byId;
}

/** Group by the value of a property. Keys only exist for values that occur. (06.12) */
export function groupBy<T, K extends keyof T>(
  items: readonly T[],
  key: K,
): Map<T[K], T[]> {
  const groups = new Map<T[K], T[]>();
  for (const item of items) {
    const groupKey = item[key];
    const group = groups.get(groupKey);
    if (group) {
      group.push(item);
    } else {
      groups.set(groupKey, [item]);
    }
  }
  return groups;
}
```

---

## `playground/ts/src/labels.ts`

```ts
import type { Priority, TaskStatus } from './domain';
import { assertNever } from './guards';

/** Exhaustive switch: adding a status to TASK_STATUSES breaks the build here. (06.12) */
export function statusLabel(status: TaskStatus): string {
  switch (status) {
    case 'TODO':
      return 'To do';
    case 'IN_PROGRESS':
      return 'In progress';
    case 'DONE':
      return 'Done';
    default:
      return assertNever(status);
  }
}

/** Alternative: a Record lookup table. Also exhaustive (missing key = compile error). */
export const PRIORITY_COLOR: Record<Priority, string> = {
  LOW: '#14b8a6',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
};

export function priorityColor(priority: Priority): string {
  return PRIORITY_COLOR[priority];
}
```

---

## `playground/ts/src/request-state.ts`

```ts
import type { RequestState } from './api-types';
import { assertNever } from './guards';

export const idle = <T>(): RequestState<T> => ({ status: 'idle' });
export const loading = <T>(): RequestState<T> => ({ status: 'loading' });
export const succeeded = <T>(data: T): RequestState<T> => ({ status: 'succeeded', data });
export const failed = <T>(error: string): RequestState<T> => ({ status: 'failed', error });

/** Return the data if the request succeeded, otherwise a fallback. */
export function dataOr<T>(state: RequestState<T>, fallback: T): T {
  return state.status === 'succeeded' ? state.data : fallback;
}

/** Describe any request state for a status line. Exhaustive. */
export function describe<T>(state: RequestState<T>, describeData: (data: T) => string): string {
  switch (state.status) {
    case 'idle':
      return '';
    case 'loading':
      return 'Loading…';
    case 'succeeded':
      return describeData(state.data);
    case 'failed':
      return `Something went wrong: ${state.error}`;
    default:
      return assertNever(state);
  }
}
```

---

## `playground/ts/src/task-utils.ts`

```ts
import type { Priority, SortDirection, SortKey, Task, TaskFilter, TaskStatus } from './domain';

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

export function filterTasks(tasks: readonly Task[], { status, priority, q }: TaskFilter = {}): Task[] {
  const query = q?.trim().toLowerCase();
  return tasks.filter(
    (task) =>
      (!status || task.status === status) &&
      (!priority || task.priority === priority) &&
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
```

---

## `playground/ts/src/api.ts`

```ts
import type { Task } from './domain';
import { isApiError, isTask } from './guards';

/**
 * Load tasks from a JSON document shaped like { "tasks": [ ... ] }.
 * The response body is untrusted: treated as `unknown` and fully validated (06.08).
 */
export async function loadTasks(url: string): Promise<Task[]> {
  const response = await fetch(url);
  const data: unknown = await response.json();

  if (!response.ok) {
    const detail = isApiError(data) ? data.message : `HTTP ${response.status}`;
    throw new Error(`Failed to load tasks: ${detail}`);
  }

  if (typeof data === 'object' && data !== null && 'tasks' in data && Array.isArray(data.tasks)) {
    const items: unknown[] = data.tasks;
    if (items.every(isTask)) {
      return items; // narrowed to Task[] by the type guard
    }
  }

  throw new Error('Invalid response: expected { tasks: Task[] }');
}
```

---

## `playground/ts/src/task-utils.test.ts`

```ts
// 📦 Provided tests for task-utils.ts (run: npm test; type-check: npm run typecheck)
import { describe, it, expect } from 'vitest';
import type { Task } from './domain';
import {
  addTask,
  removeTask,
  toggleTask,
  filterTasks,
  sortTasks,
  updateTaskField,
  groupByStatus,
  isOverdue,
  countByPriority,
} from './task-utils';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

const task = (overrides: Partial<Task> & Pick<Task, 'id' | 'title'>): Task => ({
  categoryId: null,
  ownerId: 1,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: null,
  ...overrides,
});

const makeTasks = (): readonly Task[] =>
  deepFreeze([
    task({ id: 1, title: 'Write report', status: 'TODO', priority: 'HIGH', dueDate: '2026-10-03' }),
    task({ id: 2, title: 'fix login bug', status: 'IN_PROGRESS', priority: 'MEDIUM' }),
    task({ id: 3, title: 'Plan offsite', status: 'DONE', priority: 'LOW', dueDate: '2026-09-30' }),
  ]);

const ids = (list: readonly Task[]) => list.map((t) => t.id);

describe('addTask / removeTask / toggleTask', () => {
  it('adds immutably', () => {
    const tasks = makeTasks();
    const next = addTask(tasks, task({ id: 4, title: 'New' }));
    expect(ids(next)).toEqual([1, 2, 3, 4]);
    expect(next).not.toBe(tasks);
  });

  it('removes immutably', () => {
    const tasks = makeTasks();
    expect(ids(removeTask(tasks, 2))).toEqual([1, 3]);
    expect(tasks).toHaveLength(3);
  });

  it('toggles and preserves unchanged references', () => {
    const tasks = makeTasks();
    const next = toggleTask(tasks, 3);
    expect(next[2]?.status).toBe('TODO');
    expect(next[0]).toBe(tasks[0]);
  });
});

describe('filterTasks / sortTasks', () => {
  it('filters', () => {
    const tasks = makeTasks();
    expect(ids(filterTasks(tasks, { status: 'DONE' }))).toEqual([3]);
    expect(ids(filterTasks(tasks, { q: '  LOGIN ' }))).toEqual([2]);
    expect(filterTasks(tasks)).toHaveLength(3);
  });

  it('sorts', () => {
    const tasks = makeTasks();
    expect(ids(sortTasks(tasks, 'priority', 'desc'))).toEqual([1, 2, 3]);
    expect(ids(sortTasks(tasks, 'dueDate'))).toEqual([3, 1, 2]);
  });
});

describe('updateTaskField / groupByStatus', () => {
  it('updates one field immutably', () => {
    const tasks = makeTasks();
    const next = updateTaskField(tasks, 1, 'title', 'Write Q3 report');
    expect(next[0]?.title).toBe('Write Q3 report');
    expect(next[1]).toBe(tasks[1]);
  });

  it('groups with all three keys', () => {
    expect(groupByStatus([])).toEqual({ TODO: [], IN_PROGRESS: [], DONE: [] });
    expect(ids(groupByStatus(makeTasks()).DONE)).toEqual([3]);
  });
});

describe('isOverdue (05.11)', () => {
  it('is true only for unfinished tasks with a past due date', () => {
    const today = '2026-10-01';
    expect(isOverdue(task({ id: 1, title: 'a', dueDate: '2026-09-30' }), today)).toBe(true);
    expect(isOverdue(task({ id: 2, title: 'b', dueDate: '2026-10-01' }), today)).toBe(false);
    expect(isOverdue(task({ id: 3, title: 'c', dueDate: null }), today)).toBe(false);
    expect(isOverdue(task({ id: 4, title: 'd', dueDate: '2026-09-01', status: 'DONE' }), today)).toBe(false);
  });
});

describe('countByPriority (05.11)', () => {
  it('always returns all three keys', () => {
    expect(countByPriority([])).toEqual({ LOW: 0, MEDIUM: 0, HIGH: 0 });
  });
  it('counts per priority', () => {
    expect(countByPriority(makeTasks())).toEqual({ LOW: 1, MEDIUM: 1, HIGH: 1 });
  });
});
```

---

## `playground/ts/src/api.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadTasks } from './api';

const validTask = {
  id: 1,
  title: 'A',
  description: '',
  status: 'TODO',
  priority: 'LOW',
  dueDate: null,
  categoryId: null,
  ownerId: 1,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const respondWith = (body: unknown, status = 200) =>
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify(body), { status }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadTasks', () => {
  it('returns validated tasks', async () => {
    respondWith({ tasks: [validTask] });
    await expect(loadTasks('/db.json')).resolves.toHaveLength(1);
  });

  it('uses the ApiError message on non-2xx', async () => {
    respondWith(
      { status: 401, error: 'UNAUTHORIZED', message: 'Session expired', path: '/api/tasks', timestamp: '' },
      401,
    );
    await expect(loadTasks('/api/tasks')).rejects.toThrow('Session expired');
  });

  it('rejects arrays containing invalid items', async () => {
    respondWith({ tasks: [validTask, { ...validTask, status: 'BLOCKED' }] });
    await expect(loadTasks('/db.json')).rejects.toThrow('Invalid response');
  });
});
```

---

## `playground/ts/src/guards.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { isTaskStatus, isApiError, toErrorMessage, assertNever } from './guards';
import { groupBy, findById, indexById } from './generic-utils';
import { statusLabel, priorityColor } from './labels';

describe('guards', () => {
  it('isTaskStatus', () => {
    expect(isTaskStatus('DONE')).toBe(true);
    expect(isTaskStatus('done')).toBe(false);
    expect(isTaskStatus(42)).toBe(false);
  });

  it('isApiError', () => {
    expect(isApiError({ status: 400, error: 'X', message: 'm' })).toBe(true);
    expect(isApiError(new Error('x'))).toBe(false);
  });

  it('toErrorMessage handles anything', () => {
    expect(toErrorMessage(new Error('boom'))).toBe('boom');
    expect(toErrorMessage('plain')).toBe('plain');
    expect(toErrorMessage({ status: 500, error: 'E', message: 'Server says no' })).toBe('Server says no');
    expect(toErrorMessage(42)).toBe('Unexpected error');
  });

  it('assertNever throws if reached at runtime', () => {
    expect(() => assertNever('X' as never)).toThrow('Unexpected value: "X"');
  });
});

describe('generic utils', () => {
  const cats = [
    { id: 1, name: 'Work', color: '#000' },
    { id: 2, name: 'Home', color: '#fff' },
  ];

  it('findById / indexById work for any HasId type', () => {
    expect(findById(cats, 2)?.name).toBe('Home');
    expect(findById(cats, 9)).toBeUndefined();
    expect(indexById(cats)[1]?.name).toBe('Work');
  });

  it('groupBy groups by a key', () => {
    const groups = groupBy(
      [
        { s: 'a', n: 1 },
        { s: 'b', n: 2 },
        { s: 'a', n: 3 },
      ],
      's',
    );
    expect(groups.get('a')?.map((x) => x.n)).toEqual([1, 3]);
    expect([...groups.keys()]).toEqual(['a', 'b']);
  });
});

describe('labels', () => {
  it('statusLabel / priorityColor', () => {
    expect(statusLabel('IN_PROGRESS')).toBe('In progress');
    expect(priorityColor('HIGH')).toBe('#ef4444');
  });
});
```

---

## `playground/ts/src/request-state.test.ts`

```ts
import { describe as suite, expect, it } from 'vitest';
import { idle, loading, succeeded, failed, dataOr, describe } from './request-state';

suite('request-state', () => {
  it('dataOr returns data only when succeeded', () => {
    expect(dataOr(succeeded([1, 2]), [])).toEqual([1, 2]);
    expect(dataOr(loading<number[]>(), [])).toEqual([]);
    expect(dataOr(failed<number[]>('x'), [])).toEqual([]);
  });

  it('describe covers every state', () => {
    const count = (xs: number[]) => `${xs.length} items`;
    expect(describe(idle<number[]>(), count)).toBe('');
    expect(describe(loading<number[]>(), count)).toBe('Loading…');
    expect(describe(succeeded([1]), count)).toBe('1 items');
    expect(describe(failed<number[]>('HTTP 503'), count)).toBe('Something went wrong: HTTP 503');
  });
});
```

**Back to:** [06.13 · Solution walkthrough](06.13-solution.md)
