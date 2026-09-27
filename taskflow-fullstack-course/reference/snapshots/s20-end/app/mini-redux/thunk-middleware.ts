// 18.03: our own thunk middleware, for learning. The app uses the `redux-thunk` package (store.ts).
import type { Middleware } from 'redux';

/**
 * If the "action" is a FUNCTION, call it with (dispatch, getState, extra) instead of passing it on.
 * Whatever it returns becomes the return value of dispatch() (often a Promise).
 * Plain actions continue down the chain untouched.
 */
export function createMiniThunkMiddleware<Extra>(extra: Extra): Middleware {
  return ({ dispatch, getState }) =>
    (next) =>
    (action) => {
      if (typeof action === 'function') {
        return action(dispatch, getState, extra);
      }
      return next(action);
    };
}
