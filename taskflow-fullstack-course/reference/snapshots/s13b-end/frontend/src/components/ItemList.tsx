import { Fragment } from 'react';
import type { ReactNode } from 'react';
import type { HasId } from '../domain/types';

interface ItemListProps<T extends HasId> {
  items: readonly T[];
  /** Renders ONE item. ItemList adds the key (item.id), so a caller can't forget it (07.11). */
  renderItem: (item: T) => ReactNode;
  /** Shown instead of the list when there are no items. */
  empty: ReactNode;
  className?: string;
}

/**
 * A generic list (13B.08): works for tasks, categories, comments… anything with an id.
 * T is inferred from `items`, so `renderItem` receives a Task when given tasks.
 */
export function ItemList<T extends HasId>({ items, renderItem, empty, className }: ItemListProps<T>) {
  if (items.length === 0) return empty; // a component may return any ReactNode (React 19 types)

  return (
    <div className={className}>
      {items.map((item) => (
        <Fragment key={item.id}>{renderItem(item)}</Fragment>
      ))}
    </div>
  );
}
