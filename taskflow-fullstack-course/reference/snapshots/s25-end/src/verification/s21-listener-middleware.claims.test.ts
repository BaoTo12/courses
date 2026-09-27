// Lecture-claim tests for 21.14 (createListenerMiddleware): when effects run, what the listener API
// members do, cancellation, errors and dynamic listeners. Pinned to the installed RTK.
import { addListener, configureStore, createAction, createListenerMiddleware, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

const counter = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    incremented(state) {
      state.value += 1;
    },
    set(state, action: PayloadAction<number>) {
      state.value = action.payload;
    },
  },
});
const { incremented, set } = counter.actions;
const ping = createAction('ping');

function setup(onError?: (error: unknown) => void) {
  const listener = createListenerMiddleware({ extra: { tag: 'EXTRA' }, onError });
  const store = configureStore({
    reducer: { counter: counter.reducer },
    middleware: (gDM) => gDM().prepend(listener.middleware),
  });
  type State = ReturnType<typeof store.getState>;
  const start = listener.startListening.withTypes<State, typeof store.dispatch, { tag: string }>();
  return { listener, store, start };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('21.14 when effects run, and what they see', () => {
  it('runs AFTER the reducers: getState() is the new state, getOriginalState() the old one; extra is available', () => {
    const { store, start } = setup();
    const seen: unknown[] = [];
    start({
      actionCreator: incremented,
      effect: (_action, api) => {
        seen.push(api.getOriginalState().counter.value, api.getState().counter.value, api.extra.tag);
      },
    });
    store.dispatch(incremented());
    expect(seen).toEqual([0, 1, 'EXTRA']);
  });

  it('predicate receives (action, currentState, originalState)', () => {
    const { store, start } = setup();
    const effect = vi.fn();
    start({ predicate: (_action, current, original) => current.counter.value > original.counter.value, effect });
    store.dispatch(set(0)); // no increase
    store.dispatch(incremented()); // increase
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it('getOriginalState() throws when called after an await', async () => {
    const { store, start } = setup();
    let error: unknown;
    start({
      actionCreator: incremented,
      effect: async (_action, api) => {
        await api.delay(1);
        try {
          api.getOriginalState();
        } catch (e) {
          error = e;
        }
      },
    });
    store.dispatch(incremented());
    await new Promise((r) => setTimeout(r, 20));
    expect(String(error)).toMatch(/getOriginalState can only be called synchronously/);
  });

  it('startListening returns an unsubscribe function', () => {
    const { store, start } = setup();
    const effect = vi.fn();
    const unsubscribe = start({ actionCreator: ping, effect });
    store.dispatch(ping());
    unsubscribe();
    store.dispatch(ping());
    expect(effect).toHaveBeenCalledTimes(1);
  });
});

describe('21.14 waiting inside an effect: condition, take', () => {
  it('condition(predicate, timeout) resolves true when the state matches, false on timeout', async () => {
    const { store, start } = setup();
    const results: boolean[] = [];
    start({
      actionCreator: ping,
      effect: async (_action, api) => {
        results.push(await api.condition((_a, state) => state.counter.value >= 2, 50));
      },
    });
    store.dispatch(ping());
    store.dispatch(incremented());
    store.dispatch(incremented());
    await new Promise((r) => setTimeout(r, 10));
    store.dispatch(ping()); // the next wait times out
    await new Promise((r) => setTimeout(r, 80));
    expect(results).toEqual([true, false]);
  });

  it('take(predicate) resolves with [action, currentState, previousState]', async () => {
    const { store, start } = setup();
    let taken: unknown;
    start({
      actionCreator: ping,
      effect: async (_action, api) => {
        const [action, current, previous] = await api.take(set.match);
        taken = [action.payload, current.counter.value, previous.counter.value];
      },
    });
    store.dispatch(ping());
    store.dispatch(set(7));
    await new Promise((r) => setTimeout(r, 10));
    expect(taken).toEqual([7, 7, 0]);
  });
});

describe('21.14 cancellation', () => {
  it('cancelActiveListeners() cancels earlier runs; their delay() rejects and the effect stops silently', async () => {
    vi.useFakeTimers();
    const { store, start } = setup();
    const finished: number[] = [];
    start({
      actionCreator: set,
      effect: async (action, api) => {
        api.cancelActiveListeners();
        await api.delay(100);
        finished.push(action.payload);
      },
    });
    store.dispatch(set(1));
    store.dispatch(set(2));
    store.dispatch(set(3));
    await vi.advanceTimersByTimeAsync(150);
    expect(finished).toEqual([3]);
  });

  it('fork() runs a child task; its result is { status, value }', async () => {
    const { store, start } = setup();
    let result: unknown;
    start({
      actionCreator: ping,
      effect: async (_action, api) => {
        const task = api.fork(async (forkApi) => {
          await forkApi.delay(5);
          return 42;
        });
        result = await task.result;
      },
    });
    store.dispatch(ping());
    await new Promise((r) => setTimeout(r, 30));
    expect(result).toEqual({ status: 'ok', value: 42 });
  });
});

describe('21.14 errors and dynamic listeners', () => {
  it('an error thrown in an effect goes to onError; dispatch does NOT throw', async () => {
    const onError = vi.fn();
    const { store, start } = setup(onError);
    start({
      actionCreator: ping,
      effect: () => {
        throw new Error('effect failed');
      },
    });
    expect(() => store.dispatch(ping())).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(String(onError.mock.calls[0]?.[0])).toContain('effect failed');
    expect(onError.mock.calls[0]?.[1]).toMatchObject({ raisedBy: 'effect' });
  });

  it('dispatch(addListener(...)) adds a listener at runtime and returns its unsubscribe', () => {
    const { store } = setup();
    const effect = vi.fn();
    const unsubscribe = store.dispatch(addListener({ actionCreator: ping, effect }));
    store.dispatch(ping());
    unsubscribe();
    store.dispatch(ping());
    expect(effect).toHaveBeenCalledTimes(1);
  });
});
