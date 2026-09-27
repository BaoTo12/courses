// FIXTURE: the S20 tasks slice and thunks (from snapshots/s20-end), reduced to what the S20 claim tests
// need. The app replaced them with RTK Query in S22; the claims about createAsyncThunk still hold, and
// these copies keep them testable without depending on code that no longer exists.
import { configureStore, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toApiErrorPayload } from '../../api/api-error';
import type { ApiErrorPayload } from '../../api/api-error';
import type { TaskQuery } from '../../api/tasks';
import type { CreateTaskRequest, Page } from '../../domain/api-types';
import type { Category, Task } from '../../domain/types';
import { loggedOut } from '../../features/auth/authActions';
import { uiReducer } from '../../features/ui/uiSlice';

export interface LegacyExtra {
  api: { getTasks: (query: TaskQuery, signal?: AbortSignal) => Promise<Page<Task>> };
}

export interface LegacyTasksState {
  items: Task[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  currentRequestId: string | null;
  fetchedAt: number | null;
}

const initialState: LegacyTasksState = { items: [], status: 'idle', error: null, currentRequestId: null, fetchedAt: null };

export const createLegacyThunk = createAsyncThunk.withTypes<{
  state: { tasks: LegacyTasksState };
  extra: LegacyExtra;
  rejectValue: ApiErrorPayload;
}>();

export const fetchTasks = createLegacyThunk(
  'tasks/fetch',
  async (query: TaskQuery | void, { extra, signal, rejectWithValue }) => {
    try {
      const page = await extra.api.getTasks(query ?? { size: 100 }, signal);
      return { tasks: page.items, fetchedAt: Date.now() };
    } catch (error) {
      return rejectWithValue(toApiErrorPayload(error));
    }
  },
);

export const saveNewTask = createLegacyThunk('tasks/saveNew', async (request: CreateTaskRequest) => ({
  ...request,
  id: 1,
  ownerId: 1,
  createdAt: 'x',
  updatedAt: 'x',
}));

export const saveTask = createLegacyThunk('tasks/save', async ({ id, request }: { id: number; request: CreateTaskRequest }) => ({
  ...request,
  id,
  ownerId: 1,
  createdAt: 'x',
  updatedAt: 'x',
}));

export const fetchCategories = createLegacyThunk('categories/fetch', async () => [] as Category[]);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.currentRequestId) return;
        state.items = action.payload.tasks;
        state.status = 'succeeded';
        state.currentRequestId = null;
        state.fetchedAt = action.payload.fetchedAt;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        if (action.meta.requestId !== state.currentRequestId) return;
        state.currentRequestId = null;
        if (action.meta.aborted || action.payload?.kind === 'cancelled') {
          state.status = state.fetchedAt === null ? 'idle' : 'succeeded';
          return;
        }
        state.status = 'failed';
        state.error = action.payload?.message ?? action.error.message ?? 'Unexpected error';
      })
      .addCase(loggedOut, () => initialState);
  },
});

export const tasksReducer = tasksSlice.reducer;

/** A store shaped like S20's for these slices: `tasks` + `ui`, thunks with an injected fake API. */
export function makeLegacyStore(getTasks: LegacyExtra['api']['getTasks'] = async () => ({ items: [], page: 0, size: 100, totalItems: 0, totalPages: 0 })) {
  return configureStore({
    reducer: { tasks: tasksReducer, ui: uiReducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ thunk: { extraArgument: { api: { getTasks } } } }),
  });
}
