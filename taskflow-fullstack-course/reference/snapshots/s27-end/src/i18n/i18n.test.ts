// @vitest-environment jsdom
// S25: the detector, normalisation, plurals, escaping and formatting, with the app's REAL options and
// translation files (bundled by Vite's import.meta.glob instead of fetched over HTTP).
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { afterEach, describe, expect, it } from 'vitest';
import { baseOptions } from './i18n';
import { formatDate, formatRelativeDay } from './format';
import { PRIORITIES, TASK_STATUSES } from '../domain/types';

const NAMESPACES = ['common', 'tasks', 'dashboard'];
// { '/public/locales/en/common.json': {…}, … } → { en: { common: {…} }, … }
const files = import.meta.glob<Record<string, unknown>>('/public/locales/*/*.json', { eager: true, import: 'default' });
const resources: Record<string, Record<string, Record<string, unknown>>> = {};
for (const [path, content] of Object.entries(files)) {
  const [, lng = '', ns = ''] = /\/locales\/(\w+)\/(\w+)\.json$/.exec(path) ?? [];
  (resources[lng] ??= {})[ns] = content;
}

/** A fresh instance, as if the page had just loaded at `url`. */
async function startAt(url: string) {
  window.history.replaceState({}, '', url);
  const instance = i18next.createInstance();
  await instance.use(LanguageDetector).init({ ...baseOptions, ns: NAMESPACES, resources });
  return instance;
}

const langCookie = () => /(?:^|; )tf_lang=([^;]*)/.exec(document.cookie)?.[1];

afterEach(() => {
  document.cookie = 'tf_lang=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('language detection (25.05)', () => {
  it('?lng= beats the cookie, and the result is cached in the cookie', async () => {
    document.cookie = 'tf_lang=en; path=/';
    const i18n = await startAt('/tasks?lng=vi');
    expect(i18n.resolvedLanguage).toBe('vi');
    expect(langCookie()).toBe('vi');
  });

  it('the cookie beats the browser language (jsdom: en-US)', async () => {
    document.cookie = 'tf_lang=vi; path=/';
    const i18n = await startAt('/tasks');
    expect(i18n.resolvedLanguage).toBe('vi');
    expect(i18n.t('nav.tasks')).toBe('Công việc');
  });

  it('no query, no cookie: the browser language, normalised to a supported one', async () => {
    const i18n = await startAt('/tasks');
    expect(i18n.resolvedLanguage).toBe('en');
  });

  it('vi-VN is accepted as vi (nonExplicitSupportedLngs + load: languageOnly, 25.06)', async () => {
    const i18n = await startAt('/tasks?lng=vi-VN');
    expect(i18n.resolvedLanguage).toBe('vi');
    expect(i18n.t('status.DONE')).toBe('Hoàn thành');
  });

  it('an unsupported language falls back to English', async () => {
    const i18n = await startAt('/tasks?lng=fr');
    expect(i18n.resolvedLanguage).toBe('en');
    expect(i18n.t('nav.logout')).toBe('Log out');
  });
});

describe('translation features', () => {
  it('plurals (25.09): English has _one/_other; Vietnamese has one form', async () => {
    const i18n = await startAt('/?lng=en');
    expect(i18n.t('tasks:pager.position', { page: 1, pages: 1, count: 1 })).toBe('Page 1 of 1 · 1 task');
    expect(i18n.t('dashboard:overdue.summary', { count: 5 })).toBe('You have 5 overdue tasks');
    await i18n.changeLanguage('vi');
    expect(i18n.t('dashboard:overdue.summary', { count: 1 })).toBe('Bạn có 1 công việc quá hạn');
  });

  it('escapeValue: false returns interpolated values raw; React escapes them when rendering (25.08)', async () => {
    const i18n = await startAt('/?lng=en');
    expect(i18n.t('tasks:details.deleteConfirm', { title: '<b>x</b>' })).toBe('Delete "<b>x</b>"? This cannot be undone.');
  });

  it('error codes are translated, unknown codes fall back to the default value (25.13)', async () => {
    const i18n = await startAt('/?lng=vi');
    expect(i18n.t('errors.BAD_CREDENTIALS')).toBe('Tên đăng nhập hoặc mật khẩu không đúng.');
    expect(i18n.t('errors.SOMETHING_NEW', { defaultValue: 'Server said no' })).toBe('Server said no');
  });
});

describe('formatting with Intl (25.10)', () => {
  it('dates and relative days follow the language', () => {
    expect(formatDate('2026-10-03', 'en')).toBe('Oct 3, 2026');
    expect(formatRelativeDay('2026-10-01', '2026-10-02', 'en')).toBe('tomorrow');
    expect(formatRelativeDay('2026-10-05', '2026-10-03', 'en')).toBe('2 days ago');
    expect(formatRelativeDay('2026-10-01', '2026-10-02', 'vi')).toBe('Ngày mai') // Intl's own capitalisation;
  });
});

describe('enum labels (25.13)', () => {
  it('every TaskStatus and Priority has a label in both languages (replaces the old assertNever switch)', async () => {
    for (const lng of ['en', 'vi']) {
      const i18n = await startAt(`/?lng=${lng}`);
      for (const status of TASK_STATUSES) expect(i18n.exists(`status.${status}`)).toBe(true);
      for (const priority of PRIORITIES) expect(i18n.exists(`priority.${priority}`)).toBe(true);
    }
  });
});
