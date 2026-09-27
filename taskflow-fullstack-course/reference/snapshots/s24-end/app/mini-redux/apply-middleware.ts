// 16.09: our own compose + applyMiddleware, for learning. The app uses Redux's (store.ts).
import type { MiniAction, MiniReducer, MiniStore } from './create-mini-store';

/**
 * compose(f, g, h)(x) === f(g(h(x))): right to left.
 * (Redux's compose also allows each function to change the type; ours keeps T → T, which is all we need.)
 */
export function compose<T>(...funcs: Array<(arg: T) => T>): (arg: T) => T {
  if (funcs.length === 0) return (arg) => arg;
  return funcs.reduce((outer, inner) => (arg) => outer(inner(arg)));
}

type Dispatch<A> = (action: A) => unknown;

export interface MiniMiddlewareAPI<S, A extends MiniAction> {
  getState: () => S;
  dispatch: Dispatch<A>;
}

/** storeAPI => next => action: the three-level shape of every Redux middleware (16.07). */
export type MiniMiddleware<S, A extends MiniAction> = (api: MiniMiddlewareAPI<S, A>) => (next: Dispatch<A>) => Dispatch<A>;

type StoreCreator<S, A extends MiniAction> = (reducer: MiniReducer<S, A>, preloadedState?: S) => MiniStore<S, A>;

/** An ENHANCER (16.05): takes createStore, returns a new createStore whose store has a wrapped dispatch. */
export function applyMiniMiddleware<S, A extends MiniAction>(...middlewares: MiniMiddleware<S, A>[]) {
  return (createStore: StoreCreator<S, A>): StoreCreator<S, A> =>
    (reducer, preloadedState) => {
      const store = createStore(reducer, preloadedState);
      let dispatch: Dispatch<A> = () => {
        throw new Error('Dispatching while constructing your middleware is not allowed.');
      };
      // Middleware get a dispatch that goes through the WHOLE chain (important for thunks, S18).
      const api: MiniMiddlewareAPI<S, A> = { getState: store.getState, dispatch: (action) => dispatch(action) };
      const chain = middlewares.map((middleware) => middleware(api));
      // compose(m1, m2, m3)(store.dispatch) === m1(m2(m3(store.dispatch))): m1 runs first, the real dispatch last.
      dispatch = compose(...chain)(store.dispatch);
      return { ...store, dispatch: dispatch as MiniStore<S, A>['dispatch'] };
    };
}
