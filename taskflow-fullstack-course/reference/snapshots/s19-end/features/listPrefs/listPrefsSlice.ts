// Remembered list preferences that are NOT in the URL (the URL owns status/q/view: S12, 14.13).
import type { SortDirection, SortKey } from '../../domain/types';
import type { AppAction } from '../../app/app-action';

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

export type ListPrefsAction =
  | { type: 'listPrefs/sortChanged'; payload: { key: SortKey; direction: SortDirection } }
  | { type: 'listPrefs/pageSizeChanged'; payload: PageSize };

export const sortChanged = (key: SortKey, direction: SortDirection): ListPrefsAction => ({
  type: 'listPrefs/sortChanged',
  payload: { key, direction },
});

export const pageSizeChanged = (pageSize: PageSize): ListPrefsAction => ({
  type: 'listPrefs/pageSizeChanged',
  payload: pageSize,
});

export function listPrefsReducer(state: ListPrefsState = initialListPrefsState, action: AppAction): ListPrefsState {
  switch (action.type) {
    case 'listPrefs/sortChanged': {
      const { key, direction } = action.payload;
      if (key === state.sort.key && direction === state.sort.direction) return state; // no change → same reference
      return { ...state, sort: { key, direction } };
    }
    case 'listPrefs/pageSizeChanged':
      return action.payload === state.pageSize ? state : { ...state, pageSize: action.payload };
    case 'auth/loggedOut':
      return initialListPrefsState;
    default:
      return state;
  }
}
