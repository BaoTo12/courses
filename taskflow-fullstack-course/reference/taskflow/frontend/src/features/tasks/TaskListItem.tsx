import { memo } from 'react';
import { useAppSelector } from '../../app/hooks';
import { TaskCard } from '../../components/TaskCard';
import { selectTaskById } from './taskSelectors';
import { authApi } from '../auth/authApi';

const selectMe = authApi.endpoints.getMe.select();

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
  // S51: who am I? (the getMe cache entry). A boolean: this card re-renders only when the answer changes.
  const readOnly = useAppSelector((state) => {
    const me = selectMe(state).data;
    return task !== undefined && me != null && me.role !== 'ADMIN' && task.ownerId !== me.id;
  });
  if (!task) return null; // deleted meanwhile: the parent's ids update in the same render pass
  return <TaskCard task={task} onToggle={onToggle} onEditTitle={onEditTitle} readOnly={readOnly} />;
});
