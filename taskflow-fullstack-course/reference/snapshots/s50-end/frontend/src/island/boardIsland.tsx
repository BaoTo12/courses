// S49: the Kanban board as an island in /taskflow/react-board (ReactBoardServlet + react-board.jsp).
import { useCallback } from 'react';
import { useAppDispatch } from '../app/hooks';
import { Board } from '../components/Board';
import type { Page } from '../domain/api-types';
import type { Category, Task, User } from '../domain/types';
import { apiSlice, useGetTasksQuery } from '../features/api/apiSlice';
import { authApi } from '../features/auth/authApi';
import { toggleTask } from '../features/tasks/taskActions';
import { LIST_QUERY } from '../features/tasks/taskSelectors';
import { mountIsland, readInitialData } from './island';

/** What ReactBoardServlet puts in #board-data: the API's own shapes (the same DTOs). */
interface BoardData {
  user: User;
  tasks: Page<Task>;
  categories: Category[];
}

function BoardIsland() {
  // Subscribes to the SAME cache entry the server seeded: no request now; refetches after a toggle (tags, 22.08).
  useGetTasksQuery(LIST_QUERY);
  const dispatch = useAppDispatch();
  const handleToggle = useCallback((id: number) => void dispatch(toggleTask(id)), [dispatch]);
  const handleEditTitle = useCallback(
    (id: number, title: string) => void dispatch(apiSlice.endpoints.patchTask.initiate({ id, changes: { title } })),
    [dispatch],
  );
  return <Board onToggle={handleToggle} onEditTitle={handleEditTitle} />;
}

const data = readInitialData<BoardData>('board-data');

mountIsland('board-root', <BoardIsland />, (store) =>
  Promise.all([
    store.dispatch(apiSlice.util.upsertQueryData('getTasks', LIST_QUERY, data.tasks)),
    store.dispatch(apiSlice.util.upsertQueryData('getCategories', undefined, data.categories)),
    store.dispatch(authApi.util.upsertQueryData('getMe', undefined, data.user)),   // who is logged in: no /me call
  ]),
);
