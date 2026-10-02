// 13B.09 solution tests: runtime markup + compile-time checks (tsc -b type-checks this file).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Category } from '../domain/types';
import { ItemList } from './ItemList';

const categories: Category[] = [
  { id: 1, name: 'Work', color: '#4f46e5' },
  { id: 2, name: 'Home', color: '#16a34a' },
];

describe('ItemList<T> (13B.08)', () => {
  it('renders each item in order inside the wrapper', () => {
    const html = renderToStaticMarkup(
      <ItemList items={categories} className="chips" empty={<p>None</p>} renderItem={(c) => <span>{c.name}</span>} />,
    );
    expect(html).toBe('<div class="chips"><span>Work</span><span>Home</span></div>');
  });

  it('renders `empty` (and no wrapper) for an empty list', () => {
    const html = renderToStaticMarkup(<ItemList items={[]} empty={<p>None</p>} renderItem={() => null} />);
    expect(html).toBe('<p>None</p>');
  });

  it('infers T from items and rejects items without an id', () => {
    const check = () => (
      <>
        <ItemList
          items={categories}
          empty={null}
          renderItem={(category) => {
            expectTypeOf(category).toEqualTypeOf<Category>();
            return category.name;
          }}
        />
        {/* @ts-expect-error: { name } has no id, so it doesn't satisfy T extends HasId */}
        <ItemList items={[{ name: 'no id' }]} empty={null} renderItem={() => null} />
      </>
    );
    expect(check).toBeTypeOf('function');
  });
});
