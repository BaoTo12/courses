// S19: categories, normalised like tasks. Loaded once; rarely change.
import { createSelector } from 'reselect';
import type { Category } from '../../domain/types';
import { denormalize, normalize } from '../../domain/normalize';
import type { Normalized } from '../../domain/normalize';
import type { AppAction } from '../../app/app-action';
import type { RootState } from '../../app/rootReducer';
import { selectTasks } from '../tasks/tasksSlice';
import type { LoadStatus } from '../tasks/tasksSlice';

export interface CategoriesState extends Normalized<Category> {
  status: LoadStatus;
  error: string | null;
}

export const initialCategoriesState: CategoriesState = { ids: [], entities: {}, status: 'idle', error: null };

export type CategoriesAction =
  | { type: 'categories/fetchStarted' }
  | { type: 'categories/fetchSucceeded'; payload: Category[] }
  | { type: 'categories/fetchFailed'; payload: string };

export const categoriesFetchStarted = (): CategoriesAction => ({ type: 'categories/fetchStarted' });
export const categoriesFetchSucceeded = (categories: Category[]): CategoriesAction => ({
  type: 'categories/fetchSucceeded',
  payload: categories,
});
export const categoriesFetchFailed = (message: string): CategoriesAction => ({
  type: 'categories/fetchFailed',
  payload: message,
});

export function categoriesReducer(state: CategoriesState = initialCategoriesState, action: AppAction): CategoriesState {
  switch (action.type) {
    case 'categories/fetchStarted':
      return { ...state, status: 'loading', error: null };
    case 'categories/fetchSucceeded':
      return { ...normalize(action.payload), status: 'succeeded', error: null };
    case 'categories/fetchFailed':
      return { ...state, status: 'failed', error: action.payload };
    case 'auth/loggedOut':
      return initialCategoriesState;
    default:
      return state;
  }
}

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
