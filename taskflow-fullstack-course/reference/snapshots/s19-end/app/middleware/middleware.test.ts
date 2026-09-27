import { applyMiddleware, compose, createStore } from 'redux';
import type { Middleware } from 'redux';
import { describe, expect, it, vi } from 'vitest';
import { rootReducer } from '../rootReducer';
import { dispatchStatsEnhancer } from '../enhancers/dispatch-stats';
import { makeStore } from '../store';
import { sortChanged } from '../../features/listPrefs/listPrefsSlice';
import { taskAdded, taskDeleted } from '../../features/tasks/tasksSlice';
import { toastShown } from '../../features/ui/uiSlice';
import { createAnalyticsMiddleware } from './analytics';
import { createCrashReporter } from './crash-reporter';
import { createLoggerMiddleware } from './logger';
import { REDACTED, redact } from './redact';

describe('redact', () => {
  it('replaces sensitive fields at any depth, without mutating the input', () => {
    const input = { type: 'auth/loginRequested', payload: { username: 'alice', password: 'alice123', nested: [{ csrfToken: 'x' }] } };
    const copy = structuredClone(input);
    expect(redact(input)).toEqual({
      type: 'auth/loginRequested',
      payload: { username: 'alice', password: REDACTED, nested: [{ csrfToken: REDACTED }] },
    });
    expect(input).toEqual(copy);
  });
});

describe('logger middleware (16.08)', () => {
  it('logs the redacted action and which slices changed, and returns next()’s result', () => {
    const log = vi.fn();
    const store = createStore(rootReducer, applyMiddleware(createLoggerMiddleware(log)));
    const action = sortChanged('title', 'desc');
    expect(store.dispatch(action)).toBe(action);
    expect(log).toHaveBeenCalledTimes(1);
    const [message, details] = log.mock.calls[0] ?? [];
    expect(message).toBe('[redux] listPrefs/sortChanged');
    expect(details.changed).toEqual(['listPrefs']);
  });

  it('reports no changed slices for an action nobody handles', () => {
    const log = vi.fn();
    const store = createStore(rootReducer, applyMiddleware(createLoggerMiddleware(log)));
    store.dispatch(sortChanged('dueDate', 'asc')); // the current value
    expect(log.mock.calls[0]?.[1].changed).toEqual([]);
  });
});

describe('crash reporter (16.12)', () => {
  it('reports the failing action type and RE-THROWS', () => {
    const report = vi.fn();
    const exploding: Middleware = () => () => () => {
      throw new Error('reducer bug');
    };
    const store = createStore(rootReducer, applyMiddleware(createCrashReporter(report), exploding));
    expect(() => store.dispatch(taskDeleted(1))).toThrow('reducer bug');
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ actionType: 'tasks/taskDeleted' }));
  });
});

describe('analytics middleware (16.12)', () => {
  it('sends allowlisted action types only, never payloads', () => {
    const send = vi.fn();
    const store = createStore(rootReducer, applyMiddleware(createAnalyticsMiddleware(send, () => 'T')));
    store.dispatch(sortChanged('title', 'desc'));
    store.dispatch(toastShown({ tone: 'info', message: 'private text' }));
    store.dispatch(taskAdded({
      id: 1, title: 'Secret project', description: '', status: 'TODO', priority: 'LOW',
      dueDate: null, categoryId: null, ownerId: 1, createdAt: 'x', updatedAt: 'x',
    }));
    expect(send.mock.calls).toEqual([[{ name: 'listPrefs/sortChanged', at: 'T' }], [{ name: 'tasks/taskAdded', at: 'T' }]]);
    expect(JSON.stringify(send.mock.calls)).not.toContain('Secret project');
  });
});

describe('dispatchStatsEnhancer (16.06)', () => {
  it('counts dispatches and adds a store method', () => {
    const store = createStore(rootReducer, dispatchStatsEnhancer);
    store.dispatch(sortChanged('title', 'desc'));
    store.dispatch(sortChanged('title', 'asc'));
    const stats = store.getDispatchStats();
    expect(stats.dispatches).toBe(2); // Redux's own init dispatch happens inside createStore, not through our wrapper
    expect(stats.slowestActionType).not.toBeNull();
  });

  it('composes with applyMiddleware (16.05): both layers are active', () => {
    const log = vi.fn();
    // Redux's compose can't infer through generic enhancers (it returns unknown): state the result type.
    const enhancer = compose(applyMiddleware(createLoggerMiddleware(log)), dispatchStatsEnhancer) as typeof dispatchStatsEnhancer;
    const store = createStore(rootReducer, enhancer);
    store.dispatch(sortChanged('title', 'desc'));
    expect(log).toHaveBeenCalledTimes(1);
    expect(store.getDispatchStats().dispatches).toBe(1);
  });
});

describe('makeStore', () => {
  it('accepts preloaded state and runs the whole middleware chain', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const store = makeStore({ ui: { toasts: [], selectedTaskIds: [3] } });
    expect(store.getState().ui.selectedTaskIds).toEqual([3]);
    store.dispatch(sortChanged('title', 'desc'));
    expect(info).toHaveBeenCalledWith('[analytics]', expect.objectContaining({ name: 'listPrefs/sortChanged' }));
    info.mockRestore();
    debug.mockRestore();
  });
});

describe('debug scenarios', () => {
  it('16.15: a middleware that forgets `return next(action)` makes dispatch return undefined', () => {
    const forgetful: Middleware = () => (next) => (action) => {
      next(action); // ❌ no return
    };
    const store = createStore(rootReducer, applyMiddleware(forgetful));
    const action = sortChanged('title', 'desc');
    expect(store.dispatch(action)).toBeUndefined();
    expect(store.getState().listPrefs.sort.key).toBe('title'); // …the state still updated
  });

  it('16.14: a middleware placed AFTER a transformer sees the transformed action', () => {
    const seen: string[] = [];
    const recorder: Middleware = () => (next) => (action) => {
      seen.push((action as { type: string }).type);
      return next(action);
    };
    // Renames legacy action types to the new names (a typical "transform" middleware)
    const renamer: Middleware = () => (next) => (action) =>
      next((action as { type: string }).type === 'LEGACY_SORT' ? sortChanged('title', 'desc') : action);

    const recorderAfter = createStore(rootReducer, applyMiddleware(renamer, recorder));
    recorderAfter.dispatch({ type: 'LEGACY_SORT' } as never);
    const recorderFirst = createStore(rootReducer, applyMiddleware(recorder, renamer));
    recorderFirst.dispatch({ type: 'LEGACY_SORT' } as never);

    expect(seen).toEqual(['listPrefs/sortChanged', 'LEGACY_SORT']);
  });
});
