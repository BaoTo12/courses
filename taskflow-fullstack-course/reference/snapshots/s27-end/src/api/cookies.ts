// S24 (24.05): the ONE place TaskFlow touches cookies. Components never call js-cookie or document.cookie.
import Cookies from 'js-cookie';

/**
 * Every cookie the SPA itself reads or writes, by name. A typo is a compile error, and a reviewer sees
 * the whole list in one place. (JSESSIONID is NOT here: it's HttpOnly, JavaScript can't see it, 24.07.)
 */
export const COOKIE_NAMES = {
  theme: 'tf_theme',
  listPrefs: 'tf_list_prefs',
  language: 'tf_lang',
  lastTask: 'tf_last_task',
} as const;
export type PrefCookie = keyof typeof COOKIE_NAMES;

/** Written by the SERVER, read by us (24.10). */
export const CSRF_COOKIE = 'XSRF-TOKEN';

/**
 * Safe defaults for everything we write (24.02):
 * - path '/': one cookie for the whole app, and `remove` uses the SAME path (24.18);
 * - sameSite 'lax': not sent on cross-site sub-requests (images, fetch, form POSTs from other sites);
 * - secure on HTTPS: never sent over plain HTTP in production. (On http://localhost it must be false,
 *   or the browser would refuse to store it.)
 */
const prefCookies = Cookies.withAttributes({
  path: '/',
  sameSite: 'lax',
  secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
});

/** Reads a preference cookie. `undefined` if absent. Always VALIDATE the value: the user can edit cookies. */
export function readCookie(name: PrefCookie): string | undefined {
  return prefCookies.get(COOKIE_NAMES[name]);
}

/**
 * Writes a preference cookie. `days` → a persistent cookie (Expires); no `days` → a SESSION cookie, gone when
 * the browser session ends (24.16).
 */
export function writeCookie(name: PrefCookie, value: string, options: { days?: number } = {}): void {
  prefCookies.set(COOKIE_NAMES[name], value, options.days === undefined ? {} : { expires: options.days });
}

export function removeCookie(name: PrefCookie): void {
  prefCookies.remove(COOKIE_NAMES[name]); // same path as set → really removed
}

/** The CSRF token the server issued, for the X-XSRF-TOKEN header (24.11). */
export function readCsrfToken(): string | undefined {
  return Cookies.get(CSRF_COOKIE);
}
