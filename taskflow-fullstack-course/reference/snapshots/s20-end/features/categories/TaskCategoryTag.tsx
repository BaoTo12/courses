import { useAppSelector } from '../../app/hooks';
import { Tag } from '../../components/styled/Tag';
import { selectCategoryById } from './categoriesSlice';

/**
 * The task's category, JOINED at render time (19.07): the task stores only `categoryId`;
 * the name and colour come from the categories slice. Renaming a category updates every card.
 */
export function TaskCategoryTag({ categoryId }: { categoryId: number | null }) {
  const category = useAppSelector((state) => selectCategoryById(state, categoryId));
  if (!category) return null; // uncategorised, or categories not loaded yet
  return <Tag label={category.name} color={category.color} />;
}
