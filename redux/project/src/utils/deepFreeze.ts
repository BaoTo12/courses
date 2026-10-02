// 🧩 02.1: deepFreeze (lecture 02, step 1). Replace this function.

export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;

  Object.freeze(value)
  for (const inner of Object.values(value)) {
    deepFreeze(inner);
  }
  return value;
}