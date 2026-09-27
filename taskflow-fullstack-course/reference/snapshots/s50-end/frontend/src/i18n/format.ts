// S25 (25.10): dates and numbers through Intl, in the CURRENT language. No hand-written month names.
import type { IsoDate } from '../domain/types';

/** '2026-10-03' → "Oct 3, 2026" (en) / a Vietnamese day-month-year form (vi). Dates without a time: formatted in UTC so no timezone shifts the day. */
export function formatDate(date: IsoDate, language: string): string {
  return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from `today` to `date` (both YYYY-MM-DD): negative = in the past. */
export function daysBetween(today: IsoDate, date: IsoDate): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
}

/** "tomorrow", "in 3 days", "2 days ago" / "Ngày mai"… (`numeric: 'auto'` gives the words). */
export function formatRelativeDay(today: IsoDate, date: IsoDate, language: string): string {
  return new Intl.RelativeTimeFormat(language, { numeric: 'auto' }).format(daysBetween(today, date), 'day');
}

/** A due date as the UI shows it: "Oct 3, 2026 (in 7 days)". */
export function formatDue(dueDate: IsoDate, today: IsoDate, language: string): string {
  return `${formatDate(dueDate, language)} (${formatRelativeDay(today, dueDate, language)})`;
}
