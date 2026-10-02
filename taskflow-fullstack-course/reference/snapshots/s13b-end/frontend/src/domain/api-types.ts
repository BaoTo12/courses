import type { Task } from './types';

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
