// 16.03: our own createStore, for learning. The app uses Redux's (store.ts).

export interface MiniAction {
  type: string;
}

export type MiniReducer<S, A extends MiniAction> = (state: S | undefined, action: A) => S;

export interface MiniStore<S, A extends MiniAction> {
  getState: () => S;
  dispatch: (action: A) => A;
  /** Returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
}

export function createMiniStore<S, A extends MiniAction>(reducer: MiniReducer<S, A>, preloadedState?: S): MiniStore<S, A> {
  let state = preloadedState;
  let listeners: Array<() => void> = [];
  let isDispatching = false;

  function getState(): S {
    if (isDispatching) throw new Error('You may not call getState() while the reducer is executing.');
    return state as S;
  }

  function subscribe(listener: () => void) {
    listeners = [...listeners, listener]; // a NEW array: a dispatch already notifying keeps its snapshot
    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      listeners = listeners.filter((l) => l !== listener);
    };
  }

  function dispatch(action: A): A {
    if (isDispatching) throw new Error('Reducers may not dispatch actions.');
    try {
      isDispatching = true;
      state = reducer(state, action); // 1. compute and SAVE the new state…
    } finally {
      isDispatching = false;
    }
    for (const listener of listeners) listener(); // 2. …THEN notify (the order matters: 16.99)
    return action;
  }

  dispatch({ type: '@@mini/INIT' } as A); // let every reducer produce its initial state
  return { getState, dispatch, subscribe };
}
