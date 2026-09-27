/**
 * Recursively freezes an object graph. In tests, pass frozen state to a reducer:
 * any mutation then THROWS (ES modules are strict mode), instead of silently corrupting state.
 */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Reflect.ownKeys(value)) {
      deepFreeze((value as Record<PropertyKey, unknown>)[key]);
    }
  }
  return value;
}
