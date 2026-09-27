import { useEffect, useState } from 'react';
import type { IsoDate } from '../domain/types';

/** The LOCAL date as 'YYYY-MM-DD' (toISOString() would give the UTC date, a day off near midnight). */
export function toLocalIsoDate(date: Date): IsoDate {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Today's date, as a string (a primitive: safe as a selector argument and in dependency arrays).
 * Re-checked every minute, so a dashboard left open overnight moves to the new day.
 */
export function useToday(): IsoDate {
  const [today, setToday] = useState(() => toLocalIsoDate(new Date()));
  useEffect(() => {
    const timer = setInterval(() => setToday(toLocalIsoDate(new Date())), 60_000);
    return () => clearInterval(timer);
  }, []);
  return today; // setToday with an identical string (Object.is) lets React bail out: children don't re-render
}
