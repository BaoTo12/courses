import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { PRIORITIES, TASK_STATUSES } from '../domain/types';
import { isPriority, isTaskStatus } from '../domain/guards';
import { statusLabel } from '../domain/labels';
import {
  DESCRIPTION_MAX,
  TITLE_MAX,
  hasErrors,
  localToday,
  validateTaskForm,
} from '../domain/task-form';
import type { TaskFormValues } from '../domain/task-form';
import { FormField } from './forms/FormField';
import { Button } from './Button';

interface TaskFormProps {
  initialValues: TaskFormValues;
  mode: 'create' | 'edit';
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
}

const PRIORITY_TEXT = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' } as const;

export function TaskForm({ initialValues, mode, onSubmit, onCancel }: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof TaskFormValues, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // for rendering (disabled button, label)
  const submittingRef = useRef(false); // synchronous guard: state updates are not visible until the next render

  // Derived, not state (08.05): errors are recomputed from the values on every render.
  const errors = validateTaskForm(values, localToday(), mode === 'create');
  const isDirty = (Object.keys(values) as (keyof TaskFormValues)[]).some(
    (key) => values[key] !== initialValues[key],
  );

  /** Type-safe single-field update: the value type follows the key (06.02). */
  function setField<K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  const markTouched = (field: keyof TaskFormValues) =>
    setTouched((current) => ({ ...current, [field]: true }));

  /** Show an error once the user has left the field, or after a submit attempt. */
  const visibleError = (field: keyof TaskFormValues) =>
    touched[field] || submitAttempted ? errors[field] : undefined;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // stop the browser's full-page form submission
    if (submittingRef.current) return; // a second click in the same frame sees the ref, not stale state
    setSubmitAttempted(true);
    if (hasErrors(errors)) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setValues(initialValues);
    setTouched({});
    setSubmitAttempted(false);
  }

  return (
    <form className="form" noValidate onSubmit={handleSubmit} aria-label={mode === 'create' ? 'New task' : 'Edit task'}>
      <FormField
        label="Title"
        error={visibleError('title')}
        help={`${values.title.trim().length}/${TITLE_MAX}`}
      >
        {(control) => (
          <input
            {...control}
            className="form-field__input"
            value={values.title}
            onChange={(e) => setField('title', e.target.value)}
            onBlur={() => markTouched('title')}
            maxLength={TITLE_MAX + 20}
            autoComplete="off"
          />
        )}
      </FormField>

      <FormField label="Description" error={visibleError('description')}>
        {(control) => (
          <textarea
            {...control}
            className="form-field__input"
            rows={3}
            value={values.description}
            onChange={(e) => setField('description', e.target.value)}
            onBlur={() => markTouched('description')}
            maxLength={DESCRIPTION_MAX}
          />
        )}
      </FormField>

      <FormField label="Status">
        {(control) => (
          <select
            {...control}
            className="form-field__input"
            value={values.status}
            onChange={(e) => {
              if (isTaskStatus(e.target.value)) setField('status', e.target.value);
            }}
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField label="Priority">
        {(control) => (
          <select
            {...control}
            className="form-field__input"
            value={values.priority}
            onChange={(e) => {
              if (isPriority(e.target.value)) setField('priority', e.target.value);
            }}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_TEXT[p]}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField label="Due date" error={visibleError('dueDate')} help="Optional">
        {(control) => (
          <input
            {...control}
            className="form-field__input"
            type="date"
            value={values.dueDate}
            onChange={(e) => setField('dueDate', e.target.value)}
            onBlur={() => markTouched('dueDate')}
          />
        )}
      </FormField>

      <div className="form__actions">
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create task' : 'Save changes'}
        </Button>
        <Button onClick={handleReset} disabled={!isDirty || isSubmitting}>
          Reset
        </Button>
        <Button onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        {isDirty && <span className="text-muted" aria-live="polite">Unsaved changes</span>}
      </div>
    </form>
  );
}
