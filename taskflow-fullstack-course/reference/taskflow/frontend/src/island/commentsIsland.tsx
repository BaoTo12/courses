// S49 (49.12): the comments of one task as an island in the JSP details page (/taskflow/tasks/view?id=N).
import type { User } from '../domain/types';
import { authApi } from '../features/auth/authApi';
import { CommentsSection } from '../features/comments/CommentsSection';
import { mountIsland, readInitialData } from './island';

/** The task id comes from a data- attribute, the user from the JSON block: both written by TaskViewServlet. */
const root = document.getElementById('comments-root');
const taskId = Number(root?.dataset.taskId);
const { user, readOnly } = readInitialData<{ user: User; readOnly: boolean }>('comments-data');

if (Number.isInteger(taskId) && taskId > 0) {
  // The server-rendered comments inside #comments-root are replaced by React on mount (they were the no-JS fallback).
  mountIsland('comments-root', <CommentsSection taskId={taskId} readOnly={readOnly} />, (store) =>
    store.dispatch(authApi.util.upsertQueryData('getMe', undefined, user)),
  );
}
