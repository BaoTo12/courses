import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useTasksContext } from '../tasks/tasks-context';
import { useAuth } from '../auth/auth-context';
import { useToast } from '../toast/toast-context';
import { toErrorMessage } from '../domain/guards';
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
  const { state, remove } = useTasksContext();
  const { user } = useAuth();
  const { show } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const backHref = backToListHref(location.state);

  const id = parseTaskId(rawId);
  if (id === null) return <NotFoundPage />;

  if (state.status !== 'succeeded') {
    return <p className="text-muted">Loading…</p>;
  }

  const task = state.data.find((t) => t.id === id);
  // Just deleted: the list update renders BEFORE the navigation, because React Router wraps its
  // state updates in startTransition (lower priority). Show nothing rather than flashing the 404 (13.13).
  if (!task) return isDeleting ? null : <NotFoundPage />;
  const current = task; // a const the async handler can close over safely (05.07 §4)

  async function handleDelete() {
    if (!window.confirm(`Delete "${current.title}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await remove(current.id); // DELETE /api/tasks/{id} → 204
      show({ tone: 'success', message: `Deleted: ${current.title}` });
      navigate(backHref, { replace: true }); // the deleted task's URL shouldn't stay in history
    } catch (error) {
      show({ tone: 'error', message: toErrorMessage(error) });
      setIsDeleting(false);
    }
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
