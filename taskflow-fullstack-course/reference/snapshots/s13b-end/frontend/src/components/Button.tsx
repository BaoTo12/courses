import type { ComponentPropsWithRef } from 'react';
import { buttonClasses } from './button-classes';
import type { ButtonStyleProps } from './button-classes';

/**
 * Every prop a native <button> accepts, INCLUDING `ref` (a plain prop since React 19: no forwardRef),
 * plus the design system's style props (13B.06).
 */
export type ButtonProps = ComponentPropsWithRef<'button'> & ButtonStyleProps;

/** Wraps the design system's .btn classes (styles/components/_button.scss). */
export function Button({ variant, size, type = 'button', className, ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size }, className)} {...rest} />;
}
