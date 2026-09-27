// Lecture-claim tests for S20 (20.02, 20.04, 20.05, 20.07, 20.17): every fact the lectures state about
// configureStore, createSlice and Immer, pinned to the installed RTK version. If an upgrade changes a
// behaviour or a message, the failing test names the lecture to update.
import { configureStore, createAction, createSlice, current, isAnyOf, isDraft, nanoid, original } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('20.02 configureStore defaults (development)', () => {
  it('adds 4 middleware and 2 enhancers', () => {
    let middlewareCount = 0;
    let enhancerCount = 0;
    configureStore({
      reducer: (state: number = 0) => state,
      middleware: (getDefaultMiddleware) => {
        const list = getDefaultMiddleware();
        middlewareCount = list.length;
        return list;
      },
      enhancers: (getDefaultEnhancers) => {
        const list = getDefaultEnhancers();
        enhancerCount = list.length;
        return list;
      },
    });
    expect(middlewareCount).toBe(4); // action-creator check, immutability check, thunk, serializability check
    expect(enhancerCount).toBe(2); // the middleware enhancer + autoBatchEnhancer
  });

  it('throws on a mutation INSIDE a dispatch', () => {
    const store = configureStore({
      reducer: (state: { items: number[] } = { items: [1] }, action: { type: string }) => {
        if (action.type === 'bad') state.items.push(2); // a real mutation: not an Immer reducer
        return state;
      },
    });
    expect(() => store.dispatch({ type: 'bad' })).toThrow(
      'A state mutation was detected inside a dispatch, in the path: items.1.',
    );
  });

  it('throws on a mutation BETWEEN dispatches, at the next dispatch', () => {
    const leaky = { items: [1] };
    const store = configureStore({ reducer: (state: { items: number[] } = leaky) => state });
    leaky.items.push(2);
    expect(() => store.dispatch({ type: 'x' })).toThrow(
      "A state mutation was detected between dispatches, in the path 'items.1'.",
    );
  });

  it('warns when an action CREATOR is dispatched instead of an action', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ping = createAction('demo/ping');
    const store = configureStore({ reducer: (state: number = 0) => state });
    store.dispatch(ping as never);
    expect(String(warn.mock.calls[0]?.[0])).toContain(
      'Detected an action creator with type "demo/ping" being dispatched.',
    );
    expect(String(warn.mock.calls[0]?.[0])).toContain('`dispatch(ping())` instead of `dispatch(ping)`');
  });
});

interface Prefs {
  sort: { key: string; direction: 'asc' | 'desc' };
  pageSize: number;
}
const prefsSlice = createSlice({
  name: 'listPrefs',
  initialState: { sort: { key: 'dueDate', direction: 'asc' }, pageSize: 20 } as Prefs,
  reducers: {
    pageSizeChanged(state, action: PayloadAction<number>) {
      state.pageSize = action.payload;
    },
    sortReplaced(state, action: PayloadAction<Prefs['sort']>) {
      state.sort = action.payload; // a new object, even with equal values
    },
    sortFieldsAssigned(state, action: PayloadAction<Prefs['sort']>) {
      state.sort.key = action.payload.key;
      state.sort.direction = action.payload.direction;
    },
    resetByReassigning(state) {
      // Deliberately wrong (20.05 rule 2), and it COMPILES: reassigning a parameter is legal TypeScript.
      state = { sort: { key: 'title', direction: 'desc' }, pageSize: 50 };
      void state;
    },
  },
});
const { pageSizeChanged, sortReplaced, sortFieldsAssigned, resetByReassigning } = prefsSlice.actions;

describe('20.04 createSlice generates creators and types', () => {
  it('type, action shape, match(), toString()', () => {
    expect(pageSizeChanged.type).toBe('listPrefs/pageSizeChanged');
    expect(pageSizeChanged(50)).toEqual({ type: 'listPrefs/pageSizeChanged', payload: 50 });
    expect(pageSizeChanged.match({ type: 'listPrefs/pageSizeChanged', payload: 1 })).toBe(true);
    expect(String(pageSizeChanged)).toBe('listPrefs/pageSizeChanged');
    const initial = prefsSlice.getInitialState();
    expect(prefsSlice.reducer(initial, { type: 'other' })).toBe(initial);
  });
});

describe('20.05 Immer', () => {
  const s0 = prefsSlice.getInitialState();

  it('structural sharing, frozen results, same state when a primitive is unchanged', () => {
    const s1 = prefsSlice.reducer(s0, pageSizeChanged(50));
    expect(s1.sort).toBe(s0.sort);
    expect(Object.isFrozen(s1) && Object.isFrozen(s1.sort)).toBe(true);
    expect(prefsSlice.reducer(s0, pageSizeChanged(20))).toBe(s0);
  });

  it('rule 3: a new object with equal values IS a change; equal fields are not', () => {
    expect(prefsSlice.reducer(s0, sortReplaced({ key: 'dueDate', direction: 'asc' }))).not.toBe(s0);
    expect(prefsSlice.reducer(s0, sortFieldsAssigned({ key: 'dueDate', direction: 'asc' }))).toBe(s0);
  });

  it('rule 2: reassigning `state` does nothing, silently', () => {
    expect(prefsSlice.reducer(s0, resetByReassigning())).toBe(s0);
  });

  it('rule 4: current(), original(), isDraft(); a draft used after the reducer is revoked', () => {
    let kept: { items: number[] } | undefined;
    const seen: Record<string, unknown> = {};
    const slice = createSlice({
      name: 'probe',
      initialState: { items: [1] },
      reducers: {
        pushed(state) {
          state.items.push(2);
          seen.isDraft = isDraft(state);
          seen.current = JSON.stringify(current(state));
          seen.original = JSON.stringify(original(state));
          kept = state;
        },
      },
    });
    slice.reducer(undefined, slice.actions.pushed());
    expect(seen).toEqual({ isDraft: true, current: '{"items":[1,2]}', original: '{"items":[1]}' });
    expect(() => kept?.items).toThrow("Cannot perform 'get' on a proxy that has been revoked");
  });
});

describe('20.05 current() snapshots', () => {
  it('are NOT frozen, and returning one after a mutation is the mutate-AND-return error', () => {
    let frozen: boolean | undefined;
    const slice = createSlice({
      name: 'snap',
      initialState: { items: [1] },
      reducers: {
        logged(state) {
          state.items.push(2);
          frozen = Object.isFrozen(current(state));
        },
        returnedSnapshot(state) {
          state.items.push(3);
          return current(state);
        },
      },
    });
    slice.reducer(undefined, slice.actions.logged());
    expect(frozen).toBe(false);
    expect(() => slice.reducer(undefined, slice.actions.returnedSnapshot())).toThrow('[Immer] An immer producer returned a new value *and* modified its draft.');
  });
});

describe('20.07 prepare, nanoid, builder order', () => {
  it('nanoid() is 21 characters; prepare builds the payload', () => {
    expect(nanoid()).toHaveLength(21);
    const toastShown = createAction('ui/toastShown', (message: string) => ({ payload: { message, id: nanoid() } }));
    const action = toastShown('Saved');
    expect(action.type).toBe('ui/toastShown');
    expect(action.payload.message).toBe('Saved');
    expect(action.payload.id).toHaveLength(21);
  });

  it('chained, TypeScript rejects addCase after addMatcher (checked by tsc -b)', () => {
    const a = createAction('a');
    const b = createAction('b');
    createSlice({
      name: 's',
      initialState: 0,
      reducers: {},
      extraReducers: (builder) => {
        // @ts-expect-error -- Property 'addCase' does not exist on the builder type returned by addMatcher
        builder.addMatcher(isAnyOf(a), (state) => state + 1).addCase(b, () => 0);
      },
    });
  });

  it('as separate statements it compiles; createSlice succeeds, the FIRST REDUCER CALL throws', () => {
    const a = createAction('a');
    const b = createAction('b');
    const slice = createSlice({
      name: 's',
      initialState: 0,
      reducers: {},
      extraReducers: (builder) => {
        builder.addMatcher(isAnyOf(a), (state) => state + 1);
        builder.addCase(b, () => 0);
      },
    });
    expect(() => slice.reducer(undefined, { type: 'x' })).toThrow(
      '`builder.addCase` should only be called before calling `builder.addMatcher`',
    );
  });
});

describe('20.17 mutate AND return', () => {
  it('modifying the draft then returning a new state type-checks, and Immer throws at runtime', () => {
    const slice = createSlice({
      name: 'categories',
      initialState: { status: 'idle', error: 'Boom' as string | null },
      reducers: {
        started(state) {
          state.status = 'loading';
          return { ...state, error: null };
        },
      },
    });
    expect(() => slice.reducer(undefined, slice.actions.started())).toThrow(
      '[Immer] An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.',
    );
  });

  it('TypeScript rejects a one-line arrow that returns push()’s number (checked by tsc -b)', () => {
    createSlice({
      name: 'rejected',
      initialState: { ids: [] as number[] },
      reducers: {
        // @ts-expect-error -- Type 'number' is not assignable to type 'void | … | …' (20.17)
        idAdded: (state, action: PayloadAction<number>) => state.ids.push(action.payload),
      },
    });
    const slice = createSlice({
      name: 'accepted',
      initialState: { ids: [] as number[] },
      reducers: {
        idAddedVoid: (state, action: PayloadAction<number>) => void state.ids.push(action.payload),
        idAddedBlock: (state, action: PayloadAction<number>) => {
          state.ids.push(action.payload);
        },
      },
    });
    expect(slice.reducer(undefined, slice.actions.idAddedVoid(1)).ids).toEqual([1]);
    expect(slice.reducer(undefined, slice.actions.idAddedBlock(2)).ids).toEqual([2]);
  });
});
