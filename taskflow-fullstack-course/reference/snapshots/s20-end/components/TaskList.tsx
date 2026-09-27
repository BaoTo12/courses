import type { Task } from '../domain/types';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  tasks: readonly Task[];
  onToggle: (id: number) => void;
  onEditTitle: (id: number, title: string) => void;
}

export function TaskList({ tasks, onToggle, onEditTitle }: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="text-muted">No tasks match this filter.</p>;
  }

  return (
    <div className="task-grid">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} onToggle={onToggle} onEditTitle={onEditTitle} />
      ))}
    </div>
  );
}
