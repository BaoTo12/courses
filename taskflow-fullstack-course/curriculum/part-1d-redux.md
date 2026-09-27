# Part 1D: The Redux Track

> Goal: understand Redux **from first principles to RTK Query**, covering every concept in the official **Redux Fundamentals** (8 parts) and **Redux Essentials** (8 parts) tutorials, applied to TaskFlow.
>
> The path mirrors the official recommendation: learn *how it works* by hand (Fundamentals), then *how to write it today* (Essentials / Redux Toolkit).

## Mapping to the official tutorials

| Section | Official companion reading |
|---|---|
| S14 · R1 Overview and concepts | Fundamentals Part 1 · Part 2 · Essentials Part 1 |
| S15 · R2 State, actions, reducers | Fundamentals Part 3 |
| S16 · R3 The store | Fundamentals Part 4 |
| S17 · R4 UI and React | Fundamentals Part 5 · Essentials Part 3 · Part 4 |
| S18 · R5 Async logic | Fundamentals Part 6 |
| S19 · R6 Standard patterns | Fundamentals Part 7 |
| S20 · R7 Redux Toolkit | Fundamentals Part 8 · Essentials Part 2 · Part 3 · Part 5 |
| S21 · R8 Performance, normalisation, reselect, reactive logic | Essentials Part 4 · Part 6 |
| S22 · R9 RTK Query basics | Essentials Part 7 |
| S23 · R10 RTK Query advanced | Essentials Part 8 |

Also referenced throughout: the **Redux Style Guide** and **Usage with TypeScript** pages.

## The TaskFlow state shape you'll grow

```text
RootState
├── tasks        { ids: number[], entities: Record<id, Task>, status, error }   (normalised in S19)
├── categories   { ids, entities, status }
├── listPrefs    { sort, pageSize }   (status/q/view stay in the URL, S12; decided in 14.13)
├── auth         { user: User | null, status }                                   (S24)
├── ui           { theme, toasts[] }
└── api          (RTK Query cache, S22)
```

---

## S14 · R1: Redux Overview and Concepts

**Project feature:** a **Redux counter in a plain HTML page** (no React, no build), then a written state-shape design for TaskFlow.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 14.01 | 📖 | What is Redux? A pattern + library for **global state updated by events** | ★ |
| 14.02 | 📖 | Why use Redux: predictable updates, one place to look, time-travel debugging, tooling | ★ |
| 14.03 | 📖 | **When to use and when not to**: local state vs Context vs Redux vs server-cache tools; the costs (indirection, boilerplate) | ★ |
| 14.04 | 📖 | The ecosystem: Redux core, Redux Toolkit, React-Redux, Redux DevTools, and how they relate | ★ |
| 14.05 | 📖 | State management: the "one-way data flow" cycle (state → view → action → state) in a single component vs many | ★ |
| 14.06 | 📖 | **Immutability** revisited (from S04): why Redux needs new references to detect changes | ★ |
| 14.07 | 📖 | Terminology: **actions**, **action creators**, **reducers**, **store**, **dispatch**, **selectors** | ★ |
| 14.08 | 📖 | The three principles: single source of truth · state is read-only · changes via pure reducers | ★ |
| 14.09 | 📖 | Redux data flow: initial setup, then the update cycle, step by step with a diagram | ★ |
| 14.10 | 🛠 | Build: a counter with Redux loaded via a `<script>` tag. `createStore`, `subscribe`, `dispatch`, a render function. | ★ |
| 14.11 | 🛠 | Build: open Redux DevTools on it: action log, state diff, time travel | ★ |
| 14.12 | 🎯 | Your Turn: design TaskFlow's state tree and list 12 actions as **past-tense events** | ★ |
| 14.13 | 💡 | Solution walkthrough: the reference state shape and why some data *doesn't* belong in Redux | ★ |

### ✅ Knowledge check
- **Concept:** Put these in order: a click, `dispatch`, a reducer runs, subscribers notified, UI re-reads state.
- **Concept:** Why must reducers never mutate the existing state?
- **Design:** For each piece of data, choose Redux, local state or URL: current filter, input text while typing, logged-in user, modal open flag, task list.
- **Code reading:** Given a reducer and a sequence of 3 actions, write the final state.

**Checkpoint:** `s14-end`

---

## S15 · R2: State, Actions and Reducers

**Project feature:** hand-written, fully typed `tasksReducer`, `listPrefsReducer`, `uiReducer`, and a root reducer, plus reducer unit tests.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 15.01 | 📖 | Designing state values: minimal state, derived data stays out, serialisable only | ★ |
| 15.02 | 📖 | Designing the state structure: organise by feature/domain, not by component | ★ |
| 15.03 | 📖 | Designing actions: **events, not setters** (`tasks/taskAdded` vs `SET_TASKS`), `type` naming (`domain/eventName`), `payload` | ★ |
| 15.04 | 📖 | Reducer rules: compute from `state` + `action` only; **no mutation, no async, no side effects, no randomness** | ★ |
| 15.05 | 📖 | Immutable update patterns: add / update-by-id / remove / nested fields / toggles | ★ |
| 15.06 | 🛠 | Build: `tasksReducer` with a `switch` statement and immutable updates | ★ |
| 15.07 | 📖 | TS: actions as a **discriminated union** (from S06); why the `useReducer`-style `assertNever` default **crashes** a Redux store, and what type safety you get instead | ★ |
| 15.08 | 📖 | Splitting reducers: slice reducers, each owning one key of state | ★ |
| 15.09 | 🛠 | Build: **write `combineReducers` yourself**, then replace it with Redux's | ★ |
| 15.10 | 📖 | Reducers and actions are many-to-many: one action handled by several slices (e.g. `auth/loggedOut`) | ★ |
| 15.11 | 🧩 | Unit-testing reducers with Vitest: why pure functions are the easiest code to test | ★ |
| 15.12 | 🎯 | Your Turn: `listPrefsReducer` (sort, page size) and `uiReducer` (toasts, bulk selection) + tests; `tasks/allCompleted` and `tasks/completedCleared` | ★ |
| 15.13 | 💡 | Solution walkthrough | ★ |
| 15.14 | 🐞 | Debug: "state didn't change in DevTools". A mutating reducer returns the same reference. | ★ |
| 15.15 | 🐞 | Debug: a reducer returns `undefined` on the first call (missing initial state) | ★ |

### ✅ Knowledge check
- **Concept:** Why is `Date.now()` inside a reducer a bug? Where should the timestamp be created?
- **Code reading:** Find the mutation: `return { ...state, items: state.items.sort(bySortKey) }`.
- **Debugging:** A test passes, but the UI never updates after `tasks/taskToggled`. What do you check first?
- **Design:** One action `tasks/taskUpdated` with the full task vs many specific actions (`taskRenamed`, `taskMoved`…). Trade-offs?
- **Implementation:** Handle `auth/loggedOut` in *every* slice so state resets.

**Checkpoint:** `s15-end`

---

## S16 · R3: The Store

**Project feature:** your **own `createStore`**, **own `applyMiddleware` + `compose`**, a logger middleware with redaction, a custom enhancer. Then swap to Redux's real implementations.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 16.01 | 📖 | The store's job: hold state, run the reducer, notify subscribers | ★ |
| 16.02 | 📖 | Store API: `getState`, `dispatch`, `subscribe` (+ unsubscribe); `createStore` vs `legacy_createStore` in Redux 5 | ★ |
| 16.03 | 🛠 | Build: **write `createStore` yourself** (about 25 lines), then run the S15 reducers through it | ★ |
| 16.04 | 📖 | Why dispatch is synchronous; what happens if you dispatch inside a reducer | ★ |
| 16.05 | 📖 | Store **enhancers**: wrapping `createStore` itself; the enhancer signature | ＋ |
| 16.06 | 🛠 | Build: an enhancer that counts dispatches / measures reducer time | ＋ |
| 16.07 | 📖 | **Middleware**: `storeAPI => next => action`, why three nested functions (closures + currying from S04) | ★ |
| 16.08 | 🛠 | Build: `loggerMiddleware`, then 🛡 redact `password`/`token` fields from logs | ★ |
| 16.09 | 🛠 | Build: **write `applyMiddleware` and `compose` yourself**; trace how `dispatch` is wrapped layer by layer | ★ |
| 16.10 | 📖 | What middleware can do: modify, delay, stop, or dispatch other actions; side effects live here | ★ |
| 16.11 | 🛠 | Redux DevTools: the extension enhancer, action replay, trace, state diff | ★ |
| 16.12 | 🎯 | Your Turn: a `crashReporter` middleware and an `analytics` middleware that ignores sensitive actions | ★ |
| 16.13 | 💡 | Solution walkthrough | ★ |
| 16.14 | 🐞 | Debug: middleware order: the logger shows the action *after* a transform you expected before it | ★ |
| 16.15 | 🐞 | Debug: a middleware forgets `return next(action)`; `dispatch` now returns `undefined` | ★ |

### ✅ Knowledge check
- **Concept:** Draw the call stack of `dispatch(action)` through 3 middlewares to the reducer and back.
- **Code reading:** Given your `compose(f, g, h)`, what is `compose(f, g, h)(x)`?
- **Debugging:** Subscribers fire but `getState()` shows old state. Where's the bug in a hand-written store?
- **Design:** Which of these belong in middleware: logging, API calls, validation, formatting data for the UI?
- **Implementation:** A middleware that blocks any action with `meta.requiresAuth` when `auth.user` is null.

**Checkpoint:** `s16-end`

---

## S17 · R4: UI and React

**Project feature:** TaskFlow's list, details, filter bar and task form read from and write to the Redux store through React-Redux with typed hooks.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 17.01 | 📖 | Integrating Redux with any UI: subscribe → read state → re-render (the manual way) | ★ |
| 17.02 | 🛠 | Build: wire the hand-made store to React with `useSyncExternalStore`. See what React-Redux does for you. | ＋ |
| 17.03 | 📖 | React-Redux: `<Provider>`, how the store travels through context, and why context doesn't cause re-renders here | ★ |
| 17.04 | 📖 | **`useSelector` in depth**: runs after every dispatch, compares with `===`, re-renders only on a change | ★ |
| 17.05 | 📖 | `useDispatch`; dispatching from event handlers | ★ |
| 17.06 | 📖 | TS: `RootState = ReturnType<typeof store.getState>`, `AppDispatch`, **typed `useAppSelector` / `useAppDispatch`** | ★ |
| 17.07 | 🛠 | Build: `TaskList`, `FilterBar`, `TaskDetails` connected to the store | ★ |
| 17.08 | 📖 | Global state vs component state; **form drafts stay local** until submit | ★ |
| 17.09 | 📖 | Extracting selector functions (`selectTasks`, `selectTaskById`, `selectFilters`), co-located with the slice | ★ |
| 17.10 | 📖 | Passing IDs to child components vs whole objects: re-render implications | ★ |
| 17.11 | 🛠 | Build: `TaskForm` dispatches `tasks/taskAdded` / `taskUpdated` on submit | ★ |
| 17.12 | 📖 | Legacy `connect()` + `mapStateToProps`: reading older code (you will meet it at work) | ＋ |
| 17.13 | 🎯 | Your Turn: a header badge with "N open tasks" and a "clear completed" button; show that the header re-renders only when needed | ★ |
| 17.14 | 💡 | Solution walkthrough | ★ |
| 17.15 | 🐞 | Debug: `useSelector(state => state.tasks.filter(...))` re-renders on *every* action. Why? (Fixed properly in S21.) | ★ |
| 17.16 | 🐞 | Debug: "could not find react-redux context value". `Provider` placement. | ★ |

### ✅ Knowledge check
- **Concept:** An unrelated `ui/themeToggled` action is dispatched. Which `useSelector` calls run? Which components re-render?
- **Code reading:** `const { tasks, listPrefs } = useSelector(state => ({ tasks: state.tasks, listPrefs: state.listPrefs }))`: what's wrong?
- **Debugging:** The component shows stale data after navigating back. Is the selector or the reducer wrong? How do you tell with DevTools?
- **Design:** Where should "is the edit modal open" live?
- **Implementation:** `selectTasksByCategory(state, categoryId)`, used in a category sidebar.

**Checkpoint:** `s17-end`

---

## S18 · R5: Async Logic and Data Fetching

**Project feature:** tasks loaded from and saved to the mock API through **thunks**, using the S13 Axios layer; loading and error states in the store.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 18.01 | 📖 | Why reducers can't be async; where side effects are allowed (middleware) | ★ |
| 18.02 | 📖 | The Redux async data flow diagram: UI → dispatch(thunk) → middleware → API → dispatch(result) → reducer | ★ |
| 18.03 | 🛠 | Build: **write thunk middleware yourself** (about 10 lines): `typeof action === 'function'` | ★ |
| 18.04 | 📖 | The real `redux-thunk` source walkthrough; `withExtraArgument` (injecting the API client) | ★ |
| 18.05 | 📖 | Thunk functions vs thunk action creators; `(dispatch, getState, extra)` | ★ |
| 18.06 | 🛠 | Build: `fetchTasks()`: dispatch `tasks/fetchStarted` → Axios → `fetchSucceeded` / `fetchFailed` | ★ |
| 18.07 | 🛠 | Build: `saveNewTask(draft)`: the server generates the ID; reducer adds the returned task | ★ |
| 18.08 | 📖 | TS: `ThunkAction`, `AppThunk<ReturnType>`, typing `extra` | ★ |
| 18.09 | 📖 | Loading in `useEffect` vs route loaders vs "fetch if needed" (`getState` checks) | ★ |
| 18.10 | 🔓 | Lab: race condition. Type fast in search; older responses overwrite newer ones. | ★ |
| 18.11 | 🛡 | Fix: request IDs / `AbortController` via `extra`, ignore stale results | ★ |
| 18.12 | 🎯 | Your Turn: `deleteTask(id)` and `toggleTaskOnServer(id)` thunks with error toasts (the toast list moves into the `ui` slice so thunks can show toasts) | ★ |
| 18.13 | 💡 | Solution walkthrough | ★ |
| 18.14 | 🐞 | Debug: "Actions must be plain objects". Thunk middleware not applied. | ★ |
| 18.15 | 🐞 | Debug: the list flashes empty on every navigation (unconditional refetch + reset) | ★ |

### ✅ Knowledge check
- **Concept:** Why is a thunk "just a function that receives `dispatch`"? What makes it run?
- **Code reading:** What does `await dispatch(fetchTasks())` return with your hand-written middleware?
- **Debugging:** An error from Axios never reaches the UI. Trace the thunk's catch path.
- **Design:** Should the thunk or the component show the toast? Justify with testability.
- **Implementation:** `fetchTasksIfNeeded()` that skips the request when data is fresh (< 30 s).

**Checkpoint:** `s18-end`

---

## S19 · R6: Standard Redux Patterns

**Project feature:** normalised tasks + categories, status enums for loading, action creators with ID/timestamp preparation, and thunks that return promises to components.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 19.01 | 📖 | Action creators: why they exist, consistency, "prepare" logic (IDs, timestamps) outside reducers | ★ |
| 19.02 | 📖 | Memoized selectors: the problem (new arrays every call) and a first `createSelector` (deep dive in S21) | ★ |
| 19.03 | 📖 | Async request status: `'idle' \| 'loading' \| 'succeeded' \| 'failed'` vs booleans (the S06 union again) | ★ |
| 19.04 | 🛠 | Build: loading/error UI driven by the status field | ★ |
| 19.05 | 📖 | **Normalised state**: `{ ids, entities }`; why (lookups, updates, no duplication) | ★ |
| 19.06 | 🛠 | Build: normalise `tasks` and `categories`; `selectTaskById` becomes O(1) | ★ |
| 19.07 | 📖 | Relationships: `task.categoryId` → join in a selector, not in state | ★ |
| 19.08 | 📖 | Thunks and promises: returning the promise, `await dispatch(saveTask())` then navigate | ★ |
| 19.09 | 🛠 | Build: "save then redirect to details" + error display in the form | ★ |
| 19.10 | 📖 | Folder structure: "ducks" / feature folders; the Redux Style Guide's priority A rules | ★ |
| 19.11 | 🎯 | Your Turn: a category sidebar with task counts per category, using normalised state | ★ |
| 19.12 | 💡 | Solution walkthrough | ★ |
| 19.13 | 🐞 | Debug: after renaming a category, 3 tasks show the old name (denormalised copies) | ★ |

### ✅ Knowledge check
- **Concept:** What problems does normalisation solve? When is it overkill?
- **Code reading:** Update `entities[5].title` immutably in a normalised state: write it.
- **Design:** Where do you generate IDs for optimistic creation vs server-created entities?
- **Implementation:** `selectTasksWithCategory` returning joined view models.

**Checkpoint:** `s19-end`

---

## S20 · R7: Modern Redux with Redux Toolkit

**Project feature:** the whole store **migrated to Redux Toolkit**, slice by slice, with a before/after diff; `createAsyncThunk` replaces hand-written thunks; logout resets everything.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 20.01 | 📖 | Why RTK exists: the boilerplate and mistakes you just experienced; "RTK is the official way to write Redux" | ★ |
| 20.02 | 📖 | `configureStore`: what it sets up by default (thunk, DevTools, **immutability and serializability check middleware**) | ★ |
| 20.03 | 📖 | RTK app structure (Essentials Part 2): `app/store.ts`, `app/hooks.ts`, `features/*/…Slice.ts` | ★ |
| 20.04 | 📖 | `createSlice`: name, initialState, reducers → action creators + action types generated | ★ |
| 20.05 | 📖 | **How Immer works**: drafts, Proxies, structural sharing; "mutate *or* return, never both"; pitfalls (reassigning `state`, logging drafts with `current()`) | ★ |
| 20.06 | 🛠 | Build: migrate `listPrefsSlice`, then `tasksSlice` | ★ |
| 20.07 | 📖 | `prepare` callbacks, `nanoid`, `createAction`, `createReducer`, builder callback notation | ★ |
| 20.08 | 📖 | Typed hooks with `.withTypes()` (current RTK style) | ★ |
| 20.09 | 📖 | `createAsyncThunk`: lifecycle actions (`pending/fulfilled/rejected`), `extraReducers` with `builder.addCase`, `rejectWithValue`, `condition`, `unwrap()`, `createAppAsyncThunk` | ★ |
| 20.10 | 🛠 | Build: replace the S18 thunks; delete the hand-written boilerplate; compare line counts | ★ |
| 20.11 | 📖 | `extraReducers` for cross-slice events: **logout resets all slices** | ★ |
| 20.12 | 📖 | `isAnyOf`, `isPending`, `isRejected` matchers: a global loading/error slice | ＋ |
| 20.13 | 📖 | Redux Style Guide essentials: priority A/B rules you'll be expected to follow in code review | ★ |
| 20.14 | 🎯 | Your Turn: migrate `categoriesSlice` + `uiSlice` (toasts) including `createAsyncThunk` | ★ |
| 20.15 | 💡 | Solution walkthrough: plus a classic-vs-RTK side-by-side table | ★ |
| 20.16 | 🐞 | Debug: "A non-serializable value was detected in the state" (a `Date` object in state) | ★ |
| 20.17 | 🐞 | Debug: an Immer reducer both mutates *and* returns → error. Why is it forbidden? | ★ |
| 20.18 | 🐞 | Debug: the `rejected` case shows `"Rejected"` instead of the server message (missing `rejectWithValue`) | ★ |

### ✅ Knowledge check
- **Concept:** If you write `state.items.push(t)` in `createSlice`, why is it still immutable?
- **Code reading:** List the action types generated by `createAsyncThunk('tasks/fetch', …)`.
- **Debugging:** `dispatch(saveTask()).unwrap()` throws but the component didn't catch it. What happened?
- **Design:** What's the difference in responsibility between `reducers` and `extraReducers`?
- **Implementation:** A `condition` that prevents a duplicate `fetchTasks` while one is already pending.

**Checkpoint:** `s20-end`

---

## S21 · R8: Performance, Normalisation, Memoization, reselect and Reactive Logic

**Project feature:** **Dashboard** (counts by status/priority, overdue list, completion rate) driven by memoised selectors; a sortable task list whose cards re-render only when their own task changes; `createEntityAdapter` for tasks; listener middleware for save toasts and a debounced, cancellable **quick find** in the header. (The same listener technique persists preferences to cookies in 24.06.)

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 21.01 | 📖 | **Memoization from scratch**: caching by arguments; write `memoizeOne` and `memoize` | ★ |
| 21.02 | 📖 | Why selectors need memoization: `filter`/`map` return new references → `useSelector` re-renders | ★ |
| 21.03 | 🛠 | Measure first: React DevTools **Profiler** + "highlight updates" on the task list | ★ |
| 21.04 | 📖 | **reselect `createSelector`**: input selectors vs result function, how it compares inputs | ★ |
| 21.05 | 🛠 | Build: `selectVisibleTasks` (URL filters passed as arguments + sort preference), `selectStats` | ★ |
| 21.06 | 📖 | Composing selectors; selectors that take arguments (`(state, id) => …`) | ★ |
| 21.07 | 📖 | **Cache size pitfalls**: one selector shared by many components with different args; selector factories + `useMemo` | ★ |
| 21.08 | 📖 | reselect v5: `weakMapMemoize` default, `lruMemoize`, dev-mode checks (`inputStabilityCheck`, `identityFunctionCheck`) | ★ |
| 21.09 | 📖 | Common mistakes: input selectors that return new objects, memoizing things that don't need it | ★ |
| 21.10 | 📖 | `React.memo`, `useMemo`, `useCallback` in depth: when they help, when they're noise | ★ |
| 21.11 | 🛠 | Build: `TaskListItem` receives only `taskId`, memoised; confirm with the Profiler | ★ |
| 21.12 | 📖 | `createEntityAdapter`: CRUD reducers (`addOne`, `upsertMany`, `updateOne`…), `getSelectors`, sorted IDs | ★ |
| 21.13 | 🛠 | Build: migrate `tasksSlice` to an entity adapter | ★ |
| 21.14 | 📖 | **Listener middleware** (`createListenerMiddleware`): reactive logic ("when X happens, do Y"), effects, `condition`, `take`, cancellation | ★ |
| 21.15 | 🛠 | Build: a toast whenever a task is saved; a debounced **quick find** with `cancelActiveListeners` + `delay` + the listener's `signal` (aborting stale requests) | ★ |
| 21.16 | 📖 | Listeners vs thunks vs middleware: choosing the right tool | ★ |
| 21.17 | 🎯 | Your Turn: the dashboard (4 memoised stats + an overdue list); prove with the Profiler that unrelated actions (a toast, a sort change) re-render nothing on it | ★ |
| 21.18 | 💡 | Solution walkthrough | ★ |
| 21.19 | 🐞 | Debug: a `createSelector` recomputes every time (input selector returns `{...}`) | ★ |
| 21.20 | 🐞 | Debug: two `TaskColumn`s share one parameterised selector and thrash its cache | ★ |

### ✅ Knowledge check
- **Concept:** What does `createSelector` compare: inputs or output? With what equality?
- **Code reading:** How many times does the result function run across these 4 dispatches? (A trace table is given.)
- **Debugging:** The Profiler shows `TaskList` re-rendering on `ui/toastShown`. Find the culprit selector.
- **Design:** Memoise `selectTaskById`? Why is that pointless?
- **Implementation:** `makeSelectTasksByStatus()` factory used by three columns without cache thrashing.

**Checkpoint:** `s21-end`

---

## S22 · R9: RTK Query Basics

**Project feature:** `apiSlice` with a **custom `axiosBaseQuery`** (reusing the S13 Axios instance and its interceptors); tasks and categories fetched and mutated via generated hooks; thunk-based fetching removed where RTK Query fits better.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 22.01 | 📖 | **Server state vs client state**: caching, deduplication, staleness. Why thunks + slices re-invent a cache badly. | ★ |
| 22.02 | 📖 | RTK Query concepts: `createApi`, base query, endpoints, cache entries, subscriptions | ★ |
| 22.03 | 🛠 | Build: `axiosBaseQuery` so our interceptors and error normalisation still apply | ★ |
| 22.04 | 🛠 | Build: `getTasks`, `getTask`, `getCategories` queries; add the API reducer + middleware to the store | ★ |
| 22.05 | 📖 | Query hooks: `isLoading` vs `isFetching` vs `isSuccess`, `data`, `error`, `refetch`, `skip` | ★ |
| 22.06 | 📖 | Cache lifetime: subscriptions, reference counting, `keepUnusedDataFor`, `refetchOnMountOrArgChange`, `refetchOnFocus` | ★ |
| 22.07 | 📖 | Mutations: `addTask`, `updateTask`, `deleteTask`; the mutation trigger + `unwrap()` | ★ |
| 22.08 | 📖 | **Tags**: `providesTags` / `invalidatesTags`; automatic refetching after mutations | ★ |
| 22.09 | 🛠 | Build: replace list/details fetching; keep `listPrefs` + `ui` as normal slices | ★ |
| 22.10 | 📖 | RTK Query vs `createAsyncThunk`: decision table (the official guidance) | ★ |
| 22.11 | 🎯 | Your Turn: comments for a task (`getComments(taskId)`, `addComment`) with tag invalidation | ★ |
| 22.12 | 💡 | Solution walkthrough | ★ |
| 22.13 | 🐞 | Debug: after adding a task, the list doesn't refresh (tag mismatch) | ★ |
| 22.14 | 🐞 | Debug: the spinner shows on every refetch (`isLoading` vs `isFetching` confusion) | ★ |

### ✅ Knowledge check
- **Concept:** Two components call `useGetTasksQuery({ status: 'TODO' })`. How many requests happen?
- **Code reading:** Given the `providesTags`/`invalidatesTags` config, which queries refetch after `updateTask(5)`?
- **Design:** Filters: RTK Query argument or a slice? Explain the interaction.
- **Implementation:** `getStats` query invalidated by any task mutation.

**Checkpoint:** `s22-end`

---

## S23 · R10: RTK Query Advanced Patterns

**Project feature:** ID-level invalidation, optimistic toggle/delete with undo, pagination, prefetch on hover, code-split endpoints, and **cache reset on logout**.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 23.01 | 📖 | Fine-grained tags: `{ type: 'Task', id }` + `'LIST'`; minimal refetching | ★ |
| 23.02 | 📖 | `transformResponse` / `transformErrorResponse`: adapting API shapes; normalising with an entity adapter | ★ |
| 23.03 | 📖 | `selectFromResult`: selecting part of a cached result without extra re-renders | ★ |
| 23.04 | 📖 | **Optimistic updates**: `onQueryStarted` + `updateQueryData` + `patchResult.undo()` | ★ |
| 23.05 | 🛠 | Build: an optimistic "toggle done" and "delete" with rollback + error toast | ★ |
| 23.06 | 📖 | Pessimistic updates: writing the server response into the cache | ★ |
| 23.07 | 🛠 | Build: server-side pagination with `page` args; keeping previous data while fetching | ★ |
| 23.08 | 📖 | Prefetching (`usePrefetch`) and code splitting (`injectEndpoints`) | ★ |
| 23.09 | 📖 | Streaming updates (`onCacheEntryAdded`): concept + where WebSockets would fit | ＋ |
| 23.10 | 📖 | 🛡 **Cache and identity**: user A logs out, user B logs in on the same browser and sees A's cached tasks. `api.util.resetApiState()`. | ★ |
| 23.11 | 🛠 | Build: logout clears slices *and* the RTK Query cache | ★ |
| 23.12 | 📖 | Reading RTK Query's cache in DevTools: `queries`, `mutations`, `subscriptions` | ★ |
| 23.13 | 🎯 | Your Turn: optimistic "change priority" with undo, plus prefetch task details on hover | ★ |
| 23.14 | 💡 | Solution walkthrough | ★ |
| 23.15 | 🐞 | Debug: an optimistic update patches the wrong cache entry (args mismatch) | ★ |

### ✅ Knowledge check
- **Concept:** Optimistic vs pessimistic updates: user experience, failure handling, and when each is appropriate.
- **Code reading:** Which cache entries does `updateQueryData('getTasks', { page: 0 }, …)` touch?
- **Debugging:** After an error, the UI shows the optimistic state forever. What's missing?
- **Design:** Security-wise, what must happen to client caches on logout, and why isn't it enough on its own?
- **Implementation:** An infinite-scroll variant of the list (merge pages).

**Checkpoint:** `s23-end`
