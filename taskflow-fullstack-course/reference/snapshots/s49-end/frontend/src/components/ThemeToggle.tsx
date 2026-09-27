import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/theme-context';
import { Button } from './Button';

export function ThemeToggle() {
  const { preference, cycle } = useTheme();
  const { t } = useTranslation();
  const name = t(`theme.${preference}`); // S27: 'light' | 'dark' | 'system' → translated
  return (
    <Button size="sm" onClick={cycle} aria-label={t('theme.label', { name })}>
      {t('theme.button', { name })}
    </Button>
  );
}
