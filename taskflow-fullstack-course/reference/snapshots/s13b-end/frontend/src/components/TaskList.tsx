import type { Task } from '../domain/types';
import { ItemList } from './ItemList';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  tasks: readonly Task[];
  onToggle: (id: number) => void;
  onEditTitle: (id: number, title: string) => void;
}

export function TaskList({ tasks, onToggle, onEditTitle }: TaskListProps) {
  return (
    <ItemList
      items={tasks}
      className="task-grid"
      empty={<p className="text-muted">No tasks match this filter.</p>}
      renderItem={(task) => <TaskCard task={task} onToggle={onToggle} onEditTitle={onEditTitle} />}
    />
  );
}
