import { Link, useSearchParams } from 'react-router';
import { filterTasks } from '../domain/task-utils';
import { isTaskStatus, toErrorMessage } from '../domain/guards';
import type { TaskStatus } from '../domain/types';
import { useDebounce } from '../hooks/useDebounce';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectTasks, selectTasksError, selectTasksStatus } from '../features/tasks/tasksSlice';
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
  // Three selectors, three stable results: `selectTasks` is memoised (19.02), the others are primitives.
  const items = useAppSelector(selectTasks);
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

  /** The thunk does the PATCH, updates the store AND shows the toasts (18.12). */
  function handleToggle(id: number) {
    void dispatch(toggleTaskOnServer(id));
  }

  async function handleEditTitle(id: number, title: string) {
    const task = items.find((t) => t.id === id);
    if (!task || title.trim() === '' || title.trim() === task.title) return; // nothing to save
    try {
      await dispatch(saveTaskChanges({ id, changes: { title } })).unwrap();
    } catch (err) {
      show({ tone: 'error', message: toErrorMessage(err) });
    }
  }

  const hasData = status === 'succeeded' || items.length > 0;
  const doneCount = items.filter((t) => t.status === 'DONE').length;

  function handleClearCompleted() {
    if (!window.confirm(`Delete ${doneCount} completed task(s)? This cannot be undone.`)) return;
    void dispatch(clearCompleted()); // the thunk reports the result with a toast
  }

  const reload = () => void dispatch(fetchTasks());

  let content;
  if (status === 'failed' && items.length === 0) {
    content = (
      <div role="alert">
        <p className="text-danger">{error}</p>
        <Button onClick={reload}>Try again</Button>
      </div>
    );
  } else if (!hasData) {
    content = <p className="text-muted">Loading tasks…</p>;
  } else {
    const visible = filterTasks(items, {
      status: statusFilter ?? undefined,
      categoryId: categoryFilter ?? undefined,
      q: debouncedQ,
    });
    content =
      view === 'list' ? (
        <>
          <CategorySidebar selected={categoryFilter} />
          <FilterBar value={statusFilter} onChange={(s) => setParam('status', s)} />
          <TaskList tasks={visible} onToggle={handleToggle} onEditTitle={handleEditTitle} />
        </>
      ) : (
        <Board tasks={items} onToggle={handleToggle} onEditTitle={handleEditTitle} />
      );
  }

  return (
    <>
      <h1 className="page__title">
        Tasks {hasData && <span className="text-muted">({items.length})</span>}
        {status === 'loading' && hasData && <span className="text-muted"> · refreshing…</span>}
      </h1>
      {status === 'failed' && hasData && (
        <p role="alert" className="text-danger">
          Refresh failed: {error} <Button size="sm" onClick={reload}>Try again</Button>
        </p>
      )}
      {hasData && (
        <Stack $direction="row" $gap={4} $align="center">
          <ProgressRing done={doneCount} total={items.length} />
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
      </Stack>
      {view === 'list' && <SearchBox value={q} onChange={(value) => setParam('q', value)} />}
      <hr />
      {content}
    </>
  );
}
