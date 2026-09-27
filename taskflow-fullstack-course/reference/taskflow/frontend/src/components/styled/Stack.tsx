import styled from 'styled-components';

interface StackProps {
  $direction?: 'row' | 'column';
  $gap?: number; // spacing scale step: 4px × n (same scale as SCSS space(), 03.04)
  $align?: 'start' | 'center' | 'end' | 'stretch';
  $justify?: 'start' | 'center' | 'end' | 'space-between';
  $wrap?: boolean;
}

/** Layout primitive: flexbox with spacing-scale gaps. Polymorphic via `as` (09.08). */
export const Stack = styled.div<StackProps>`
  display: flex;
  flex-direction: ${({ $direction = 'column' }) => $direction};
  gap: ${({ $gap = 2 }) => $gap * 4}px;
  align-items: ${({ $align = 'stretch' }) => $align};
  justify-content: ${({ $justify = 'start' }) => $justify};
  flex-wrap: ${({ $wrap = false }) => ($wrap ? 'wrap' : 'nowrap')};
`;
