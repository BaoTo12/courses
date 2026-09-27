// S21 (21.01): memoization from scratch, to understand what reselect does (and doesn't) cache.

/** True when both argument lists have the same length and every argument is the same (Object.is). */
function sameArgs(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

/**
 * Remembers ONLY the last call: same arguments as last time → the cached result, without calling `fn`.
 * A cache of size 1, like reselect 4's `defaultMemoize` (now `lruMemoize` with maxSize 1).
 */
export function memoizeOne<Args extends unknown[], R>(fn: (...args: Args) => R): (...args: Args) => R {
  let last: { args: Args; result: R } | null = null;
  return (...args: Args) => {
    if (last !== null && sameArgs(last.args, args)) return last.result;
    const result = fn(...args);
    last = { args, result };
    return result;
  };
}

/**
 * Remembers EVERY argument list it has seen (until the cache is cleared), keyed by the arguments.
 * Unbounded: fine for a few distinct arguments (3 statuses), a memory leak for many (every search text).
 * Real implementations key by reference without leaking (reselect 5's `weakMapMemoize`, 21.08).
 */
export function memoize<Args extends unknown[], R>(
  fn: (...args: Args) => R,
): ((...args: Args) => R) & { cacheSize: () => number; clear: () => void } {
  let entries: { args: Args; result: R }[] = [];
  const memoized = (...args: Args) => {
    const hit = entries.find((entry) => sameArgs(entry.args, args));
    if (hit) return hit.result;
    const result = fn(...args);
    entries.push({ args, result });
    return result;
  };
  return Object.assign(memoized, {
    cacheSize: () => entries.length,
    clear: () => {
      entries = [];
    },
  });
}
