// UI state shared across the app: toasts (rendered by the S10 ToastProvider from S18 on) and bulk selection.
import type { Toast, ToastInput } from '../../toast/toast-context';
import type { AppAction } from '../../app/app-action';

export interface UiState {
  toasts: Toast[];
  /** Ids only (never copies of tasks), in an array (serialisable), not a Set (14.13). */
  selectedTaskIds: number[];
}

export const initialUiState: UiState = { toasts: [], selectedTaskIds: [] };

export type UiAction =
  | { type: 'ui/toastShown'; payload: Toast }
  | { type: 'ui/toastDismissed'; payload: number }
  | { type: 'ui/taskSelectionToggled'; payload: number }
  | { type: 'ui/selectionCleared' };

// Toast ids are generated in the action CREATOR: a reducer must not have a counter or randomness (15.04).
let nextToastId = 1;
export const toastShown = (toast: ToastInput): UiAction => ({
  type: 'ui/toastShown',
  payload: { ...toast, id: nextToastId++ },
});
export const toastDismissed = (id: number): UiAction => ({ type: 'ui/toastDismissed', payload: id });
export const taskSelectionToggled = (taskId: number): UiAction => ({ type: 'ui/taskSelectionToggled', payload: taskId });
export const selectionCleared = (): UiAction => ({ type: 'ui/selectionCleared' });

export function uiReducer(state: UiState = initialUiState, action: AppAction): UiState {
  switch (action.type) {
    case 'ui/toastShown':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'ui/toastDismissed':
      return { ...state, toasts: state.toasts.filter((toast) => toast.id !== action.payload) };
    case 'ui/taskSelectionToggled': {
      const id = action.payload;
      const selected = state.selectedTaskIds.includes(id);
      return {
        ...state,
        selectedTaskIds: selected ? state.selectedTaskIds.filter((x) => x !== id) : [...state.selectedTaskIds, id],
      };
    }
    case 'ui/selectionCleared':
      return state.selectedTaskIds.length === 0 ? state : { ...state, selectedTaskIds: [] };

    // ── Other slices' events this slice cares about (15.10) ──────────────────
    case 'tasks/taskDeleted':
      return removeFromSelection(state, [action.payload]);
    case 'tasks/completedCleared':
      return removeFromSelection(state, action.payload);
    case 'auth/loggedOut':
      return initialUiState;
    default:
      return state;
  }
}

/** Returns the SAME state object when nothing was selected, so subscribers see "no change". */
function removeFromSelection(state: UiState, ids: readonly number[]): UiState {
  const next = state.selectedTaskIds.filter((id) => !ids.includes(id));
  return next.length === state.selectedTaskIds.length ? state : { ...state, selectedTaskIds: next };
}
