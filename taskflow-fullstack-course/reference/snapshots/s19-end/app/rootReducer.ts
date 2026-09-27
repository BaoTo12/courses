import { combineReducers } from 'redux';
import type { Reducer } from 'redux';
import type { AppAction } from './app-action';
import { tasksReducer } from '../features/tasks/tasksSlice';
import { categoriesReducer } from '../features/categories/categoriesSlice';
import { listPrefsReducer } from '../features/listPrefs/listPrefsSlice';
import { uiReducer } from '../features/ui/uiSlice';

/** Each key of the root state is owned by one slice reducer (15.08). */
const sliceReducers = {
  tasks: tasksReducer,
  categories: categoriesReducer,
  listPrefs: listPrefsReducer,
  ui: uiReducer,
};

/** The state type is DERIVED from the reducers: no hand-written interface to keep in sync (06.03). */
export type RootState = { [K in keyof typeof sliceReducers]: ReturnType<(typeof sliceReducers)[K]> };

/**
 * Redux 5's combineReducers infers the PRELOADED-state type only for slice reducers that accept
 * UnknownAction. Ours accept the narrower AppAction, so it infers `never` per slice, and createStore's
 * overloads then reject our own reducer (16.03 §5). We state the correct type once, here. RTK avoids this (S20).
 */
export const rootReducer = combineReducers(sliceReducers) as Reducer<RootState, AppAction, Partial<RootState>>;
