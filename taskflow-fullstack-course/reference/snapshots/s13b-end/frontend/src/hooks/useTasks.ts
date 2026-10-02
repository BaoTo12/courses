import { useCallback, useEffect, useReducer, useState } from 'react';
import { createTask, deleteTask, getTasks, patchTask, updateTask } from '../api/tasks';
import { toErrorMessage } from '../domain/guards';
import { initialTasksState, tasksReducer } from './tasks-reducer';
import type { CreateTaskRequest, UpdateTaskRequest } from '../domain/api-types';

/** Until pagination arrives (S23), the list loads the first 100 tasks: the API's maximum page size. */
const LIST_QUERY = { size: 100 } as const;

/**
 * Loads tasks from the API and exposes async operations.
 * Every write is "server first, then local state" (pessimistic): the UI shows only what the server accepted.
 * The operations THROW an ApiRequestError on failure: the caller decides how to tell the user.
 */
export function useTasks() {
  const [state, dispatch] = useReducer(tasksReducer, initialTasksState);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    dispatch({ type: 'fetchStarted' });

    getTasks(LIST_QUERY, controller.signal)
      .then((page) => dispatch({ type: 'fetchSucceeded', tasks: page.items }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return; // cancelled on purpose: not an error
        dispatch({ type: 'fetchFailed', error: toErrorMessage(error) });
      });

    return () => controller.abort(); // cleanup: runs before re-running and on unmount
  }, [reloadCount]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  const create = useCallback(async (request: CreateTaskRequest) => {
    const created = await createTask(request);
    dispatch({ type: 'taskAdded', task: created });
    return created;
  }, []);

  const update = useCallback(async (id: number, request: CreateTaskRequest) => {
    const saved = await updateTask(id, request);
    dispatch({ type: 'taskUpdated', task: saved });
    return saved;
  }, []);

  const patch = useCallback(async (id: number, changes: UpdateTaskRequest) => {
    const saved = await patchTask(id, changes);
    dispatch({ type: 'taskUpdated', task: saved });
    return saved;
  }, []);

  const remove = useCallback(async (id: number) => {
    await deleteTask(id);
    dispatch({ type: 'taskRemoved', id });
  }, []);

  return { state, reload, create, update, patch, remove };
}
