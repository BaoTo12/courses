// S25: TaskFlow's i18next set-up. One instance for the app; tests build their own from the same options.
import i18n from 'i18next';
import type { InitOptions } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import type { DetectorOptions } from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';
import { COOKIE_NAMES } from '../api/cookies';

export const SUPPORTED_LANGUAGES = ['en', 'vi'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isAppLanguage(value: unknown): value is AppLanguage {
  return SUPPORTED_LANGUAGES.some((language) => language === value);
}

/**
 * 25.05: WHERE the language comes from, in priority order, and where the choice is remembered.
 * - `?lng=vi` wins (a shared link, a test), then the cookie (the user's earlier choice), then the browser.
 * - `caches: ['cookie']`: whatever was detected or chosen is written to `tf_lang`, the cookie the JSP
 *   admin portal's LocaleFilter reads in S44. One language setting for both apps.
 */
export const detectionOptions: DetectorOptions = {
  order: ['querystring', 'cookie', 'navigator'],
  lookupQuerystring: 'lng',
  lookupCookie: COOKIE_NAMES.language,
  caches: ['cookie'],
  cookieMinutes: 60 * 24 * 365, // one year, like any device preference (24.16)
  cookieOptions: { path: '/', sameSite: 'lax' },
};

/** Everything except "where do the translations come from" (HTTP in the app, inline in tests). */
export const baseOptions: InitOptions = {
  fallbackLng: 'en', // a missing Vietnamese key shows English, never the raw key
  supportedLngs: [...SUPPORTED_LANGUAGES],
  nonExplicitSupportedLngs: true, // 'vi-VN' is accepted as 'vi' (25.06)
  load: 'languageOnly', // …and only /locales/vi/… is requested, never /locales/vi-VN/…
  ns: ['common'], // loaded at start-up; 'tasks' and 'dashboard' load when a component asks (25.11)
  defaultNS: 'common',
  interpolation: { escapeValue: false }, // React escapes when rendering (25.08)
  detection: detectionOptions,
};

/** Starts the app's instance: translations over HTTP from /public/locales, lazily per namespace. */
export function initI18n() {
  i18n.on('languageChanged', (language) => {
    document.documentElement.lang = language; // screen readers, hyphenation, :lang() CSS (25.07)
  });
  return i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      ...baseOptions,
      // BASE_URL: '/' in dev, '/<context>/app/' when the SPA is deployed inside the WAR (S49).
      backend: { loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json` },
    });
}

export { i18n };
