import styled, { keyframes } from 'styled-components';
import type { DefaultTheme } from 'styled-components';

const SIZE = 72;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Threshold colours from the theme: danger below 34%, warning below 67%, success otherwise. */
function ringColor(percent: number, theme: DefaultTheme): string {
  if (percent < 34) return theme.colors.danger;
  if (percent < 67) return theme.colors.warning;
  return theme.colors.success;
}

const appear = keyframes`
  from { stroke-dashoffset: ${CIRCUMFERENCE}; }
`;

const Wrapper = styled.figure`
  position: relative;
  width: ${SIZE}px;
  height: ${SIZE}px;
  margin: 0;
`;

const Arc = styled.circle<{ $offset: number; $percent: number }>`
  fill: none;
  stroke: ${({ $percent, theme }) => ringColor($percent, theme)};
  stroke-width: ${STROKE};
  stroke-linecap: round;
  stroke-dasharray: ${CIRCUMFERENCE};
  stroke-dashoffset: ${({ $offset }) => $offset};
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke-dashoffset 300ms ease, stroke 300ms ease;
  animation: ${appear} 600ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
`;

const Label = styled.figcaption`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 0.875rem;
  font-weight: 600;
`;

interface ProgressRingProps {
  done: number;
  total: number;
}

export function ProgressRing({ done, total }: ProgressRingProps) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const offset = CIRCUMFERENCE * (1 - percent / 100);

  return (
    <Wrapper aria-label={`${percent}% of tasks done`} role="img">
      <svg width={SIZE} height={SIZE} aria-hidden="true">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={STROKE}
        />
        <Arc cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} $offset={offset} $percent={percent} />
      </svg>
      <Label aria-hidden="true">{percent}%</Label>
    </Wrapper>
  );
}
