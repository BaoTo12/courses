// S20: the same listPrefs slice as S15, written with Redux Toolkit's createSlice.
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SortDirection, SortKey } from '../../domain/types';
import { loggedOut } from '../auth/authActions';

export const PAGE_SIZES = [10, 20, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export interface ListPrefsState {
  sort: { key: SortKey; direction: SortDirection };
  pageSize: PageSize;
}

export const initialListPrefsState: ListPrefsState = {
  sort: { key: 'dueDate', direction: 'asc' },
  pageSize: 20,
};

const listPrefsSlice = createSlice({
  name: 'listPrefs', // the prefix of every generated action type: 'listPrefs/sortChanged'…
  initialState: initialListPrefsState,
  reducers: {
    // With `prepare`, the action creator keeps S15's signature: sortChanged('title', 'desc').
    sortChanged: {
      reducer(state, action: PayloadAction<{ key: SortKey; direction: SortDirection }>) {
        // Assign the FIELDS, not a new object: Immer ignores assignments of an identical primitive,
        // so choosing the current sort again returns the SAME state (a new object would count as a change, 20.05).
        state.sort.key = action.payload.key;
        state.sort.direction = action.payload.direction;
      },
      prepare(key: SortKey, direction: SortDirection) {
        return { payload: { key, direction } };
      },
    },
    pageSizeChanged(state, action: PayloadAction<PageSize>) {
      state.pageSize = action.payload;
    },
  },
  // Actions this slice doesn't own, but reacts to (20.11).
  extraReducers: (builder) => {
    builder.addCase(loggedOut, () => initialListPrefsState);
  },
});

export const { sortChanged, pageSizeChanged } = listPrefsSlice.actions;
export const listPrefsReducer = listPrefsSlice.reducer;
