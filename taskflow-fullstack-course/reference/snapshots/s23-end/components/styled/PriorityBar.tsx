import styled from 'styled-components';
import type { Priority } from '../../domain/types';

const PRIORITY_LEVEL: Record<Priority, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

const Track = styled.div`
  display: flex;
  gap: 2px;
  width: 48px;
  height: 6px;
`;

const Segment = styled.span<{ $filled: boolean; $priority: Priority }>`
  flex: 1;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ $filled, $priority, theme }) =>
    $filled ? theme.colors.priority[$priority] : theme.colors.border};
  transition: background-color 150ms ease;
`;

/** Three segments, filled according to priority, in the priority colour (from the theme). */
export function PriorityBar({ priority }: { priority: Priority }) {
  const level = PRIORITY_LEVEL[priority];
  return (
    <Track role="img" aria-label={`Priority: ${priority.toLowerCase()}`}>
      {[1, 2, 3].map((n) => (
        <Segment key={n} $filled={n <= level} $priority={priority} />
      ))}
    </Track>
  );
}
