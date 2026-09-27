import { createAsyncThunk } from '@reduxjs/toolkit';
import type { ThunkAction, UnknownAction } from '@reduxjs/toolkit';
import type * as taskflowApi from '../api';
import type { ApiErrorPayload } from '../api/api-error';
import type { AppDispatch } from './store';
import type { RootState } from './rootReducer';

/**
 * What every thunk receives as `extra` (18.04): the API layer, and the list request in flight.
 * Injected, not imported, so tests can pass fakes.
 */
export interface ThunkExtra {
  /** The whole API layer (api/index.ts): tasks and categories. */
  api: typeof taskflowApi;
  /** The list request in flight, so a newer one can abort it (18.11). One holder PER STORE. */
  listRequest: { controller: AbortController | null };
}

/** A hand-written thunk (still useful for simple "if needed" logic). */
export type AppThunk<R = void> = ThunkAction<R, RootState, ThunkExtra, UnknownAction>;

/**
 * createAsyncThunk with TaskFlow's types filled in once (20.09): getState() is RootState,
 * `extra` is ThunkExtra, and rejectWithValue takes a serialisable ApiErrorPayload.
 */
export const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
  extra: ThunkExtra;
  rejectValue: ApiErrorPayload;
}>();
