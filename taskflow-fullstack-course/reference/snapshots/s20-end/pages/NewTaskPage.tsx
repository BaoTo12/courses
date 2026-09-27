import { useNavigate } from 'react-router';
import { EMPTY_TASK_FORM, hasErrors, pickFormErrors, toCreateRequest } from '../domain/task-form';
import type { TaskFormValues } from '../domain/task-form';
import { toErrorMessage } from '../domain/guards';
import { fieldErrorsOf } from '../api/api-error';
import { useAppDispatch } from '../app/hooks';
import { saveNewTask } from '../features/tasks/tasksThunks';
import { useToast } from '../toast/toast-context';
import { TaskForm } from '../components/TaskForm';

export function NewTaskPage() {
  const dispatch = useAppDispatch();
  const { show } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(values: TaskFormValues) {
    try {
      // unwrap(): resolve with the created Task, or throw the rejection payload (20.09)
      const created = await dispatch(saveNewTask(toCreateRequest(values))).unwrap();
      show({ tone: 'success', message: `Created: ${created.title}` });
      // replace: the form page shouldn't stay in history (Back would re-open a submitted form)
      navigate(`/tasks/${created.id}`, { replace: true });
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
      <h1 className="page__title">New task</h1>
      <TaskForm mode="create" initialValues={EMPTY_TASK_FORM} onSubmit={handleSubmit} onCancel={() => navigate(-1)} />
    </>
  );
}
