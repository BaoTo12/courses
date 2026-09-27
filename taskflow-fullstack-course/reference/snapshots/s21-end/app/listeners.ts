// S21: the listener middleware (21.14): "when THIS action happens, run THAT effect".
import { createListenerMiddleware } from '@reduxjs/toolkit';
import type { TypedStartListening } from '@reduxjs/toolkit';
import type { RootState } from './rootReducer';
import type { AppDispatch } from './store';
import type { ThunkExtra } from './thunk-types';
import { addTaskListeners } from '../features/tasks/taskListeners';
import { addQuickFindListener } from '../features/search/quickFindListener';

/** startListening with TaskFlow's types: getState() is RootState, `extra` is ThunkExtra. */
export type AppStartListening = TypedStartListening<RootState, AppDispatch, ThunkExtra>;

/**
 * One listener middleware PER STORE (like the thunk `extra`, 18.13): each store gets its own
 * registered listeners and its own `extra`, so tests can pass a fake API.
 */
export function createAppListenerMiddleware(extra: ThunkExtra) {
  const listenerMiddleware = createListenerMiddleware({ extra });
  const startAppListening = listenerMiddleware.startListening.withTypes<RootState, AppDispatch, ThunkExtra>();
  addTaskListeners(startAppListening);
  addQuickFindListener(startAppListening);
  return listenerMiddleware;
}
