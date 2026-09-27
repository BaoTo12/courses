import { memo } from 'react';
import type { Task } from '../domain/types';
import { TaskCard } from './TaskCard';

/**
 * S23: the list shows a server PAGE (23.07), so it receives the page's task objects, not ids to look up in
 * the app-wide list. `memo` compares each task by reference, and RTK Query's structural sharing keeps
 * unchanged tasks identical across refetches and optimistic patches (22.06): a toggle still re-renders one card.
 */
const MemoTaskCard = memo(TaskCard);

interface TaskListProps {
  tasks: readonly Task[];
  onToggle: (id: number) => void;
  onEditTitle: (id: number, title: string) => void;
  /** Hover → prefetch the details (23.08). */
  onHoverTask?: (id: number) => void;
}

export function TaskList({ tasks, onToggle, onEditTitle, onHoverTask }: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="text-muted">No tasks match this filter.</p>;
  }

  return (
    <div className="task-grid">
      {tasks.map((task) => (
        <div key={task.id} onMouseEnter={onHoverTask && (() => onHoverTask(task.id))}>
          <MemoTaskCard task={task} onToggle={onToggle} onEditTitle={onEditTitle} />
        </div>
      ))}
    </div>
  );
}
