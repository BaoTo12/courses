// Shared by Button and ButtonLink (13B.06). A plain module, not a component file: Fast Refresh (07.06).

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'md' | 'sm';

/** The design system's .btn modifiers as typed props: a typo like variant="primay" is a compile error. */
export interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** { variant: 'primary', size: 'sm' } → 'btn btn--primary btn--sm' (+ any extra class). */
export function buttonClasses({ variant = 'secondary', size = 'md' }: ButtonStyleProps, className?: string): string {
  return ['btn', `btn--${variant}`, size === 'sm' && 'btn--sm', className].filter(Boolean).join(' ');
}
