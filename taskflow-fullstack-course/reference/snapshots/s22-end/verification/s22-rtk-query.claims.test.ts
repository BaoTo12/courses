// Lecture-claim tests for S22 (RTK Query): deduplication, cache entries, structural sharing, tags,
// cache lifetime, errors, cache utilities. The requests go through TaskFlow's REAL Axios instance
// (interceptors included); only its ADAPTER (the part that does the HTTP) is replaced by a fake.
import { configureStore } from '@reduxjs/toolkit';
import type { Middleware } from '@reduxjs/toolkit';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api as axiosInstance } from '../api/client';
import type { Task } from '../domain/types';
import { apiSlice } from '../features/api/apiSlice';

const task = (id: number, overrides: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  description: '',
  status: 'TODO',
  priority: 'LOW',
  dueDate: null,
  categoryId: null,
  ownerId: 1,
  createdAt: 'x',
  updatedAt: 'x',
  ...overrides,
});
const page = (items: Task[]) => ({ items, page: 0, size: 100, totalItems: items.length, totalPages: 1 });

/** A fake HTTP layer: `respond(config)` decides each response. Records every request. */
function fakeServer(respond: (config: InternalAxiosRequestConfig) => { status: number; data: unknown } | Promise<never>) {
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(`${config.method?.toUpperCase()} ${config.url}${config.params ? ' ' + JSON.stringify(config.params) : ''}`);
    const result = await respond(config);
    const response = { data: result.data, status: result.status, statusText: '', headers: {}, config };
    if (result.status >= 400) {
      throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response);
    }
    return response;
  };
  return { requests, adapter };
}

const originalAdapter = axiosInstance.defaults.adapter;
let store: ReturnType<typeof makeApiStore>;

function makeApiStore() {
  return configureStore({
    reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
  });
}

beforeEach(() => {
  vi.spyOn(console, 'debug').mockImplementation(() => {});
  store = makeApiStore();
});
afterEach(() => {
  axiosInstance.defaults.adapter = originalAdapter;
  store.dispatch(apiSlice.util.resetApiState());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('22.02 cache entries and deduplication', () => {
  it('two subscriptions to the SAME argument share one request and one cache entry', async () => {
    const server = fakeServer(() => ({ status: 200, data: page([task(1)]) }));
    axiosInstance.defaults.adapter = server.adapter;
    const a = store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 }));
    const b = store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 }));
    await Promise.all([a, b]);
    expect(server.requests).toEqual(['GET /tasks {"size":100}']);
    expect(Object.keys(store.getState().api.queries)).toEqual(['getTasks({"size":100})']);
    // Subscriptions are tracked INSIDE the middleware; a copy is synced to state.api.subscriptions
    // (for the DevTools) shortly after, not immediately.
    expect(store.getState().api.subscriptions).toEqual({});
    await new Promise((r) => setTimeout(r, 600));
    expect(Object.keys(store.getState().api.subscriptions['getTasks({"size":100})'] ?? {})).toHaveLength(2);
    a.unsubscribe();
    b.unsubscribe();
  });

  it('a different argument is a different cache entry (and a second request)', async () => {
    const server = fakeServer(() => ({ status: 200, data: page([]) }));
    axiosInstance.defaults.adapter = server.adapter;
    await store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 }));
    await store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100, status: 'TODO' }));
    expect(server.requests).toHaveLength(2);
    expect(Object.keys(store.getState().api.queries).sort()).toEqual([
      'getTasks({"size":100,"status":"TODO"})',
      'getTasks({"size":100})',
    ]);
  });

  it('argument objects are compared by VALUE (key order does not matter)', async () => {
    const server = fakeServer(() => ({ status: 200, data: page([]) }));
    axiosInstance.defaults.adapter = server.adapter;
    await store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100, status: 'TODO' }));
    await store.dispatch(apiSlice.endpoints.getTasks.initiate({ status: 'TODO', size: 100 }));
    expect(server.requests).toHaveLength(1);
  });
});

describe('22.05 status flags in the cache', () => {
  it('select(arg) returns the entry with status flags; data keeps the last result while refetching', async () => {
    let answer = page([task(1)]);
    axiosInstance.defaults.adapter = fakeServer(() => ({ status: 200, data: answer })).adapter;
    const select = apiSlice.endpoints.getTasks.select({ size: 100 });
    expect(select(store.getState())).toMatchObject({ isUninitialized: true, status: 'uninitialized' });
    const sub = store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 }));
    expect(select(store.getState())).toMatchObject({ isLoading: true, status: 'pending' });
    expect(select(store.getState()).data).toBeUndefined();
    await sub;
    expect(select(store.getState())).toMatchObject({ isSuccess: true, status: 'fulfilled' });
    answer = page([task(1), task(2)]);
    const refetch = sub.refetch();
    const during = select(store.getState());
    expect(during.status).toBe('pending');
    // The CACHE ENTRY's isLoading means 'a request is pending' (true on a refetch too). The HOOK's isLoading
    // means 'pending AND no data yet' (false on a refetch; its isFetching is true): see 22.05.
    expect(during.isLoading).toBe(true);
    expect(during.data?.items).toHaveLength(1); // the previous data stays while refetching
    await refetch;
    expect(select(store.getState()).data?.items).toHaveLength(2);
    sub.unsubscribe();
  });
});

describe('22.06 structural sharing', () => {
  it('a refetch with EQUAL JSON returns the same data reference; a changed task only replaces that task', async () => {
    let answer = page([task(1), task(2)]);
    axiosInstance.defaults.adapter = fakeServer(() => ({ status: 200, data: structuredClone(answer) })).adapter;
    const sub = store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 }));
    await sub;
    const select = apiSlice.endpoints.getTasks.select({ size: 100 });
    const first = select(store.getState()).data!;
    await sub.refetch();
    expect(select(store.getState()).data).toBe(first); // new JSON, equal content → same reference

    answer = page([task(1), task(2, { status: 'DONE' })]);
    await sub.refetch();
    const second = select(store.getState()).data!;
    expect(second).not.toBe(first);
    expect(second.items[0]).toBe(first.items[0]); // unchanged task: same object
    expect(second.items[1]).not.toBe(first.items[1]);
    sub.unsubscribe();
  });
});

describe('22.06 cache lifetime', () => {
  it('an entry without subscribers is removed after keepUnusedDataFor (default 60 s)', async () => {
    vi.useFakeTimers();
    axiosInstance.defaults.adapter = fakeServer(() => ({ status: 200, data: page([]) })).adapter;
    const sub = store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 }));
    await vi.advanceTimersByTimeAsync(0);
    await sub;
    sub.unsubscribe();
    await vi.advanceTimersByTimeAsync(59_000);
    expect(Object.keys(store.getState().api.queries)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(Object.keys(store.getState().api.queries)).toHaveLength(0);
  });

  it('unsubscribing does NOT abort a request in flight; queryResult.abort() does', async () => {
    const signals: AbortSignal[] = [];
    axiosInstance.defaults.adapter = fakeServer((config) => {
      if (config.signal) signals.push(config.signal as AbortSignal);
      return new Promise<never>(() => {});
    }).adapter;
    const sub = store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 }));
    sub.unsubscribe();
    await flush();
    expect(signals[0]?.aborted).toBe(false);
    sub.abort();
    expect(signals[0]?.aborted).toBe(true);
  });
});

describe('22.07 / 22.08 mutations and tags', () => {
  it('a mutation invalidates the Task tag → the subscribed getTasks query refetches', async () => {
    const server = fakeServer((config) =>
      config.method === 'post' ? { status: 201, data: task(9) } : { status: 200, data: page([task(1)]) },
    );
    axiosInstance.defaults.adapter = server.adapter;
    const sub = store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 }));
    await sub;
    const created = await store
      .dispatch(apiSlice.endpoints.addTask.initiate({ title: 'New', description: '', status: 'TODO', priority: 'LOW', dueDate: null, categoryId: null }))
      .unwrap();
    expect(created.id).toBe(9);
    await flush();
    await flush();
    expect(server.requests).toEqual(['GET /tasks {"size":100}', 'POST /tasks', 'GET /tasks {"size":100}']);
    sub.unsubscribe();
  });

  it('an invalidated entry WITHOUT subscribers is not refetched (it is only marked stale)', async () => {
    const server = fakeServer((config) => (config.method === 'patch' ? { status: 200, data: task(1) } : { status: 200, data: page([task(1)]) }));
    axiosInstance.defaults.adapter = server.adapter;
    const sub = store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 }));
    await sub;
    sub.unsubscribe();
    await store.dispatch(apiSlice.endpoints.patchTask.initiate({ id: 1, changes: { status: 'DONE' } }));
    await flush();
    expect(server.requests).toEqual(['GET /tasks {"size":100}', 'PATCH /tasks/1']);
  });

  it('unwrap() of a failed mutation throws the base query error: our ApiErrorPayload with fieldErrors', async () => {
    axiosInstance.defaults.adapter = fakeServer(() => ({
      status: 400,
      data: { status: 400, error: 'VALIDATION_FAILED', message: 'Request contains invalid fields', fieldErrors: { title: 'a task with this title already exists' }, path: '/api/tasks', timestamp: 'x' },
    })).adapter;
    const attempt = store.dispatch(
      apiSlice.endpoints.addTask.initiate({ title: 'Dup', description: '', status: 'TODO', priority: 'LOW', dueDate: null, categoryId: null }),
    );
    await expect(attempt.unwrap()).rejects.toMatchObject({
      kind: 'http',
      status: 400,
      fieldErrors: { title: 'a task with this title already exists' },
    });
  });

  it('a response that fails `validate` becomes an "unexpected" error, not data', async () => {
    axiosInstance.defaults.adapter = fakeServer(() => ({ status: 200, data: { hello: 'world' } })).adapter;
    const result = await store.dispatch(apiSlice.endpoints.getTask.initiate(1));
    expect(result.error).toMatchObject({ kind: 'unexpected', message: 'The server sent an unexpected response.' });
    expect(result.data).toBeUndefined();
  });

  it('clearCompleted (queryFn): several DELETEs, partial failure reported in data', async () => {
    const server = fakeServer((config) => (config.url === '/tasks/2' ? { status: 500, data: {} } : { status: 204, data: '' }));
    axiosInstance.defaults.adapter = server.adapter;
    const result = await store.dispatch(apiSlice.endpoints.clearCompleted.initiate([1, 2, 3])).unwrap();
    expect(result).toEqual({ deleted: [1, 3], failed: [2] });
    expect(server.requests).toEqual(['DELETE /tasks/1', 'DELETE /tasks/2', 'DELETE /tasks/3']);
  });
});

describe('22.08 / 22.13 how tags match', () => {
  // Test-only endpoints, injected into the app's api slice (injectEndpoints: 23.08).
  const tagLab = apiSlice.injectEndpoints({
    endpoints: (build) => ({
      labList: build.query<number[], void>({
        queryFn: () => ({ data: [1] }),
        providesTags: [{ type: 'Task', id: 'LIST' }],
      }),
      labInvalidate: build.mutation<null, { type: 'Task'; id?: number | 'LIST' }>({
        queryFn: () => ({ data: null }),
        invalidatesTags: (_result, _error, tag) => [tag.id === undefined ? 'Task' : tag],
      }),
      labStats: build.query<{ total: number }, void>({
        queryFn: () => ({ data: { total: 1 } }),
        providesTags: ['Task'], // "anything about tasks": invalidated by EVERY task mutation (20.99-style answer)
      }),
    }),
  });

  async function refetchedAfter(tag: { type: 'Task'; id?: number | 'LIST' }) {
    const sub = store.dispatch(tagLab.endpoints.labList.initiate());
    await sub;
    const before = tagLab.endpoints.labList.select()(store.getState()).fulfilledTimeStamp;
    await new Promise((r) => setTimeout(r, 5));
    await store.dispatch(tagLab.endpoints.labInvalidate.initiate(tag));
    await flush();
    await flush();
    const after = tagLab.endpoints.labList.select()(store.getState()).fulfilledTimeStamp;
    sub.unsubscribe();
    return after !== before;
  }

  it("{ type: 'Task', id: 'LIST' } is refetched by the same tag or by the bare type 'Task'", async () => {
    expect(await refetchedAfter({ type: 'Task', id: 'LIST' })).toBe(true);
    expect(await refetchedAfter({ type: 'Task' })).toBe(true);
  });

  it('…but NOT by a tag with another id (the classic "list doesn’t refresh" mismatch)', async () => {
    expect(await refetchedAfter({ type: 'Task', id: 9 })).toBe(false);
  });

  it("a query that provides the BARE 'Task' tag: refetched by a bare 'Task' invalidation, NOT by an id-specific one", async () => {
    const stamp = () => tagLab.endpoints.labStats.select()(store.getState()).fulfilledTimeStamp;
    const sub = store.dispatch(tagLab.endpoints.labStats.initiate());
    await sub;
    const first = stamp();
    await new Promise((r) => setTimeout(r, 5));
    await store.dispatch(tagLab.endpoints.labInvalidate.initiate({ type: 'Task', id: 9 }));
    await flush();
    await flush();
    expect(stamp()).toBe(first); // id 9 invalidated: a bare-tag provider is untouched
    await store.dispatch(tagLab.endpoints.labInvalidate.initiate({ type: 'Task' }));
    await flush();
    await flush();
    expect(stamp()).not.toBe(first); // bare 'Task' invalidated: refetched
    sub.unsubscribe();
  });
});

describe('22 actions and utilities', () => {
  it('all mutations share ONE action type; endpoint matchers tell them apart', async () => {
    axiosInstance.defaults.adapter = fakeServer(() => ({ status: 200, data: task(1) })).adapter;
    const types: string[] = [];
    const recorder: Middleware = () => (next) => (action) => {
      types.push((action as { type: string }).type);
      return next(action);
    };
    const recorded = configureStore({
      reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
      middleware: (gDM) =>
        gDM()
          .concat(apiSlice.middleware)
          .concat(recorder),
    });
    const result = await recorded.dispatch(apiSlice.endpoints.patchTask.initiate({ id: 1, changes: {} }));
    const last = { type: 'api/executeMutation/fulfilled', payload: result.data, meta: { arg: { endpointName: 'patchTask', originalArgs: { id: 1, changes: {} } }, requestId: 'r', requestStatus: 'fulfilled', fulfilledTimeStamp: 1, baseQueryMeta: undefined } };
    expect(apiSlice.endpoints.patchTask.matchFulfilled(last)).toBe(true);
    expect(apiSlice.endpoints.addTask.matchFulfilled(last)).toBe(false);
    expect(types.filter((t) => t.startsWith('api/executeMutation'))).toEqual(['api/executeMutation/pending', 'api/executeMutation/fulfilled']);
    recorded.dispatch(apiSlice.util.resetApiState());
  });

  it('upsertQueryData fills a cache entry WITHOUT a request; resetApiState empties the cache', async () => {
    const server = fakeServer(() => ({ status: 200, data: page([]) }));
    axiosInstance.defaults.adapter = server.adapter;
    await store.dispatch(apiSlice.util.upsertQueryData('getTasks', { size: 100 }, page([task(5)])));
    expect(apiSlice.endpoints.getTasks.select({ size: 100 })(store.getState()).data?.items[0]?.id).toBe(5);
    expect(server.requests).toEqual([]);
    store.dispatch(apiSlice.util.resetApiState());
    expect(store.getState().api.queries).toEqual({});
  });
});
