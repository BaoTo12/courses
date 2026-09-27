import { useNavigate } from 'react-router';
import { EMPTY_TASK_FORM, hasErrors, pickFormErrors, toCreateRequest } from '../domain/task-form';
import type { TaskFormValues } from '../domain/task-form';
import { toErrorMessage } from '../domain/guards';
import { fieldErrorsOf } from '../api/api-error';
import { useAddTaskMutation } from '../features/api/apiSlice';
import { useToast } from '../toast/toast-context';
import { TaskForm } from '../components/TaskForm';

export function NewTaskPage() {
  // A mutation hook returns [trigger, result]. We only need the trigger: TaskForm shows its own
  // "saving" state while onSubmit's promise is pending.
  const [addTask] = useAddTaskMutation();
  const { show } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(values: TaskFormValues) {
    try {
      // unwrap(): resolves with the created Task, or throws the base query's error (22.07)
      const created = await addTask(toCreateRequest(values)).unwrap();
      // The success toast comes from a listener (21.15); the list refetches because addTask invalidates 'Task' (22.08).
      navigate(`/tasks/${created.id}`, { replace: true });
    } catch (error) {
      // A 400 with field errors (e.g. duplicate title) → show them in the form, not in a toast (19.09).
      // The error is our axiosBaseQuery's ApiErrorPayload (22.03).
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
