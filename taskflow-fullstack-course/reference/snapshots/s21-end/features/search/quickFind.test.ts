import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as realApi from '../../api';
import { ApiRequestError } from '../../api/api-error';
import type { TaskQuery } from '../../api/tasks';
import { makeStore } from '../../app/store';
import type { Page } from '../../domain/api-types';
import type { Task } from '../../domain/types';
import { saveNewTask, saveTask } from '../tasks/tasksThunks';
import { QUICK_FIND_DEBOUNCE_MS } from './quickFindListener';
import { quickFindChanged, quickFindClosed } from './quickFindSlice';

vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});

const task = (id: number, title: string): Task => ({
  id,
  title,
  description: '',
  status: 'TODO',
  priority: 'LOW',
  dueDate: null,
  categoryId: null,
  ownerId: 1,
  createdAt: 'x',
  updatedAt: 'x',
});
const page = (items: Task[]): Page<Task> => ({ items, page: 0, size: 5, totalItems: items.length, totalPages: 1 });

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('quick find listener (21.15)', () => {
  it('debounces: typing "w", "wr", "wri", "writ" quickly sends ONE request, for "writ"', async () => {
    const getTasks = vi.fn(async () => page([task(1, 'Write quarterly report')]));
    const store = makeStore(undefined, { api: { ...realApi, getTasks } });

    for (const text of ['w', 'wr', 'wri', 'writ']) {
      store.dispatch(quickFindChanged(text));
      await vi.advanceTimersByTimeAsync(100); // faster than the debounce
    }
    expect(getTasks).not.toHaveBeenCalled();
    expect(store.getState().quickFind.status).toBe('loading');

    await vi.advanceTimersByTimeAsync(QUICK_FIND_DEBOUNCE_MS);
    expect(getTasks).toHaveBeenCalledTimes(1);
    expect(getTasks).toHaveBeenCalledWith({ q: 'writ', size: 5 }, expect.any(AbortSignal));
    expect(store.getState().quickFind).toMatchObject({
      status: 'succeeded',
      results: [{ id: 1, title: 'Write quarterly report', status: 'TODO' }],
    });
  });

  it('a newer keystroke ABORTS the request already in flight', async () => {
    const signals: AbortSignal[] = [];
    const getTasks = vi.fn((query?: TaskQuery, signal?: AbortSignal) => {
      if (signal) signals.push(signal);
      // the first request never answers on its own: only an abort ends it
      if (query?.q === 'rep') return new Promise<Page<Task>>((_resolve, reject) => signal?.addEventListener('abort', () => reject(signal.reason)));
      return Promise.resolve(page([task(2, 'Report bug')]));
    });
    const store = makeStore(undefined, { api: { ...realApi, getTasks } });

    store.dispatch(quickFindChanged('rep'));
    await vi.advanceTimersByTimeAsync(QUICK_FIND_DEBOUNCE_MS); // the request for "rep" starts
    expect(signals[0]?.aborted).toBe(false);

    store.dispatch(quickFindChanged('repo'));
    expect(signals[0]?.aborted).toBe(true); // cancelActiveListeners aborted the old effect's signal
    await vi.advanceTimersByTimeAsync(QUICK_FIND_DEBOUNCE_MS);
    expect(store.getState().quickFind).toMatchObject({ query: 'repo', status: 'succeeded', error: null });
  });

  it('short queries are not sent; errors are stored; closing resets', async () => {
    const getTasks = vi.fn(async () => {
      throw new ApiRequestError({ kind: 'network', message: 'Cannot reach the server.' });
    });
    const store = makeStore(undefined, { api: { ...realApi, getTasks } });
    store.dispatch(quickFindChanged('x'));
    await vi.advanceTimersByTimeAsync(QUICK_FIND_DEBOUNCE_MS * 2);
    expect(getTasks).not.toHaveBeenCalled();
    expect(store.getState().quickFind.status).toBe('idle');

    store.dispatch(quickFindChanged('xyz'));
    await vi.advanceTimersByTimeAsync(QUICK_FIND_DEBOUNCE_MS);
    expect(store.getState().quickFind).toMatchObject({ status: 'failed', error: 'Cannot reach the server.' });

    store.dispatch(quickFindClosed());
    expect(store.getState().quickFind).toEqual({ query: '', status: 'idle', results: [], error: null });
  });
});

describe('save toast listener (21.15)', () => {
  it('shows "Created: …" and "Saved: …" for the two save thunks, nothing for others', () => {
    const store = makeStore();
    store.dispatch(saveNewTask.fulfilled(task(9, 'New one'), 'r1', {} as never));
    store.dispatch(saveTask.fulfilled(task(9, 'Renamed'), 'r2', {} as never));
    expect(store.getState().ui.toasts.map((t) => t.message)).toEqual(['Created: New one', 'Saved: Renamed']);
  });
});
