import styled from 'styled-components';
import { contrastText, isSafeHexColor } from '../../domain/color';

const FALLBACK = '#64748b';

const Chip = styled.span<{ $bg: string; $fg: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
`;

interface TagProps {
  label: string;
  /** Comes from the API (category colour): untrusted, validated before it reaches CSS. */
  color: string;
}

export function Tag({ label, color }: TagProps) {
  const bg = isSafeHexColor(color) ? color : FALLBACK;
  return (
    <Chip $bg={bg} $fg={contrastText(bg)}>
      {label}
    </Chip>
  );
}
