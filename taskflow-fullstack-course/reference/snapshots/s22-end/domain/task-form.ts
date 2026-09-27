import type { IsoDate, Priority, Task, TaskStatus } from './types';
import type { CreateTaskRequest } from './api-types';

/** What the form edits. Every field is what an <input>/<select> actually holds: strings and unions. */
export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  /** '' means "no due date" (an empty date input), converted to null on submit. */
  dueDate: IsoDate | '';
}

export type TaskFormErrors = Partial<Record<keyof TaskFormValues, string>>;

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 2000;

export const EMPTY_TASK_FORM: TaskFormValues = {
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: '',
};

export function toFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ?? '',
  };
}

/**
 * Pure validation. `today` is a parameter (05.12): testable, and the caller decides the time zone.
 * `isNew`: a due date in the past is only rejected when creating (editing an old task is fine).
 */
export function validateTaskForm(
  values: TaskFormValues,
  today: IsoDate,
  isNew: boolean,
): TaskFormErrors {
  const errors: TaskFormErrors = {};
  const title = values.title.trim();

  if (title === '') {
    errors.title = 'Title is required.';
  } else if (title.length > TITLE_MAX) {
    errors.title = `Title must be at most ${TITLE_MAX} characters.`;
  }

  if (values.description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be at most ${DESCRIPTION_MAX} characters.`;
  }

  if (values.dueDate !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(values.dueDate)) {
    errors.dueDate = 'Use the date picker (YYYY-MM-DD).';
  } else if (isNew && values.dueDate !== '' && values.dueDate < today) {
    errors.dueDate = 'Due date cannot be in the past.';
  }

  return errors;
}

export const hasErrors = (errors: TaskFormErrors) => Object.keys(errors).length > 0;

/** Form values → the API request shape (06.04): trimmed, '' → null. */
export function toCreateRequest(values: TaskFormValues, categoryId: number | null = null): CreateTaskRequest {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate === '' ? null : values.dueDate,
    categoryId,
  };
}

/** Local "today" as YYYY-MM-DD (not UTC; see 05.12). */
export function localToday(): IsoDate {
  return new Date().toLocaleDateString('en-CA');
}

const FORM_FIELDS: readonly (keyof TaskFormValues)[] = ['title', 'description', 'status', 'priority', 'dueDate'];

/**
 * Server field errors (a 400's `fieldErrors`, 13.07) → form errors (19.09).
 * Keeps only keys the form knows: the server's object is untrusted input and may contain anything.
 */
export function pickFormErrors(fieldErrors: Readonly<Record<string, string>>): TaskFormErrors {
  const errors: TaskFormErrors = {};
  for (const field of FORM_FIELDS) {
    const message = fieldErrors[field];
    if (message) errors[field] = message.charAt(0).toUpperCase() + message.slice(1) + '.';
  }
  return errors;
}
