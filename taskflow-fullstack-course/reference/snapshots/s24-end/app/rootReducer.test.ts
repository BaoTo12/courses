import { combineReducers, createStore } from 'redux';
import { describe, expect, it } from 'vitest';
import { deepFreeze } from '../test/deep-freeze';
import { loggedOut } from '../features/auth/authActions';
import { listPrefsReducer, pageSizeChanged, sortChanged } from '../features/listPrefs/listPrefsSlice';
import { quickFindReducer } from '../features/search/quickFindSlice';
import { mutationFulfilled } from '../test/rtk-query-actions';
import { taskSelectionToggled, toastShown, uiReducer } from '../features/ui/uiSlice';
import { combineSliceReducers } from './combine-slice-reducers';
import { rootReducer } from './rootReducer';

const reducers = { quickFind: quickFindReducer, listPrefs: listPrefsReducer, ui: uiReducer };

describe('rootReducer', () => {
  it('builds the initial state from every slice', () => {
    const store = createStore(rootReducer);
    expect(Object.keys(store.getState())).toEqual(['api', 'listPrefs', 'ui', 'quickFind']);
    expect(store.getState().listPrefs).toEqual({ sort: { key: 'dueDate', direction: 'asc' }, pageSize: 20 });
  });

  it('one action, several reducers: the deleteTask mutation also clears the selection', () => {
    const store = createStore(rootReducer);
    store.dispatch(taskSelectionToggled(5));
    store.dispatch(taskSelectionToggled(7));
    store.dispatch(mutationFulfilled('deleteTask', 5, undefined));
    expect(store.getState().ui.selectedTaskIds).toEqual([7]);
  });

  it('auth/loggedOut resets every slice', () => {
    const store = createStore(rootReducer);
    const initial = store.getState();
    store.dispatch(sortChanged('title', 'desc'));
    store.dispatch(pageSizeChanged(50));
    store.dispatch(toastShown({ tone: 'info', message: 'Hi' }));
    store.dispatch(loggedOut());
    expect(store.getState()).toEqual(initial);
  });

  it('returns the SAME root object when no slice changed', () => {
    const store = createStore(rootReducer);
    const before = store.getState();
    store.dispatch(sortChanged('dueDate', 'asc')); // already the current sort
    expect(store.getState()).toBe(before);
  });
});

describe('combineSliceReducers (our own, 15.09) behaves like Redux combineReducers', () => {
  const ours = combineSliceReducers(reducers);
  const theirs = combineReducers(reducers);
  const init = { type: '@@init' }; // an action no slice handles, like Redux's own init action
  const actions = [
    taskSelectionToggled(3),
    sortChanged('priority', 'desc'),
    mutationFulfilled('deleteTask', 3, undefined),
    sortChanged('priority', 'desc'),
    loggedOut(),
  ];

  it('produces equal states, and preserves references the same way', () => {
    let a = ours(undefined, init);
    let b = theirs(undefined, init);
    expect(a).toEqual(b);
    for (const action of actions) {
      const nextA = ours(deepFreeze(a), action);
      const nextB = theirs(deepFreeze(b), action);
      expect(nextA).toEqual(nextB);
      expect(nextA === a).toBe(nextB === b); // both return the same object when nothing changed
      a = nextA;
      b = nextB;
    }
  });
});
