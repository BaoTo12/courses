import { skipToken } from '@reduxjs/toolkit/query/react';
import { useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { isNotFoundError } from '../api/api-error';
import { isPriority, toErrorMessage } from '../domain/guards';
import { PRIORITIES } from '../domain/types';
import { useDeleteTaskMutation, useGetTaskQuery, usePatchTaskMutation } from '../features/api/apiSlice';
import { useAuth } from '../auth/auth-context';
import { PriorityBadge, StatusBadge } from '../components/Badge';
import { Button } from '../components/Button';
import { PriorityBar } from '../components/styled/PriorityBar';
import { Stack } from '../components/styled/Stack';
import { backToListHref, parseTaskId } from './list-link';
import { NotFoundPage } from './NotFoundPage';
import { CommentsSection } from '../features/comments/CommentsSection';
import { rememberLastTask } from '../features/preferences/rememberedCookies';

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
  const [patchTask] = usePatchTaskMutation();
  const loadedId = task?.id;
  // 24.16: remember the last task this user OPENED (a session cookie), once it really loaded.
  useEffect(() => {
    if (loadedId !== undefined) rememberLastTask(loadedId);
  }, [loadedId]);

  if (id === null) return <NotFoundPage />;
  // Just deleted, navigation still pending (router updates are transitions, 13.13): show nothing meanwhile.
  if (deletion.isSuccess || deletion.isLoading) return null;
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

  function handleDelete() {
    if (!window.confirm(`Delete "${current.title}"? This cannot be undone.`)) return;
    // OPTIMISTIC (23.05): leave at once; the lists already hide the task. If the DELETE fails, the task comes back
    // (patch undo) and a listener shows the error toast. Leaving first also unsubscribes getTask(id), so its
    // invalidation removes the entry instead of refetching it: no more wasted GET → 404 (22.09).
    navigate(backHref, { replace: true }); // the deleted URL leaves history
    void deleteTask(current.id);
  }

  function handlePriority(value: string) {
    // OPTIMISTIC via patchTask (23.13): the badge changes now, and rolls back if the server refuses.
    if (isPriority(value) && value !== current.priority) void patchTask({ id: current.id, changes: { priority: value } });
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
        {user && (
          <label className="text-muted">
            Priority{' '}
            <select value={task.priority} onChange={(e) => handlePriority(e.target.value)}>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
        )}
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
          <Button size="sm" variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        )}
      </Stack>
      <CommentsSection taskId={task.id} />
    </article>
  );
}
