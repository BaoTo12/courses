import { applyMiddleware, createStore } from 'redux';
import { describe, expect, it } from 'vitest';
import { rootReducer } from '../rootReducer';
import { sortChanged } from '../../features/listPrefs/listPrefsSlice';
import { taskSelectionToggled } from '../../features/ui/uiSlice';
import type { AppAction } from '../app-action';
import type { RootState } from '../rootReducer';
import { applyMiniMiddleware, compose } from './apply-middleware';
import type { MiniMiddleware } from './apply-middleware';
import { createMiniStore } from './create-mini-store';

describe('createMiniStore (16.03)', () => {
  it('produces the same states as Redux createStore for the same actions', () => {
    const mini = createMiniStore(rootReducer);
    const real = createStore(rootReducer);
    expect(mini.getState()).toEqual(real.getState());
    for (const action of [taskSelectionToggled(1), sortChanged('title', 'desc'), taskSelectionToggled(1)]) {
      mini.dispatch(action);
      real.dispatch(action);
      expect(mini.getState()).toEqual(real.getState());
    }
  });

  it('dispatch returns the action, and subscribers see the NEW state', () => {
    const store = createMiniStore(rootReducer);
    const seen: number[][] = [];
    store.subscribe(() => seen.push(store.getState().ui.selectedTaskIds));
    const action = taskSelectionToggled(7);
    expect(store.dispatch(action)).toBe(action);
    expect(seen).toEqual([[7]]);
  });

  it('unsubscribe works, and is safe to call twice', () => {
    const store = createMiniStore(rootReducer);
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    store.dispatch(taskSelectionToggled(1));
    unsubscribe();
    unsubscribe();
    store.dispatch(taskSelectionToggled(2));
    expect(calls).toBe(1);
  });

  it('a listener added DURING a notification is not called for that same dispatch', () => {
    const store = createMiniStore(rootReducer);
    const log: string[] = [];
    store.subscribe(() => {
      log.push('first');
      if (log.length === 1) store.subscribe(() => log.push('late'));
    });
    store.dispatch(taskSelectionToggled(1));
    expect(log).toEqual(['first']);
    store.dispatch(taskSelectionToggled(2));
    expect(log).toEqual(['first', 'first', 'late']);
  });

  it('refuses dispatch and getState inside the reducer, like Redux', () => {
    type S = { n: number };
    const holder: { store?: ReturnType<typeof createMiniStore<S, { type: string }>> } = {};
    holder.store = createMiniStore<S, { type: string }>((state = { n: 0 }, action) => {
      if (action.type === 'bad/dispatch') holder.store?.dispatch({ type: 'x' });
      if (action.type === 'bad/getState') holder.store?.getState();
      return state;
    });
    expect(() => holder.store?.dispatch({ type: 'bad/dispatch' })).toThrow('Reducers may not dispatch actions.');
    expect(() => holder.store?.dispatch({ type: 'bad/getState' })).toThrow(/getState\(\) while the reducer is executing/);
  });
});

describe('compose (16.09)', () => {
  it('applies functions right to left', () => {
    const add1 = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const square = (x: number) => x * x;
    expect(compose(add1, double, square)(3)).toBe(add1(double(square(3)))); // 19
    expect(compose(add1, double, square)(3)).toBe(19);
    expect(compose<number>()(5)).toBe(5);
  });
});

describe('applyMiniMiddleware (16.09) matches Redux applyMiddleware', () => {
  /** Records the order in which each middleware sees the action, before and after next(). */
  function tracer(name: string, log: string[]): MiniMiddleware<RootState, AppAction> {
    return () => (next) => (action) => {
      log.push(`${name} before`);
      const result = next(action);
      log.push(`${name} after`);
      return result;
    };
  }

  it('the first middleware runs first on the way in, and last on the way out', () => {
    const ours: string[] = [];
    const store = applyMiniMiddleware(tracer('A', ours), tracer('B', ours), tracer('C', ours))(createMiniStore)(rootReducer);
    store.dispatch(taskSelectionToggled(1));

    const theirs: string[] = [];
    const real = createStore(
      rootReducer,
      applyMiddleware(
        tracer('A', theirs) as never,
        tracer('B', theirs) as never,
        tracer('C', theirs) as never,
      ),
    );
    real.dispatch(taskSelectionToggled(1));

    expect(ours).toEqual(['A before', 'B before', 'C before', 'C after', 'B after', 'A after']);
    expect(ours).toEqual(theirs);
  });

  it('storeAPI.dispatch goes through the WHOLE chain again', () => {
    const log: string[] = [];
    const redispatcher: MiniMiddleware<RootState, AppAction> = (api) => (next) => (action) => {
      log.push(`saw ${action.type}`);
      if (action.type === 'ui/selectionCleared') api.dispatch(taskSelectionToggled(99)); // re-enters at the top
      return next(action);
    };
    const store = applyMiniMiddleware(redispatcher)(createMiniStore)(rootReducer);
    store.dispatch({ type: 'ui/selectionCleared' });
    expect(log).toEqual(['saw ui/selectionCleared', 'saw ui/taskSelectionToggled']);
    // The re-dispatched action reached the reducers FIRST (99 selected), THEN the original
    // selectionCleared continued down the chain and cleared it: re-dispatching jumps the queue (16.10).
    expect(store.getState().ui.selectedTaskIds).toEqual([]);
  });
});
