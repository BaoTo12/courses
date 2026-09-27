// S24 Your Turn (24.16): two more cookies, each with the attributes its PURPOSE needs.
import { readCookie, writeCookie } from '../../api/cookies';
import type { User } from '../../domain/types';

export type Language = User['locale']; // 'en' | 'vi'
const LANGUAGES: readonly Language[] = ['en', 'vi'];

/**
 * "Remember my language": a DEVICE preference. Persistent (1 year), survives logout, and harmless if read by
 * JavaScript. S25's language detector reads the same cookie (`lookupCookie: 'tf_lang'`).
 */
export function rememberLanguage(language: Language): void {
  writeCookie('language', language, { days: 365 });
}

export function readRememberedLanguage(): Language | undefined {
  const raw = readCookie('language');
  return LANGUAGES.find((language) => language === raw); // validate: user-editable
}

/**
 * "Remember the last visited task": USER data (it points at one of this user's tasks). A SESSION cookie (no
 * expiry: gone when the browser session ends) and removed on logout by `clearUserData` (23.11).
 */
export function rememberLastTask(taskId: number): void {
  writeCookie('lastTask', String(taskId));
}

export function readLastTaskId(): number | undefined {
  const raw = readCookie('lastTask');
  if (raw === undefined || !/^[1-9]\d{0,9}$/.test(raw)) return undefined; // a positive integer, nothing else
  return Number(raw);
}
