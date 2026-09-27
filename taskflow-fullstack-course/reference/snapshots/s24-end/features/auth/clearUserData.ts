import { removeCookie } from '../../api/cookies';
import type { AppThunk } from '../../app/thunk-types';
import { apiSlice } from '../api/apiSlice';
import { loggedOut } from './authActions';

/**
 * Forget everything the previous user could see (23.10, 23.11). Three stores of user data, three resets:
 * - `loggedOut()`: every slice resets to its initial state (20.11);
 * - `resetApiState()`: RTK Query's cache is not our slice, it doesn't know `loggedOut`. It must be emptied
 *   explicitly: queries, mutations, subscriptions. A response still in flight is dropped when it lands;
 * - user-specific cookies (24.16): "last visited task" points at THIS user's data. Device preferences
 *   (theme, language) stay: they belong to the browser, not to the account.
 * One thunk, so every logout path (button, 401 → sessionExpired, S38's server-side expiry) does all three.
 */
export const clearUserData = (): AppThunk => (dispatch) => {
  dispatch(loggedOut());
  dispatch(apiSlice.util.resetApiState());
  removeCookie('lastTask');
};
