import { memo } from 'react';
import { useAppSelector } from '../../app/hooks';
import { TaskCard } from '../../components/TaskCard';
import { selectTaskById } from './taskSelectors';

interface TaskListItemProps {
  taskId: number;
  onToggle: (id: number) => void;
  onEditTitle: (id: number, title: string) => void;
}

/**
 * One card, connected by ID (21.11). It selects its own task, so:
 * - React.memo skips it when the parent re-renders with the same props (the id and two stable callbacks);
 * - useSelector re-renders it only when THIS task object changes (Immer keeps the others' identity).
 * Toggling one task re-renders one card, not the whole list.
 */
export const TaskListItem = memo(function TaskListItem({ taskId, onToggle, onEditTitle }: TaskListItemProps) {
  const task = useAppSelector((state) => selectTaskById(state, taskId));
  if (!task) return null; // deleted meanwhile: the parent's ids update in the same render pass
  return <TaskCard task={task} onToggle={onToggle} onEditTitle={onEditTitle} />;
});
