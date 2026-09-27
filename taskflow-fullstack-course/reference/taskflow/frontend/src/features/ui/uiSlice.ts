// S20: toasts + bulk selection, with createSlice. Toast actions come from toastActions.ts (createAction).
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Toast } from '../../toast/toast-context';
import { loggedOut } from '../auth/authActions';
import { apiSlice } from '../api/apiSlice';
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
      .addCase(loggedOut, () => initialUiState)
      // Other features' events (15.10). Since S22 they're RTK Query mutations: every mutation shares the
      // type 'api/executeMutation/fulfilled', so we match by ENDPOINT (22.07). The mutation's argument is
      // in meta.arg.originalArgs.
      .addMatcher(apiSlice.endpoints.deleteTask.matchFulfilled, (state, action) =>
        removeFromSelection(state, [action.meta.arg.originalArgs]),
      )
      .addMatcher(apiSlice.endpoints.clearCompleted.matchFulfilled, (state, action) =>
        removeFromSelection(state, action.payload.deleted),
      )
      // S27 bulk delete: deleted ids leave the selection; FAILED ones stay selected, ready for a retry.
      .addMatcher(apiSlice.endpoints.deleteTasks.matchFulfilled, (state, action) =>
        removeFromSelection(state, action.payload.deleted),
      );
  },
});

export const { taskSelectionToggled, selectionCleared } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
export { toastShown, toastDismissed }; // re-exported for convenience (callers may import from the slice)
