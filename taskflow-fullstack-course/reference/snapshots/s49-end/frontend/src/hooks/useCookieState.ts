import { useCallback, useState } from 'react';
import type { SetStateAction } from 'react';
import { readCookie, writeCookie } from '../api/cookies';
import type { PrefCookie } from '../api/cookies';

/**
 * S24 (24.06): useState that persists to a preference cookie, for string unions like the theme.
 * Same shape as S09's useLocalStorage, so the ThemeProvider swaps one import. Why a cookie now: the
 * server can read it too, so the JSP admin portal (S44) and a server-rendered page start in the right theme.
 */
export function useCookieState<T extends string>(
  name: PrefCookie,
  initialValue: T,
  isValid: (value: unknown) => value is T,
  days = 365,
): [T, (action: SetStateAction<T>) => void] {
  const [value, setValue] = useState<T>(() => {
    const raw = readCookie(name);
    return isValid(raw) ? raw : initialValue; // validate: cookies are user-editable
  });

  const update = useCallback(
    (action: SetStateAction<T>) => {
      setValue((previous) => {
        const next = typeof action === 'function' ? action(previous) : action;
        writeCookie(name, next, { days });
        return next;
      });
    },
    [name, days],
  );

  return [value, update];
}
