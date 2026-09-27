// Hand-written Redux "slice" (S15): state type, action types, action creators and reducer in one file.
// S20 replaces all of this with RTK's createSlice; the behaviour stays the same.
import { createSelector } from 'reselect';
import type { Task } from '../../domain/types';
import { denormalize, normalize } from '../../domain/normalize';
import type { Normalized } from '../../domain/normalize';
import type { AppAction } from '../../app/app-action';
import type { RootState } from '../../app/rootReducer';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

/** Normalised since S19: `ids` keep the server's order, `entities` hold each task once. */
export interface TasksState extends Normalized<Task> {
  status: LoadStatus;
  error: string | null;
  /** The id of the fetch in flight; results of any OTHER (older) fetch are ignored (18.11). */
  currentRequestId: string | null;
  /** When the list was last loaded successfully (epoch ms), for "fetch if needed" (18.09). */
  fetchedAt: number | null;
}

export const initialTasksState: TasksState = {
  ids: [],
  entities: {},
  status: 'idle',
  error: null,
  currentRequestId: null,
  fetchedAt: null,
};

// ── Actions: past-tense EVENTS, typed as a discriminated union (06.06) ───────
export type TasksAction =
  | { type: 'tasks/fetchStarted'; payload: { requestId: string } }
  | { type: 'tasks/fetchSucceeded'; payload: { requestId: string; tasks: Task[]; fetchedAt: number } }
  | { type: 'tasks/fetchFailed'; payload: { requestId: string; message: string } }
  | { type: 'tasks/taskAdded'; payload: Task }
  | { type: 'tasks/taskUpdated'; payload: Task }
  | { type: 'tasks/taskDeleted'; payload: number }
  /** The server marked every task done. The timestamp comes IN the action: reducers can't call Date.now(). */
  | { type: 'tasks/allCompleted'; payload: { updatedAt: string } }
  /** The server deleted the completed tasks; the payload lists their ids (other slices need them too). */
  | { type: 'tasks/completedCleared'; payload: number[] };

/** The member of the union with this `type` (Extract, 06.03). */
type TasksActionOf<T extends TasksAction['type']> = Extract<TasksAction, { type: T }>;

// ── Action creators ───────────────────────────────────────────────────────────
export const fetchStarted = (requestId: string): TasksActionOf<'tasks/fetchStarted'> => ({
  type: 'tasks/fetchStarted',
  payload: { requestId },
});
/** `fetchedAt` defaults to "now": the clock is read here, never in the reducer (15.04). */
export const fetchSucceeded = (
  requestId: string,
  tasks: Task[],
  fetchedAt = Date.now(),
): TasksActionOf<'tasks/fetchSucceeded'> => ({
  type: 'tasks/fetchSucceeded',
  payload: { requestId, tasks, fetchedAt },
});
export const fetchFailed = (requestId: string, message: string): TasksActionOf<'tasks/fetchFailed'> => ({
  type: 'tasks/fetchFailed',
  payload: { requestId, message },
});
export const taskAdded = (task: Task): TasksActionOf<'tasks/taskAdded'> => ({ type: 'tasks/taskAdded', payload: task });
export const taskUpdated = (task: Task): TasksActionOf<'tasks/taskUpdated'> => ({
  type: 'tasks/taskUpdated',
  payload: task,
});
export const taskDeleted = (id: number): TasksActionOf<'tasks/taskDeleted'> => ({ type: 'tasks/taskDeleted', payload: id });
/** The non-deterministic part (the clock) lives HERE, in the action creator, never in the reducer. */
export const allCompleted = (updatedAt = new Date().toISOString()): TasksActionOf<'tasks/allCompleted'> => ({
  type: 'tasks/allCompleted',
  payload: { updatedAt },
});
export const completedCleared = (ids: number[]): TasksActionOf<'tasks/completedCleared'> => ({
  type: 'tasks/completedCleared',
  payload: ids,
});

/** A copy of `entities` without the given ids (the rest keep their identity). */
function withoutIds(entities: Record<number, Task>, ids: ReadonlySet<number>): Record<number, Task> {
  const next: Record<number, Task> = {};
  for (const [key, task] of Object.entries(entities)) {
    if (!ids.has(Number(key))) next[Number(key)] = task;
  }
  return next;
}

// ── Reducer ───────────────────────────────────────────────────────────────────
export function tasksReducer(state: TasksState = initialTasksState, action: AppAction): TasksState {
  switch (action.type) {
    case 'tasks/fetchStarted':
      // Keep the current tasks while reloading (the list doesn't blink); clear the old error.
      // The NEWEST fetch wins: remember its id (18.11).
      return { ...state, status: 'loading', error: null, currentRequestId: action.payload.requestId };
    case 'tasks/fetchSucceeded': {
      const { requestId, tasks, fetchedAt } = action.payload;
      if (requestId !== state.currentRequestId) return state; // a stale response: ignore it (18.10)
      return { ...state, ...normalize(tasks), status: 'succeeded', error: null, currentRequestId: null, fetchedAt };
    }
    case 'tasks/fetchFailed': {
      const { requestId, message } = action.payload;
      if (requestId !== state.currentRequestId) return state;
      return { ...state, status: 'failed', error: message, currentRequestId: null };
    }
    case 'tasks/taskAdded': {
      const task = action.payload;
      const ids = state.entities[task.id] ? state.ids : [...state.ids, task.id];
      return { ...state, ids, entities: { ...state.entities, [task.id]: task } };
    }
    case 'tasks/taskUpdated': {
      const task = action.payload;
      if (!state.entities[task.id]) return state; // unknown task (e.g. deleted meanwhile): nothing to update
      // `ids` is NOT touched: components that select ids don't re-render for a content change (17.10).
      return { ...state, entities: { ...state.entities, [task.id]: task } };
    }
    case 'tasks/taskDeleted': {
      const id = action.payload;
      if (!state.entities[id]) return state;
      return { ...state, ids: state.ids.filter((x) => x !== id), entities: withoutIds(state.entities, new Set([id])) };
    }
    case 'tasks/allCompleted': {
      const { updatedAt } = action.payload;
      const open = state.ids.filter((id) => state.entities[id]?.status !== 'DONE');
      if (open.length === 0) return state;
      const entities = { ...state.entities };
      for (const id of open) {
        const task = entities[id];
        if (task) entities[id] = { ...task, status: 'DONE', updatedAt }; // DONE tasks keep their identity
      }
      return { ...state, entities };
    }
    case 'tasks/completedCleared': {
      const cleared = new Set(action.payload); // a local helper, not state: Sets are fine here
      return { ...state, ids: state.ids.filter((id) => !cleared.has(id)), entities: withoutIds(state.entities, cleared) };
    }
    case 'auth/loggedOut':
      return initialTasksState; // another user may log in next: forget everything (15.10)
    default:
      // Not an error: other slices' actions and Redux's own init action arrive here (15.07).
      return state;
  }
}

// ── Selectors (17.09): co-located with the slice that owns the state shape ────
export const selectTaskIds = (state: RootState): number[] => state.tasks.ids;
export const selectTasksStatus = (state: RootState): LoadStatus => state.tasks.status;
export const selectTasksError = (state: RootState): string | null => state.tasks.error;

/** O(1) since S19: a lookup, not a search. */
export const selectTaskById = (state: RootState, id: number): Task | undefined => state.tasks.entities[id];

/**
 * The tasks as an ordered array, MEMOISED (19.02): recomputed only when `ids` or `entities` change,
 * so every call between changes returns the SAME array and `useSelector` doesn't re-render (17.04).
 */
export const selectTasks = createSelector(
  [selectTaskIds, (state: RootState) => state.tasks.entities],
  (ids, entities) => denormalize({ ids, entities }),
);

/** Returns a number (a primitive), so `useSelector` can compare it with === safely (17.04). */
export const selectOpenTaskCount = (state: RootState): number =>
  selectTasks(state).filter((task) => task.status !== 'DONE').length;
