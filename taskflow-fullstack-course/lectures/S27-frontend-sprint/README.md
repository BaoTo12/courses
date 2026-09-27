# S27 · Frontend Feature Sprint: Code Only

> By request, S27 ships as **code, without lectures**. The finished frontend is in `reference/taskflow/frontend` and frozen in `reference/snapshots/s27-end` (**Part 1 complete: TaskFlow Web on the mock API**).
> Verified: 234 tests (25 files), `tsc -b`, lint. New test: "S27 bulk delete" in `src/features/api/taskCache.test.ts`.

## What changed, file by file

| Feature | Files | Notes |
|---|---|---|
| **Bulk actions** (select many → Mark done / Delete) | `features/tasks/BulkBar.tsx` (new), `components/TaskCard.tsx` (checkbox), `components/TaskList.tsx` (`selectedIds`, `onSelect`), `pages/TasksPage.tsx` | Mark done = one optimistic `patchTask` per task (23.05). Delete = one `deleteTasks` mutation. |
| **`deleteTasks` endpoint** | `features/api/apiSlice.ts` | Shares `deleteEach()` with `clearCompleted`. It removes tasks optimistically from every cached list. Partial failure is **data**, and the LIST refetch brings refused tasks back. |
| Selection keeps failed ids | `features/ui/uiSlice.ts` | `deleteTasks.matchFulfilled` removes only the `deleted` ids. |
| **Error boundary** | `components/ErrorBoundary.tsx` (new), `layouts/AppLayout.tsx` | Wraps `<Outlet/>` with `key={location.pathname}`, so a render error breaks one page, and navigating resets it. It doesn't catch event-handler or async errors (those are toasts and error states). |
| Render-crash reporting | `app/middleware/crash-reporter.ts` → `reportRenderError` | Logs only the error summary and the component stack, no user data (26.09). |
| **Loading skeleton** | `components/TaskListSkeleton.tsx` + `.module.scss` (new) | First load of the list view only. `prefers-reduced-motion` respected. One screen-reader status. |
| **Translated toasts** | `toast/toast-context.ts` (`i18nKey`, `values`), `toast/ToastProvider.tsx`, `features/tasks/taskListeners.ts`, `features/auth/authListeners.ts` | Stores a **key + values**, translated at render time (25.13 §4). `message` stays as the English fallback. Error toasts use `errors.<code>`. |
| **Rest of the UI translated** | `TaskForm`, `TaskCard` (localised due dates via `formatDue`), `SortControl`, `CategorySidebar`, `QuickFind`, `Board`, `SearchBox`, `ThemeToggle`, `OpenTasksBadge`, `NewTaskPage`, `EditTaskPage`, `TaskList` | New keys in `public/locales/{en,vi}/{common,tasks}.json`: `toasts.*`, `theme.*`, `openTasks.*`, `quickFind.*`, `errorBoundary.*`, `search.*`, `sort.*`, `categories.*`, `board.*`, `card.*`, `bulk.*`, `form.*`. |

## Known limits, kept on purpose

- **Client-side validation messages** (`domain/task-form.ts`) are still English. The server's field messages will be localised by the backend (S44), and the client messages will follow the same catalogue then.
- **The sort order** stays a saved preference (a cookie, 24.06), not a URL parameter. Filters, search and page are in the URL (shareable).
- **The board** shows the app-wide list (`size=100`), as documented in 23.07.

## Part 1 capstone questions (for self-study)

1. Trace a click on "Mark done", from `onClick` through the thunk, `patchTask.initiate`, the optimistic patch, the listener middleware, the RTK Query middleware, the Axios interceptors (request id, CSRF), the network, `invalidatesTags`, the refetch, structural sharing, the memoised selector and `memo(TaskCard)`, to exactly one re-rendered card.
2. Say where each of these lives, and why: design tokens (SCSS, S01–S04), theme (a cookie + `<html data-theme>`), language (the `tf_lang` cookie + i18next), auth state (the `getMe` cache entry), task data (the RTK Query cache), filters (the URL), sort and page size (the `listPrefs` slice + a cookie), selection and toasts (the `ui` slice).
