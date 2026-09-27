// Lecture-claim tests for the S20 API cards (20.02, 20.04, 20.07, 20.09, 20.12, 20.A): options and
// members of configureStore, createSlice, createAction, createReducer, the builder, createAsyncThunk
// and the matchers, as documented in the lectures. Pinned to the installed RTK version.
import {
  configureStore,
  createAction,
  createAsyncThunk,
  createReducer,
  createSlice,
  isAllOf,
  isAsyncThunkAction,
  isFluxStandardAction,
  unwrapResult,
} from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';

describe('20.02 the store configureStore returns', () => {
  it('has dispatch, getState, subscribe, replaceReducer, and an interop key for observables', () => {
    const store = configureStore({ reducer: (state: number = 0) => state });
    // '@@observable' is Redux's fallback key when the runtime has no Symbol.observable (Node, most browsers)
    expect(Object.keys(store).sort()).toEqual(['@@observable', 'dispatch', 'getState', 'replaceReducer', 'subscribe']);
  });

  it('`reducer` may be an object of slice reducers (combineReducers is called for you)', () => {
    const store = configureStore({ reducer: { a: (s: number = 1) => s, b: (s: string = 'x') => s } });
    expect(store.getState()).toEqual({ a: 1, b: 'x' });
  });
});

describe('20.04 createSlice options and the slice object', () => {
  const counter = createSlice({
    name: 'counter',
    initialState: () => ({ value: 0 }), // a LAZY initializer: called when the reducer needs the initial state
    reducers: {
      incremented(state) {
        state.value += 1;
      },
      addedBy(state, action: PayloadAction<number>) {
        state.value += action.payload;
      },
    },
    selectors: {
      selectValue: (state) => state.value,
      selectDoubled: (state, factor: number) => state.value * factor,
    },
  });

  it('exposes name, reducerPath, reducer, actions, caseReducers, getInitialState, selectors, getSelectors, selectSlice', () => {
    expect(counter.name).toBe('counter');
    expect(counter.reducerPath).toBe('counter'); // defaults to the name
    expect(Object.keys(counter.actions)).toEqual(['incremented', 'addedBy']);
    expect(Object.keys(counter.caseReducers)).toEqual(['incremented', 'addedBy']);
    expect(counter.getInitialState()).toEqual({ value: 0 });
    expect(counter.actions.incremented()).toEqual({ type: 'counter/incremented', payload: undefined });
  });

  it('`selectors` are bound to the ROOT state at state[reducerPath]; getSelectors(fn) rebinds them', () => {
    const store = configureStore({ reducer: { counter: counter.reducer } });
    store.dispatch(counter.actions.addedBy(5));
    expect(counter.selectors.selectValue(store.getState())).toBe(5);
    expect(counter.selectors.selectDoubled(store.getState(), 3)).toBe(15);
    expect(counter.selectSlice(store.getState())).toEqual({ value: 5 });
    const local = counter.getSelectors(); // unbound: take the SLICE state
    expect(local.selectValue({ value: 7 })).toBe(7);
  });
});

describe('20.07 createAction, prepare, createReducer, the builder', () => {
  it('prepare may add meta and error; the creator has type, match, toString', () => {
    const logged = createAction('log/added', (text: string) => ({
      payload: text,
      meta: { at: 'test' },
      error: false,
    }));
    expect(logged('hi')).toEqual({ type: 'log/added', payload: 'hi', meta: { at: 'test' }, error: false });
    expect(isFluxStandardAction(logged('hi'))).toBe(true);
    const plain = createAction<number>('counter/set');
    expect(plain(3)).toEqual({ type: 'counter/set', payload: 3 });
  });

  it('createReducer returns a reducer with getInitialState()', () => {
    const reset = createAction('reset');
    const reducer = createReducer({ n: 1 }, (builder) => {
      builder.addCase(reset, () => ({ n: 0 }));
    });
    expect(reducer.getInitialState()).toEqual({ n: 1 });
    expect(reducer(undefined, reset())).toEqual({ n: 0 });
  });

  it('builder.addAsyncThunk handles pending/fulfilled/rejected/settled of one thunk', async () => {
    const load = createAsyncThunk('data/load', async (fail: boolean) => {
      if (fail) throw new Error('nope');
      return 42;
    });
    const log: string[] = [];
    const slice = createSlice({
      name: 'data',
      initialState: { value: 0, status: 'idle' },
      reducers: {},
      extraReducers: (builder) => {
        builder.addAsyncThunk(load, {
          pending: (state) => {
            state.status = 'pending';
            log.push('pending');
          },
          fulfilled: (state, action) => {
            state.value = action.payload;
            log.push('fulfilled');
          },
          rejected: () => {
            log.push('rejected');
          },
          settled: (state, action) => {
            state.status = action.meta.requestStatus; // 'fulfilled' | 'rejected'
            log.push('settled');
          },
        });
      },
    });
    const store = configureStore({ reducer: { data: slice.reducer } });
    await store.dispatch(load(false));
    await store.dispatch(load(true));
    expect(log).toEqual(['pending', 'fulfilled', 'settled', 'pending', 'rejected', 'settled']);
    expect(store.getState().data).toEqual({ value: 42, status: 'rejected' });
  });
});

describe('20.09 createAsyncThunk options and API', () => {
  it('the creator has pending, fulfilled, rejected, settled, typePrefix', () => {
    const t = createAsyncThunk('x/y', async () => 1);
    expect(typeof t.settled).toBe('function');
    expect(t.settled(t.fulfilled(1, 'r'))).toBe(true);
    expect(t.settled(t.pending('r'))).toBe(false);
  });

  it('idGenerator sets meta.requestId; dispatchConditionRejection dispatches the skipped rejection', async () => {
    const seen: string[] = [];
    const store = configureStore({
      reducer: (state: number = 0, action: { type: string }) => {
        seen.push(action.type);
        return state;
      },
    });
    const withId = createAsyncThunk('t/id', async () => 'ok', { idGenerator: (arg: void) => `custom-${String(arg)}` });
    const result = await store.dispatch(withId());
    expect(result.meta.requestId).toBe('custom-undefined');

    const skipped = createAsyncThunk('t/skip', async () => 'never', {
      condition: () => false,
      dispatchConditionRejection: true,
    });
    await store.dispatch(skipped());
    expect(seen).toContain('t/skip/rejected'); // with the default (false) nothing would be dispatched
  });

  it('thunkAPI.abort() rejects the thunk from inside; an external signal passed at dispatch aborts it too', async () => {
    const store = configureStore({ reducer: (state: number = 0) => state });
    const selfAborting = createAsyncThunk('t/self', async (_: void, api) => {
      api.abort('changed my mind');
      return new Promise<never>(() => {});
    });
    const r1 = await store.dispatch(selfAborting());
    expect(r1.meta).toMatchObject({ aborted: true });

    const controller = new AbortController();
    const slow = createAsyncThunk('t/slow', async (_: void, { signal }) => new Promise<never>((_r, reject) => signal.addEventListener('abort', () => reject(signal.reason))));
    const promise = store.dispatch(slow(undefined, { signal: controller.signal }));
    controller.abort('external');
    const r2 = await promise;
    expect(r2.meta).toMatchObject({ aborted: true });
    expect(slow.rejected.match(r2) && r2.error.name).toBe('AbortError');
  });

  it('unwrapResult(action) is unwrap() for an action you already have', async () => {
    const store = configureStore({ reducer: (state: number = 0) => state });
    const ok = createAsyncThunk('t/ok', async () => 7);
    expect(unwrapResult(await store.dispatch(ok()))).toBe(7);
  });
});

describe('20.12 more matchers', () => {
  it('isAsyncThunkAction and isAllOf', () => {
    const t = createAsyncThunk('m/t', async () => 1);
    const other = createAction('m/other');
    expect(isAsyncThunkAction(t)(t.pending('r'))).toBe(true);
    expect(isAsyncThunkAction()(other())).toBe(false);
    const isFulfilledT = isAllOf(t.fulfilled, (a: { type: string }): a is { type: string } => a.type.startsWith('m/') /* matchers must be TYPE GUARDS */);
    expect(isFulfilledT(t.fulfilled(1, 'r'))).toBe(true);
    expect(isFulfilledT(t.pending('r'))).toBe(false);
  });
});
