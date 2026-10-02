import axios from 'axios';
import { isApiError } from '../domain/guards';

/** What went wrong, from the UI's point of view (13.08). */
export type ApiErrorKind =
  | 'http' // the server answered with a non-2xx status
  | 'timeout' // no answer within the client's timeout
  | 'network' // no answer at all: server down, DNS, CORS, offline
  | 'cancelled' // we aborted it ourselves (AbortController): usually not an error to show
  | 'unexpected'; // a bug: something that isn't an HTTP failure

/**
 * The ONE error type the rest of the app sees. Components never inspect AxiosError:
 * the api/ layer hides the HTTP library (so it could be replaced without touching the UI).
 */
export class ApiRequestError extends Error {
  readonly kind: ApiErrorKind;
  /** HTTP status, or null when there was no response. */
  readonly status: number | null;
  /** Machine-readable code from the error body (e.g. 'VALIDATION_FAILED'), or the kind. */
  readonly code: string;
  readonly fieldErrors: Readonly<Record<string, string>>;

  constructor(options: {
    kind: ApiErrorKind;
    message: string;
    status?: number | null;
    code?: string;
    fieldErrors?: Record<string, string>;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'ApiRequestError';
    this.kind = options.kind;
    this.status = options.status ?? null;
    this.code = options.code ?? options.kind.toUpperCase();
    this.fieldErrors = options.fieldErrors ?? {};
  }
}

/** Turns anything an Axios call can throw into an ApiRequestError. */
export function toApiRequestError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) return error;

  if (axios.isCancel(error)) {
    return new ApiRequestError({ kind: 'cancelled', message: 'Request cancelled', cause: error });
  }

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiRequestError({ kind: 'timeout', message: 'The server took too long to respond.', cause: error });
    }
    if (error.response) {
      const { status, data } = error.response;
      if (isApiError(data)) {
        // Our contract's error body (02-project-spec §5): use the server's message and field errors.
        const fields = Object.entries(data.fieldErrors ?? {});
        const details = fields.map(([field, problem]) => `${field} ${problem}`).join('; ');
        return new ApiRequestError({
          kind: 'http',
          status,
          code: data.error,
          message: details ? `${data.message}: ${details}` : data.message,
          fieldErrors: data.fieldErrors,
          cause: error,
        });
      }
      // A non-contract body: usually a PROXY answering for a server that is down (Vite's proxy sends
      // an empty 502; Nginx an HTML page). Verified: with the mock API stopped, we get 502, not a network error.
      const message =
        status >= 500 ? `The server is unavailable (HTTP ${status}). Try again in a moment.` : `Request failed (HTTP ${status}).`;
      return new ApiRequestError({ kind: 'http', status, message, cause: error });
    }
    // A request was sent but no response arrived.
    return new ApiRequestError({ kind: 'network', message: 'Cannot reach the server. Check your connection.', cause: error });
  }

  return new ApiRequestError({
    kind: 'unexpected',
    message: error instanceof Error ? error.message : 'Unexpected error',
    cause: error,
  });
}

export function isCancelled(error: unknown): boolean {
  return error instanceof ApiRequestError && error.kind === 'cancelled';
}
