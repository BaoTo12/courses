// S22 (22.03): RTK Query's "base query" = the ONE function every endpoint uses to talk to the server.
// Ours goes through the S13 Axios instance, so the interceptors (request id, timing, error normalisation)
// keep working, and failures reach RTK Query as the same serialisable ApiErrorPayload the thunks used.
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosRequestConfig } from 'axios';
import { ApiRequestError, toApiErrorPayload } from './api-error';
import type { ApiErrorPayload } from './api-error';
import { api } from './client';
import { sessionExpired } from '../features/auth/authActions';

/** What an endpoint's `query()` returns: a description of the HTTP request. */
export interface AxiosQueryArgs {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** The JSON body (POST, PUT, PATCH). */
  data?: unknown;
  /** Query-string parameters; Axios drops `undefined` values. */
  params?: AxiosRequestConfig['params'];
  /** A type guard for the response body (13.05): a mismatch becomes an 'unexpected' error, not bad data. */
  validate?: (data: unknown) => boolean;
}

/** Endpoints for which 401 is an expected answer, not an expired session. */
const SESSION_ENDPOINTS = new Set(['getMe', 'login']);

export function axiosBaseQuery(): BaseQueryFn<AxiosQueryArgs, unknown, ApiErrorPayload> {
  return async ({ url, method = 'GET', data, params, validate }, { signal, dispatch, endpoint }) => {
    try {
      // `signal` is RTK Query's AbortSignal (22.06): `queryResult.abort()` really aborts the HTTP request.
      const response = await api.request({ url, method, data, params, signal });
      if (validate && !validate(response.data)) {
        const error = new ApiRequestError({ kind: 'unexpected', message: 'The server sent an unexpected response.' });
        return { error: toApiErrorPayload(error) };
      }
      return { data: response.data };
    } catch (error) {
      // The response interceptor already turned any failure into an ApiRequestError (13.08);
      // RTK Query stores `error` in its cache, so it must be plain, serialisable data (20.16).
      const payload = toApiErrorPayload(error);
      // 401 = "no session" (24.13). For getMe and login that's an ANSWER; anywhere else the session is gone.
      // An action, not a redirect: the base query knows nothing about routing; a listener decides.
      if (payload.status === 401 && !SESSION_ENDPOINTS.has(endpoint)) dispatch(sessionExpired());
      return { error: payload };
    }
  };
}
