// Lecture-claim tests for S20 (20.09, 20.11, 20.12, 20.16, 20.18, 20.99): createAsyncThunk's actions and
// promise, condition, matchers, the serializability check and the logout reset, pinned to the installed RTK.
import {
  combineReducers,
  configureStore,
  createAsyncThunk,
  createSlice,
  isFulfilled,
  isPending,
  isRejected,
  isRejectedWithValue,
} from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiErrorPayload } from '../api/api-error';
import type { TaskQuery } from '../api/tasks';
import { loggedOut } from '../features/auth/authActions';
import { createLegacyThunk, fetchCategories, fetchTasks, makeLegacyStore, saveNewTask, tasksReducer } from './fixtures/s20-tasks';
import { taskSelectionToggled, uiReducer } from '../features/ui/uiSlice';
import { toastShown } from '../features/ui/toastActions';

vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});

afterEach(() => {
  vi.mocked(console.error).mockRestore?.();
});

const plainStore = () => configureStore({ reducer: (state: number = 0) => state });

describe('20.09 createAsyncThunk: actions and the returned promise', () => {
  it('generates three types; fulfilled carries payload + meta.arg + meta.requestId (21 chars)', async () => {
    const double = createAsyncThunk('demo/ok', async (n: number) => n * 2);
    expect([double.typePrefix, double.pending.type, double.fulfilled.type, double.rejected.type]).toEqual([
      'demo/ok',
      'demo/ok/pending',
      'demo/ok/fulfilled',
      'demo/ok/rejected',
    ]);
    const result = await plainStore().dispatch(double(21));
    expect(result).toMatchObject({ type: 'demo/ok/fulfilled', payload: 42, meta: { arg: 21, requestStatus: 'fulfilled' } });
    expect(result.meta.requestId).toHaveLength(21);
  });

  it('a thrown error is SERIALISED into action.error; unwrap() throws that plain object, not an Error', async () => {
    const plain = createAsyncThunk('demo/plain', async () => {
      throw new TypeError('boom');
    });
    const store = plainStore();
    const result = await store.dispatch(plain());
    if (!plain.rejected.match(result)) throw new Error('expected a rejected action');
    expect(result.error).toMatchObject({ name: 'TypeError', message: 'boom' });
    expect(result.meta).toMatchObject({ rejectedWithValue: false, aborted: false, condition: false });
    const thrown = await store.dispatch(plain()).unwrap().catch((e: unknown) => e);
    expect(thrown instanceof Error).toBe(false);
    expect(thrown).toMatchObject({ name: 'TypeError', message: 'boom' });
  });

  it('20.18: rejectWithValue → payload holds the value, error.message is just "Rejected"; unwrap throws the value', async () => {
    const withValue = createAsyncThunk<number, void, { rejectValue: { message: string } }>('demo/wv', async (_, api) =>
      api.rejectWithValue({ message: 'Server says no' }),
    );
    const store = plainStore();
    const result = await store.dispatch(withValue());
    expect(result).toMatchObject({ payload: { message: 'Server says no' }, error: { message: 'Rejected' }, meta: { rejectedWithValue: true } });
    await expect(store.dispatch(withValue()).unwrap()).rejects.toEqual({ message: 'Server says no' });
  });

  it('pending is dispatched synchronously; abort() → rejected with meta.aborted and an AbortError; the tasks slice goes back to idle', async () => {
    const getTasks = vi.fn(
      (_query?: TaskQuery, signal?: AbortSignal) =>
        new Promise<never>((_resolve, reject) => signal?.addEventListener('abort', () => reject(signal.reason))),
    );
    const store = makeLegacyStore(getTasks);
    const promise = store.dispatch(fetchTasks({ q: 'x' }));
    expect(store.getState().tasks.status).toBe('loading');
    expect([typeof promise.abort, typeof promise.unwrap, promise.requestId.length, promise.arg]).toEqual([
      'function',
      'function',
      21,
      { q: 'x' },
    ]);
    promise.abort('user left');
    const result = await promise;
    expect(result).toMatchObject({ type: 'tasks/fetch/rejected', meta: { aborted: true }, error: { name: 'AbortError', message: 'user left' } });
    expect(store.getState().tasks.status).toBe('idle');
  });
});

describe('20.09 §7 / 20.99 Q13: condition', () => {
  it('a second dispatch while pending: no request, no action dispatched, a ConditionError from unwrap()', async () => {
    const fetchTasksOnce = createLegacyThunk(
      'tasks/fetch',
      async (query: TaskQuery | void, { extra, signal, rejectWithValue }) => {
        try {
          const page = await extra.api.getTasks(query ?? { size: 100 }, signal);
          return { tasks: page.items, fetchedAt: Date.now() };
        } catch (error) {
          return rejectWithValue({ kind: 'unexpected', status: null, code: 'X', message: String(error), fieldErrors: {} });
        }
      },
      { condition: (_query, { getState }) => getState().tasks.status !== 'loading' },
    );
    const getTasks = vi.fn(async () => ({ items: [], page: 0, size: 100, totalItems: 0, totalPages: 0 }));
    const store = makeLegacyStore(getTasks);
    let notifications = 0;
    store.subscribe(() => notifications++);

    const first = store.dispatch(fetchTasksOnce());
    const second = store.dispatch(fetchTasksOnce());
    const [a, b] = await Promise.all([first, second]);
    expect(getTasks).toHaveBeenCalledTimes(1);
    expect([a.type, b.type]).toEqual(['tasks/fetch/fulfilled', 'tasks/fetch/rejected']);
    expect(fetchTasksOnce.rejected.match(b) && b.meta.condition).toBe(true);
    if (fetchTasksOnce.rejected.match(b)) expect(b.error).toMatchObject({ name: 'ConditionError' });
    await expect(second.unwrap()).rejects.toMatchObject({ name: 'ConditionError' });
    expect(notifications).toBe(2); // pending + fulfilled only
  });
});

describe('20.09 §9: an optional thunk argument (checked by tsc -b)', () => {
  it('`| void` and `| undefined` make it optional; a default value does not', () => {
    type Q = { q?: string };
    const withDefault = createAsyncThunk('p/a', async (query: Q = {}) => query);
    const withVoid = createAsyncThunk('p/b', async (query: Q | void) => query);
    const withUndefined = createAsyncThunk('p/c', async (query: Q | undefined) => query);
    const store = plainStore();
    // @ts-expect-error -- Expected 1-2 arguments, but got 0.
    void store.dispatch(withDefault());
    void store.dispatch(withVoid());
    void store.dispatch(withUndefined());
  });
});

describe('20.11 logout', () => {
  it('a root reducer that resets on loggedOut type-checks and clears every slice', () => {
    const appReducer = combineReducers({ tasks: tasksReducer, ui: uiReducer });
    const rootReducer: typeof appReducer = (state, action) => appReducer(loggedOut.match(action) ? undefined : state, action);
    const store = configureStore({ reducer: rootReducer });
    store.dispatch(taskSelectionToggled(3));
    expect(store.getState().ui.selectedTaskIds).toEqual([3]);
    store.dispatch(loggedOut());
    expect(store.getState().ui.selectedTaskIds).toEqual([]);
  });
});

describe('20.12 a global requests slice with matchers', () => {
  interface RequestsState {
    pending: Record<string, string>;
    lastError: string | null;
  }
  const requestsSlice = createSlice({
    name: 'requests',
    initialState: { pending: {}, lastError: null } as RequestsState,
    reducers: {},
    extraReducers: (builder) => {
      builder
        .addMatcher(isPending, (state, action) => {
          state.pending[action.meta.requestId] = action.type.replace(/\/pending$/, '');
        })
        .addMatcher(isFulfilled, (state, action) => {
          delete state.pending[action.meta.requestId];
        })
        .addMatcher(isRejected, (state, action) => {
          delete state.pending[action.meta.requestId];
          if (action.meta.condition || action.meta.aborted) return;
          const payload = isRejectedWithValue(action) ? (action.payload as ApiErrorPayload | undefined) : undefined;
          state.lastError = payload?.message ?? action.error.message ?? 'Unexpected error';
        });
    },
  });
  const payload: ApiErrorPayload = { kind: 'http', status: 400, code: 'X', message: 'Invalid title', fieldErrors: {} };

  it('tracks pending requests of any thunk and keeps the last error', () => {
    const store = configureStore({ reducer: { requests: requestsSlice.reducer } });
    store.dispatch(fetchTasks.pending('a', undefined));
    store.dispatch(fetchCategories.pending('b', undefined));
    expect(store.getState().requests.pending).toEqual({ a: 'tasks/fetch', b: 'categories/fetch' });
    store.dispatch(fetchTasks.fulfilled({ tasks: [], fetchedAt: 1 }, 'a', undefined));
    store.dispatch(saveNewTask.rejected(null, 'c', {} as never, payload));
    expect(store.getState().requests.lastError).toBe('Invalid title');
    store.dispatch(fetchCategories.rejected(new Error('boom'), 'b', undefined));
    expect(store.getState().requests).toEqual({ pending: {}, lastError: 'boom' });
  });
});

describe('20.16 serializability check messages (console.error)', () => {
  it('names the action path first, then the state path after every later action', () => {
    const errors: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.filter((a) => typeof a === 'string').join(' '));
    });
    const store = makeLegacyStore();
    store.dispatch(fetchTasks.pending('r1', undefined));
    store.dispatch(fetchTasks.fulfilled({ tasks: [], fetchedAt: new Date() as never }, 'r1', undefined));
    store.dispatch(toastShown({ tone: 'info', message: 'x' }));
    expect(errors[0]).toContain('A non-serializable value was detected in an action, in the path: `payload.fetchedAt`.');
    expect(errors[1]).toContain('A non-serializable value was detected in the state, in the path: `tasks.fetchedAt`.');
    expect(errors[1]).toContain('Take a look at the reducer(s) handling this action type: tasks/fetch/fulfilled.');
    expect(errors[2]).toContain('Take a look at the reducer(s) handling this action type: ui/toastShown.'); // misleading!
  });
});
