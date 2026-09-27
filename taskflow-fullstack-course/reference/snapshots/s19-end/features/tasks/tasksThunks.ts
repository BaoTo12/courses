// S18: async logic as THUNKS. A thunk action creator returns a function; the thunk middleware calls it
// with (dispatch, getState, extra). S20 replaces the boilerplate with createAsyncThunk.
import { isCancelled } from '../../api/api-error';
import type { TaskQuery } from '../../api/tasks';
import { toErrorMessage } from '../../domain/guards';
import type { CreateTaskRequest, UpdateTaskRequest } from '../../domain/api-types';
import type { Task } from '../../domain/types';
import type { AppThunk } from '../../app/thunk-types';
import { toastShown } from '../ui/uiSlice';
import {
  completedCleared,
  fetchFailed,
  fetchStarted,
  fetchSucceeded,
  taskAdded,
  taskDeleted,
  taskUpdated,
  selectTaskById,
  selectTasks,
} from './tasksSlice';

/** Until pagination arrives (S23), the list loads the first 100 tasks: the API's maximum page size. */
const DEFAULT_QUERY: TaskQuery = { size: 100 };

/**
 * Loads the task list. Never rejects: failures become `tasks/fetchFailed`.
 * Newer calls win: the reducer ignores results from older request ids, and the older request is aborted.
 */
export const fetchTasks =
  (query: TaskQuery = DEFAULT_QUERY): AppThunk<Promise<void>> =>
  async (dispatch, _getState, { api, nextRequestId, listRequest }) => {
    listRequest.controller?.abort(); // a newer request supersedes the older one
    const controller = new AbortController();
    listRequest.controller = controller;

    const requestId = nextRequestId();
    dispatch(fetchStarted(requestId));
    try {
      const page = await api.getTasks(query, controller.signal);
      dispatch(fetchSucceeded(requestId, page.items));
    } catch (error) {
      if (isCancelled(error)) return; // superseded by a newer request (or the page went away)
      dispatch(fetchFailed(requestId, toErrorMessage(error)));
    } finally {
      if (listRequest.controller === controller) listRequest.controller = null;
    }
  };

/** How long loaded data counts as fresh for fetchTasksIfNeeded (18.09). */
export const FRESH_FOR_MS = 30_000;

/** Skips the request when a load is already running, or the data is younger than FRESH_FOR_MS. */
export const fetchTasksIfNeeded =
  (now: () => number = Date.now): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const { status, fetchedAt } = getState().tasks;
    if (status === 'loading') return;
    if (fetchedAt !== null && now() - fetchedAt < FRESH_FOR_MS) return;
    await dispatch(fetchTasks());
  };

// ── Writes: server first, then dispatch what the server returned (pessimistic, 13.13) ──

/** POST. Rejects with an ApiRequestError: the form page decides how to show it. */
export const saveNewTask =
  (request: CreateTaskRequest): AppThunk<Promise<Task>> =>
  async (dispatch, _getState, { api }) => {
    const created = await api.createTask(request);
    dispatch(taskAdded(created));
    return created;
  };

/** PUT. Rejects on failure. */
export const saveTask =
  (id: number, request: CreateTaskRequest): AppThunk<Promise<Task>> =>
  async (dispatch, _getState, { api }) => {
    const saved = await api.updateTask(id, request);
    dispatch(taskUpdated(saved));
    return saved;
  };

/** PATCH (e.g. an inline title edit). Rejects on failure. */
export const saveTaskChanges =
  (id: number, changes: UpdateTaskRequest): AppThunk<Promise<Task>> =>
  async (dispatch, _getState, { api }) => {
    const saved = await api.patchTask(id, changes);
    dispatch(taskUpdated(saved));
    return saved;
  };

// ── 18.12: thunks that report to the user themselves (toasts), and resolve to true/false ──

/** Toggles DONE ↔ TODO on the server. Resolves to false (with an error toast) instead of rejecting. */
export const toggleTaskOnServer =
  (id: number): AppThunk<Promise<boolean>> =>
  async (dispatch, getState, { api }) => {
    const task = selectTaskById(getState(), id);
    if (!task) return false;
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    try {
      const saved = await api.patchTask(id, { status: nextStatus });
      dispatch(taskUpdated(saved));
      if (nextStatus === 'DONE') dispatch(toastShown({ tone: 'success', message: `Completed: ${saved.title}` }));
      return true;
    } catch (error) {
      dispatch(toastShown({ tone: 'error', message: toErrorMessage(error) }));
      return false;
    }
  };

/** Deletes on the server. Resolves to true on success; on failure shows an error toast and resolves to false. */
export const deleteTask =
  (id: number): AppThunk<Promise<boolean>> =>
  async (dispatch, getState, { api }) => {
    const title = selectTaskById(getState(), id)?.title ?? `Task ${id}`;
    try {
      await api.deleteTask(id);
      dispatch(taskDeleted(id));
      dispatch(toastShown({ tone: 'success', message: `Deleted: ${title}` }));
      return true;
    } catch (error) {
      dispatch(toastShown({ tone: 'error', message: toErrorMessage(error) }));
      return false;
    }
  };

/** Deletes every DONE task (one DELETE each), then ONE event with the ids really deleted (17.13). */
export const clearCompleted = (): AppThunk<Promise<void>> => async (dispatch, getState, { api }) => {
  const ids = selectTasks(getState())
    .filter((t) => t.status === 'DONE')
    .map((t) => t.id);
  if (ids.length === 0) return;
  const results = await Promise.allSettled(ids.map((id) => api.deleteTask(id)));
  const deleted = ids.filter((_, index) => results[index]?.status === 'fulfilled');
  if (deleted.length > 0) dispatch(completedCleared(deleted));
  const failed = ids.length - deleted.length;
  dispatch(
    failed === 0
      ? toastShown({ tone: 'success', message: `Deleted ${deleted.length} completed task(s).` })
      : toastShown({ tone: 'error', message: `Deleted ${deleted.length}, but ${failed} could not be deleted.` }),
  );
};
