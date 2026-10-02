import { api } from './client';
import { ApiRequestError } from './api-error';
import { isPageOf, isTask } from '../domain/guards';
import type { Priority, SortDirection, SortKey, Task, TaskStatus } from '../domain/types';
import type { CreateTaskRequest, Page, UpdateTaskRequest } from '../domain/api-types';

/** Query parameters of GET /api/tasks (02-project-spec §5). */
export interface TaskQuery {
  q?: string;
  status?: TaskStatus;
  priority?: Priority;
  categoryId?: number;
  page?: number;
  size?: number;
  sort?: `${SortKey | 'id'},${SortDirection}`;
}

/** Responses are `unknown` until validated: the server is outside our type system (06.09). */
function expectTask(data: unknown): Task {
  if (!isTask(data)) throw invalidResponse();
  return data;
}

function invalidResponse(): ApiRequestError {
  return new ApiRequestError({ kind: 'unexpected', message: 'The server sent an unexpected response.' });
}

export async function getTasks(query: TaskQuery = {}, signal?: AbortSignal): Promise<Page<Task>> {
  // Axios serialises params and drops undefined values: { status: undefined } sends nothing.
  const { data } = await api.get<unknown>('/tasks', { params: query, signal });
  if (!isPageOf(data, isTask)) throw invalidResponse();
  return data;
}

export async function getTask(id: number, signal?: AbortSignal): Promise<Task> {
  const { data } = await api.get<unknown>(`/tasks/${id}`, { signal });
  return expectTask(data);
}

/** POST → 201 Created, with the new task (server-assigned id, owner, timestamps) in the body. */
export async function createTask(request: CreateTaskRequest): Promise<Task> {
  const { data } = await api.post<unknown>('/tasks', request);
  return expectTask(data);
}

/** PUT = replace all editable fields. */
export async function updateTask(id: number, request: CreateTaskRequest): Promise<Task> {
  const { data } = await api.put<unknown>(`/tasks/${id}`, request);
  return expectTask(data);
}

/** PATCH = change only the fields sent. */
export async function patchTask(id: number, changes: UpdateTaskRequest): Promise<Task> {
  const { data } = await api.patch<unknown>(`/tasks/${id}`, changes);
  return expectTask(data);
}

/** DELETE → 204 No Content. */
export async function deleteTask(id: number): Promise<void> {
  await api.delete(`/tasks/${id}`);
}
