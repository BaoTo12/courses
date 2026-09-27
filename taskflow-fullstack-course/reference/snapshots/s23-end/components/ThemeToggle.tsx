import { useTheme } from '../theme/theme-context';
import { Button } from './Button';

const LABEL = { light: 'Light', dark: 'Dark', system: 'System' } as const;

export function ThemeToggle() {
  const { preference, cycle } = useTheme();
  return (
    <Button size="sm" onClick={cycle} aria-label={`Theme: ${LABEL[preference]}. Click to change.`}>
      Theme: {LABEL[preference]}
    </Button>
  );
}
