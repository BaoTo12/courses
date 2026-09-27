import { createContext, useContext } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const satisfies readonly ThemePreference[];

export const isThemePreference = (value: unknown): value is ThemePreference =>
  typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);

export interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  cycle: () => void;
}

/** `null` default = "no provider above me", which useTheme turns into a clear error. */
export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return context;
}
