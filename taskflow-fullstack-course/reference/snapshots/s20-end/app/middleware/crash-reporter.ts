import { isAction } from 'redux';
import type { Middleware } from 'redux';
import { redact } from './redact';

export interface CrashReport {
  error: unknown;
  actionType: string;
  action: unknown;
}

/**
 * If a reducer (or a later middleware) throws while handling an action, report it with the action
 * that caused it, then RE-THROW: reporting must not hide the failure (13.14's lesson).
 * Register it FIRST so it wraps everything else (16.14).
 */
export function createCrashReporter(report: (crash: CrashReport) => void): Middleware {
  return () => (next) => (action) => {
    try {
      return next(action);
    } catch (error) {
      report({
        error,
        actionType: isAction(action) ? action.type : typeof action,
        action: redact(action),
      });
      throw error;
    }
  };
}
