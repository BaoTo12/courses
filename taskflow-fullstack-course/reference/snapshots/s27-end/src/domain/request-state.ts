import type { RequestState } from './api-types';
import { assertNever } from './guards';

export const idle = <T>(): RequestState<T> => ({ status: 'idle' });
export const loading = <T>(): RequestState<T> => ({ status: 'loading' });
export const succeeded = <T>(data: T): RequestState<T> => ({ status: 'succeeded', data });
export const failed = <T>(error: string): RequestState<T> => ({ status: 'failed', error });

/** Return the data if the request succeeded, otherwise a fallback. */
export function dataOr<T>(state: RequestState<T>, fallback: T): T {
  return state.status === 'succeeded' ? state.data : fallback;
}

/** Describe any request state for a status line. Exhaustive. */
export function describe<T>(state: RequestState<T>, describeData: (data: T) => string): string {
  switch (state.status) {
    case 'idle':
      return '';
    case 'loading':
      return 'Loading…';
    case 'succeeded':
      return describeData(state.data);
    case 'failed':
      return `Something went wrong: ${state.error}`;
    default:
      return assertNever(state);
  }
}
