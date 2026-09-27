import { useEffect, useState } from 'react';

/**
 * useState that persists to localStorage.
 * Storage can be unavailable (private mode, blocked cookies, quota) or contain garbage:
 * every access is wrapped, and `isValid` guards what we read back (untrusted input!).
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  isValid: (value: unknown) => value is T,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable or full: keep working in memory
    }
  }, [key, value]);

  return [value, setValue] as const;
}
