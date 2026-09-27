// S21: "quick find" in the header: a server-side search, debounced by a LISTENER (21.15).
// Separate from the tasks slice on purpose: search results must not replace the task list.
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/rootReducer';
import type { LoadStatus, Task } from '../../domain/types';
import { loggedOut } from '../auth/authActions';

/** Queries shorter than this aren't sent: one letter matches almost everything. */
export const QUICK_FIND_MIN_LENGTH = 2;

export type QuickFindResult = Pick<Task, 'id' | 'title' | 'status'>;

export interface QuickFindState {
  query: string;
  status: LoadStatus;
  results: QuickFindResult[];
  error: string | null;
}

export const initialQuickFindState: QuickFindState = { query: '', status: 'idle', results: [], error: null };

const quickFindSlice = createSlice({
  name: 'quickFind',
  initialState: initialQuickFindState,
  reducers: {
    /** Every keystroke. The listener decides whether and when to search. */
    quickFindChanged(state, action: PayloadAction<string>) {
      state.query = action.payload;
      state.error = null;
      if (action.payload.trim().length < QUICK_FIND_MIN_LENGTH) {
        state.status = 'idle';
        state.results = [];
      } else {
        state.status = 'loading';
      }
    },
    quickFindSucceeded(state, action: PayloadAction<{ query: string; results: QuickFindResult[] }>) {
      if (action.payload.query !== state.query.trim()) return; // an answer to an older query: ignore
      state.status = 'succeeded';
      state.results = action.payload.results;
    },
    quickFindFailed(state, action: PayloadAction<{ query: string; message: string }>) {
      if (action.payload.query !== state.query.trim()) return;
      state.status = 'failed';
      state.error = action.payload.message;
    },
    quickFindClosed: () => initialQuickFindState,
  },
  extraReducers: (builder) => {
    builder.addCase(loggedOut, () => initialQuickFindState);
  },
});

export const { quickFindChanged, quickFindSucceeded, quickFindFailed, quickFindClosed } = quickFindSlice.actions;
export const quickFindReducer = quickFindSlice.reducer;

export const selectQuickFind = (state: RootState) => state.quickFind;
