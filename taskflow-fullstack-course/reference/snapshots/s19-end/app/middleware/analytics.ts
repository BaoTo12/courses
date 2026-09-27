import { isAction } from 'redux';
import type { Middleware } from 'redux';

export interface AnalyticsEvent {
  name: string;
  at: string;
}

/**
 * An ALLOWLIST of action types worth tracking. Allowlist, not denylist: a new sensitive action
 * (auth/loggedIn with a user object, a password change…) is untracked by default (16.12).
 */
const TRACKED_ACTIONS = new Set([
  'tasks/taskAdded',
  'tasks/taskDeleted',
  'tasks/allCompleted',
  'tasks/completedCleared',
  'listPrefs/sortChanged',
  'listPrefs/pageSizeChanged',
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
