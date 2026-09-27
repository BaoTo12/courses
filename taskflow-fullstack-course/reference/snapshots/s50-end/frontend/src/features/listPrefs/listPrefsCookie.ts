// S24 (24.06): the list preferences (sort + page size) survive a reload, in a cookie.
import { isAnyOf } from '@reduxjs/toolkit';
import { readCookie, removeCookie, writeCookie } from '../../api/cookies';
import type { AppStartListening } from '../../app/listeners';
import type { SortDirection, SortKey } from '../../domain/types';
import { loggedOut } from '../auth/authActions';
import { PAGE_SIZES, pageSizeChanged, sortChanged } from './listPrefsSlice';
import type { ListPrefsState } from './listPrefsSlice';

const SORT_KEYS: readonly SortKey[] = ['title', 'priority', 'dueDate'];
const DIRECTIONS: readonly SortDirection[] = ['asc', 'desc'];

/**
 * The saved preferences, or `undefined` when there are none or they're invalid. A cookie is USER INPUT:
 * anyone can edit it in DevTools, so it's parsed and validated like a URL parameter (12.03).
 */
export function readListPrefsCookie(): ListPrefsState | undefined {
  const raw = readCookie('listPrefs');
  if (raw === undefined) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return undefined;
    const { sortKey, direction, pageSize } = value as Record<string, unknown>;
    const key = SORT_KEYS.find((k) => k === sortKey);
    const dir = DIRECTIONS.find((d) => d === direction);
    const size = PAGE_SIZES.find((s) => s === pageSize);
    if (!key || !dir || !size) return undefined;
    return { sort: { key, direction: dir }, pageSize: size };
  } catch {
    return undefined; // not JSON: ignore it, the defaults apply
  }
}

const isListPrefsChange = isAnyOf(sortChanged, pageSizeChanged);

/** Writes the cookie AFTER each change reached the reducer (21.14), and removes it with the logout reset. */
export function addListPrefsCookieListener(startAppListening: AppStartListening) {
  startAppListening({
    matcher: isListPrefsChange,
    effect: (_action, listenerApi) => {
      const { sort, pageSize } = listenerApi.getState().listPrefs;
      // Short names, one JSON value: a cookie is sent with EVERY request to the server, so keep it small.
      writeCookie('listPrefs', JSON.stringify({ sortKey: sort.key, direction: sort.direction, pageSize }), { days: 180 });
    },
  });
  startAppListening({
    actionCreator: loggedOut, // the slice resets on logout (20.11): so does its copy in the cookie
    effect: () => removeCookie('listPrefs'),
  });
}
