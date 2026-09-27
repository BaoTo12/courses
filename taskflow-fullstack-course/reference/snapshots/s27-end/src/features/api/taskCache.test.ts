// S23: the task cache's advanced behaviour, against an in-memory tasks server behind the REAL Axios instance.
import type { AxiosAdapter } from 'axios';
import { AxiosError } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api as axiosInstance } from '../../api/client';
import { makeStore } from '../../app/store';
import type { TaskQuery } from '../../api/tasks';
import type { Task } from '../../domain/types';
import { task } from '../../test/task-cache';
import { clearUserData } from '../auth/clearUserData';
import { sortChanged } from '../listPrefs/listPrefsSlice';
import { taskSelectionToggled } from '../ui/uiSlice';
import { apiSlice } from './apiSlice';

vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});

const originalAdapter = axiosInstance.defaults.adapter;
afterEach(() => {
  axiosInstance.defaults.adapter = originalAdapter;
});

const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
};

/** GET /tasks (?status, paging ignored), GET/PUT/PATCH/DELETE /tasks/:id. `failWrites` → 500 for writes. */
function tasksServer(initial: Task[]) {
  let tasks = initial.map((t) => ({ ...t }));
  const requests: string[] = [];
  const state = { failWrites: false, failDeleteIds: new Set<number>() };
  const adapter: AxiosAdapter = async (config) => {
    const method = config.method?.toUpperCase() ?? 'GET';
    requests.push(`${method} ${config.url}`);
    const respond = (status: number, data: unknown) => {
      const response = { data, status, statusText: '', headers: {}, config };
      if (status >= 400) throw new AxiosError('failed', 'ERR_BAD_RESPONSE', config, null, response);
      return response;
    };
    const fail = () => respond(500, { status: 500, error: 'BOOM', message: 'Server error', path: '', timestamp: '' });
    const id = Number(/\/tasks\/(\d+)/.exec(config.url ?? '')?.[1]);
    if (method === 'GET' && !id) {
      const status = (config.params as { status?: string } | undefined)?.status;
      // Copies: the store freezes whatever it caches, and these objects are the server's own (20.05).
      const items = tasks.filter((t) => !status || t.status === status).map((t) => ({ ...t }));
      return respond(200, { items, page: 0, size: 100, totalItems: items.length, totalPages: 1 });
    }
    const existing = tasks.find((t) => t.id === id);
    if (method !== 'GET' && state.failWrites) return fail();
    if (!existing) return respond(404, { status: 404, error: 'NOT_FOUND', message: 'No such task', path: '', timestamp: '' });
    if (method === 'GET') return respond(200, { ...existing });
    if (method === 'DELETE') {
      if (state.failDeleteIds.has(id)) return fail();
      tasks = tasks.filter((t) => t.id !== id);
      return respond(204, '');
    }
    Object.assign(existing, JSON.parse(String(config.data)));
    return respond(200, { ...existing });
  };
  return { adapter, requests, state };
}

function setup(...tasks: Task[]) {
  const server = tasksServer(tasks);
  axiosInstance.defaults.adapter = server.adapter;
  const store = makeStore();
  const list = (query: TaskQuery = { size: 100 }) => apiSlice.endpoints.getTasks.select(query)(store.getState()).data?.items;
  const one = (id: number) => apiSlice.endpoints.getTask.select(id)(store.getState()).data;
  return { server, store, list, one };
}

describe('S23 task cache', () => {
  it('23.06 seeding: after the list loads, getTask(id) is already cached, so no request is sent', async () => {
    const { server, store } = setup(task(1), task(2));
    const listSub = store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 }));
    await listSub;
    await flush();
    const detail = await store.dispatch(apiSlice.endpoints.getTask.initiate(2));
    expect(detail.data?.title).toBe('Task 2');
    expect(server.requests).toEqual(['GET /tasks']);
    listSub.unsubscribe();
  });

  it('23.01 id tags: patching task 1 refetches the list and getTask(1), not getTask(2)', async () => {
    const { server, store } = setup(task(1), task(2));
    const subs = [
      store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 })),
      store.dispatch(apiSlice.endpoints.getTask.initiate(1)),
      store.dispatch(apiSlice.endpoints.getTask.initiate(2)),
    ];
    await Promise.all(subs);
    await flush();
    server.requests.length = 0;

    await store.dispatch(apiSlice.endpoints.patchTask.initiate({ id: 1, changes: { title: 'Renamed' } })).unwrap();
    await flush();
    expect(server.requests.sort()).toEqual(['GET /tasks', 'GET /tasks/1', 'PATCH /tasks/1']);
    for (const sub of subs) sub.unsubscribe();
  });

  it('23.04 optimistic patch: every cached list and the detail change at once, and roll back on failure', async () => {
    const { server, store, list, one } = setup(task(1), task(2));
    const subs = [
      store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 })),
      store.dispatch(apiSlice.endpoints.getTasks.initiate({ status: 'TODO', size: 100 })),
    ];
    await Promise.all(subs);
    await flush();
    server.state.failWrites = true;

    const patch = store.dispatch(apiSlice.endpoints.patchTask.initiate({ id: 1, changes: { status: 'DONE' } }));
    // Before the server has answered:
    expect(list()?.find((t) => t.id === 1)?.status).toBe('DONE');
    expect(list({ status: 'TODO', size: 100 })?.find((t) => t.id === 1)?.status).toBe('DONE');
    expect(one(1)?.status).toBe('DONE'); // the seeded detail entry too

    await expect(patch.unwrap()).rejects.toMatchObject({ status: 500 });
    expect(list()?.find((t) => t.id === 1)?.status).toBe('TODO');
    expect(one(1)?.status).toBe('TODO');
    expect(store.getState().ui.toasts.map((t) => t.message)).toEqual(['Server error']);
    for (const sub of subs) sub.unsubscribe();
  });

  it('23.05 optimistic delete: gone from the lists at once, back after a failure', async () => {
    const { server, store, list } = setup(task(1), task(2));
    const sub = store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 }));
    await sub;
    server.state.failWrites = true;

    const deletion = store.dispatch(apiSlice.endpoints.deleteTask.initiate(1));
    expect(list()?.map((t) => t.id)).toEqual([2]);
    await expect(deletion.unwrap()).rejects.toMatchObject({ status: 500 });
    expect(list()?.map((t) => t.id)).toEqual([1, 2]);
    sub.unsubscribe();
  });

  it('23.05 a successful delete: the toast still has the title, and an unsubscribed getTask(id) is removed, not refetched', async () => {
    const { server, store, list } = setup(task(1, { title: 'Old notes' }), task(2));
    const sub = store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 }));
    await sub;
    await flush();
    server.requests.length = 0;

    await store.dispatch(apiSlice.endpoints.deleteTask.initiate(1)).unwrap();
    await flush();
    expect(server.requests).toEqual(['DELETE /tasks/1', 'GET /tasks']); // no GET /tasks/1 → 404
    expect(list()?.map((t) => t.id)).toEqual([2]);
    expect(Object.keys(store.getState().api.queries)).not.toContain('getTask(1)');
    expect(store.getState().ui.toasts.map((t) => t.message)).toEqual(['Deleted: Old notes']);
    sub.unsubscribe();
  });

  it('23.06 pessimistic update: the PUT response is written into getTask(id); only the lists refetch', async () => {
    const { server, store, one } = setup(task(1), task(2));
    const subs = [
      store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 })),
      store.dispatch(apiSlice.endpoints.getTask.initiate(1)),
    ];
    await Promise.all(subs);
    await flush();
    server.requests.length = 0;

    const request = { title: 'Edited', description: '', priority: 'HIGH' as const, dueDate: null, categoryId: null, status: 'TODO' as const };
    const updating = store.dispatch(apiSlice.endpoints.updateTask.initiate({ id: 1, request }));
    expect(one(1)?.title).toBe('Task 1'); // pessimistic: nothing changes before the answer
    await updating.unwrap();
    await flush();
    expect(one(1)?.title).toBe('Edited');
    expect(server.requests).toEqual(['PUT /tasks/1', 'GET /tasks']);
    for (const sub of subs) sub.unsubscribe();
  });

  it('23.11 clearUserData: slices reset, the cache is emptied, and a response still in flight is dropped', async () => {
    const { store } = setup(task(1));
    await store.dispatch(apiSlice.endpoints.getTask.initiate(1));
    store.dispatch(sortChanged('title', 'desc'));
    const inFlight = store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 })); // user A's request…

    store.dispatch(clearUserData()); // …A logs out before it answers
    await inFlight;
    await flush();

    expect(store.getState().api.queries).toEqual({});
    expect(store.getState().listPrefs.sort).toEqual({ key: 'dueDate', direction: 'asc' });
    inFlight.unsubscribe();
  });

  it('23.13 optimistic priority change rolls back on failure', async () => {
    const { server, store, one } = setup(task(1));
    const sub = store.dispatch(apiSlice.endpoints.getTask.initiate(1));
    await sub;
    server.state.failWrites = true;
    const patch = store.dispatch(apiSlice.endpoints.patchTask.initiate({ id: 1, changes: { priority: 'HIGH' } }));
    expect(one(1)?.priority).toBe('HIGH');
    await expect(patch.unwrap()).rejects.toMatchObject({ status: 500 });
    expect(one(1)?.priority).toBe('MEDIUM');
    sub.unsubscribe();
  });

  it('S27 bulk delete: gone at once, the refused one comes back with the LIST refetch, stays selected, one toast', async () => {
    const { server, store, list } = setup(task(1), task(2), task(3));
    const sub = store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 }));
    await sub;
    for (const id of [1, 2]) store.dispatch(taskSelectionToggled(id));
    server.state.failDeleteIds.add(2);

    const deletion = store.dispatch(apiSlice.endpoints.deleteTasks.initiate([1, 2]));
    expect(list()?.map((t) => t.id)).toEqual([3]); // optimistic
    await expect(deletion.unwrap()).resolves.toEqual({ deleted: [1], failed: [2] });
    await flush();

    expect(list()?.map((t) => t.id)).toEqual([2, 3]); // the server kept 2: the refetch shows it again
    expect(store.getState().ui.selectedTaskIds).toEqual([2]);
    expect(store.getState().ui.toasts.map((t) => [t.i18nKey, t.values])).toEqual([['toasts.deletedPartly', { deleted: 1, failed: 1 }]]);
    sub.unsubscribe();
  });
});
