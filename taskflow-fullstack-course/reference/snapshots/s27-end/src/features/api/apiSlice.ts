// S22: TaskFlow's server state, managed by RTK Query. ONE api slice for the whole backend
// (the Redux docs' recommendation): one cache, one middleware, tags that work across endpoints.
// S23: id-level tags, optimistic toggle/delete, a pessimistic edit, and detail entries seeded from lists.
import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '../../api/axiosBaseQuery';
import type { AxiosQueryArgs } from '../../api/axiosBaseQuery';
import type { TaskQuery } from '../../api/tasks';
import type { CreateTaskRequest, Page, UpdateTaskRequest } from '../../domain/api-types';
import { isCategory, isPageOf, isTask } from '../../domain/guards';
import type { Category, Task } from '../../domain/types';

export interface ClearCompletedResult {
  deleted: number[];
  failed: number[];
}

/** "The membership of a task list": what creating or deleting a task changes (23.01). */
const TASK_LIST = { type: 'Task', id: 'LIST' } as const;

type BaseQuery = (args: AxiosQueryArgs) => ReturnType<ReturnType<typeof axiosBaseQuery>>;

/** DELETE each id through the base query; partial success is a RESULT ({ deleted, failed }), never an error. */
async function deleteEach(ids: number[], baseQuery: BaseQuery) {
  const results = await Promise.all(ids.map((id) => baseQuery({ url: `/tasks/${id}`, method: 'DELETE' })));
  const deleted = ids.filter((_id, index) => !results[index]?.error);
  const failed = ids.filter((_id, index) => results[index]?.error);
  return { data: { deleted, failed } };
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
      // One tag per task it contains, plus the LIST tag for its membership (23.01).
      providesTags: (result) => [...(result?.items.map(({ id }) => ({ type: 'Task' as const, id })) ?? []), TASK_LIST],
      // Seed getTask(id) with every task the list brought (23.06): opening a task from the list sends no request.
      async onQueryStarted(_query, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            apiSlice.util.upsertQueryEntries(data.items.map((task) => ({ endpointName: 'getTask', arg: task.id, value: task }))),
          );
        } catch {
          // The list's own entry holds the error: nothing to seed.
        }
      },
    }),
    getTask: build.query<Task, number>({
      query: (id) => ({ url: `/tasks/${id}`, validate: isTask }),
      providesTags: (_result, _error, id) => [{ type: 'Task', id }],
    }),
    getCategories: build.query<Category[], void>({
      query: () => ({ url: '/categories', validate: (data) => Array.isArray(data) && data.every(isCategory) }),
      providesTags: ['Category'],
    }),

    // ── Mutations ─────────────────────────────────────────────────────────────
    addTask: build.mutation<Task, CreateTaskRequest>({
      query: (request) => ({ url: '/tasks', method: 'POST', data: request, validate: isTask }),
      invalidatesTags: (_result, error) => (error ? [] : [TASK_LIST]), // a new member: lists only
    }),
    /**
     * PESSIMISTIC (23.06): wait for the server, then write ITS answer into the cache. The details page shows the
     * saved task without a refetch; lists refetch (the edit may change their order or membership).
     */
    updateTask: build.mutation<Task, { id: number; request: CreateTaskRequest }>({
      query: ({ id, request }) => ({ url: `/tasks/${id}`, method: 'PUT', data: request, validate: isTask }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data: saved } = await queryFulfilled;
          dispatch(apiSlice.util.upsertQueryData('getTask', id, saved));
        } catch {
          // The form shows the error (unwrap in EditTaskPage): the cache was never touched.
        }
      },
      invalidatesTags: (_result, error) => (error ? [] : [TASK_LIST]),
    }),
    /**
     * OPTIMISTIC (23.04): change every cached copy of the task NOW, undo if the server says no.
     * On success, the id tag refetches the entries that contain it, to confirm the server's version.
     */
    patchTask: build.mutation<Task, { id: number; changes: UpdateTaskRequest }>({
      query: ({ id, changes }) => ({ url: `/tasks/${id}`, method: 'PATCH', data: changes, validate: isTask }),
      async onQueryStarted({ id, changes }, { dispatch, getState, queryFulfilled }) {
        const patches = [
          // EVERY cached list, whatever its arguments (23.15: patching only one of them is the classic bug).
          ...apiSlice.util.selectCachedArgsForQuery(getState(), 'getTasks').map((query) =>
            dispatch(
              apiSlice.util.updateQueryData('getTasks', query, (page) => {
                const task = page.items.find((item) => item.id === id);
                if (task) Object.assign(task, changes);
              }),
            ),
          ),
          dispatch(apiSlice.util.updateQueryData('getTask', id, (task) => void Object.assign(task, changes))),
        ];
        try {
          await queryFulfilled;
        } catch {
          for (const patch of patches) patch.undo(); // roll back; a listener shows the error toast (22.09)
        }
      },
      invalidatesTags: (_result, error, { id }) => (error ? [] : [{ type: 'Task', id }]),
    }),
    /** OPTIMISTIC (23.05): the task disappears from every list at once, and comes back if the DELETE fails. */
    deleteTask: build.mutation<void, number>({
      query: (id) => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      transformResponse: () => undefined, // 204 No Content: Axios gives '' as data
      async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
        const patches = apiSlice.util.selectCachedArgsForQuery(getState(), 'getTasks').map((query) =>
          dispatch(
            apiSlice.util.updateQueryData('getTasks', query, (page) => {
              const index = page.items.findIndex((item) => item.id === id);
              if (index === -1) return;
              page.items.splice(index, 1);
              page.totalItems -= 1;
            }),
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          for (const patch of patches) patch.undo();
        }
      },
      invalidatesTags: (_result, error, id) => (error ? [] : [{ type: 'Task', id }, TASK_LIST]),
    }),
    /**
     * Several DELETEs, ONE invalidation (22.07): a `queryFn` instead of `query` when an endpoint
     * isn't a single request. It receives the base query to make each request.
     */
    clearCompleted: build.mutation<ClearCompletedResult, number[]>({
      queryFn: (ids, _api, _extraOptions, baseQuery) => deleteEach(ids, baseQuery),
      invalidatesTags: (result) => [...(result?.deleted.map((id) => ({ type: 'Task' as const, id })) ?? []), TASK_LIST],
    }),
    /**
     * S27 bulk delete (select many → Delete). OPTIMISTIC: the tasks leave every cached list at once. There's no
     * undo on "failure" because partial success is DATA, not an error: the LIST refetch brings back the ones the
     * server refused, and a toast reports them.
     */
    deleteTasks: build.mutation<ClearCompletedResult, number[]>({
      queryFn: (ids, _api, _extraOptions, baseQuery) => deleteEach(ids, baseQuery),
      onQueryStarted(ids, { dispatch, getState }) {
        for (const query of apiSlice.util.selectCachedArgsForQuery(getState(), 'getTasks')) {
          dispatch(
            apiSlice.util.updateQueryData('getTasks', query, (page) => {
              const before = page.items.length;
              page.items = page.items.filter((item) => !ids.includes(item.id));
              page.totalItems -= before - page.items.length;
            }),
          );
        }
      },
      invalidatesTags: (result) => [...(result?.deleted.map((id) => ({ type: 'Task' as const, id })) ?? []), TASK_LIST],
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
  useDeleteTasksMutation,
  usePrefetch,
} = apiSlice;
