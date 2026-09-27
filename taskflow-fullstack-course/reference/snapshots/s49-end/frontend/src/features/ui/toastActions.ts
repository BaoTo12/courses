import { createAction, nanoid } from '@reduxjs/toolkit';
import type { ToastInput } from '../../toast/toast-context';

// Toast events in their own module: thunks in every feature dispatch them, and the ui slice handles them.
// (If they lived in uiSlice.ts, tasksThunks.ts and uiSlice.ts would import each other: a module cycle.)

/** `prepare` (20.07) builds the payload: the id is generated HERE, never in a reducer (19.01). */
export const toastShown = createAction('ui/toastShown', (input: ToastInput) => ({
  payload: { ...input, id: nanoid() },
}));

export const toastDismissed = createAction<string>('ui/toastDismissed');
