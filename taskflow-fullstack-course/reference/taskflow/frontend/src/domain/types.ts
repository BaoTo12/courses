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

/** The status of a request we track ourselves (19.03). RTK Query tracks its own (22.05). */
export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';
export type SortDirection = 'asc' | 'desc';

/** S51: a user a task is shared with (read-only). */
export interface Share {
  userId: number;
  username: string;
  displayName: string;
}

/** S51: one entry of the activity feed. `details` is "task 5: <title>": user data, rendered as text. */
export interface Activity extends HasId {
  type: 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_DELETED' | 'COMMENT_ADDED' | 'TASK_SHARED' | 'TASK_UNSHARED';
  details: string;
  at: IsoDateTime;
}