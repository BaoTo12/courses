import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectTaskById, selectTasksStatus } from '../features/tasks/tasksSlice';
import { deleteTask } from '../features/tasks/tasksThunks';
import { useAuth } from '../auth/auth-context';
import { PriorityBadge, StatusBadge } from '../components/Badge';
import { Button } from '../components/Button';
import { PriorityBar } from '../components/styled/PriorityBar';
import { Stack } from '../components/styled/Stack';
import { backToListHref, parseTaskId } from './list-link';
import { NotFoundPage } from './NotFoundPage';

export function TaskDetailsPage() {
  const { id: rawId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const backHref = backToListHref(location.state);

  const id = parseTaskId(rawId);
  const task = useAppSelector((state) => (id === null ? undefined : selectTaskById(state, id)));
  const status = useAppSelector(selectTasksStatus);

  if (id === null) return <NotFoundPage />;
  if (!task && (status === 'idle' || status === 'loading')) {
    return <p className="text-muted">Loading…</p>;
  }

  // Just deleted: the list update renders BEFORE the navigation, because React Router wraps its
  // state updates in startTransition (lower priority). Show nothing rather than flashing the 404 (13.13).
  if (!task) return isDeleting ? null : <NotFoundPage />;
  const current = task; // a const the async handler can close over safely (05.07 §4)

  async function handleDelete() {
    if (!window.confirm(`Delete "${current.title}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    // The thunk deletes on the server, updates the store and shows the toast. createAsyncThunk resolves
    // with the final ACTION (always truthy!): ask which one it was with .match() (20.09).
    const result = await dispatch(deleteTask(current.id));
    if (deleteTask.fulfilled.match(result)) navigate(backHref, { replace: true }); // the deleted URL leaves history
    else setIsDeleting(false);
  }

  return (
    <article>
      <nav aria-label="Breadcrumb" className="text-muted">
        <Link to={backHref}>Tasks</Link> › <span aria-current="page">{task.title}</span>
      </nav>
      <h1 className="page__title">{task.title}</h1>
      <Stack $direction="row" $gap={2} $align="center">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
        <PriorityBar priority={task.priority} />
      </Stack>
      <p>{task.description || <span className="text-muted">No description.</span>}</p>
      <p className="text-muted">Due: {task.dueDate ?? 'no due date'}</p>
      <Stack $direction="row" $gap={2}>
        <Link className="btn btn--primary btn--sm" to={`/tasks/${task.id}/edit`} state={location.state}>
          Edit
        </Link>
        <Link className="btn btn--secondary btn--sm" to={backHref}>
          Back to list
        </Link>
        {/* Hidden for anonymous users: UX only. The API decides who may delete (12.07). */}
        {user && (
          <Button size="sm" variant="danger" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        )}
      </Stack>
    </article>
  );
}
