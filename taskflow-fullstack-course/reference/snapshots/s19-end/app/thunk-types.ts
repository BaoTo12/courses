import type { ThunkAction, ThunkDispatch } from 'redux-thunk';
import type * as taskflowApi from '../api';
import type { AppAction } from './app-action';
import type { RootState } from './rootReducer';

/**
 * What every thunk receives as its 3rd argument (18.04): the API layer and an id generator.
 * Injected, not imported, so tests can pass fakes (18.13).
 */
export interface ThunkExtra {
  /** The whole API layer (api/index.ts): tasks and categories. */
  api: typeof taskflowApi;
  /** Ids for requests (18.11): generated OUTSIDE reducers, which must stay deterministic (15.04). */
  nextRequestId: () => string;
  /** The list request in flight, so a newer one can abort it (18.11). One holder PER STORE. */
  listRequest: { controller: AbortController | null };
}

/** A thunk returning R (usually a Promise). `AppThunk<Promise<Task>>` = resolves with a Task. */
export type AppThunk<R = void> = ThunkAction<R, RootState, ThunkExtra, AppAction>;

/** dispatch that accepts plain actions AND thunks (and returns what the thunk returns). */
export type AppDispatch = ThunkDispatch<RootState, ThunkExtra, AppAction>;
