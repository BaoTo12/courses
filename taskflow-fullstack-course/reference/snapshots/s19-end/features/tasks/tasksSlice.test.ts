import { describe, expect, it } from 'vitest';
import type { Task } from '../../domain/types';
import { normalize } from '../../domain/normalize';
import { deepFreeze } from '../../test/deep-freeze';
import { loggedOut } from '../auth/authActions';
import { makeStore } from '../../app/store';
import {
  allCompleted,
  completedCleared,
  fetchFailed,
  fetchStarted,
  fetchSucceeded,
  initialTasksState,
  selectTaskById,
  selectTasks,
  taskAdded,
  taskDeleted,
  taskUpdated,
  tasksReducer,
} from './tasksSlice';
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

/** A loaded, normalised, FROZEN state: any mutation in the reducer throws. */
const loaded = (...items: Task[]): TasksState =>
  deepFreeze({ ...normalize(items), status: 'succeeded', error: null, currentRequestId: null, fetchedAt: 1000 });

describe('tasksReducer (normalised since S19)', () => {
  it('returns the initial state for an unknown action (including Redux init)', () => {
    expect(tasksReducer(undefined, { type: '@@redux/INITx.y.z' } as never)).toBe(initialTasksState);
  });

  it('returns the SAME state object for actions it does not handle', () => {
    const state = loaded(task(1));
    expect(tasksReducer(state, { type: 'ui/selectionCleared' })).toBe(state);
  });

  it('tracks the fetch lifecycle, keeps tasks while reloading, and normalises the result', () => {
    const reloading = tasksReducer(loaded(task(1)), fetchStarted('r1'));
    expect(reloading).toMatchObject({ ids: [1], status: 'loading', error: null, currentRequestId: 'r1' });

    const failed = tasksReducer(deepFreeze(reloading), fetchFailed('r1', 'Boom'));
    expect(failed).toMatchObject({ status: 'failed', error: 'Boom', currentRequestId: null });

    const retrying = tasksReducer(deepFreeze(failed), fetchStarted('r2'));
    const done = tasksReducer(deepFreeze(retrying), fetchSucceeded('r2', [task(3), task(2)], 5000));
    expect(done).toEqual({
      ids: [3, 2], // the server's order is preserved
      entities: { 2: task(2), 3: task(3) },
      status: 'succeeded',
      error: null,
      currentRequestId: null,
      fetchedAt: 5000,
    });
  });

  it('ignores responses from a stale (older) request (18.10, 18.11)', () => {
    const first = tasksReducer(loaded(task(1)), fetchStarted('old'));
    const second = deepFreeze(tasksReducer(deepFreeze(first), fetchStarted('new')));
    const afterNew = deepFreeze(tasksReducer(second, fetchSucceeded('new', [task(2), task(3)], 2000)));
    expect(tasksReducer(afterNew, fetchSucceeded('old', [task(9)], 3000))).toBe(afterNew);
    expect(tasksReducer(afterNew, fetchFailed('old', 'late error'))).toBe(afterNew);
  });

  it('adds, updates and deletes without mutating', () => {
    const state = loaded(task(1), task(2));

    expect(tasksReducer(state, taskAdded(task(3))).ids).toEqual([1, 2, 3]);

    const updated = tasksReducer(state, taskUpdated(task(2, { title: 'Renamed' })));
    expect(updated.entities[2]?.title).toBe('Renamed');
    expect(updated.entities[1]).toBe(state.entities[1]); // untouched tasks keep their identity
    expect(updated.ids).toBe(state.ids); // a content change doesn't touch the ids array (17.10)

    const deleted = tasksReducer(state, taskDeleted(1));
    expect(deleted.ids).toEqual([2]);
    expect(deleted.entities[1]).toBeUndefined();
  });

  it('ignores updates and deletes for unknown ids (same state)', () => {
    const state = loaded(task(1));
    expect(tasksReducer(state, taskUpdated(task(99)))).toBe(state);
    expect(tasksReducer(state, taskDeleted(99))).toBe(state);
  });

  it('allCompleted uses the timestamp from the action, and leaves DONE tasks untouched', () => {
    const doneAlready = task(1, { status: 'DONE' });
    const state = loaded(doneAlready, task(2));
    const next = tasksReducer(state, allCompleted('2026-10-01T10:00:00Z'));
    expect(next.entities[1]).toBe(doneAlready);
    expect(next.entities[2]).toMatchObject({ status: 'DONE', updatedAt: '2026-10-01T10:00:00Z' });
    expect(tasksReducer(deepFreeze(next), allCompleted('2026-10-02T10:00:00Z'))).toBe(next); // nothing left to complete
  });

  it('completedCleared removes exactly the listed ids', () => {
    const state = loaded(task(1), task(2), task(3));
    const next = tasksReducer(state, completedCleared([1, 3]));
    expect(next.ids).toEqual([2]);
    expect(Object.keys(next.entities)).toEqual(['2']);
  });

  it('resets on auth/loggedOut', () => {
    expect(tasksReducer(loaded(task(1)), loggedOut())).toBe(initialTasksState);
  });
});

describe('selectors (19.02, 19.06)', () => {
  it('selectTaskById is a lookup; selectTasks is memoised', () => {
    const store = makeStore({ tasks: loaded(task(1), task(2)) });
    expect(selectTaskById(store.getState(), 2)?.title).toBe('Task 2');

    const first = selectTasks(store.getState());
    expect(first.map((t) => t.id)).toEqual([1, 2]);
    // An unrelated action: the tasks slice is unchanged → the SAME array is returned.
    store.dispatch({ type: 'ui/selectionCleared' });
    expect(selectTasks(store.getState())).toBe(first);
    // A task changes → a new array (with the new task object).
    store.dispatch(taskUpdated(task(2, { title: 'Changed' })));
    const second = selectTasks(store.getState());
    expect(second).not.toBe(first);
    expect(second[1]?.title).toBe('Changed');
  });
});
