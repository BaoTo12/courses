import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from './store';
import type { RootState } from './rootReducer';

// Typed versions of the React-Redux hooks (17.06). Use these everywhere instead of the plain ones:
// the state and dispatch types are declared once, here, not in every component.
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
