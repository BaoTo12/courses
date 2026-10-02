import type { ReactNode } from 'react';
import { useTasks } from '../hooks/useTasks';
import { TasksContext } from './tasks-context';

/** One useTasks() instance for the whole app: pages share the same tasks (08.11). */
export function TasksProvider({ children }: { children: ReactNode }) {
  const tasks = useTasks();
  return <TasksContext.Provider value={tasks}>{children}</TasksContext.Provider>;
}
