import styled, { css } from 'styled-components';

type Variant = 'primary' | 'secondary' | 'danger';
type Size = 'md' | 'sm';

// Transient props ($-prefixed) are used for styling and NOT forwarded to the DOM.
interface StyledButtonProps {
  $variant?: Variant;
  $size?: Size;
}

const variantStyles = {
  primary: css`
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.onPrimary};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.colors.primaryHover};
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.border};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.colors.surfaceMuted};
    }
  `,
  danger: css`
    background: ${({ theme }) => theme.colors.danger};
    color: ${({ theme }) => theme.colors.onPrimary};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.colors.dangerHover};
    }
  `,
} satisfies Record<Variant, ReturnType<typeof css>>;

/** A styled-components version of the design-system button, for comparison (09.05). */
export const StyledButton = styled.button.attrs({ type: 'button' })<StyledButtonProps>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-weight: 500;
  line-height: 1.25;
  cursor: pointer;
  transition: background-color 150ms ease;
  padding: ${({ $size = 'md' }) => ($size === 'sm' ? '4px 12px' : '8px 16px')};
  font-size: ${({ $size = 'md' }) => ($size === 'sm' ? '0.75rem' : '0.875rem')};

  ${({ $variant = 'secondary' }) => variantStyles[$variant]}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
