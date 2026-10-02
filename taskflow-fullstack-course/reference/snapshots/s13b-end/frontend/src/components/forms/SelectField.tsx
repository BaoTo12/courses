import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { isOneOf } from '../../domain/guards';
import { FormField } from './FormField';

/** Native <select> props we pass through. The ones SelectField controls itself are removed with Omit. */
type NativeSelectProps = Omit<
  ComponentPropsWithoutRef<'select'>,
  'value' | 'defaultValue' | 'onChange' | 'children' | 'id'
>;

interface SelectFieldProps<T extends string> extends NativeSelectProps {
  label: string;
  /** The allowed values, e.g. TASK_STATUSES. T is inferred from HERE. */
  options: readonly T[];
  /** NoInfer (TS 5.4): `value` must be one of the options; it can't widen T (13B.05). */
  value: NoInfer<T>;
  getLabel: (option: T) => string;
  /** Called only with a value that passed isOneOf: never with whatever the DOM happened to contain. */
  onChange: (value: T) => void;
  error?: string;
  help?: ReactNode;
}

/**
 * A GENERIC component (13B.05): one <select> for any string union. The type parameter flows from
 * `options` into `value`, `getLabel` and `onChange`, so <SelectField options={PRIORITIES} …/> hands
 * onChange a Priority, not a string.
 */
export function SelectField<T extends string>({
  label,
  options,
  value,
  getLabel,
  onChange,
  error,
  help,
  className,
  ...rest
}: SelectFieldProps<T>) {
  return (
    <FormField label={label} error={error} help={help}>
      {(control) => (
        <select
          {...rest}
          {...control}
          className={['form-field__input', className].filter(Boolean).join(' ')}
          value={value}
          onChange={(e) => {
            // e.target.value is a string from the DOM: validate it before it becomes a T (06.09)
            if (isOneOf(options, e.target.value)) onChange(e.target.value);
          }}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {getLabel(option)}
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
}
