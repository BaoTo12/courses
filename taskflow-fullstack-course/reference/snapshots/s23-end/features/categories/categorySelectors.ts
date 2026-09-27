// S22: categories live in RTK Query's cache (the `getCategories` query), not in a slice.
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/rootReducer';
import type { Category } from '../../domain/types';
import { apiSlice } from '../api/apiSlice';
import { selectTasks } from '../tasks/taskSelectors';

const NO_CATEGORIES: Category[] = [];

/** The cache entry of `getCategories()` (no argument: `select()` with none). */
export const selectCategoriesResult = apiSlice.endpoints.getCategories.select();

/** The categories in the server's order; the same array until they change. */
export const selectCategories = createSelector([selectCategoriesResult], (result) => result.data ?? NO_CATEGORIES);

const selectCategoryEntities = createSelector([selectCategories], (categories) => {
  const entities: Record<number, Category> = {};
  for (const category of categories) entities[category.id] = category;
  return entities;
});

/** O(1). A `null` categoryId (uncategorised) → undefined. */
export const selectCategoryById = (state: RootState, id: number | null): Category | undefined =>
  id === null ? undefined : selectCategoryEntities(state)[id];

export interface TaskCountsByCategory {
  byCategory: Record<number, number>;
  uncategorized: number;
}

/**
 * Task counts per category (19.11), MEMOIZED on the task list: the same object until the tasks change,
 * so the sidebar doesn't re-render for unrelated actions.
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
