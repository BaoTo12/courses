import type { AppStartListening } from '../../app/listeners';
import { toastShown } from '../ui/toastActions';
import { sessionExpired } from './authActions';
import { authApi } from './authApi';
import { clearUserData } from './clearUserData';

const selectMe = authApi.endpoints.getMe.select();

/**
 * 24.13: the server said 401 to a request that needed a session. Forget the user and their data; `RequireAuth`
 * then sends them to /login?returnTo=<where they were>. After a successful login they come back there.
 */
export function addAuthListeners(startAppListening: AppStartListening) {
  startAppListening({
    actionCreator: sessionExpired,
    effect: (_action, listenerApi) => {
      // Several requests can fail with 401 at once: react to the first only. Once "me" is null, ignore.
      if (!selectMe(listenerApi.getState()).data) return;
      listenerApi.dispatch(clearUserData());
      listenerApi.dispatch(authApi.util.upsertQueryData('getMe', undefined, null));
      listenerApi.dispatch(toastShown({ tone: 'info', message: 'Your session has expired. Please log in again.', i18nKey: 'auth.sessionExpired' }));
    },
  });
}
