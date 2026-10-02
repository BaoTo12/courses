import { useSearchParams } from 'react-router';
import { filterTasks } from '../domain/task-utils';
import { assertNever, isTaskStatus, toErrorMessage } from '../domain/guards';
import type { TaskStatus } from '../domain/types';
import { useDebounce } from '../hooks/useDebounce';
import { useTasksContext } from '../tasks/tasks-context';
import { useToast } from '../toast/toast-context';
import { FilterBar } from '../components/FilterBar';
import { SearchBox } from '../components/SearchBox';
import { TaskList } from '../components/TaskList';
import { Board } from '../components/Board';
import { Button } from '../components/Button';
import { ButtonLink } from '../components/ButtonLink';
import { ProgressRing } from '../components/styled/ProgressRing';
import { Stack } from '../components/styled/Stack';

type View = 'list' | 'board';

export function TasksPage() {
  const { state, reload, patch } = useTasksContext();
  const { show } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // The URL is the source of truth for filters (12.03). Parse and VALIDATE: the URL is user input.
  const rawStatus = searchParams.get('status');
  const statusFilter: TaskStatus | null = isTaskStatus(rawStatus) ? rawStatus : null;
  const view: View = searchParams.get('view') === 'board' ? 'board' : 'list';
  const q = searchParams.get('q') ?? '';

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

  // The input shows q immediately; filtering (and, in S13, the server request) uses a debounced copy.
  const debouncedQ = useDebounce(q, 300);

  /** Server first (PATCH), then the list updates. The toast reports what the server accepted. */
  async function handleToggle(id: number) {
    if (state.status !== 'succeeded') return;
    const task = state.data.find((t) => t.id === id);
    if (!task) return;
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    try {
      await patch(id, { status: nextStatus });
      if (nextStatus === 'DONE') show({ tone: 'success', message: `Completed: ${task.title}` });
    } catch (error) {
      show({ tone: 'error', message: toErrorMessage(error) });
    }
  }

  async function handleEditTitle(id: number, title: string) {
    if (state.status !== 'succeeded') return;
    const task = state.data.find((t) => t.id === id);
    if (!task || title.trim() === '' || title.trim() === task.title) return; // nothing to save
    try {
      await patch(id, { title });
    } catch (error) {
      show({ tone: 'error', message: toErrorMessage(error) });
    }
  }

  let content;
  switch (state.status) {
    case 'idle':
    case 'loading':
      content = <p className="text-muted">Loading tasks…</p>;
      break;
    case 'failed':
      content = (
        <div role="alert">
          <p className="text-danger">{state.error}</p>
          <Button onClick={reload}>Try again</Button>
        </div>
      );
      break;
    case 'succeeded': {
      const visible = filterTasks(state.data, { status: statusFilter ?? undefined, q: debouncedQ });
      content =
        view === 'list' ? (
          <>
            <FilterBar value={statusFilter} onChange={(s) => setParam('status', s)} />
            <TaskList tasks={visible} onToggle={handleToggle} onEditTitle={handleEditTitle} />
          </>
        ) : (
          <Board tasks={state.data} onToggle={handleToggle} onEditTitle={handleEditTitle} />
        );
      break;
    }
    default:
      content = assertNever(state);
  }

  return (
    <>
      <h1 className="page__title">
        Tasks {state.status === 'succeeded' && <span className="text-muted">({state.data.length})</span>}
      </h1>
      {state.status === 'succeeded' && (
        <Stack $direction="row" $gap={4} $align="center">
          <ProgressRing done={state.data.filter((t) => t.status === 'DONE').length} total={state.data.length} />
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
        <ButtonLink variant="primary" size="sm" to="/tasks/new">
          + New task
        </ButtonLink>
      </Stack>
      {view === 'list' && <SearchBox value={q} onChange={(value) => setParam('q', value)} />}
      <hr />
      {content}
    </>
  );
}
