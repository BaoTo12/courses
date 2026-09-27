import { Link, useSearchParams } from 'react-router';
import { useAppSelector } from '../../app/hooks';
import { Tag } from '../../components/styled/Tag';
import { selectCategories, selectTaskCountsByCategory } from './categorySelectors';
import styles from './CategorySidebar.module.scss';

/**
 * 19.11: categories with task counts. Clicking one filters the list via `?category=` (the URL stays
 * the source of truth for filters, 12.03); the other query parameters are kept.
 */
export function CategorySidebar({ selected }: { selected: number | null }) {
  const categories = useAppSelector(selectCategories);
  const counts = useAppSelector(selectTaskCountsByCategory);
  const [searchParams] = useSearchParams();

  /** The current search string with `category` set (or removed for "All"). */
  function searchWith(categoryId: number | null): string {
    const next = new URLSearchParams(searchParams);
    if (categoryId === null) next.delete('category');
    else next.set('category', String(categoryId));
    const text = next.toString();
    return text === '' ? '' : `?${text}`;
  }

  if (categories.length === 0) return null;

  return (
    <nav aria-label="Categories">
      <ul className={styles.list}>
        <li>
          <Link to={{ search: searchWith(null) }} aria-current={selected === null ? 'true' : undefined}>
            All categories
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <Link to={{ search: searchWith(category.id) }} aria-current={selected === category.id ? 'true' : undefined}>
              <Tag label={category.name} color={category.color} />{' '}
              <span className="text-muted">{counts.byCategory[category.id] ?? 0}</span>
            </Link>
          </li>
        ))}
        {counts.uncategorized > 0 && <li className="text-muted">Uncategorised: {counts.uncategorized}</li>}
      </ul>
    </nav>
  );
}
