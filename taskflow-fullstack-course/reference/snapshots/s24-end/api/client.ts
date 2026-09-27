import axios from 'axios';
import { toApiRequestError } from './api-error';
import { readCsrfToken } from './cookies';

// Declaration merging (06.10): add our own field to Axios's request config type.
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** Set by the timing interceptor. */
    metadata?: { startedAt: number };
  }
}

/** The one Axios instance for TaskFlow's API. Nothing else in the app imports axios directly. */
export const api = axios.create({
  // '/api' goes through the Vite dev proxy (same origin). Part 3 changes only this line (or the env var).
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10_000,
  // Send cookies on CROSS-origin requests too (13.10). Same-origin requests send them anyway.
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

// ── Request interceptor: a correlation id + a start time ─────────────────────
api.interceptors.request.use((config) => {
  // The same id appears in the browser's Network tab and (in Part 3) in the server's logs.
  config.headers.set('X-Request-Id', crypto.randomUUID());
  config.metadata = { startedAt: performance.now() };
  return config;
});

// ── Request interceptor: the CSRF header on unsafe methods (24.11) ───────────
const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

api.interceptors.request.use(async (config) => {
  if (!UNSAFE_METHODS.has(config.method?.toLowerCase() ?? 'get')) return config; // GET/HEAD/OPTIONS: no token
  let token = readCsrfToken();
  // (No `document` = no cookie jar, e.g. Node tests: nothing to fetch or read.)
  if (token === undefined && typeof document !== 'undefined') {
    // No token yet (first write of this browser session): ask the server to issue one. A GET, so this
    // interceptor doesn't recurse. The response's Set-Cookie stores it; we read it back from the cookie.
    await api.get('/auth/csrf');
    token = readCsrfToken();
  }
  if (token !== undefined) config.headers.set('X-XSRF-TOKEN', token);
  return config;
});

// ── Response interceptor: timing log + ONE error type for the whole app ──────
api.interceptors.response.use(
  (response) => {
    logTiming(response.config.method, response.config.url, response.status, response.config.metadata);
    return response;
  },
  (error: unknown) => {
    const apiError = toApiRequestError(error);
    if (axios.isAxiosError(error) && apiError.kind !== 'cancelled') {
      logTiming(error.config?.method, error.config?.url, apiError.status ?? apiError.kind, error.config?.metadata);
    }
    // ALWAYS reject: returning a value here would turn the failure into a "success" (13.14).
    return Promise.reject(apiError);
  },
);

function logTiming(
  method: string | undefined,
  url: string | undefined,
  outcome: number | string,
  metadata: { startedAt: number } | undefined,
) {
  if (!import.meta.env.DEV || metadata === undefined) return;
  const ms = Math.round(performance.now() - metadata.startedAt);
  console.debug(`[api] ${method?.toUpperCase()} ${url} → ${outcome} in ${ms} ms`);
}
