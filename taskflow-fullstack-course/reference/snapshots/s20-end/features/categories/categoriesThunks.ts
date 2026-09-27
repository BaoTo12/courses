import { toApiErrorPayload } from '../../api/api-error';
import { createAppAsyncThunk } from '../../app/thunk-types';

/**
 * Categories change rarely: load once per session (and again only after a failure).
 * `condition` replaces the hand-written "if needed" check: when it returns false,
 * the thunk doesn't run at all, and no `pending` action is dispatched (20.09).
 */
export const fetchCategories = createAppAsyncThunk(
  'categories/fetch',
  async (_: void, { extra, rejectWithValue }) => {
    try {
      return await extra.api.getCategories();
    } catch (error) {
      return rejectWithValue(toApiErrorPayload(error));
    }
  },
  {
    condition: (_: void, { getState }) => {
      const { status } = getState().categories;
      return status === 'idle' || status === 'failed';
    },
  },
);
