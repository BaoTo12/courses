import type { Task } from '../domain/types';
import type { RequestState } from '../domain/api-types';
import { removeTask } from '../domain/task-utils';
import { assertNever } from '../domain/guards';

export type TasksState = RequestState<Task[]>;

// Actions describe EVENTS that happened (past tense), not "set X" commands.
export type TasksAction =
  | { type: 'fetchStarted' }
  | { type: 'fetchSucceeded'; tasks: Task[] }
  | { type: 'fetchFailed'; error: string }
  | { type: 'taskAdded'; task: Task }
  | { type: 'taskUpdated'; task: Task }
  | { type: 'taskRemoved'; id: number };

export const initialTasksState: TasksState = { status: 'idle' };

/** Pure: (state, action) → new state. No fetching, no mutation, no randomness. */
export function tasksReducer(state: TasksState, action: TasksAction): TasksState {
  switch (action.type) {
    case 'fetchStarted':
      return { status: 'loading' };
    case 'fetchSucceeded':
      return { status: 'succeeded', data: action.tasks };
    case 'fetchFailed':
      return { status: 'failed', error: action.error };
    case 'taskAdded':
      if (state.status !== 'succeeded') return state;
      return { status: 'succeeded', data: [...state.data, action.task] };
    case 'taskUpdated':
      if (state.status !== 'succeeded') return state;
      return {
        status: 'succeeded',
        data: state.data.map((t) => (t.id === action.task.id ? action.task : t)),
      };
    case 'taskRemoved':
      if (state.status !== 'succeeded') return state;
      return { status: 'succeeded', data: removeTask(state.data, action.id) };
    default:
      return assertNever(action);
  }
}
