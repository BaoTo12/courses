import { skipToken } from '@reduxjs/toolkit/query/react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { isNotFoundError } from '../api/api-error';
import { toErrorMessage } from '../domain/guards';
import { useDeleteTaskMutation, useGetTaskQuery } from '../features/api/apiSlice';
import { useAuth } from '../auth/auth-context';
import { PriorityBadge, StatusBadge } from '../components/Badge';
import { Button } from '../components/Button';
import { PriorityBar } from '../components/styled/PriorityBar';
import { Stack } from '../components/styled/Stack';
import { backToListHref, parseTaskId } from './list-link';
import { NotFoundPage } from './NotFoundPage';
import { CommentsSection } from '../features/comments/CommentsSection';

export function TaskDetailsPage() {
  const { id: rawId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const backHref = backToListHref(location.state);

  const id = parseTaskId(rawId);
  // Its OWN cache entry (getTask(id)): a direct visit to /tasks/5 works without the list (22.09).
  const { data: task, isLoading, error } = useGetTaskQuery(id ?? skipToken);
  const [deleteTask, deletion] = useDeleteTaskMutation();

  if (id === null) return <NotFoundPage />;
  // Just deleted: deleteTask invalidates 'Task', so this page's getTask refetches and gets a 404 while the
  // navigation is still pending (React Router's updates are transitions, 13.13). Show nothing meanwhile.
  if (deletion.isSuccess) return null;
  if (isNotFoundError(error)) return <NotFoundPage />;
  if (isLoading) return <p className="text-muted">Loading…</p>;
  if (!task) {
    return (
      <p role="alert" className="text-danger">
        {toErrorMessage(error)}
      </p>
    );
  }
  const current = task; // a const the async handler can close over safely (05.07 §4)

  async function handleDelete() {
    if (!window.confirm(`Delete "${current.title}"? This cannot be undone.`)) return;
    try {
      await deleteTask(current.id).unwrap(); // throws on failure (22.07)
      navigate(backHref, { replace: true }); // the deleted URL leaves history
    } catch {
      // Nothing to do here: a listener shows the error toast (22.09), and the page stays.
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
          <Button size="sm" variant="danger" onClick={handleDelete} disabled={deletion.isLoading}>
            {deletion.isLoading ? 'Deleting…' : 'Delete'}
          </Button>
        )}
      </Stack>
      <CommentsSection taskId={task.id} />
    </article>
  );
}
