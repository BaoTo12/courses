import type { AxiosAdapter } from 'axios';
import { AxiosError } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api as axiosInstance } from '../../api/client';
import { makeStore } from '../../app/store';
import type { Comment } from '../../domain/types';
import { apiSlice } from '../api/apiSlice';

vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});

const originalAdapter = axiosInstance.defaults.adapter;
afterEach(() => {
  axiosInstance.defaults.adapter = originalAdapter;
});

const comment = (id: number, taskId: number, body: string): Comment => ({ id, taskId, authorId: 1, body, createdAt: '2026-09-26T08:00:00Z' });
const flush = async () => {
  for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0));
};

/** A tiny in-memory comments server behind the REAL Axios instance. */
function commentsServer() {
  const store: Comment[] = [comment(1, 5, 'First'), comment(2, 6, 'Other task')];
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(`${config.method?.toUpperCase()} ${config.url}`);
    const taskId = Number(/\/tasks\/(\d+)\/comments/.exec(config.url ?? '')?.[1]);
    const respond = (status: number, data: unknown) => ({ data, status, statusText: '', headers: {}, config });
    if (config.method === 'post') {
      const { body } = JSON.parse(String(config.data)) as { body: string };
      if (body.length > 1000) {
        const response = respond(400, { status: 400, error: 'VALIDATION_FAILED', message: 'Invalid', fieldErrors: { body: 'must be 1 to 1000 characters' }, path: '', timestamp: '' });
        throw new AxiosError('bad', 'ERR_BAD_REQUEST', config, null, response);
      }
      const created = comment(store.length + 1, taskId, body);
      store.push(created);
      return respond(201, created);
    }
    return respond(200, store.filter((c) => c.taskId === taskId));
  };
  return { adapter, requests };
}

describe('comments (22.11)', () => {
  it('adding a comment to task 5 refetches task 5’s comments, not task 6’s (tags with the task id)', async () => {
    const server = commentsServer();
    axiosInstance.defaults.adapter = server.adapter;
    const store = makeStore();
    const five = store.dispatch(apiSlice.endpoints.getComments.initiate(5));
    const six = store.dispatch(apiSlice.endpoints.getComments.initiate(6));
    await Promise.all([five, six]);

    await store.dispatch(apiSlice.endpoints.addComment.initiate({ taskId: 5, body: 'Second' })).unwrap();
    await flush();

    expect(server.requests).toEqual([
      'GET /tasks/5/comments',
      'GET /tasks/6/comments',
      'POST /tasks/5/comments',
      'GET /tasks/5/comments', // ← only this one refetched
    ]);
    const select5 = apiSlice.endpoints.getComments.select(5);
    expect(select5(store.getState()).data?.map((c) => c.body)).toEqual(['First', 'Second']);
    five.unsubscribe();
    six.unsubscribe();
  });

  it('a rejected post surfaces the field error through unwrap()', async () => {
    axiosInstance.defaults.adapter = commentsServer().adapter;
    const store = makeStore();
    const attempt = store.dispatch(apiSlice.endpoints.addComment.initiate({ taskId: 5, body: 'x'.repeat(1001) }));
    await expect(attempt.unwrap()).rejects.toMatchObject({ status: 400, fieldErrors: { body: 'must be 1 to 1000 characters' } });
  });
});
