import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';

export interface FieldControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

interface FormFieldProps {
  label: string;
  error?: string;
  help?: ReactNode;
  /** Render prop: receives the id/ARIA wiring for the actual control. */
  children: (control: FieldControlProps) => ReactElement;
}

/**
 * Label + control + help + error, wired together for assistive technology.
 * Uses the design system's .form-field classes (02.10) so it matches the JSP forms (S37).
 */
export function FormField({ label, error, help, children }: FormFieldProps) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`form-field${error ? ' form-field--error' : ''}`}>
      <label className="form-field__label" htmlFor={id}>
        {label}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {help && (
        <p className="form-field__help" id={helpId}>
          {help}
        </p>
      )}
      {error && (
        <p className="form-field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
