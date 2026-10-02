import { useLocation, useNavigate, useParams } from 'react-router';
import { toCreateRequest, toFormValues } from '../domain/task-form';
import type { TaskFormValues } from '../domain/task-form';
import { toErrorMessage } from '../domain/guards';
import { useTasksContext } from '../tasks/tasks-context';
import { useToast } from '../toast/toast-context';
import { TaskForm } from '../components/TaskForm';
import { parseTaskId } from './list-link';
import { NotFoundPage } from './NotFoundPage';

export function EditTaskPage() {
  const { id: rawId } = useParams();
  const { state, update } = useTasksContext();
  const { show } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const id = parseTaskId(rawId);
  if (id === null) return <NotFoundPage />;
  if (state.status !== 'succeeded') return <p className="text-muted">Loading…</p>;

  const task = state.data.find((t) => t.id === id);
  if (!task) return <NotFoundPage />;
  const existing = task; // a const the async handler can close over safely (05.07 §4)

  async function handleSubmit(values: TaskFormValues) {
    try {
      const saved = await update(existing.id, toCreateRequest(values, existing.categoryId)); // PUT
      show({ tone: 'success', message: `Saved: ${saved.title}` });
      navigate(`/tasks/${saved.id}`, { replace: true, state: location.state });
    } catch (error) {
      show({ tone: 'error', message: toErrorMessage(error) });
    }
  }

  return (
    <>
      <h1 className="page__title">Edit task</h1>
      <TaskForm
        key={task.id}
        mode="edit"
        initialValues={toFormValues(task)}
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    </>
  );
}
