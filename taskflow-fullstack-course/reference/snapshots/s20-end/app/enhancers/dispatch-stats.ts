import type { StoreEnhancer } from 'redux';

export interface DispatchStats {
  dispatches: number;
  slowestReducerMs: number;
  slowestActionType: string | null;
}

/**
 * 16.06: an ENHANCER wraps createStore itself. This one
 * - wraps the REDUCER to time every call, and
 * - wraps DISPATCH to count dispatches, and
 * - ADDS a method to the store: getDispatchStats().
 * (Middleware could count dispatches, but only an enhancer can add store methods or wrap the reducer.)
 */
export const dispatchStatsEnhancer: StoreEnhancer<{ getDispatchStats: () => DispatchStats }> =
  (createStore) => (reducer, preloadedState) => {
    const stats: DispatchStats = { dispatches: 0, slowestReducerMs: 0, slowestActionType: null };

    const timedReducer: typeof reducer = (state, action) => {
      const startedAt = performance.now();
      const nextState = reducer(state, action);
      const ms = performance.now() - startedAt;
      if (ms > stats.slowestReducerMs) {
        stats.slowestReducerMs = ms;
        stats.slowestActionType = action.type;
      }
      return nextState;
    };

    const store = createStore(timedReducer, preloadedState);

    const dispatch: typeof store.dispatch = (action) => {
      stats.dispatches += 1;
      return store.dispatch(action);
    };

    return { ...store, dispatch, getDispatchStats: () => ({ ...stats }) };
  };
