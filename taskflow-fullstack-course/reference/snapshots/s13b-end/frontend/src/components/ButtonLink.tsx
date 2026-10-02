import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { buttonClasses } from './button-classes';
import type { ButtonStyleProps } from './button-classes';

/**
 * A navigation that LOOKS like a button (12.02 §7): React Router's own Link props, read from the component
 * itself with ComponentProps<typeof Link>, plus our style props (13B.06). No Link prop is retyped by hand.
 */
export type ButtonLinkProps = ComponentProps<typeof Link> & ButtonStyleProps;

export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, size }, className)} {...rest} />;
}
