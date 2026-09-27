import type { AxiosAdapter } from 'axios';
import { AxiosError } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api as axiosInstance } from '../../api/client';
import { mutationFulfilled } from '../../test/rtk-query-actions';
import { storeWithTasks, task } from '../../test/task-cache';
import { toggleTask } from './taskActions';

vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});

const originalAdapter = axiosInstance.defaults.adapter;
afterEach(() => {
  axiosInstance.defaults.adapter = originalAdapter;
});

const toasts = (store: Awaited<ReturnType<typeof storeWithTasks>>) => store.getState().ui.toasts.map((t) => `${t.tone}: ${t.message}`);
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('task listeners (21.15, 22.09): toasts for task writes', () => {
  it('Created / Saved for addTask / updateTask', async () => {
    const store = await storeWithTasks();
    store.dispatch(mutationFulfilled('addTask', {}, task(9, { title: 'New one' })));
    store.dispatch(mutationFulfilled('updateTask', { id: 9, request: {} }, task(9, { title: 'Renamed' })));
    expect(toasts(store)).toEqual(['success: Created: New one', 'success: Saved: Renamed']);
  });

  it('Completed: only for a PATCH that set status DONE (not a reopen, not a title edit)', async () => {
    const store = await storeWithTasks();
    store.dispatch(mutationFulfilled('patchTask', { id: 1, changes: { status: 'DONE' } }, task(1, { title: 'Report', status: 'DONE' })));
    store.dispatch(mutationFulfilled('patchTask', { id: 1, changes: { status: 'TODO' } }, task(1, { title: 'Report' })));
    store.dispatch(mutationFulfilled('patchTask', { id: 1, changes: { title: 'Report v2' } }, task(1, { title: 'Report v2' })));
    expect(toasts(store)).toEqual(['success: Completed: Report']);
  });

  it('Deleted: takes the title from the cache as it was BEFORE the action (getOriginalState)', async () => {
    const store = await storeWithTasks(task(4, { title: 'Old notes' }));
    store.dispatch(mutationFulfilled('deleteTask', 4, undefined));
    store.dispatch(mutationFulfilled('deleteTask', 77, undefined)); // not in the cache
    expect(toasts(store)).toEqual(['success: Deleted: Old notes', 'success: Deleted: Task 77']);
  });

  it('clearCompleted reports partial failures', async () => {
    const store = await storeWithTasks();
    store.dispatch(mutationFulfilled('clearCompleted', [1, 2], { deleted: [1], failed: [2] }));
    expect(toasts(store)).toEqual(['error: Deleted 1, but 1 could not be deleted.']);
  });
});

describe('toggleTask thunk (22.09)', () => {
  it('reads the status from the cache and PATCHes the opposite one; a failure becomes an error toast', async () => {
    const bodies: unknown[] = [];
    const adapter: AxiosAdapter = async (config) => {
      bodies.push(JSON.parse(String(config.data)));
      const response = { data: { status: 503, error: 'UNAVAILABLE', message: 'Try later', path: '/api/tasks/1', timestamp: 'x' }, status: 503, statusText: '', headers: {}, config };
      throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, null, response);
    };
    axiosInstance.defaults.adapter = adapter;
    const store = await storeWithTasks(task(1, { status: 'DONE' }));
    store.dispatch(toggleTask(1));
    await flush();
    await flush();
    expect(bodies).toEqual([{ status: 'TODO' }]);
    expect(toasts(store)).toEqual(['error: Try later']);
  });

  it('does nothing for a task that is not in the cache', async () => {
    const store = await storeWithTasks();
    const adapter = vi.fn<AxiosAdapter>();
    axiosInstance.defaults.adapter = adapter;
    store.dispatch(toggleTask(42));
    await flush();
    expect(adapter).not.toHaveBeenCalled();
  });
});
