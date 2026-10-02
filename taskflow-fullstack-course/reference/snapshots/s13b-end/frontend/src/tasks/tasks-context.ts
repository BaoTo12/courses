import { createContext, useContext } from 'react';
import type { useTasks } from '../hooks/useTasks';

/** Everything useTasks() returns, shared with every page (replaced by Redux in S17). */
export type TasksContextValue = ReturnType<typeof useTasks>;

export const TasksContext = createContext<TasksContextValue | null>(null);

export function useTasksContext(): TasksContextValue {
  const context = useContext(TasksContext);
  if (context === null) {
    throw new Error('useTasksContext must be used inside <TasksProvider>');
  }
  return context;
}
