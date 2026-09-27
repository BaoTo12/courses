import { isAnyOf } from '@reduxjs/toolkit';
import type { AppStartListening } from '../../app/listeners';
import { apiSlice } from '../api/apiSlice';
import { commentsApi } from '../comments/commentsApi';
import { sharesApi } from '../sharing/sharesApi';

const { addTask, updateTask, patchTask, deleteTask, clearCompleted, deleteTasks } = apiSlice.endpoints;

/** Every successful write that the server records as activity (TaskEvent, S51). */
const isRecordedWrite = isAnyOf(
  addTask.matchFulfilled,
  updateTask.matchFulfilled,
  patchTask.matchFulfilled,
  deleteTask.matchFulfilled,
  clearCompleted.matchFulfilled,
  deleteTasks.matchFulfilled,
  commentsApi.endpoints.addComment.matchFulfilled,
  sharesApi.endpoints.addShare.matchFulfilled,
  sharesApi.endpoints.removeShare.matchFulfilled,
);

/**
 * S51: the activity feed is SERVER data, so after any recorded write the cached feed is stale. The mutations don't
 * know about the feed (and shouldn't): one listener invalidates the 'Activity' tag for all of them. A mounted
 * <ActivityFeed> refetches; an unmounted one just refetches next time (21.14, 22.08).
 */
export function addActivityListeners(startAppListening: AppStartListening) {
  startAppListening({
    matcher: isRecordedWrite,
    effect: (_action, listenerApi) => {
      listenerApi.dispatch(apiSlice.util.invalidateTags(['Activity']));
    },
  });
}