import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import { isTaskStatus, toErrorMessage } from '../domain/guards';
import type { TaskStatus } from '../domain/types';
import { useDebounce } from '../hooks/useDebounce';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectTasksError, selectTasksStatus } from '../features/tasks/tasksSlice';
import { selectTaskStats, selectVisibleTaskIds } from '../features/tasks/taskListSelectors';
import { SortControl } from '../features/listPrefs/SortControl';
import { clearCompleted, fetchTasks, saveTaskChanges, toggleTaskOnServer } from '../features/tasks/tasksThunks';
import { useToast } from '../toast/toast-context';
import { useAuth } from '../auth/auth-context';
import { CategorySidebar } from '../features/categories/CategorySidebar';
import { parseCategoryParam } from './list-link';
import { FilterBar } from '../components/FilterBar';
import { SearchBox } from '../components/SearchBox';
import { TaskList } from '../components/TaskList';
import { Board } from '../components/Board';
import { Button } from '../components/Button';
import { ProgressRing } from '../components/styled/ProgressRing';
import { Stack } from '../components/styled/Stack';

type View = 'list' | 'board';

export function TasksPage() {
  // Stable results only (21.05): memoised stats, and primitives. The ids are selected below, with the filters.
  const stats = useAppSelector(selectTaskStats);
  const status = useAppSelector(selectTasksStatus);
  const error = useAppSelector(selectTasksError);
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { show } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // The URL is the source of truth for filters (12.03). Parse and VALIDATE: the URL is user input.
  const rawStatus = searchParams.get('status');
  const statusFilter: TaskStatus | null = isTaskStatus(rawStatus) ? rawStatus : null;
  const view: View = searchParams.get('view') === 'board' ? 'board' : 'list';
  const q = searchParams.get('q') ?? '';
  const categoryFilter = parseCategoryParam(searchParams.get('category'));

  /** Update one query parameter, keeping the others. replace: filter tweaks shouldn't flood history. */
  function setParam(name: string, value: string | null) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === null || value === '') next.delete(name);
        else next.set(name, value);
        return next;
      },
      { replace: true },
    );
  }

  // The input shows q immediately; filtering uses a debounced copy (08.12).
  const debouncedQ = useDebounce(q, 300);

  // The ids to show: filters from the URL passed as an ARGUMENT (21.06). A new object each render is fine:
  // the selector's input selectors extract primitives (21.09).
  const visibleIds = useAppSelector((state) =>
    selectVisibleTaskIds(state, {
      status: statusFilter ?? undefined,
      categoryId: categoryFilter ?? undefined,
      q: debouncedQ,
    }),
  );

  // STABLE callbacks (useCallback, 21.10): they're props of every memoised TaskListItem.
  // A new function on each render would defeat React.memo and re-render every card.
  /** The thunk does the PATCH, updates the store AND shows the toasts (18.12). */
  const handleToggle = useCallback((id: number) => void dispatch(toggleTaskOnServer(id)), [dispatch]);

  const handleEditTitle = useCallback(
    async (id: number, title: string) => {
      try {
        await dispatch(saveTaskChanges({ id, changes: { title } })).unwrap();
      } catch (err) {
        show({ tone: 'error', message: toErrorMessage(err) });
      }
    },
    [dispatch, show],
  );

  const hasData = status === 'succeeded' || stats.total > 0;
  const doneCount = stats.done;

  function handleClearCompleted() {
    if (!window.confirm(`Delete ${doneCount} completed task(s)? This cannot be undone.`)) return;
    void dispatch(clearCompleted()); // the thunk reports the result with a toast
  }

  const reload = () => void dispatch(fetchTasks());

  let content;
  if (status === 'failed' && stats.total === 0) {
    content = (
      <div role="alert">
        <p className="text-danger">{error}</p>
        <Button onClick={reload}>Try again</Button>
      </div>
    );
  } else if (!hasData) {
    content = <p className="text-muted">Loading tasks…</p>;
  } else {
    content =
      view === 'list' ? (
        <>
          <CategorySidebar selected={categoryFilter} />
          <FilterBar value={statusFilter} onChange={(s) => setParam('status', s)} />
          <TaskList taskIds={visibleIds} onToggle={handleToggle} onEditTitle={handleEditTitle} />
        </>
      ) : (
        <Board onToggle={handleToggle} onEditTitle={handleEditTitle} />
      );
  }

  return (
    <>
      <h1 className="page__title">
        Tasks {hasData && <span className="text-muted">({stats.total})</span>}
        {status === 'loading' && hasData && <span className="text-muted"> · refreshing…</span>}
      </h1>
      {status === 'failed' && hasData && (
        <p role="alert" className="text-danger">
          Refresh failed: {error} <Button size="sm" onClick={reload}>Try again</Button>
        </p>
      )}
      {hasData && (
        <Stack $direction="row" $gap={4} $align="center">
          <ProgressRing done={stats.done} total={stats.total} />
          <span className="text-muted">tasks done</span>
        </Stack>
      )}
      <Stack $direction="row" $gap={2} $align="center" $wrap>
        <div role="group" aria-label="View">
          <Button size="sm" variant={view === 'list' ? 'primary' : 'secondary'} onClick={() => setParam('view', null)}>
            List
          </Button>
          <Button size="sm" variant={view === 'board' ? 'primary' : 'secondary'} onClick={() => setParam('view', 'board')}>
            Board
          </Button>
        </div>
        <Link className="btn btn--primary btn--sm" to="/tasks/new">
          + New task
        </Link>
        {user && doneCount > 0 && (
          <Button size="sm" variant="danger" onClick={handleClearCompleted}>
            Clear completed ({doneCount})
          </Button>
        )}
        <SortControl />
      </Stack>
      {view === 'list' && <SearchBox value={q} onChange={(value) => setParam('q', value)} />}
      <hr />
      {content}
    </>
  );
}
