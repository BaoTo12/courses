// S20: every task I/O operation as createAsyncThunk. Each one generates three action types,
// e.g. 'tasks/fetch/pending' | '…/fulfilled' | '…/rejected', handled in tasksSlice's extraReducers.
import { toApiErrorPayload } from '../../api/api-error';
import type { TaskQuery } from '../../api/tasks';
import type { CreateTaskRequest, UpdateTaskRequest } from '../../domain/api-types';
import type { Task } from '../../domain/types';
import { createAppAsyncThunk } from '../../app/thunk-types';
import type { AppThunk } from '../../app/thunk-types';
import { toastShown } from '../ui/toastActions';

/** Until pagination arrives (S23), the list loads the first 100 tasks: the API's maximum page size. */
const DEFAULT_QUERY: TaskQuery = { size: 100 };

/**
 * Loads the task list. The reducer ignores results from all but the LATEST request, using the
 * `meta.requestId` RTK generates (18.11). The previous request is also aborted, to save work.
 */
export const fetchTasks = createAppAsyncThunk(
  'tasks/fetch',
  // `TaskQuery | void` makes the argument optional: dispatch(fetchTasks()) (a default value alone isn't enough, 20.09)
  async (query: TaskQuery | void, { extra, signal, rejectWithValue }) => {
    extra.listRequest.controller?.abort(); // a newer request supersedes the older one
    const controller = new AbortController();
    extra.listRequest.controller = controller;
    try {
      // Aborted by EITHER a newer fetch (our controller) or the caller's promise.abort() (RTK's signal)
      const page = await extra.api.getTasks(query ?? DEFAULT_QUERY, AbortSignal.any([signal, controller.signal]));
      // The payload creator may read the clock; the reducer may not (15.04): fetchedAt travels in the payload.
      return { tasks: page.items, fetchedAt: Date.now() };
    } catch (error) {
      return rejectWithValue(toApiErrorPayload(error)); // a serialisable payload, not the Error instance
    } finally {
      if (extra.listRequest.controller === controller) extra.listRequest.controller = null;
    }
  },
);

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

// ── Writes: fulfilled = what the server returned; rejected = a serialisable ApiErrorPayload ──

/** POST. Components call `dispatch(saveNewTask(r)).unwrap()` to get the Task or catch the payload. */
export const saveNewTask = createAppAsyncThunk(
  'tasks/saveNew',
  async (request: CreateTaskRequest, { extra, rejectWithValue }) => {
    try {
      return await extra.api.createTask(request);
    } catch (error) {
      return rejectWithValue(toApiErrorPayload(error));
    }
  },
);

/** PUT. */
export const saveTask = createAppAsyncThunk(
  'tasks/save',
  async ({ id, request }: { id: number; request: CreateTaskRequest }, { extra, rejectWithValue }) => {
    try {
      return await extra.api.updateTask(id, request);
    } catch (error) {
      return rejectWithValue(toApiErrorPayload(error));
    }
  },
);

/** PATCH (e.g. an inline title edit). */
export const saveTaskChanges = createAppAsyncThunk(
  'tasks/saveChanges',
  async ({ id, changes }: { id: number; changes: UpdateTaskRequest }, { extra, rejectWithValue }) => {
    try {
      return await extra.api.patchTask(id, changes);
    } catch (error) {
      return rejectWithValue(toApiErrorPayload(error));
    }
  },
);

// ── Thunks that report to the user themselves (18.12) ──────────────────────────

/** Toggles DONE ↔ TODO on the server; success/error toasts are dispatched here. */
export const toggleTaskOnServer = createAppAsyncThunk(
  'tasks/toggle',
  async (id: number, { extra, getState, dispatch, rejectWithValue }) => {
    const task = getState().tasks.entities[id];
    if (!task) return rejectWithValue(toApiErrorPayload(new Error(`Task ${id} is not loaded`)));
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    try {
      const saved: Task = await extra.api.patchTask(id, { status: nextStatus });
      if (nextStatus === 'DONE') dispatch(toastShown({ tone: 'success', message: `Completed: ${saved.title}` }));
      return saved;
    } catch (error) {
      const payload = toApiErrorPayload(error);
      dispatch(toastShown({ tone: 'error', message: payload.message }));
      return rejectWithValue(payload);
    }
  },
);

/** Deletes on the server; fulfilled payload = the id (the ui slice uses it too). */
export const deleteTask = createAppAsyncThunk(
  'tasks/delete',
  async (id: number, { extra, getState, dispatch, rejectWithValue }) => {
    const title = getState().tasks.entities[id]?.title ?? `Task ${id}`;
    try {
      await extra.api.deleteTask(id);
      dispatch(toastShown({ tone: 'success', message: `Deleted: ${title}` }));
      return id;
    } catch (error) {
      const payload = toApiErrorPayload(error);
      dispatch(toastShown({ tone: 'error', message: payload.message }));
      return rejectWithValue(payload);
    }
  },
);

/** True when at least one loaded task is DONE. */
const hasCompletedTasks = (state: { tasks: { ids: number[]; entities: Record<number, Task> } }) =>
  state.tasks.ids.some((id) => state.tasks.entities[id]?.status === 'DONE');

/** Deletes every DONE task; fulfilled payload = the ids really deleted (partial failures are reported). */
export const clearCompleted = createAppAsyncThunk(
  'tasks/clearCompleted',
  async (_: void, { extra, getState, dispatch }) => {
    const { ids, entities } = getState().tasks;
    const doneIds = ids.filter((id) => entities[id]?.status === 'DONE');
    const results = await Promise.allSettled(doneIds.map((id) => extra.api.deleteTask(id)));
    const deleted = doneIds.filter((_id, index) => results[index]?.status === 'fulfilled');
    const failed = doneIds.length - deleted.length;
    dispatch(
      failed === 0
        ? toastShown({ tone: 'success', message: `Deleted ${deleted.length} completed task(s).` })
        : toastShown({ tone: 'error', message: `Deleted ${deleted.length}, but ${failed} could not be deleted.` }),
    );
    return deleted;
  },
  // `condition` (20.09): don't even start (no pending action) when there's nothing to clear.
  { condition: (_: void, { getState }) => hasCompletedTasks(getState()) },
);
