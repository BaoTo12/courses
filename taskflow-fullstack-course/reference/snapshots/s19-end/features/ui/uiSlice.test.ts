import { describe, expect, it } from 'vitest';
import { deepFreeze } from '../../test/deep-freeze';
import { completedCleared, taskDeleted } from '../tasks/tasksSlice';
import {
  initialUiState,
  selectionCleared,
  taskSelectionToggled,
  toastDismissed,
  toastShown,
  uiReducer,
} from './uiSlice';

describe('uiReducer', () => {
  it('shows and dismisses toasts; ids come from the action creator', () => {
    const first = toastShown({ tone: 'success', message: 'Saved' });
    const second = toastShown({ tone: 'error', message: 'Oops' });
    expect(second.type === 'ui/toastShown' && first.type === 'ui/toastShown').toBe(true);

    const withTwo = [first, second].reduce(uiReducer, deepFreeze(initialUiState));
    expect(withTwo.toasts.map((t) => t.message)).toEqual(['Saved', 'Oops']);

    const id = first.type === 'ui/toastShown' ? first.payload.id : -1;
    expect(uiReducer(deepFreeze(withTwo), toastDismissed(id)).toasts.map((t) => t.message)).toEqual(['Oops']);
  });

  it('toggles selection on and off', () => {
    const on = uiReducer(deepFreeze(initialUiState), taskSelectionToggled(4));
    expect(on.selectedTaskIds).toEqual([4]);
    expect(uiReducer(deepFreeze(on), taskSelectionToggled(4)).selectedTaskIds).toEqual([]);
  });

  it('reacts to task events from another slice', () => {
    const state = deepFreeze({ ...initialUiState, selectedTaskIds: [1, 2, 3] });
    expect(uiReducer(state, taskDeleted(2)).selectedTaskIds).toEqual([1, 3]);
    expect(uiReducer(state, completedCleared([1, 3])).selectedTaskIds).toEqual([2]);
  });

  it('keeps the same reference when nothing changes', () => {
    const state = deepFreeze({ ...initialUiState, selectedTaskIds: [1] });
    expect(uiReducer(state, taskDeleted(99))).toBe(state);
    expect(uiReducer(deepFreeze(initialUiState), selectionCleared())).toBe(initialUiState);
  });
});
