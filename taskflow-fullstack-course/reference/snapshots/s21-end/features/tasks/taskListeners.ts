import { isFulfilled } from '@reduxjs/toolkit';
import type { AppStartListening } from '../../app/listeners';
import { toastShown } from '../ui/toastActions';
import { saveNewTask, saveTask } from './tasksThunks';

/**
 * The matcher in a CONSTANT, not inline: written as `matcher: isFulfilled(…)` inside the options object,
 * TypeScript types the effect's `action` as a bare `Action` (verified with tsc, 21.14), and `action.payload`
 * doesn't compile. From a constant, it's the union of both fulfilled actions.
 */
const isTaskSaved = isFulfilled(saveNewTask, saveTask);

/**
 * "A task was saved → tell the user." (21.15) One listener instead of a toast in every page that saves:
 * the pages only decide where to navigate, and any future way of saving gets the toast for free.
 */
export function addTaskListeners(startAppListening: AppStartListening) {
  startAppListening({
    matcher: isTaskSaved,
    effect: (action, listenerApi) => {
      const verb = saveNewTask.fulfilled.match(action) ? 'Created' : 'Saved';
      listenerApi.dispatch(toastShown({ tone: 'success', message: `${verb}: ${action.payload.title}` }));
    },
  });
}
