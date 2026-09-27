// S24 (24.12): real session-cookie authentication against the API, as RTK Query endpoints.
// The session id itself is an HttpOnly cookie: this code never sees it (24.07). It only asks "who am I?".
import { isUser } from '../../domain/guards';
import type { User } from '../../domain/types';
import { apiSlice } from '../api/apiSlice';
import { clearUserData } from './clearUserData';

export interface Credentials {
  username: string;
  password: string;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    /**
     * GET /auth/me → the user, or `null` when not logged in. A 401 here is an ANSWER ("nobody"), not an error,
     * so a `queryFn` turns it into data. Other failures (network, 500) stay errors.
     */
    getMe: build.query<User | null, void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const result = await baseQuery({ url: '/auth/me', validate: isUser });
        if (result.error) return result.error.status === 401 ? { data: null } : { error: result.error };
        return { data: result.data as User }; // validated by `isUser` in the base query (22.03)
      },
    }),
    /** PESSIMISTIC (23.06): on success, the answer IS the new "me". */
    login: build.mutation<User, Credentials>({
      query: (credentials) => ({ url: '/auth/login', method: 'POST', data: credentials, validate: isUser }),
      async onQueryStarted(_credentials, { dispatch, queryFulfilled }) {
        try {
          const { data: user } = await queryFulfilled;
          dispatch(authApi.util.upsertQueryData('getMe', undefined, user));
        } catch {
          // LoginPage shows the error.
        }
      },
    }),
    /** Ends the SERVER session, then forgets everything locally, even if the request failed (offline). */
    logout: build.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      transformResponse: () => undefined,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await queryFulfilled.catch(() => undefined);
        dispatch(clearUserData());
        dispatch(authApi.util.upsertQueryData('getMe', undefined, null));
      },
    }),
  }),
});

export const { useGetMeQuery, useLoginMutation, useLogoutMutation } = authApi;
