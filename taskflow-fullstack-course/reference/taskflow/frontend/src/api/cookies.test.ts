// @vitest-environment jsdom
// S24: cookies need a browser-like document (jsdom). Everything else in the suite runs in Node.
import type { AxiosAdapter } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeStore } from '../app/store';
import { readLastTaskId } from '../features/preferences/rememberedCookies';
import { readListPrefsCookie } from '../features/listPrefs/listPrefsCookie';
import { pageSizeChanged, sortChanged } from '../features/listPrefs/listPrefsSlice';
import { loggedOut } from '../features/auth/authActions';
import { api } from './client';
import { readCookie, removeCookie, writeCookie } from './cookies';

vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});

const originalAdapter = api.defaults.adapter;
afterEach(() => {
  api.defaults.adapter = originalAdapter;
  for (const name of document.cookie.split(';').map((c) => c.split('=')[0]?.trim())) {
    if (name) document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
});

describe('cookies.ts (24.05)', () => {
  it('writes, reads and removes with the same path', () => {
    writeCookie('theme', 'dark', { days: 365 });
    expect(document.cookie).toContain('tf_theme=dark');
    expect(readCookie('theme')).toBe('dark');
    removeCookie('theme');
    expect(readCookie('theme')).toBeUndefined();
  });

  it('a cookie set on another path is NOT removed by remove() on "/" (24.18)', () => {
    document.cookie = 'tf_theme=dark; path=/'; // what we would write…
    removeCookie('theme');
    expect(readCookie('theme')).toBeUndefined();
    // …but jsdom's page is at "/", so a cookie scoped to "/app" isn't even visible to it: document.cookie
    // only lists cookies whose path matches the CURRENT page. That's the other half of 24.18's bug.
    document.cookie = 'tf_theme=dark; path=/app';
    expect(readCookie('theme')).toBeUndefined();
  });

  it('validates what it reads: an edited cookie falls back to "nothing saved"', () => {
    document.cookie = 'tf_last_task=1%3Balert(1); path=/';
    expect(readLastTaskId()).toBeUndefined();
    document.cookie = 'tf_last_task=42; path=/';
    expect(readLastTaskId()).toBe(42);
  });
});

describe('list preferences cookie (24.06)', () => {
  it('a listener writes it after each change; logout removes it; invalid JSON is ignored', () => {
    const store = makeStore();
    store.dispatch(sortChanged('title', 'desc'));
    store.dispatch(pageSizeChanged(50));
    expect(readListPrefsCookie()).toEqual({ sort: { key: 'title', direction: 'desc' }, pageSize: 50 });

    store.dispatch(loggedOut());
    expect(readListPrefsCookie()).toBeUndefined();

    document.cookie = 'tf_list_prefs=%7Bnot-json; path=/';
    expect(readListPrefsCookie()).toBeUndefined();
    document.cookie = `tf_list_prefs=${encodeURIComponent(JSON.stringify({ sortKey: 'owner', direction: 'asc', pageSize: 20 }))}; path=/`;
    expect(readListPrefsCookie()).toBeUndefined(); // an unknown sort key
  });
});

describe('CSRF header (24.11)', () => {
  /** Records each request's method, URL and X-XSRF-TOKEN; GET /auth/csrf "sets" the cookie like the server. */
  function recordingAdapter() {
    const seen: string[] = [];
    const adapter: AxiosAdapter = async (config) => {
      const token = config.headers.get('X-XSRF-TOKEN');
      seen.push(`${config.method?.toUpperCase()} ${config.url} ${token ?? '-'}`);
      if (config.url === '/auth/csrf') document.cookie = 'XSRF-TOKEN=issued-token; path=/';
      return { data: {}, status: 200, statusText: '', headers: {}, config };
    };
    return { adapter, seen };
  }

  it('adds X-XSRF-TOKEN from the cookie to unsafe methods only', async () => {
    const { adapter, seen } = recordingAdapter();
    api.defaults.adapter = adapter;
    document.cookie = 'XSRF-TOKEN=abc; path=/';
    await api.get('/tasks');
    await api.post('/tasks', {});
    await api.put('/tasks/1', {});
    await api.patch('/tasks/1', {});
    await api.delete('/tasks/1');
    expect(seen).toEqual(['GET /tasks -', 'POST /tasks abc', 'PUT /tasks/1 abc', 'PATCH /tasks/1 abc', 'DELETE /tasks/1 abc']);
  });

  it('no token yet: fetches one first, then sends it', async () => {
    const { adapter, seen } = recordingAdapter();
    api.defaults.adapter = adapter;
    await api.post('/auth/login', { username: 'alice', password: 'x' });
    expect(seen).toEqual(['GET /auth/csrf -', 'POST /auth/login issued-token']);
  });
});
