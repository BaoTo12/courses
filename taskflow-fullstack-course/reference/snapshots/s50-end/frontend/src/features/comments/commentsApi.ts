// S23 (23.08): the comments endpoints live with their feature. `injectEndpoints` adds them to the ONE api slice:
// same cache, same middleware, same tag space ('Comment' is declared in apiSlice's tagTypes).
import { isComment } from '../../domain/guards';
import type { Comment } from '../../domain/types';
import { apiSlice } from '../api/apiSlice';

export const commentsApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    // Tags carry the TASK id, so adding a comment to task 5 refetches only task 5's list (22.11).
    getComments: build.query<Comment[], number>({
      query: (taskId) => ({ url: `/tasks/${taskId}/comments`, validate: (data) => Array.isArray(data) && data.every(isComment) }),
      providesTags: (_result, _error, taskId) => [{ type: 'Comment', id: taskId }],
    }),
    addComment: build.mutation<Comment, { taskId: number; body: string }>({
      query: ({ taskId, body }) => ({ url: `/tasks/${taskId}/comments`, method: 'POST', data: { body }, validate: isComment }),
      invalidatesTags: (_result, _error, { taskId }) => [{ type: 'Comment', id: taskId }],
    }),
  }),
});

export const { useGetCommentsQuery, useAddCommentMutation } = commentsApi;
