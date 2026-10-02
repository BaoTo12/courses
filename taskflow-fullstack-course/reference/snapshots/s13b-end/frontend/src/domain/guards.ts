import { PRIORITIES, TASK_STATUSES } from './types';
import type { Category, Priority, Task, TaskStatus } from './types';
import type { ApiError, Page } from './api-types';

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

/**
 * Generic guard built from a runtime list (13B.05): `isOneOf(TASK_STATUSES, x)` narrows x to TaskStatus.
 * `const T` makes an inline array literal infer its literal types: isOneOf(['a', 'b'], x) → x is 'a' | 'b'.
 */
export function isOneOf<const T extends string>(options: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

export function isCategory(value: unknown): value is Category {
  // color is validated again before it reaches CSS (isSafeHexColor, 10.10): here we only check the shape.
  return isObject(value) && typeof value.id === 'number' && typeof value.name === 'string' && typeof value.color === 'string';
}

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

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isObject(value) && Object.values(value).every((v) => typeof v === 'string');

export function isApiError(value: unknown): value is ApiError {
  return (
    isObject(value) &&
    typeof value.status === 'number' &&
    typeof value.error === 'string' &&
    typeof value.message === 'string' &&
    (value.fieldErrors === undefined || isStringRecord(value.fieldErrors))
  );
}

/** Generic guard for the Page<T> envelope (13.05): checks the envelope AND every item. */
export function isPageOf<T>(value: unknown, isItem: (item: unknown) => item is T): value is Page<T> {
  return (
    isObject(value) &&
    Array.isArray(value.items) &&
    value.items.every(isItem) &&
    typeof value.page === 'number' &&
    typeof value.size === 'number' &&
    typeof value.totalItems === 'number' &&
    typeof value.totalPages === 'number'
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
