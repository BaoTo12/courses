import type { AuthAction } from '../features/auth/authActions';
import type { CategoriesAction } from '../features/categories/categoriesSlice';
import type { ListPrefsAction } from '../features/listPrefs/listPrefsSlice';
import type { TasksAction } from '../features/tasks/tasksSlice';
import type { UiAction } from '../features/ui/uiSlice';

/**
 * Every action TaskFlow can dispatch. In Redux, EVERY slice reducer receives EVERY action,
 * so each reducer's `action` parameter is this whole union, not just "its own" actions (15.07).
 */
export type AppAction = TasksAction | CategoriesAction | ListPrefsAction | UiAction | AuthAction;
