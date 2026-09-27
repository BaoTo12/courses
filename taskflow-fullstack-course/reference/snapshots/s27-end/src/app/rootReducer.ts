import { combineReducers } from '@reduxjs/toolkit';
import { apiSlice } from '../features/api/apiSlice';
import { listPrefsReducer } from '../features/listPrefs/listPrefsSlice';
import { uiReducer } from '../features/ui/uiSlice';
import { quickFindReducer } from '../features/search/quickFindSlice';

/**
 * Each key of the root state is owned by one reducer (15.08). Since S22, SERVER data (tasks, categories)
 * lives in RTK Query's cache under `api`; the slices keep only CLIENT state: preferences, UI, quick find.
 */
export const rootReducer = combineReducers({
  [apiSlice.reducerPath]: apiSlice.reducer,
  listPrefs: listPrefsReducer,
  ui: uiReducer,
  quickFind: quickFindReducer,
});

/**
 * Derived from the reducers (06.03). No cast any more: createSlice reducers accept any action,
 * so combineReducers infers the preloaded-state type correctly (compare 16.03 §5).
 */
export type RootState = ReturnType<typeof rootReducer>;
