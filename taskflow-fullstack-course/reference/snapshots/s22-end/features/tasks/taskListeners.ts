import { isAnyOf } from '@reduxjs/toolkit';
import type { AppStartListening } from '../../app/listeners';
import { apiSlice } from '../api/apiSlice';
import { toastShown } from '../ui/toastActions';
import { selectTaskById } from './taskSelectors';

const { addTask, updateTask, patchTask, deleteTask, clearCompleted } = apiSlice.endpoints;

// Matchers in CONSTANTS, never inline in startListening: inline, TypeScript loses the action type (21.14).
const isTaskSaved = isAnyOf(addTask.matchFulfilled, updateTask.matchFulfilled);
const isBackgroundWriteFailed = isAnyOf(patchTask.matchRejected, deleteTask.matchRejected, clearCompleted.matchRejected);

/**
 * Every "tell the user" reaction to task writes (21.15, 22.09). The S18 thunks dispatched these toasts
 * themselves; RTK Query mutations don't, so the reactions live here, whoever triggered the write.
 */
export function addTaskListeners(startAppListening: AppStartListening) {
  startAppListening({
    matcher: isTaskSaved,
    effect: (action, listenerApi) => {
      const verb = addTask.matchFulfilled(action) ? 'Created' : 'Saved';
      listenerApi.dispatch(toastShown({ tone: 'success', message: `${verb}: ${action.payload.title}` }));
    },
  });

  // Toggle "done" from the list: the PATCH that set status DONE (not a title edit, not a reopen).
  startAppListening({
    matcher: patchTask.matchFulfilled,
    effect: (action, listenerApi) => {
      if (action.meta.arg.originalArgs.changes.status === 'DONE') {
        listenerApi.dispatch(toastShown({ tone: 'success', message: `Completed: ${action.payload.title}` }));
      }
    },
  });

  startAppListening({
    matcher: deleteTask.matchFulfilled,
    effect: (action, listenerApi) => {
      const id = action.meta.arg.originalArgs;
      // The title from the state BEFORE this action (21.14): the cache still has the task until the refetch.
      const title = selectTaskById(listenerApi.getOriginalState(), id)?.title ?? `Task ${id}`;
      listenerApi.dispatch(toastShown({ tone: 'success', message: `Deleted: ${title}` }));
    },
  });

  startAppListening({
    matcher: clearCompleted.matchFulfilled,
    effect: (action, listenerApi) => {
      const { deleted, failed } = action.payload;
      listenerApi.dispatch(
        failed.length === 0
          ? toastShown({ tone: 'success', message: `Deleted ${deleted.length} completed task(s).` })
          : toastShown({ tone: 'error', message: `Deleted ${deleted.length}, but ${failed.length} could not be deleted.` }),
      );
    },
  });

  // Writes started from the list or the details page have no form to show errors in: toast them.
  // (addTask / updateTask errors are NOT here: the forms show them next to the fields, 19.09.)
  startAppListening({
    matcher: isBackgroundWriteFailed,
    effect: (action, listenerApi) => {
      const message = action.payload?.message ?? action.error.message ?? 'Unexpected error';
      listenerApi.dispatch(toastShown({ tone: 'error', message }));
    },
  });
}
