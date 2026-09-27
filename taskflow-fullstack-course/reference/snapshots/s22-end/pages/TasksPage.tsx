import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import { isTaskStatus, toErrorMessage } from '../domain/guards';
import type { TaskStatus } from '../domain/types';
import { useDebounce } from '../hooks/useDebounce';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { apiSlice, useClearCompletedMutation, useGetTasksQuery } from '../features/api/apiSlice';
import { LIST_QUERY } from '../features/tasks/taskSelectors';
import { selectCompletedTaskIds, selectTaskStats, selectVisibleTaskIds } from '../features/tasks/taskListSelectors';
import { toggleTask } from '../features/tasks/taskActions';
import { SortControl } from '../features/listPrefs/SortControl';
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
  // The list's cache entry (22.05): isLoading = first load, no data yet; isFetching = ANY request in flight.
  // The same argument as AppLayout's subscription → the same cache entry, no second request (22.02).
  const { isLoading, isFetching, isError, error, refetch } = useGetTasksQuery(LIST_QUERY);
  // Stable results only (21.05): memoised stats and ids. They read the same cache entry.
  const stats = useAppSelector(selectTaskStats);
  const completedIds = useAppSelector(selectCompletedTaskIds);
  const [clearCompleted] = useClearCompletedMutation();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
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
  // The mutations run through dispatch (22.09): stable callbacks, success/error toasts from listeners.
  const handleToggle = useCallback((id: number) => dispatch(toggleTask(id)), [dispatch]);
  const handleEditTitle = useCallback(
    (id: number, title: string) => void dispatch(apiSlice.endpoints.patchTask.initiate({ id, changes: { title } })),
    [dispatch],
  );

  const hasData = stats.total > 0 || !isLoading;
  const doneCount = completedIds.length;

  function handleClearCompleted() {
    if (!window.confirm(`Delete ${doneCount} completed task(s)? This cannot be undone.`)) return;
    void clearCompleted(completedIds); // a listener reports the result with a toast
  }

  const reload = () => void refetch();

  let content;
  if (isError && stats.total === 0) {
    content = (
      <div role="alert">
        <p className="text-danger">{toErrorMessage(error)}</p>
        <Button onClick={reload}>Try again</Button>
      </div>
    );
  } else if (isLoading) {
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
        {isFetching && !isLoading && <span className="text-muted"> · refreshing…</span>}
      </h1>
      {isError && stats.total > 0 && (
        <p role="alert" className="text-danger">
          Refresh failed: {toErrorMessage(error)} <Button size="sm" onClick={reload}>Try again</Button>
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
