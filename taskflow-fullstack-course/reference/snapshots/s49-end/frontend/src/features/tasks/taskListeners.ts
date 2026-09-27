import { isAnyOf } from '@reduxjs/toolkit';
import type { AppStartListening } from '../../app/listeners';
import { apiSlice } from '../api/apiSlice';
import { toastShown } from '../ui/toastActions';
import { selectCachedTask } from './taskSelectors';

const { addTask, updateTask, patchTask, deleteTask, clearCompleted, deleteTasks } = apiSlice.endpoints;

// Matchers in CONSTANTS, never inline in startListening: inline, TypeScript loses the action type (21.14).
const isTaskSaved = isAnyOf(addTask.matchFulfilled, updateTask.matchFulfilled);
const isBackgroundWriteFailed = isAnyOf(patchTask.matchRejected, deleteTask.matchRejected, clearCompleted.matchRejected, deleteTasks.matchRejected);
const isManyDeleted = isAnyOf(clearCompleted.matchFulfilled, deleteTasks.matchFulfilled);

/**
 * Every "tell the user" reaction to task writes (21.15, 22.09). The S18 thunks dispatched these toasts
 * themselves; RTK Query mutations don't, so the reactions live here, whoever triggered the write.
 */
export function addTaskListeners(startAppListening: AppStartListening) {
  startAppListening({
    matcher: isTaskSaved,
    effect: (action, listenerApi) => {
      const verb = addTask.matchFulfilled(action) ? 'Created' : 'Saved';
      const { title } = action.payload;
      const i18nKey = verb === 'Created' ? 'toasts.created' : 'toasts.saved';
      listenerApi.dispatch(toastShown({ tone: 'success', message: `${verb}: ${title}`, i18nKey, values: { title } }));
    },
  });

  // Toggle "done" from the list: the PATCH that set status DONE (not a title edit, not a reopen).
  startAppListening({
    matcher: patchTask.matchFulfilled,
    effect: (action, listenerApi) => {
      if (action.meta.arg.originalArgs.changes.status === 'DONE') {
        const { title } = action.payload;
        listenerApi.dispatch(toastShown({ tone: 'success', message: `Completed: ${title}`, i18nKey: 'toasts.completed', values: { title } }));
      }
    },
  });

  startAppListening({
    matcher: deleteTask.matchFulfilled,
    effect: (action, listenerApi) => {
      const id = action.meta.arg.originalArgs;
      // The title from the state BEFORE this action (21.14). The optimistic delete (23.05) already removed the
      // task from the lists, so look in its own entry too: getTask(id), seeded from the list (23.06).
      const title = selectCachedTask(listenerApi.getOriginalState(), id)?.title ?? `Task ${id}`;
      listenerApi.dispatch(toastShown({ tone: 'success', message: `Deleted: ${title}`, i18nKey: 'toasts.deleted', values: { title } }));
    },
  });

  startAppListening({
    matcher: isManyDeleted, // "clear completed" and S27's bulk delete report the same way
    effect: (action, listenerApi) => {
      const { deleted, failed } = action.payload;
      listenerApi.dispatch(
        failed.length === 0
          ? toastShown({
              tone: 'success',
              message: `Deleted ${deleted.length} completed task(s).`,
              i18nKey: 'toasts.deletedMany',
              values: { count: deleted.length },
            })
          : toastShown({
              tone: 'error',
              message: `Deleted ${deleted.length}, but ${failed.length} could not be deleted.`,
              i18nKey: 'toasts.deletedPartly',
              values: { deleted: deleted.length, failed: failed.length },
            }),
      );
    },
  });

  // Writes started from the list or the details page have no form to show errors in: toast them.
  // (addTask / updateTask errors are NOT here: the forms show them next to the fields, 19.09.)
  startAppListening({
    matcher: isBackgroundWriteFailed,
    effect: (action, listenerApi) => {
      const message = action.payload?.message ?? action.error.message ?? 'Unexpected error';
      const code = action.payload?.code;
      // Translated by CODE when there's one (25.13); the server's message is the fallback.
      listenerApi.dispatch(toastShown({ tone: 'error', message, ...(code ? { i18nKey: `errors.${code}` } : {}) }));
    },
  });
}
