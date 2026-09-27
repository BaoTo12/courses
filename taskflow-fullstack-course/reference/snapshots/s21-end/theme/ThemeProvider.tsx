import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ThemeContext, isThemePreference } from './theme-context';
import type { ThemeContextValue, ThemePreference } from './theme-context';
import { theme } from './theme';
import { GlobalStyle } from './GlobalStyle';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useLocalStorage<ThemePreference>(
    'taskflow.theme',
    'system',
    isThemePreference,
  );

  // Synchronise React state → the <html data-theme> attribute that the SCSS themes use (03.13).
  useEffect(() => {
    const root = document.documentElement;
    if (preference === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference);
    }
  }, [preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      setPreference,
      cycle: () =>
        setPreference((p) => (p === 'light' ? 'dark' : p === 'dark' ? 'system' : 'light')),
    }),
    [preference, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>
      {/* `theme` is a module constant: it never changes, so switching light/dark re-renders nothing. */}
      <StyledThemeProvider theme={theme}>
        <GlobalStyle />
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
}
