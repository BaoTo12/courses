import type { AppThunk } from '../../app/thunk-types';
import { apiSlice } from '../api/apiSlice';
import { loggedOut } from './authActions';

/**
 * Forget everything the previous user could see (23.10, 23.11). Two stores of user data, two resets:
 * - `loggedOut()`: every slice resets to its initial state (20.11);
 * - `resetApiState()`: RTK Query's cache is not our slice, it doesn't know `loggedOut`. It must be emptied
 *   explicitly: queries, mutations, subscriptions. A response still in flight is dropped when it lands.
 * One thunk, so every logout path (button, 401 handler in S24, session expiry) does both.
 */
export const clearUserData = (): AppThunk => (dispatch) => {
  dispatch(loggedOut());
  dispatch(apiSlice.util.resetApiState());
};
