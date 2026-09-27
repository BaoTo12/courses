// S51: the caller's latest task events (GET /api/activity), recorded server-side by ActivityRecorder.
import { isActivity } from '../../domain/guards';
import type { Activity } from '../../domain/types';
import { apiSlice } from '../api/apiSlice';

export const activityApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getActivity: build.query<Activity[], void>({
      query: () => ({ url: '/activity', validate: (data) => Array.isArray(data) && data.every(isActivity) }),
      providesTags: ['Activity'],
    }),
  }),
});

export const { useGetActivityQuery } = activityApi;