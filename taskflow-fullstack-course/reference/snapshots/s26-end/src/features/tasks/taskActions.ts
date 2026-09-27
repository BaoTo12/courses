import type { AppThunk } from '../../app/thunk-types';
import { apiSlice } from '../api/apiSlice';
import { selectTaskById } from './taskSelectors';

/**
 * Toggle DONE ↔ TODO. A plain thunk (22.09): it READS the current status from the cache, then starts the
 * RTK Query mutation with `endpoint.initiate(...)`, the same thing a mutation hook's trigger does.
 * The list's `handleToggle` can then be `useCallback((id) => dispatch(toggleTask(id)), [dispatch])`:
 * stable, without subscribing the page to every task (21.10). Toasts come from listeners (taskListeners.ts).
 */
export const toggleTask =
  (id: number): AppThunk =>
  (dispatch, getState) => {
    const task = selectTaskById(getState(), id);
    if (!task) return;
    const status = task.status === 'DONE' ? 'TODO' : 'DONE';
    void dispatch(apiSlice.endpoints.patchTask.initiate({ id, changes: { status } }));
  };
