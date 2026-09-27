// The auth slice arrives in S24. Its logout EVENT is needed now: every slice resets on it (15.10).

export type AuthAction = { type: 'auth/loggedOut' };

export const loggedOut = (): AuthAction => ({ type: 'auth/loggedOut' });
