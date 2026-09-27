import { isAction } from '@reduxjs/toolkit';
import type { Middleware } from '@reduxjs/toolkit';
import { apiSlice } from '../../features/api/apiSlice';
import { pageSizeChanged, sortChanged } from '../../features/listPrefs/listPrefsSlice';

export interface AnalyticsEvent {
  name: string;
  at: string;
}

const { addTask, deleteTask, clearCompleted } = apiSlice.endpoints;

/**
 * An ALLOWLIST of events worth tracking. Allowlist, not denylist: a new sensitive action
 * (auth/loggedIn with a user object, a password change…) is untracked by default (16.12).
 * Since S22 it's a list of MATCHERS with our own event names: every RTK Query mutation has the same
 * action type ('api/executeMutation/fulfilled'), so a Set of types can't tell "created" from "deleted".
 */
const TRACKED: { name: string; matches: (action: unknown) => boolean }[] = [
  { name: 'tasks/created', matches: addTask.matchFulfilled },
  { name: 'tasks/deleted', matches: deleteTask.matchFulfilled },
  { name: 'tasks/completedCleared', matches: clearCompleted.matchFulfilled },
  { name: sortChanged.type, matches: sortChanged.match },
  { name: pageSizeChanged.type, matches: pageSizeChanged.match },
];

/** Sends only an event NAME and a timestamp: never payloads (they contain user content). */
export function createAnalyticsMiddleware(
  send: (event: AnalyticsEvent) => void,
  now: () => string = () => new Date().toISOString(),
): Middleware {
  return () => (next) => (action) => {
    const result = next(action); // track only actions that reducers accepted without throwing
    if (isAction(action)) {
      const tracked = TRACKED.find((entry) => entry.matches(action));
      if (tracked) send({ name: tracked.name, at: now() });
    }
    return result;
  };
}
