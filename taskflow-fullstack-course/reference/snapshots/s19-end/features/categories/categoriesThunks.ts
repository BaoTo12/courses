import { toErrorMessage } from '../../domain/guards';
import type { AppThunk } from '../../app/thunk-types';
import { categoriesFetchFailed, categoriesFetchStarted, categoriesFetchSucceeded } from './categoriesSlice';

/** Categories change rarely: load once per session (and again only after a failure). */
export const fetchCategoriesIfNeeded = (): AppThunk<Promise<void>> => async (dispatch, getState, { api }) => {
  const { status } = getState().categories;
  if (status === 'loading' || status === 'succeeded') return;
  dispatch(categoriesFetchStarted());
  try {
    dispatch(categoriesFetchSucceeded(await api.getCategories()));
  } catch (error) {
    dispatch(categoriesFetchFailed(toErrorMessage(error)));
  }
};
