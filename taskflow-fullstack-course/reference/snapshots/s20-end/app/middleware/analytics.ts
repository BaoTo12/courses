import { isAction } from 'redux';
import type { Middleware } from 'redux';
import { clearCompleted, deleteTask, saveNewTask } from '../../features/tasks/tasksThunks';
import { allCompleted } from '../../features/tasks/tasksSlice';
import { pageSizeChanged, sortChanged } from '../../features/listPrefs/listPrefsSlice';

export interface AnalyticsEvent {
  name: string;
  at: string;
}

/**
 * An ALLOWLIST of action types worth tracking. Allowlist, not denylist: a new sensitive action
 * (auth/loggedIn with a user object, a password change…) is untracked by default (16.12).
 */
const TRACKED_ACTIONS = new Set<string>([
  // From the action creators' `.type` (S20): renaming an action can't silently break tracking.
  saveNewTask.fulfilled.type,
  deleteTask.fulfilled.type,
  clearCompleted.fulfilled.type,
  allCompleted.type,
  sortChanged.type,
  pageSizeChanged.type,
]);

/** Sends only the action TYPE and a timestamp: never payloads (they contain user content). */
export function createAnalyticsMiddleware(
  send: (event: AnalyticsEvent) => void,
  now: () => string = () => new Date().toISOString(),
): Middleware {
  return () => (next) => (action) => {
    const result = next(action); // track only actions that reducers accepted without throwing
    if (isAction(action) && TRACKED_ACTIONS.has(action.type)) {
      send({ name: action.type, at: now() });
    }
    return result;
  };
}
