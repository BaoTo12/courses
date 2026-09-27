// 15.09: our own combineReducers, to see there's no magic. The app uses Redux's (rootReducer.ts).

/** Any slice reducer. `never` parameters accept every function signature (parameters are contravariant). */
type AnySliceReducer = (state: never, action: never) => unknown;

/** { tasks: TasksState, … }: each key's state is its reducer's return type. */
type CombinedState<R extends Record<string, AnySliceReducer>> = { [K in keyof R]: ReturnType<R[K]> };

/** The action type the slice reducers accept (they all take AppAction). */
type CombinedAction<R extends Record<string, AnySliceReducer>> = Parameters<R[keyof R]>[1];

/**
 * Builds a root reducer from one reducer per key. Every slice reducer receives EVERY action,
 * with only ITS part of the state. If no slice changed, the SAME root object is returned.
 */
export function combineSliceReducers<R extends Record<string, AnySliceReducer>>(reducers: R) {
  type S = CombinedState<R>;
  const keys = Object.keys(reducers) as (keyof R)[];

  return function rootReducer(state: S | undefined, action: CombinedAction<R>): S {
    let changed = state === undefined;
    const next = {} as S;
    for (const key of keys) {
      const reducer = reducers[key] as unknown as (slice: unknown, action: unknown) => S[typeof key];
      const previous = state?.[key];
      const updated = reducer(previous, action);
      next[key] = updated;
      if (updated !== previous) changed = true;
    }
    return changed ? next : (state as S);
  };
}
