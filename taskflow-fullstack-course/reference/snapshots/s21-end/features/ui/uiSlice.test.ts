import { describe, expect, it } from 'vitest';
import { deepFreeze } from '../../test/deep-freeze';
import { clearCompleted, deleteTask } from '../tasks/tasksThunks';
import { initialUiState, selectionCleared, taskSelectionToggled, toastDismissed, toastShown, uiReducer } from './uiSlice';

describe('uiReducer (createSlice, S20)', () => {
  it('shows and dismisses toasts; ids come from prepare (nanoid)', () => {
    const first = toastShown({ tone: 'success', message: 'Saved' });
    const second = toastShown({ tone: 'error', message: 'Oops' });
    expect(typeof first.payload.id).toBe('string');
    expect(first.payload.id).not.toBe(second.payload.id);

    const withTwo = [first, second].reduce(uiReducer, deepFreeze(initialUiState));
    expect(withTwo.toasts.map((t) => t.message)).toEqual(['Saved', 'Oops']);
    expect(uiReducer(deepFreeze(withTwo), toastDismissed(first.payload.id)).toasts.map((t) => t.message)).toEqual(['Oops']);
  });

  it('toggles selection on and off (push/splice on a draft)', () => {
    const on = uiReducer(deepFreeze(initialUiState), taskSelectionToggled(4));
    expect(on.selectedTaskIds).toEqual([4]);
    expect(uiReducer(deepFreeze(on), taskSelectionToggled(4)).selectedTaskIds).toEqual([]);
  });

  it('reacts to the tasks thunks’ fulfilled actions (extraReducers)', () => {
    const state = deepFreeze({ ...initialUiState, selectedTaskIds: [1, 2, 3] });
    expect(uiReducer(state, deleteTask.fulfilled(2, 'r', 2)).selectedTaskIds).toEqual([1, 3]);
    expect(uiReducer(state, clearCompleted.fulfilled([1, 3], 'r', undefined)).selectedTaskIds).toEqual([2]);
  });

  it('keeps the same reference when nothing changes (Immer returns the original)', () => {
    const state = deepFreeze({ ...initialUiState, selectedTaskIds: [1] });
    expect(uiReducer(state, deleteTask.fulfilled(99, 'r', 99))).toBe(state);
    expect(uiReducer(deepFreeze(initialUiState), selectionCleared())).toBe(initialUiState);
  });
});
