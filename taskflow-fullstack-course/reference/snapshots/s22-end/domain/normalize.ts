import type { HasId } from './types';

/**
 * Normalised collection (19.05): ids keep the ORDER; entities give O(1) lookups by id.
 * One copy of each item, referenced by id everywhere else.
 */
export interface Normalized<T extends HasId> {
  ids: number[];
  entities: Record<number, T>;
}

export function normalize<T extends HasId>(items: readonly T[]): Normalized<T> {
  const entities: Record<number, T> = {};
  for (const item of items) entities[item.id] = item;
  return { ids: items.map((item) => item.id), entities };
}

/** Back to an ordered array (skips ids without an entity, which would be a reducer bug). */
export function denormalize<T extends HasId>({ ids, entities }: Normalized<T>): T[] {
  return ids.map((id) => entities[id]).filter((item): item is T => item !== undefined);
}
