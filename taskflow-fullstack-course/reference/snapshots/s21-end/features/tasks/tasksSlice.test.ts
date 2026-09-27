import { describe, expect, it } from 'vitest';
import type { Task } from '../../domain/types';
import { normalize } from '../../domain/normalize';
import { deepFreeze } from '../../test/deep-freeze';
import { loggedOut } from '../auth/authActions';
import { makeStore } from '../../app/store';
import { allCompleted, initialTasksState, selectTaskById, selectTasks, tasksReducer } from './tasksSlice';
import type { TasksState } from './tasksSlice';
import { clearCompleted, deleteTask, fetchTasks, saveNewTask, saveTaskChanges } from './tasksThunks';

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

/**
 * A loaded, normalised, FROZEN state. With Immer, a real mutation of the INPUT would still throw:
 * createSlice reducers mutate a draft, never the frozen original (20.05).
 */
const loaded = (...items: Task[]): TasksState =>
  deepFreeze({ ...normalize(items), status: 'succeeded', error: null, currentRequestId: null, fetchedAt: 1000 });

// RTK's thunk action creators can BUILD their lifecycle actions: handy for reducer tests (20.09).
// pending(requestId, arg) · fulfilled(payload, requestId, arg) · rejected(error, requestId, arg, payload?)

describe('tasksReducer (createSlice, S20)', () => {
  it('returns the initial state for an unknown action', () => {
    expect(tasksReducer(undefined, { type: '@@redux/INITx.y.z' })).toBe(initialTasksState);
  });

  it('returns the SAME state object for actions it does not handle', () => {
    const state = loaded(task(1));
    expect(tasksReducer(state, { type: 'ui/selectionCleared' })).toBe(state);
  });

  it('tracks the fetch lifecycle with RTK request ids, and normalises the result', () => {
    const reloading = tasksReducer(loaded(task(1)), fetchTasks.pending('r1', undefined));
    expect(reloading).toMatchObject({ ids: [1], status: 'loading', error: null, currentRequestId: 'r1' });

    const failed = tasksReducer(
      deepFreeze(reloading),
      fetchTasks.rejected(null, 'r1', undefined, { kind: 'http', status: 503, code: 'X', message: 'Boom', fieldErrors: {} }),
    );
    expect(failed).toMatchObject({ status: 'failed', error: 'Boom', currentRequestId: null });

    const retrying = tasksReducer(deepFreeze(failed), fetchTasks.pending('r2', undefined));
    const done = tasksReducer(deepFreeze(retrying), fetchTasks.fulfilled({ tasks: [task(3), task(2)], fetchedAt: 5000 }, 'r2', undefined));
    expect(done).toEqual({
      ids: [3, 2],
      entities: { 2: task(2), 3: task(3) },
      status: 'succeeded',
      error: null,
      currentRequestId: null,
      fetchedAt: 5000,
    });
  });

  it('ignores responses from a stale (older) request (18.11)', () => {
    const first = tasksReducer(loaded(task(1)), fetchTasks.pending('old', undefined));
    const second = deepFreeze(tasksReducer(deepFreeze(first), fetchTasks.pending('new', undefined)));
    const afterNew = deepFreeze(tasksReducer(second, fetchTasks.fulfilled({ tasks: [task(2)], fetchedAt: 2000 }, 'new', undefined)));
    expect(tasksReducer(afterNew, fetchTasks.fulfilled({ tasks: [task(9)], fetchedAt: 3000 }, 'old', undefined))).toBe(afterNew);
    expect(tasksReducer(afterNew, fetchTasks.rejected(new Error('late'), 'old', undefined))).toBe(afterNew);
  });

  it('a cancelled current request is not an error', () => {
    const loading = deepFreeze(tasksReducer(loaded(task(1)), fetchTasks.pending('r1', undefined)));
    const cancelled = tasksReducer(
      loading,
      fetchTasks.rejected(null, 'r1', undefined, { kind: 'cancelled', status: null, code: 'CANCELLED', message: 'Request cancelled', fieldErrors: {} }),
    );
    expect(cancelled).toMatchObject({ status: 'succeeded', error: null, currentRequestId: null });
  });

  it('upserts saved tasks (isAnyOf matcher) and removes deleted ones, keeping identities', () => {
    const state = loaded(task(1), task(2));
    const request = { title: 'x', description: '', status: 'TODO' as const, priority: 'LOW' as const, dueDate: null, categoryId: null };

    expect(tasksReducer(state, saveNewTask.fulfilled(task(3), 'r', request)).ids).toEqual([1, 2, 3]);

    const updated = tasksReducer(state, saveTaskChanges.fulfilled(task(2, { title: 'Renamed' }), 'r', { id: 2, changes: {} }));
    expect(updated.entities[2]?.title).toBe('Renamed');
    expect(updated.entities[1]).toBe(state.entities[1]); // structural sharing (20.05)
    expect(updated.ids).toBe(state.ids); // Immer kept `ids`: nothing touched it

    expect(tasksReducer(state, deleteTask.fulfilled(1, 'r', 1)).ids).toEqual([2]);
    expect(tasksReducer(loaded(task(1), task(2), task(3)), clearCompleted.fulfilled([1, 3], 'r', undefined)).ids).toEqual([2]);
  });

  it('allCompleted: prepare supplies the timestamp; DONE tasks keep their identity; no-op → same state', () => {
    const doneAlready = task(1, { status: 'DONE' });
    const state = loaded(doneAlready, task(2));
    const next = tasksReducer(state, allCompleted('2026-10-01T10:00:00Z'));
    expect(next.entities[1]).toBe(doneAlready);
    expect(next.entities[2]).toMatchObject({ status: 'DONE', updatedAt: '2026-10-01T10:00:00Z' });
    expect(tasksReducer(deepFreeze(next), allCompleted('2026-10-02T10:00:00Z'))).toBe(next);
    expect(typeof allCompleted().payload.updatedAt).toBe('string'); // the default comes from prepare
  });

  it('resets on auth/loggedOut', () => {
    expect(tasksReducer(loaded(task(1)), loggedOut())).toBe(initialTasksState);
  });

  it('a fetch still in flight at logout cannot write the old user’s tasks back (20.11)', () => {
    const inFlight = tasksReducer(loaded(task(1)), fetchTasks.pending('old-user', undefined));
    const afterLogout = deepFreeze(tasksReducer(deepFreeze(inFlight), loggedOut())); // currentRequestId → null
    const late = fetchTasks.fulfilled({ tasks: [task(1), task(2)], fetchedAt: 9000 }, 'old-user', undefined);
    expect(tasksReducer(afterLogout, late)).toBe(afterLogout);
  });
});

describe('selectors', () => {
  it('selectTaskById is a lookup; selectTasks is memoised', () => {
    const store = makeStore({ tasks: loaded(task(1), task(2)) });
    expect(selectTaskById(store.getState(), 2)?.title).toBe('Task 2');
    const first = selectTasks(store.getState());
    store.dispatch({ type: 'ui/selectionCleared' });
    expect(selectTasks(store.getState())).toBe(first);
    store.dispatch(saveTaskChanges.fulfilled(task(2, { title: 'Changed' }), 'r', { id: 2, changes: {} }));
    expect(selectTasks(store.getState())).not.toBe(first);
  });
});
