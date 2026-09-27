// S51: after a successful task write, the listener invalidates 'Activity', so a subscribed feed refetches.
import type { AxiosAdapter } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api as axiosInstance } from '../../api/client';
import { makeStore } from '../../app/store';
import { apiSlice } from '../api/apiSlice';
import { activityApi } from './activityApi';

vi.spyOn(console, 'debug').mockImplementation(() => {});

const originalAdapter = axiosInstance.defaults.adapter;
afterEach(() => {
  axiosInstance.defaults.adapter = originalAdapter;
});

const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
};

const task = {
  id: 5, title: 'Write report', description: '', status: 'DONE', priority: 'LOW', dueDate: null, categoryId: null, ownerId: 1,
  createdAt: '2026-09-01T08:00:00Z', updatedAt: '2026-09-02T08:00:00Z',
};

describe('activity feed invalidation (S51)', () => {
  it('refetches GET /activity after a successful patch, not after a failed one', async () => {
    const requests: string[] = [];
    let patchStatus = 200;
    const adapter: AxiosAdapter = async (config) => {
      const line = `${config.method?.toUpperCase()} ${config.url}`;
      requests.push(line);
      const respond = (status: number, data: unknown) => ({ data, status, statusText: '', headers: {}, config });
      if (line === 'GET /activity') return respond(200, []);
      if (line === 'PATCH /tasks/5') {
        if (patchStatus === 200) return respond(200, task);
        return Promise.reject(Object.assign(new Error('Forbidden'), {
          isAxiosError: true, config, response: respond(403, { status: 403, error: 'READ_ONLY', message: 'read-only', path: '/api/tasks/5', timestamp: 'x' }),
        }));
      }
      return respond(404, { status: 404, error: 'NOT_FOUND', message: 'no', path: config.url ?? '', timestamp: 'x' });
    };
    axiosInstance.defaults.adapter = adapter;

    const store = makeStore();
    const feed = store.dispatch(activityApi.endpoints.getActivity.initiate());   // a mounted <ActivityFeed>
    await flush();
    expect(requests.filter((r) => r === 'GET /activity')).toHaveLength(1);

    await store.dispatch(apiSlice.endpoints.patchTask.initiate({ id: 5, changes: { status: 'DONE' } }));
    await flush();
    expect(requests.filter((r) => r === 'GET /activity')).toHaveLength(2);        // invalidated → refetched

    patchStatus = 403;
    await store.dispatch(apiSlice.endpoints.patchTask.initiate({ id: 5, changes: { status: 'TODO' } }));
    await flush();
    expect(requests.filter((r) => r === 'GET /activity')).toHaveLength(2);        // a failed write records nothing
    feed.unsubscribe();
  });
});
