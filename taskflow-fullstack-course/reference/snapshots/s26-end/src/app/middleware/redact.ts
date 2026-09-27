/** Keys whose values must never reach logs, analytics or crash reports (16.08). */
const SENSITIVE_KEY = /pass(word)?|token|secret|authorization|cookie|session|csrf|xsrf/i;

export const REDACTED = '[REDACTED]';

/**
 * Returns a deep COPY of `value` with sensitive fields replaced. Never mutates the input
 * (it may be an action or state object that Redux still holds).
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[…]'; // don't walk huge or cyclic structures
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1)]),
    );
  }
  return value;
}
