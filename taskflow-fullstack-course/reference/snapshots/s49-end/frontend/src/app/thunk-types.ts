import type { ThunkAction, UnknownAction } from '@reduxjs/toolkit';
import type * as taskflowApi from '../api';
import type { RootState } from './rootReducer';

/**
 * What every thunk and listener receives as `extra` (18.04): the API layer. Injected, not imported,
 * so tests can pass fakes. (Since S22, most server calls go through RTK Query instead; the quick-find
 * listener still uses `extra.api`, 21.15.)
 */
export interface ThunkExtra {
  api: typeof taskflowApi;
}

/** A hand-written thunk: small logic that reads the state, then dispatches (22.09: `toggleTask`). */
export type AppThunk<R = void> = ThunkAction<R, RootState, ThunkExtra, UnknownAction>;
