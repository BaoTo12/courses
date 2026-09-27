import { createAction } from '@reduxjs/toolkit';

// Its logout EVENT: every slice resets on it (15.10, 20.11).
// createAction (20.07): an action creator whose `.type` and `.match()` other slices can use.
export const loggedOut = createAction('auth/loggedOut');

/** S24 (24.13): the API answered 401 to a logged-in user: the server session is gone (expired, or ended elsewhere). */
export const sessionExpired = createAction('auth/sessionExpired');
