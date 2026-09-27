// S20: categories with createSlice + createAsyncThunk (the 20.14 exercise). Same state shape as S19.
import { createSelector, createSlice } from '@reduxjs/toolkit';
import type { Category } from '../../domain/types';
import { denormalize, normalize } from '../../domain/normalize';
import type { Normalized } from '../../domain/normalize';
import type { RootState } from '../../app/rootReducer';
import { loggedOut } from '../auth/authActions';
import { selectTasks } from '../tasks/tasksSlice';
import type { LoadStatus } from '../tasks/tasksSlice';
import { fetchCategories } from './categoriesThunks';

export interface CategoriesState extends Normalized<Category> {
  status: LoadStatus;
  error: string | null;
}

export const initialCategoriesState: CategoriesState = { ids: [], entities: {}, status: 'idle', error: null };

const categoriesSlice = createSlice({
  name: 'categories',
  initialState: initialCategoriesState,
  reducers: {}, // no local events: everything comes from the server
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (_state, action) => {
        // Returning a NEW value replaces the state (20.05): the whole slice, rebuilt from the response.
        return { ...normalize(action.payload), status: 'succeeded', error: null };
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message ?? action.error.message ?? 'Unexpected error';
      })
      .addCase(loggedOut, () => initialCategoriesState);
  },
});

export const categoriesReducer = categoriesSlice.reducer;

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectCategoriesStatus = (state: RootState): LoadStatus => state.categories.status;

/** O(1): a lookup in `entities`. `null` categoryId (uncategorised) → undefined. */
export const selectCategoryById = (state: RootState, id: number | null): Category | undefined =>
  id === null ? undefined : state.categories.entities[id];

/** Memoised (19.02): the SAME array until the categories slice changes. */
export const selectCategories = createSelector(
  [(state: RootState) => state.categories.ids, (state: RootState) => state.categories.entities],
  (ids, entities) => denormalize({ ids, entities }),
);

export interface TaskCountsByCategory {
  byCategory: Record<number, number>;
  uncategorized: number;
}

/**
 * Task counts per category (19.11), MEMOISED on the task list: the same object until tasks change,
 * so the sidebar doesn't re-render for unrelated actions (toasts, sort preference…).
 */
export const selectTaskCountsByCategory = createSelector([selectTasks], (tasks): TaskCountsByCategory => {
  const byCategory: Record<number, number> = {};
  let uncategorized = 0;
  for (const task of tasks) {
    if (task.categoryId === null) uncategorized += 1;
    else byCategory[task.categoryId] = (byCategory[task.categoryId] ?? 0) + 1;
  }
  return { byCategory, uncategorized };
});
