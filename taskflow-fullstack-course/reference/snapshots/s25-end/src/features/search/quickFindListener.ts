import { toApiErrorPayload } from '../../api/api-error';
import type { AppStartListening } from '../../app/listeners';
import { QUICK_FIND_MIN_LENGTH, quickFindChanged, quickFindFailed, quickFindSucceeded } from './quickFindSlice';

/** Wait this long after the last keystroke before searching. */
export const QUICK_FIND_DEBOUNCE_MS = 300;

/**
 * Debounced search with the listener middleware (21.15):
 * 1. every keystroke cancels the previous run of this effect (cancelActiveListeners);
 * 2. `delay` waits, and throws if a newer keystroke cancelled us meanwhile: nothing more runs;
 * 3. the request gets the listener's `signal`, so a cancellation ALSO aborts an HTTP request in flight.
 */
export function addQuickFindListener(startAppListening: AppStartListening) {
  startAppListening({
    actionCreator: quickFindChanged,
    effect: async (action, listenerApi) => {
      listenerApi.cancelActiveListeners();
      const query = action.payload.trim();
      if (query.length < QUICK_FIND_MIN_LENGTH) return;

      await listenerApi.delay(QUICK_FIND_DEBOUNCE_MS);
      try {
        const page = await listenerApi.extra.api.getTasks({ q: query, size: 5 }, listenerApi.signal);
        const results = page.items.map(({ id, title, status }) => ({ id, title, status }));
        listenerApi.dispatch(quickFindSucceeded({ query, results }));
      } catch (error) {
        if (listenerApi.signal.aborted) return; // cancelled by a newer keystroke: not an error
        listenerApi.dispatch(quickFindFailed({ query, message: toApiErrorPayload(error).message }));
      }
    },
  });
}
