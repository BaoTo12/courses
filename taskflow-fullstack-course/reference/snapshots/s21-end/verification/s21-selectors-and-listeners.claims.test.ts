// Lecture-claim tests for S21 (21.04–21.09, 21.14, 21.19, 21.20): what reselect 5 (via RTK) caches, when it
// recomputes, its development warnings, and a listener typing trap. Pinned to the installed versions.
import { createListenerMiddleware, createSelector, isAnyOf, isFulfilled, lruMemoize } from '@reduxjs/toolkit';
import * as reselect from 'reselect';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveNewTask, saveTask } from '../features/tasks/tasksThunks';

type T = { id: number; status: string };
type S = { tasks: T[]; theme: string };
const state1: S = { tasks: [{ id: 1, status: 'TODO' }, { id: 2, status: 'DONE' }], theme: 'light' };
const state2: S = { ...state1, theme: 'dark' }; // an unrelated change: new root, same tasks

afterEach(() => {
  vi.restoreAllMocks();
});

describe('21.04 createSelector basics', () => {
  it('RTK re-exports reselect’s createSelector; unrelated changes return the cached result', () => {
    expect(createSelector).toBe(reselect.createSelector);
    const selectDone = createSelector([(s: S) => s.tasks], (tasks) => tasks.filter((t) => t.status === 'DONE'));
    expect(selectDone(state1)).toBe(selectDone(state2));
    expect(selectDone.recomputations()).toBe(1);
    expect(Object.keys(selectDone).sort()).toEqual([
      'argsMemoize',
      'clearCache',
      'dependencies',
      'dependencyRecomputations',
      'lastResult',
      'memoize',
      'memoizedResultFunc',
      'recomputations',
      'resetDependencyRecomputations',
      'resetRecomputations',
      'resetResultsCount',
      'resultFunc',
      'resultsCount',
    ]);
  });
});

describe('21.07 / 21.08 / 21.20 cache size per memoizer', () => {
  const byStatus = (tasks: T[], status: string) => tasks.filter((t) => t.status === status);

  it('weakMapMemoize (default): alternating arguments recompute only once per argument', () => {
    const select = createSelector([(s: S) => s.tasks, (_s: S, status: string) => status], byStatus);
    for (const status of ['TODO', 'DONE', 'TODO', 'DONE']) select(state1, status);
    expect(select.recomputations()).toBe(2);
  });

  it('lruMemoize (size 1, reselect 4’s default): the same calls THRASH, recomputing every time', () => {
    const select = createSelector([(s: S) => s.tasks, (_s: S, status: string) => status], byStatus, { memoize: lruMemoize, argsMemoize: lruMemoize });
    for (const status of ['TODO', 'DONE', 'TODO', 'DONE']) select(state1, status);
    expect(select.recomputations()).toBe(4);
  });

  it('lruMemoize with maxSize 3: no thrashing for 2 alternating arguments', () => {
    const select = createSelector([(s: S) => s.tasks, (_s: S, status: string) => status], byStatus, {
      memoize: lruMemoize,
      memoizeOptions: { maxSize: 3 },
      argsMemoize: lruMemoize,
      argsMemoizeOptions: { maxSize: 3 },
    });
    for (const status of ['TODO', 'DONE', 'TODO', 'DONE']) select(state1, status);
    expect(select.recomputations()).toBe(2);
  });

  it('weakMapMemoize keeps every distinct argument: 5 search strings twice → 5 recomputations', () => {
    const select = createSelector([(s: S) => s.tasks, (_s: S, q: string) => q], (tasks, q) =>
      tasks.filter((t) => String(t.id).includes(q)),
    );
    for (let round = 0; round < 2; round++) for (let i = 0; i < 5; i++) select(state1, `q${i}`);
    expect(select.recomputations()).toBe(5);
  });
});

describe('21.09 object arguments', () => {
  it('a new {…} argument each call is fine when the input selectors extract primitives', () => {
    const select = createSelector(
      [(s: S) => s.tasks, (_s: S, filter: { status: string }) => filter.status],
      (tasks, status) => tasks.filter((t) => t.status === status),
    );
    for (let i = 0; i < 4; i++) select(state1, { status: 'TODO' });
    expect(select.recomputations()).toBe(1);
  });

  it('…but an input selector returning the object itself recomputes on every call', () => {
    const select = createSelector(
      [(s: S) => s.tasks, (_s: S, filter: { status: string }) => filter],
      (tasks, filter) => tasks.filter((t) => t.status === filter.status),
    );
    const first = select(state1, { status: 'TODO' });
    expect(select(state1, { status: 'TODO' })).not.toBe(first);
    expect(select.recomputations()).toBe(2);
  });
});

describe('21.19 an input selector that builds a new object', () => {
  it('recomputes on every NEW STATE (not on every call), and the dev check warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const selectStats = createSelector([(s: S) => ({ tasks: s.tasks })], ({ tasks }) => ({ total: tasks.length }));
    const a = selectStats(state1);
    const b = selectStats(state1); // same state object: the ARGUMENTS are memoised → cache hit
    const c = selectStats(state2); // new state (any action) → the input builds a new object → recompute
    expect(a).toBe(b);
    expect(c).not.toBe(b);
    expect(selectStats.recomputations()).toBe(2);
    expect(String(warn.mock.calls[0]?.[0])).toContain('An input selector returned a different result when passed same arguments.');
    selectStats(state1);
    expect(warn).toHaveBeenCalledTimes(1); // the check runs on the first call only ('once')
  });

  it('identityFunctionCheck warns about a result function that returns its input', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const selectTasks = createSelector([(s: S) => s.tasks], (tasks) => tasks);
    selectTasks(state1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('The result function returned its own inputs without modification.');
  });
});

describe('21.04 / 21.08 createSelector options and helpers', () => {
  it("devModeChecks per selector: 'always' warns on every call, 'never' silences", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const noisy = createSelector([(s: S) => ({ tasks: s.tasks })], ({ tasks }) => tasks.length, {
      devModeChecks: { inputStabilityCheck: 'always' },
    });
    noisy(state1);
    noisy(state2);
    expect(warn).toHaveBeenCalledTimes(2);
    const quiet = createSelector([(s: S) => ({ tasks: s.tasks })], ({ tasks }) => tasks.length, {
      devModeChecks: { inputStabilityCheck: 'never' },
    });
    quiet(state1);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('weakMapMemoize maxSize bounds the cache for primitive arguments (both caches)', () => {
    const select = createSelector([(s: S) => s.tasks, (_s: S, q: string) => q], (tasks, q) => tasks.filter((t) => String(t.id) === q), {
      memoizeOptions: { maxSize: 2 },
      argsMemoizeOptions: { maxSize: 2 },
    });
    for (const q of ['a', 'b', 'c', 'd', 'e', 'f']) select(state1, q); // 6 distinct: generations get dropped
    select.resetRecomputations();
    select(state1, 'a'); // long unused → dropped with its generation → recomputed
    expect(select.recomputations()).toBe(1);
    select(state1, 'f'); // recent → still cached
    expect(select.recomputations()).toBe(1);
  });

  it('createSelector.withTypes<RootState>() pre-types the state parameter (checked by tsc -b)', () => {
    const createAppSelector = createSelector.withTypes<S>();
    const selectCount = createAppSelector([(state) => state.tasks], (tasks) => tasks.length); // state: S, inferred
    expect(selectCount(state1)).toBe(2);
  });

  it('createStructuredSelector builds an object of results, memoized as a whole', () => {
    const selectView = reselect.createStructuredSelector({
      tasks: (s: S) => s.tasks,
      theme: (s: S) => s.theme,
    });
    const view = selectView(state1);
    expect(view).toEqual({ tasks: state1.tasks, theme: 'light' });
    expect(selectView({ ...state1 })).toBe(view); // new root, same inputs → same object
  });
});

describe('21.20 the board scenario with an lruMemoize-based createSelector', () => {
  it('three columns sharing one selector: +3 recomputations per state change; a factory per column: 0', () => {
    const createAppSelector = reselect.createSelectorCreator({ memoize: lruMemoize, argsMemoize: lruMemoize });
    const inputs = [(s: S) => s.tasks, (_s: S, status: string) => status] as [(s: S) => T[], (s: S, status: string) => string];
    const shared = createAppSelector(inputs, (tasks, status) => tasks.filter((t) => t.status === status).map((t) => t.id));
    const columns = ['TODO', 'IN_PROGRESS', 'DONE'];
    const render = (state: S, select: (s: S, status: string) => number[], status: string) => select(state, status);

    for (const status of columns) render(state1, shared, status);
    const afterFirst = shared.recomputations();
    for (const status of columns) render(state2, shared, status); // an unrelated action: new root, same tasks
    expect(shared.recomputations() - afterFirst).toBe(3); // thrashing

    const perColumn = columns.map(() =>
      createAppSelector(inputs, (tasks, status) => tasks.filter((t) => t.status === status).map((t) => t.id)),
    );
    columns.forEach((status, i) => render(state1, perColumn[i]!, status));
    columns.forEach((status, i) => render(state2, perColumn[i]!, status));
    expect(perColumn.map((s) => s.recomputations())).toEqual([1, 1, 1]); // each column computed once
  });
});

describe('21.14 listener matcher typing (checked by tsc -b)', () => {
  it('an INLINE isAnyOf/isFulfilled call types the effect’s action as bare Action; a constant does not', () => {
    const listener = createListenerMiddleware();
    listener.startListening({
      matcher: isAnyOf(saveNewTask.fulfilled, saveTask.fulfilled),
      // @ts-expect-error -- Property 'payload' does not exist on type 'Action'
      effect: (action) => void action.payload.title,
    });
    const isTaskSaved = isFulfilled(saveNewTask, saveTask);
    listener.startListening({ matcher: isTaskSaved, effect: (action) => void action.payload.title });
    listener.startListening({ matcher: saveNewTask.fulfilled.match, effect: (action) => void action.payload.title });
  });
});
