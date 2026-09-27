import { useLocation, useNavigate, useParams } from 'react-router';
import { hasErrors, pickFormErrors, toCreateRequest, toFormValues } from '../domain/task-form';
import type { TaskFormValues } from '../domain/task-form';
import { toErrorMessage } from '../domain/guards';
import { fieldErrorsOf } from '../api/api-error';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectTaskById, selectTasksStatus } from '../features/tasks/tasksSlice';
import { saveTask } from '../features/tasks/tasksThunks';
import { useToast } from '../toast/toast-context';
import { TaskForm } from '../components/TaskForm';
import { parseTaskId } from './list-link';
import { NotFoundPage } from './NotFoundPage';

export function EditTaskPage() {
  const { id: rawId } = useParams();
  const dispatch = useAppDispatch();
  const { show } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const id = parseTaskId(rawId);
  // Hooks run before any early return (08.01): select with a possibly-null id.
  const task = useAppSelector((state) => (id === null ? undefined : selectTaskById(state, id)));
  const status = useAppSelector(selectTasksStatus);

  if (id === null) return <NotFoundPage />;
  if (!task && (status === 'idle' || status === 'loading')) return <p className="text-muted">Loading…</p>;
  if (!task) return <NotFoundPage />;
  const existing = task; // a const the async handler can close over safely (05.07 §4)

  async function handleSubmit(values: TaskFormValues) {
    try {
      const saved = await dispatch(
        saveTask({ id: existing.id, request: toCreateRequest(values, existing.categoryId) }), // PUT
      ).unwrap();
      show({ tone: 'success', message: `Saved: ${saved.title}` });
      navigate(`/tasks/${saved.id}`, { replace: true, state: location.state });
    } catch (error) {
      // A 400 with field errors (e.g. duplicate title) → show them in the form, not in a toast (19.09).
      // unwrap() rejects with the rejectWithValue payload: a plain ApiErrorPayload (20.09)
      const fieldErrors = pickFormErrors(fieldErrorsOf(error) ?? {});
      if (hasErrors(fieldErrors)) return fieldErrors;
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
