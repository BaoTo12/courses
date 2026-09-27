import { applyMiddleware, compose, createStore } from 'redux';
import type { Middleware, Store } from 'redux';
import { withExtraArgument } from 'redux-thunk';
import * as taskflowApi from '../api';
import { rootReducer } from './rootReducer';
import type { RootState } from './rootReducer';
import type { AppAction } from './app-action';
import type { AppDispatch, ThunkExtra } from './thunk-types';
import { createCrashReporter } from './middleware/crash-reporter';
import { createLoggerMiddleware } from './middleware/logger';
import { createAnalyticsMiddleware } from './middleware/analytics';

declare global {
  interface Window {
    /** Injected by the Redux DevTools extension (14.11, 16.11). */
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
  }
}

/** A fresh extra argument per store: the real API unless a test overrides parts of it (18.13). */
function buildExtra(overrides: Partial<ThunkExtra> = {}): ThunkExtra {
  let requestCounter = 0;
  return {
    api: taskflowApi,
    nextRequestId: () => `req-${++requestCounter}`,
    listRequest: { controller: null },
    ...overrides,
  };
}

/** The middleware chain, in order: the FIRST one wraps all the others (16.09, 16.14). */
function buildMiddleware(extra: ThunkExtra): Middleware[] {
  const middleware: Middleware[] = [
    createCrashReporter((crash) => console.error('[crash]', crash.actionType, crash)), // S27: a real reporting endpoint
    withExtraArgument(extra), // thunks: functions are called here and never reach the logger (18.03)
  ];
  if (import.meta.env.DEV) middleware.push(createLoggerMiddleware());
  middleware.push(createAnalyticsMiddleware((event) => console.info('[analytics]', event))); // placeholder sink
  return middleware;
}

/** The store type with a thunk-aware dispatch (Redux's own types can't infer it from a Middleware[]: 18.08). */
export type AppStore = Store<RootState, AppAction> & { dispatch: AppDispatch };

/** A factory, so tests can create fresh stores (optionally with preloaded state and a fake API). */
export function makeStore(preloadedState?: Partial<RootState>, extraOverrides?: Partial<ThunkExtra>): AppStore {
  // The DevTools' compose also connects the extension; only in development (14.11 §5).
  const devToolsCompose =
    import.meta.env.DEV && typeof window !== 'undefined' ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ : undefined;
  const composeEnhancers = devToolsCompose ?? compose;
  const extra = buildExtra(extraOverrides);
  return createStore(rootReducer, preloadedState, composeEnhancers(applyMiddleware(...buildMiddleware(extra)))) as AppStore;
}

export const store = makeStore();

export type { AppDispatch } from './thunk-types';
