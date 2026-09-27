// S24: login / me / logout / session expiry, against a fake session server behind the REAL Axios instance.
import type { AxiosAdapter } from 'axios';
import { AxiosError } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api as axiosInstance } from '../../api/client';
import { makeStore } from '../../app/store';
import type { User } from '../../domain/types';
import { apiSlice } from '../api/apiSlice';
import { authApi } from './authApi';

vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});

const originalAdapter = axiosInstance.defaults.adapter;
afterEach(() => {
  axiosInstance.defaults.adapter = originalAdapter;
});

const alice: User = { id: 1, username: 'alice', displayName: 'Alice Nguyen', role: 'USER', locale: 'en' };
const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
};

/** `loggedIn` is the server's session state; flip it to simulate expiry. */
function sessionServer() {
  const state = { loggedIn: false };
  const requests: string[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(`${config.method?.toUpperCase()} ${config.url}`);
    const respond = (status: number, data: unknown) => {
      const response = { data, status, statusText: '', headers: {}, config };
      if (status >= 400) throw new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, response);
      return response;
    };
    const unauthenticated = () => respond(401, { status: 401, error: 'UNAUTHENTICATED', message: 'Not logged in', path: '', timestamp: '' });
    if (config.url === '/auth/login') {
      const { password } = JSON.parse(String(config.data)) as { password: string };
      if (password !== 'alice123') return respond(401, { status: 401, error: 'BAD_CREDENTIALS', message: 'Invalid username or password', path: '', timestamp: '' });
      state.loggedIn = true;
      return respond(200, alice);
    }
    if (config.url === '/auth/logout') {
      state.loggedIn = false;
      return respond(204, '');
    }
    if (!state.loggedIn) return unauthenticated();
    if (config.url === '/auth/me') return respond(200, alice);
    return respond(200, { items: [], page: 0, size: 100, totalItems: 0, totalPages: 0 });
  };
  return { adapter, requests, state };
}

function setup() {
  const server = sessionServer();
  axiosInstance.defaults.adapter = server.adapter;
  const store = makeStore();
  const me = () => authApi.endpoints.getMe.select()(store.getState()).data;
  const toasts = () => store.getState().ui.toasts.map((t) => t.message);
  return { server, store, me, toasts };
}

describe('session auth (24.12, 24.13)', () => {
  it('getMe: a 401 is an answer (null), not an error, and not a "session expired"', async () => {
    const { store, me, toasts } = setup();
    const result = await store.dispatch(authApi.endpoints.getMe.initiate());
    expect(result.isSuccess).toBe(true);
    expect(me()).toBeNull();
    expect(toasts()).toEqual([]);
  });

  it('login: bad credentials reject with the 401 payload; good ones make getMe the user without a request', async () => {
    const { server, store, me } = setup();
    await expect(store.dispatch(authApi.endpoints.login.initiate({ username: 'alice', password: 'nope' })).unwrap()).rejects.toMatchObject({
      status: 401,
      message: 'Invalid username or password',
    });
    await store.dispatch(authApi.endpoints.login.initiate({ username: 'alice', password: 'alice123' })).unwrap();
    await flush();
    expect(me()).toEqual(alice);
    expect(server.requests).not.toContain('GET /auth/me');
  });

  it('a 401 on a data request → sessionExpired: data cleared, user null, ONE toast even for two 401s', async () => {
    const { server, store, me, toasts } = setup();
    await store.dispatch(authApi.endpoints.login.initiate({ username: 'alice', password: 'alice123' })).unwrap();
    await store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 }));
    server.state.loggedIn = false; // the server session expired

    await Promise.all([
      store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 }, { forceRefetch: true })),
      store.dispatch(apiSlice.endpoints.getTask.initiate(5)),
    ]);
    await flush();

    expect(me()).toBeNull();
    expect(Object.keys(store.getState().api.queries)).toEqual(['getMe(undefined)']);
    expect(toasts()).toEqual(['Your session has expired. Please log in again.']);
  });

  it('logout: the server session ends and everything local is cleared', async () => {
    const { server, store, me } = setup();
    await store.dispatch(authApi.endpoints.login.initiate({ username: 'alice', password: 'alice123' })).unwrap();
    await store.dispatch(apiSlice.endpoints.getTasks.initiate({ size: 100 }));
    await store.dispatch(authApi.endpoints.logout.initiate()).unwrap();
    await flush();
    expect(server.state.loggedIn).toBe(false);
    expect(me()).toBeNull();
    expect(Object.keys(store.getState().api.queries)).toEqual(['getMe(undefined)']);
  });
});
