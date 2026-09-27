import { combineReducers } from '@reduxjs/toolkit';
import { tasksReducer } from '../features/tasks/tasksSlice';
import { categoriesReducer } from '../features/categories/categoriesSlice';
import { listPrefsReducer } from '../features/listPrefs/listPrefsSlice';
import { uiReducer } from '../features/ui/uiSlice';
import { quickFindReducer } from '../features/search/quickFindSlice';

/** Each key of the root state is owned by one slice reducer (15.08). */
export const rootReducer = combineReducers({
  tasks: tasksReducer,
  categories: categoriesReducer,
  listPrefs: listPrefsReducer,
  ui: uiReducer,
  quickFind: quickFindReducer,
});

/**
 * Derived from the reducers (06.03). No cast any more: createSlice reducers accept any action,
 * so combineReducers infers the preloaded-state type correctly (compare 16.03 §5).
 */
export type RootState = ReturnType<typeof rootReducer>;
