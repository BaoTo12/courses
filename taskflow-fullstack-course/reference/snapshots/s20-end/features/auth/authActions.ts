import { createAction } from '@reduxjs/toolkit';

// The auth slice arrives in S24. Its logout EVENT is needed now: every slice resets on it (15.10, 20.11).
// createAction (20.07): an action creator whose `.type` and `.match()` other slices can use.
export const loggedOut = createAction('auth/loggedOut');
