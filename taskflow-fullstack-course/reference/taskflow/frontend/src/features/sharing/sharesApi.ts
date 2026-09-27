// S51: who a task is shared with (read-only). Owner/admin only: the server answers 403 READ_ONLY to recipients.
import { isShare } from '../../domain/guards';
import type { Share } from '../../domain/types';
import { apiSlice } from '../api/apiSlice';

export const sharesApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getShares: build.query<Share[], number>({
      query: (taskId) => ({ url: `/tasks/${taskId}/shares`, validate: (data) => Array.isArray(data) && data.every(isShare) }),
      providesTags: (_result, _error, taskId) => [{ type: 'Share', id: taskId }],
    }),
    /** PESSIMISTIC: the server resolves the username; errors come back as fieldErrors.username. */
    addShare: build.mutation<Share, { taskId: number; username: string }>({
      query: ({ taskId, username }) => ({ url: `/tasks/${taskId}/shares`, method: 'POST', data: { username }, validate: isShare }),
      invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Share', id: taskId }],
    }),
    removeShare: build.mutation<void, { taskId: number; userId: number }>({
      query: ({ taskId, userId }) => ({ url: `/tasks/${taskId}/shares/${userId}`, method: 'DELETE' }),
      transformResponse: () => undefined,
      invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Share', id: taskId }],
    }),
  }),
});

export const { useGetSharesQuery, useAddShareMutation, useRemoveShareMutation } = sharesApi;