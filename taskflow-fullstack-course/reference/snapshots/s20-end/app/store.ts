import { configureStore } from '@reduxjs/toolkit';
import * as taskflowApi from '../api';
import { rootReducer } from './rootReducer';
import type { RootState } from './rootReducer';
import type { ThunkExtra } from './thunk-types';
import { createCrashReporter } from './middleware/crash-reporter';
import { createLoggerMiddleware } from './middleware/logger';
import { createAnalyticsMiddleware } from './middleware/analytics';

/** A fresh extra argument per store: the real API unless a test overrides parts of it (18.13). */
function buildExtra(overrides: Partial<ThunkExtra> = {}): ThunkExtra {
  return {
    api: taskflowApi,
    listRequest: { controller: null },
    ...overrides,
  };
}

/** A factory, so tests can create fresh stores (optionally with preloaded state and a fake API). */
export function makeStore(preloadedState?: Partial<RootState>, extraOverrides?: Partial<ThunkExtra>) {
  const extra = buildExtra(extraOverrides);
  const crashReporter = createCrashReporter((crash) => console.error('[crash]', crash.actionType, crash)); // S27: a real endpoint
  const analytics = createAnalyticsMiddleware((event) => console.info('[analytics]', event)); // placeholder sink

  return configureStore({
    reducer: rootReducer,
    preloadedState,
    // getDefaultMiddleware() = thunk (with our extra argument) + dev-only immutability & serializability checks (20.02)
    middleware: (getDefaultMiddleware) => {
      const chain = getDefaultMiddleware({ thunk: { extraArgument: extra } }).prepend(crashReporter); // first: wraps all
      return import.meta.env.DEV ? chain.concat(createLoggerMiddleware(), analytics) : chain.concat(analytics);
    },
    devTools: import.meta.env.DEV, // the Redux DevTools extension, development only (14.11 §5)
  });
}

export const store = makeStore();

// Inferred, not declared (compare 18.08): configureStore knows what the middleware add to dispatch.
export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
