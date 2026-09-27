// S22: TaskFlow's server state, managed by RTK Query. ONE api slice for the whole backend
// (the Redux docs' recommendation): one cache, one middleware, tags that work across endpoints.
import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '../../api/axiosBaseQuery';
import type { TaskQuery } from '../../api/tasks';
import type { CreateTaskRequest, Page, UpdateTaskRequest } from '../../domain/api-types';
import { isCategory, isComment, isPageOf, isTask } from '../../domain/guards';
import type { Category, Comment, Task } from '../../domain/types';

export interface ClearCompletedResult {
  deleted: number[];
  failed: number[];
}

export const apiSlice = createApi({
  reducerPath: 'api', // where the cache lives in the root state: state.api
  baseQuery: axiosBaseQuery(),
  // Every kind of cached data that a mutation can make stale (22.08).
  tagTypes: ['Task', 'Category', 'Comment'],
  endpoints: (build) => ({
    // ── Queries: read, cached per argument ────────────────────────────────────
    getTasks: build.query<Page<Task>, TaskQuery>({
      query: (params) => ({ url: '/tasks', params, validate: (data) => isPageOf(data, isTask) }),
      providesTags: ['Task'],
    }),
    getTask: build.query<Task, number>({
      query: (id) => ({ url: `/tasks/${id}`, validate: isTask }),
      providesTags: ['Task'],
    }),
    getCategories: build.query<Category[], void>({
      query: () => ({ url: '/categories', validate: (data) => Array.isArray(data) && data.every(isCategory) }),
      providesTags: ['Category'],
    }),

    // ── Mutations: write, then invalidate what they made stale ───────────────
    addTask: build.mutation<Task, CreateTaskRequest>({
      query: (request) => ({ url: '/tasks', method: 'POST', data: request, validate: isTask }),
      invalidatesTags: ['Task'],
    }),
    updateTask: build.mutation<Task, { id: number; request: CreateTaskRequest }>({
      query: ({ id, request }) => ({ url: `/tasks/${id}`, method: 'PUT', data: request, validate: isTask }),
      invalidatesTags: ['Task'],
    }),
    patchTask: build.mutation<Task, { id: number; changes: UpdateTaskRequest }>({
      query: ({ id, changes }) => ({ url: `/tasks/${id}`, method: 'PATCH', data: changes, validate: isTask }),
      invalidatesTags: ['Task'],
    }),
    deleteTask: build.mutation<void, number>({
      query: (id) => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      transformResponse: () => undefined, // 204 No Content: Axios gives '' as data
      invalidatesTags: ['Task'],
    }),
    /**
     * Several DELETEs, ONE invalidation (22.07): a `queryFn` instead of `query` when an endpoint
     * isn't a single request. It receives the base query to make each request.
     */
    clearCompleted: build.mutation<ClearCompletedResult, number[]>({
      async queryFn(ids, _api, _extraOptions, baseQuery) {
        const results = await Promise.all(ids.map((id) => baseQuery({ url: `/tasks/${id}`, method: 'DELETE' })));
        const deleted = ids.filter((_id, index) => !results[index]?.error);
        const failed = ids.filter((_id, index) => results[index]?.error);
        return { data: { deleted, failed } };
      },
      invalidatesTags: ['Task'],
    }),

    // ── Comments (22.11): tags carry the TASK id, so adding a comment to task 5 refetches only task 5's list ──
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

export const {
  useGetTasksQuery,
  useGetTaskQuery,
  useGetCategoriesQuery,
  useAddTaskMutation,
  useUpdateTaskMutation,
  usePatchTaskMutation,
  useDeleteTaskMutation,
  useClearCompletedMutation,
  useGetCommentsQuery,
  useAddCommentMutation,
} = apiSlice;
