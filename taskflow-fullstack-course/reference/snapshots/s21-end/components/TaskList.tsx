import { TaskListItem } from '../features/tasks/TaskListItem';

interface TaskListProps {
  /** Ids only (21.11): each item selects its own task. */
  taskIds: readonly number[];
  onToggle: (id: number) => void;
  onEditTitle: (id: number, title: string) => void;
}

export function TaskList({ taskIds, onToggle, onEditTitle }: TaskListProps) {
  if (taskIds.length === 0) {
    return <p className="text-muted">No tasks match this filter.</p>;
  }

  return (
    <div className="task-grid">
      {taskIds.map((id) => (
        <TaskListItem key={id} taskId={id} onToggle={onToggle} onEditTitle={onEditTitle} />
      ))}
    </div>
  );
}
