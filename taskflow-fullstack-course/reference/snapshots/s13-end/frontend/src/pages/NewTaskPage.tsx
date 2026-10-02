import { useNavigate } from 'react-router';
import { EMPTY_TASK_FORM, toCreateRequest } from '../domain/task-form';
import type { TaskFormValues } from '../domain/task-form';
import { toErrorMessage } from '../domain/guards';
import { useTasksContext } from '../tasks/tasks-context';
import { useToast } from '../toast/toast-context';
import { TaskForm } from '../components/TaskForm';

export function NewTaskPage() {
  const { create } = useTasksContext();
  const { show } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(values: TaskFormValues) {
    try {
      const created = await create(toCreateRequest(values)); // POST /api/tasks → 201
      show({ tone: 'success', message: `Created: ${created.title}` });
      // replace: the form page shouldn't stay in history (Back would re-open a submitted form)
      navigate(`/tasks/${created.id}`, { replace: true });
    } catch (error) {
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
