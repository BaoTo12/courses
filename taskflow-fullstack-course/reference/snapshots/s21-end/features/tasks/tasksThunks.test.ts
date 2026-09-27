import { applyMiddleware, createStore } from 'redux';
import { withExtraArgument } from 'redux-thunk';
import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../api/api-error';
import type { Page } from '../../domain/api-types';
import type { Task } from '../../domain/types';
import { normalize } from '../../domain/normalize';
import { makeStore } from '../../app/store';
import { rootReducer } from '../../app/rootReducer';
import type { ThunkExtra } from '../../app/thunk-types';
import { createMiniThunkMiddleware } from '../../app/mini-redux/thunk-middleware';
import {
  clearCompleted,
  deleteTask,
  fetchTasks,
  fetchTasksIfNeeded,
  FRESH_FOR_MS,
  saveNewTask,
  toggleTaskOnServer,
} from './tasksThunks';
import { selectTaskById, selectTasks } from './tasksSlice';
import type { TasksState } from './tasksSlice';

const task = (id: number, overrides: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: null,
  categoryId: null,
  ownerId: 1,
  createdAt: '2026-09-01T08:00:00Z',
  updatedAt: '2026-09-01T08:00:00Z',
  ...overrides,
});

/** Preloaded, normalised tasks state (S19). */
const loadedTasks = (...items: Task[]): TasksState => ({
  ...normalize(items),
  status: 'succeeded',
  error: null,
  currentRequestId: null,
  fetchedAt: 1,
});

const page = (items: Task[]): Page<Task> => ({ items, page: 0, size: 100, totalItems: items.length, totalPages: 1 });

/** A fake API: every function is a vi.fn() you can program per test. No network involved. */
function fakeApi(overrides: Partial<ThunkExtra['api']> = {}): ThunkExtra['api'] {
  return {
    getTasks: vi.fn(async () => page([task(1), task(2)])),
    getTask: vi.fn(async (id: number) => task(id)),
    createTask: vi.fn(async (request) => ({ ...task(99), ...request })),
    updateTask: vi.fn(async (id: number, request) => ({ ...task(id), ...request })),
    patchTask: vi.fn(async (id: number, changes) => ({ ...task(id), ...changes })),
    deleteTask: vi.fn(async () => undefined),
    getCategories: vi.fn(async () => []),
    ...overrides,
  };
}

/** A promise you resolve by hand: to control the ORDER in which responses arrive. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// Keep the dev logger/analytics quiet in these tests.
vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});

describe('thunk middleware (18.03)', () => {
  it('ours and redux-thunk both call functions with (dispatch, getState, extra) and return their result', () => {
    for (const middleware of [createMiniThunkMiddleware('EXTRA'), withExtraArgument('EXTRA')]) {
      const store = createStore(rootReducer, applyMiddleware(middleware));
      const seen: unknown[] = [];
      const result = store.dispatch(((dispatch: unknown, getState: () => unknown, extra: unknown) => {
        seen.push(typeof dispatch, typeof getState, extra);
        return 'returned by the thunk';
      }) as never);
      expect(result).toBe('returned by the thunk');
      expect(seen).toEqual(['function', 'function', 'EXTRA']);
    }
  });

  it('18.14: without thunk middleware, dispatching a function throws "Actions must be plain objects"', () => {
    const store = createStore(rootReducer);
    expect(() => store.dispatch((() => {}) as never)).toThrow(/Actions must be plain objects/);
  });
});

describe('fetchTasks (createAsyncThunk, 20.10)', () => {
  it('dispatches pending → fulfilled and loads the list', async () => {
    const api = fakeApi();
    const store = makeStore(undefined, { api });
    const result = await store.dispatch(fetchTasks());
    expect(fetchTasks.fulfilled.match(result)).toBe(true);
    expect(store.getState().tasks).toMatchObject({ status: 'succeeded', error: null, currentRequestId: null });
    expect(selectTasks(store.getState()).map((t) => t.id)).toEqual([1, 2]);
    expect(api.getTasks).toHaveBeenCalledWith({ size: 100 }, expect.any(AbortSignal));
  });

  it('turns an API error into a rejected action with the SERVER message (rejectWithValue), never throws', async () => {
    const api = fakeApi({
      getTasks: vi.fn(async () => {
        throw new ApiRequestError({ kind: 'http', status: 503, message: 'Server unavailable' });
      }),
    });
    const store = makeStore(undefined, { api });
    const result = await store.dispatch(fetchTasks()); // resolves with the rejected ACTION
    expect(fetchTasks.rejected.match(result)).toBe(true);
    expect(result.payload).toMatchObject({ kind: 'http', status: 503, message: 'Server unavailable' });
    expect(store.getState().tasks).toMatchObject({ status: 'failed', error: 'Server unavailable' });
  });

  it('a slow OLD response cannot overwrite a newer one, and the old request is aborted', async () => {
    const slow = deferred<Page<Task>>();
    const fast = deferred<Page<Task>>();
    const signals: AbortSignal[] = [];
    const api = fakeApi({
      getTasks: vi.fn((query, signal?: AbortSignal) => {
        if (signal) signals.push(signal);
        return query?.q === 'r' ? slow.promise : fast.promise;
      }),
    });
    const store = makeStore(undefined, { api });

    const first = store.dispatch(fetchTasks({ q: 'r' }));
    const second = store.dispatch(fetchTasks({ q: 'report' }));
    expect(signals[0]?.aborted).toBe(true); // the newer request aborted the older one
    expect(signals[1]?.aborted).toBe(false);

    fast.resolve(page([task(7)]));
    await second;
    slow.resolve(page([task(1), task(2), task(3)])); // the OLD one arrives late (a fake API ignores abort)
    await first;

    expect(selectTasks(store.getState()).map((t) => t.id)).toEqual([7]); // the newer result survived
  });
});

describe('fetchTasksIfNeeded (18.09)', () => {
  it('skips while loading and while fresh, and refetches when stale', async () => {
    const api = fakeApi();
    const store = makeStore(undefined, { api });
    await store.dispatch(fetchTasksIfNeeded());
    expect(api.getTasks).toHaveBeenCalledTimes(1);

    const fetchedAt = store.getState().tasks.fetchedAt ?? 0;
    await store.dispatch(fetchTasksIfNeeded(() => fetchedAt + FRESH_FOR_MS - 1));
    expect(api.getTasks).toHaveBeenCalledTimes(1);

    await store.dispatch(fetchTasksIfNeeded(() => fetchedAt + FRESH_FOR_MS));
    expect(api.getTasks).toHaveBeenCalledTimes(2);
  });

  it('two dispatches in a row (StrictMode) start only one request', async () => {
    const api = fakeApi();
    const store = makeStore(undefined, { api });
    await Promise.all([store.dispatch(fetchTasksIfNeeded()), store.dispatch(fetchTasksIfNeeded())]);
    expect(api.getTasks).toHaveBeenCalledTimes(1);
  });
});

describe('write thunks', () => {
  it('saveNewTask: unwrap() resolves with the SERVER task, which is added to the store', async () => {
    const store = makeStore(undefined, { api: fakeApi() });
    const created = await store
      .dispatch(saveNewTask({ title: 'New', description: '', status: 'TODO', priority: 'LOW', dueDate: null, categoryId: null }))
      .unwrap();
    expect(created.id).toBe(99);
    expect(selectTasks(store.getState()).map((t) => t.id)).toEqual([99]);
  });

  it('saveNewTask: unwrap() throws the serialisable payload, with field errors', async () => {
    const api = fakeApi({
      createTask: vi.fn(async () => {
        throw new ApiRequestError({ kind: 'http', status: 400, message: 'Invalid', fieldErrors: { title: 'taken' } });
      }),
    });
    const store = makeStore(undefined, { api });
    const attempt = store.dispatch(saveNewTask({ title: 'x', description: '', status: 'TODO', priority: 'LOW', dueDate: null, categoryId: null }));
    await expect(attempt.unwrap()).rejects.toMatchObject({ status: 400, fieldErrors: { title: 'taken' } });
  });

  it('toggleTaskOnServer: success → updated + toast; failure → rejected + error toast, state unchanged', async () => {
    const store = makeStore({ tasks: loadedTasks(task(1)) }, { api: fakeApi() });
    const ok = await store.dispatch(toggleTaskOnServer(1));
    expect(toggleTaskOnServer.fulfilled.match(ok)).toBe(true);
    expect(selectTaskById(store.getState(), 1)?.status).toBe('DONE');
    expect(store.getState().ui.toasts.at(-1)).toMatchObject({ tone: 'success', message: 'Completed: Task 1' });

    const failing = makeStore(
      { tasks: loadedTasks(task(1)) },
      {
        api: fakeApi({
          patchTask: vi.fn(async () => {
            throw new ApiRequestError({ kind: 'network', message: 'Cannot reach the server.' });
          }),
        }),
      },
    );
    const bad = await failing.dispatch(toggleTaskOnServer(1));
    expect(toggleTaskOnServer.rejected.match(bad)).toBe(true);
    expect(selectTaskById(failing.getState(), 1)?.status).toBe('TODO');
    expect(failing.getState().ui.toasts.at(-1)).toMatchObject({ tone: 'error', message: 'Cannot reach the server.' });
  });

  it('deleteTask removes the task and clears it from the selection (extraReducers in ui)', async () => {
    const store = makeStore({ tasks: loadedTasks(task(1), task(2)), ui: { toasts: [], selectedTaskIds: [1] } }, { api: fakeApi() });
    const result = await store.dispatch(deleteTask(1));
    expect(deleteTask.fulfilled.match(result)).toBe(true);
    expect(selectTasks(store.getState()).map((t) => t.id)).toEqual([2]);
    expect(store.getState().ui.selectedTaskIds).toEqual([]);
  });

  it('clearCompleted keeps the tasks whose DELETE failed; its condition skips when nothing is DONE', async () => {
    const api = fakeApi({
      deleteTask: vi.fn(async (id: number) => {
        if (id === 2) throw new ApiRequestError({ kind: 'http', status: 500, message: 'boom' });
      }),
    });
    const done = (id: number) => task(id, { status: 'DONE' });
    const store = makeStore({ tasks: loadedTasks(done(1), done(2), task(3)) }, { api });
    await store.dispatch(clearCompleted());
    expect(selectTasks(store.getState()).map((t) => t.id)).toEqual([2, 3]);
    expect(store.getState().ui.toasts.at(-1)).toMatchObject({ tone: 'error', message: 'Deleted 1, but 1 could not be deleted.' });

    const nothingDone = makeStore({ tasks: loadedTasks(task(3)) }, { api });
    const skipped = await nothingDone.dispatch(clearCompleted());
    // rejected by `condition`: the payload creator never ran, and no `pending` was dispatched
    expect(clearCompleted.rejected.match(skipped) && skipped.meta.condition).toBe(true);
  });
});
