// GIVEN (not part of the course): a tiny HTTP client for the fake server, built on `fetch`.
// It sends and receives JSON, and turns an error status (4xx/5xx) into a thrown Error.
import { serverUrl } from './server';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(serverUrl + path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${data.message}`);
  return data as T;
}

export const client = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
};
