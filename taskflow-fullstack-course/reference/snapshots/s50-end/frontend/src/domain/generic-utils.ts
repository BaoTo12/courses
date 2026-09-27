import type { HasId } from './types';

/** Find an entity by id in any list of things that have an id. */
export function findById<T extends HasId>(items: readonly T[], id: number): T | undefined {
  return items.find((item) => item.id === id);
}

/** Index a list by id: [{id:1,…}] → { 1: {id:1,…} } */
export function indexById<T extends HasId>(items: readonly T[]): Record<number, T> {
  const byId: Record<number, T> = {};
  for (const item of items) {
    byId[item.id] = item;
  }
  return byId;
}

/** Group by the value of a property. Keys only exist for values that occur. (06.12) */
export function groupBy<T, K extends keyof T>(
  items: readonly T[],
  key: K,
): Map<T[K], T[]> {
  const groups = new Map<T[K], T[]>();
  for (const item of items) {
    const groupKey = item[key];
    const group = groups.get(groupKey);
    if (group) {
      group.push(item);
    } else {
      groups.set(groupKey, [item]);
    }
  }
  return groups;
}
