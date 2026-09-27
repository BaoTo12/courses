// S20: toasts + bulk selection, with createSlice. Toast actions come from toastActions.ts (createAction).
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Toast } from '../../toast/toast-context';
import { loggedOut } from '../auth/authActions';
import { clearCompleted, deleteTask } from '../tasks/tasksThunks';
import { toastDismissed, toastShown } from './toastActions';

export interface UiState {
  toasts: Toast[];
  /** Ids only (never copies of tasks), in an array (serialisable), not a Set (14.13). */
  selectedTaskIds: number[];
}

export const initialUiState: UiState = { toasts: [], selectedTaskIds: [] };

/** Remove ids from the selection. With Immer, assigning a filtered array to a draft field is fine. */
function removeFromSelection(state: UiState, ids: readonly number[]) {
  if (ids.some((id) => state.selectedTaskIds.includes(id))) {
    state.selectedTaskIds = state.selectedTaskIds.filter((id) => !ids.includes(id));
  }
  // No change → no assignment → Immer returns the SAME state object (20.05).
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: initialUiState,
  reducers: {
    taskSelectionToggled(state, action: PayloadAction<number>) {
      const index = state.selectedTaskIds.indexOf(action.payload);
      if (index === -1) state.selectedTaskIds.push(action.payload);
      else state.selectedTaskIds.splice(index, 1); // mutating methods are fine on a draft
    },
    selectionCleared(state) {
      if (state.selectedTaskIds.length > 0) state.selectedTaskIds = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(toastShown, (state, action) => {
        state.toasts.push(action.payload);
      })
      .addCase(toastDismissed, (state, action) => {
        state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
      })
      // Other slices' events (15.10): the async thunks' `fulfilled` actions ARE the events now.
      .addCase(deleteTask.fulfilled, (state, action) => removeFromSelection(state, [action.payload]))
      .addCase(clearCompleted.fulfilled, (state, action) => removeFromSelection(state, action.payload))
      .addCase(loggedOut, () => initialUiState);
  },
});

export const { taskSelectionToggled, selectionCleared } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
export { toastShown, toastDismissed }; // re-exported for convenience (callers may import from the slice)
