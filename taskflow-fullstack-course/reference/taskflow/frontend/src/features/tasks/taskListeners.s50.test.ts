// S50: a background write that fails because of a 401, or is ABORTED by the cache reset after it, gets no error toast
// (the session-expired toast already explains it: found in 48.04's end-to-end run). Other failures still toast.
import { describe, expect, it } from 'vitest';
import { makeStore } from '../../app/store';
import { apiSlice } from '../api/apiSlice';

function rejectedPatch(options: { aborted?: boolean; status?: number }) {
  const withPayload = options.status !== undefined;
  return {
    type: `${apiSlice.reducerPath}/executeMutation/rejected`,
    payload: withPayload
      ? { kind: 'http', status: options.status, code: 'SOME_CODE', message: 'Server said no', fieldErrors: {} }
      : undefined,
    error: { message: options.aborted ? 'Aborted' : 'Rejected' },
    meta: {
      arg: { type: 'mutation', endpointName: 'patchTask', originalArgs: { id: 1, changes: {} }, track: true },
      requestId: 'test',
      requestStatus: 'rejected',
      aborted: options.aborted ?? false,
      condition: false,
      rejectedWithValue: withPayload,
    },
  };
}

describe('background write failures (S50)', () => {
  it('no toast for an aborted write', () => {
    const store = makeStore();
    store.dispatch(rejectedPatch({ aborted: true }));
    expect(store.getState().ui.toasts).toHaveLength(0);
  });

  it('no toast for a 401 (the session-expired toast covers it)', () => {
    const store = makeStore();
    store.dispatch(rejectedPatch({ status: 401 }));
    expect(store.getState().ui.toasts).toHaveLength(0);
  });

  it('still a toast for other failures', () => {
    const store = makeStore();
    store.dispatch(rejectedPatch({ status: 403 }));
    expect(store.getState().ui.toasts).toHaveLength(1);
    expect(store.getState().ui.toasts[0]?.tone).toBe('error');
  });
});
