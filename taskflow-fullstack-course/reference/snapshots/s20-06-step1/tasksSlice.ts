// S20 step 1 (20.06): the tasks slice with createSlice. SAME action names, payloads and creator
// signatures as S19, so the S18 thunks and the other hand-written slices keep working unchanged.
// (20.10 then replaces the fetch/save events with createAsyncThunk's lifecycle actions.)
import { createSelector, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Task } from '../../domain/types';
import { denormalize, normalize } from '../../domain/normalize';
import type { Normalized } from '../../domain/normalize';
import type { RootState } from '../../app/rootReducer';
import { loggedOut } from '../auth/authActions';

export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface TasksState extends Normalized<Task> {
  status: LoadStatus;
  error: string | null;
  currentRequestId: string | null;
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

function removeMany(state: TasksState, ids: readonly number[]) {
  for (const id of ids) delete state.entities[id];
  state.ids = state.ids.filter((id) => !ids.includes(id));
}

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: initialTasksState,
  reducers: {
    fetchStarted: {
      reducer(state, action: PayloadAction<{ requestId: string }>) {
        state.status = 'loading';
        state.error = null;
        state.currentRequestId = action.payload.requestId;
      },
      prepare(requestId: string) {
        return { payload: { requestId } };
      },
    },
    fetchSucceeded: {
      reducer(state, action: PayloadAction<{ requestId: string; tasks: Task[]; fetchedAt: number }>) {
        const { requestId, tasks, fetchedAt } = action.payload;
        if (requestId !== state.currentRequestId) return; // stale: no change → the same state object
        const { ids, entities } = normalize(tasks);
        state.ids = ids;
        state.entities = entities;
        state.status = 'succeeded';
        state.error = null;
        state.currentRequestId = null;
        state.fetchedAt = fetchedAt;
      },
      // The clock is read in prepare (an action creator), never in the reducer (15.04).
      prepare(requestId: string, tasks: Task[], fetchedAt: number = Date.now()) {
        return { payload: { requestId, tasks, fetchedAt } };
      },
    },
    fetchFailed: {
      reducer(state, action: PayloadAction<{ requestId: string; message: string }>) {
        if (action.payload.requestId !== state.currentRequestId) return;
        state.status = 'failed';
        state.error = action.payload.message;
        state.currentRequestId = null;
      },
      prepare(requestId: string, message: string) {
        return { payload: { requestId, message } };
      },
    },
    taskAdded(state, action: PayloadAction<Task>) {
      const task = action.payload;
      if (!state.entities[task.id]) state.ids.push(task.id);
      state.entities[task.id] = task;
    },
    taskUpdated(state, action: PayloadAction<Task>) {
      const task = action.payload;
      if (state.entities[task.id]) state.entities[task.id] = task; // unknown task: nothing to update
    },
    taskDeleted(state, action: PayloadAction<number>) {
      if (state.entities[action.payload]) removeMany(state, [action.payload]);
    },
    allCompleted: {
      reducer(state, action: PayloadAction<{ updatedAt: string }>) {
        for (const id of state.ids) {
          const task = state.entities[id];
          if (task && task.status !== 'DONE') {
            task.status = 'DONE';
            task.updatedAt = action.payload.updatedAt;
          }
        }
      },
      prepare(updatedAt: string = new Date().toISOString()) {
        return { payload: { updatedAt } };
      },
    },
    completedCleared(state, action: PayloadAction<number[]>) {
      removeMany(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    // Not owned by this slice: the auth feature's event (20.11), a createAction creator (20.07).
    builder.addCase(loggedOut, () => initialTasksState);
  },
});

export const { fetchStarted, fetchSucceeded, fetchFailed, taskAdded, taskUpdated, taskDeleted, allCompleted, completedCleared } =
  tasksSlice.actions;
export const tasksReducer = tasksSlice.reducer;

/** The union of this slice's actions, DERIVED from the generated creators: AppAction keeps working meanwhile. */
export type TasksAction = ReturnType<(typeof tasksSlice.actions)[keyof typeof tasksSlice.actions]>;

export const selectTaskIds = (state: RootState): number[] => state.tasks.ids;
export const selectTasksStatus = (state: RootState): LoadStatus => state.tasks.status;
export const selectTasksError = (state: RootState): string | null => state.tasks.error;
export const selectTaskById = (state: RootState, id: number): Task | undefined => state.tasks.entities[id];
export const selectTasks = createSelector(
  [selectTaskIds, (state: RootState) => state.tasks.entities],
  (ids, entities) => denormalize({ ids, entities }),
);
export const selectOpenTaskCount = (state: RootState): number =>
  selectTasks(state).filter((task) => task.status !== 'DONE').length;
