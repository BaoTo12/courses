// 17.02 (＋): connecting a store to React by hand, with React's own external-store hook.
// React-Redux's useSelector is built on the same primitive, plus equality checks and dev warnings.
import { useSyncExternalStore } from 'react';
import type { MiniAction, MiniStore } from './create-mini-store';

export function useMiniSelector<S, A extends MiniAction, T>(store: MiniStore<S, A>, selector: (state: S) => T): T {
  // subscribe: how React listens for changes; getSnapshot: how it reads the current value.
  // React re-renders when getSnapshot() returns a value that is !== the previous one (Object.is).
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}
