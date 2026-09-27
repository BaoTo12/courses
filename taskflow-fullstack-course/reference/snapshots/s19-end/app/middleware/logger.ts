import { isAction } from 'redux';
import type { Middleware } from 'redux';
import { redact } from './redact';

type Log = (message: string, details: { action: unknown; changed: string[]; ms: number }) => void;

/** Which top-level slices got a NEW reference: the cheap way to see what an action changed (14.06). */
function changedSlices(before: unknown, after: unknown): string[] {
  if (typeof before !== 'object' || before === null || typeof after !== 'object' || after === null) return [];
  const prev = before as Record<string, unknown>;
  const next = after as Record<string, unknown>;
  return Object.keys(next).filter((key) => prev[key] !== next[key]);
}

/**
 * Logs every action (REDACTED) and which slices it changed. Deliberately does NOT log whole states:
 * they can be large and can contain personal data (16.08).
 */
export function createLoggerMiddleware(log: Log = (message, details) => console.debug(message, details)): Middleware {
  return (storeAPI) => (next) => (action) => {
    // Redux 5 types `action` as unknown: thunks (functions) also travel through middleware (S18).
    if (!isAction(action)) return next(action);
    const before = storeAPI.getState();
    const startedAt = performance.now();
    const result = next(action); // everything after this line runs once the reducers are done
    log(`[redux] ${action.type}`, {
      action: redact(action),
      changed: changedSlices(before, storeAPI.getState()),
      ms: Math.round((performance.now() - startedAt) * 100) / 100,
    });
    return result; // ALWAYS return what next() returned (16.15)
  };
}
