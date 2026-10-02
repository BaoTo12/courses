# Redux Toolkit, from zero: course roadmap

## What it is

Redux Toolkit (RTK) is the official, recommended way to write Redux. It's the same Redux (one store, actions,
reducers, middleware) with functions that generate the repetitive parts, development checks that catch the classic
mistakes, and RTK Query, a tool that fetches, caches and refreshes server data for you.

## The problem it solves

Hand-written Redux repeats the same work in every app: store setup, an action type, a creator and a `switch` case
per action, hand-made immutable copies at every level, and the same loading/success/failure code for every request.
That's a lot of code, and every copy is a chance for a mistake (a mutation, a forgotten case, a stale list). RTK
writes that code, and RTK Query removes most of the data-fetching state from your slices altogether.

## What you need to know first

| Prerequisite | Why |
|---|---|
| Redux's core ideas: state, action, reducer, store, dispatch, middleware, selector, thunk | RTK generates them; lecture 01 recaps them in one table. The [Redux course](../redux/00-roadmap.md) teaches them from zero |
| TypeScript: types, interfaces, unions, generics | all the code is strict TypeScript |
| React: components, props, `useState`, `useEffect` | from lecture 04 |
| Promises, `async`/`await` | from lecture 05 |

## Version and setup

- `@reduxjs/toolkit` 2 (with Immer 10, Reselect 5, RTK Query), `react-redux` 9, React 19, TypeScript 5 (strict).
- The official tutorial this course covers: [Redux Essentials](https://redux.js.org/tutorials/essentials/part-1-overview-concepts),
  all eight parts (Redux Toolkit app structure, data flow, using Redux data, async logic, performance and
  normalization, reactive logic, RTK Query basics and advanced patterns), plus the RTK part of Redux Fundamentals
  ("Modern Redux with Redux Toolkit").
- Setup: `cd project`, `npm install`, then `npm run lesson 01`. See [project/README.md](project/README.md).

## The project

A small **social feed**: log in as one of two users, read the posts, write a post, react to posts (👍 ❤️ 🚀), see
toasts and live notifications. The data comes from a real HTTP server running inside the demo (given). Everything
runs in Node; the UI is a simulated page (jsdom), printed as text by each demo.

The project is a **skeleton**: every file exists, and the code the course teaches is replaced by 🧩 placeholders.
Each lecture's build steps give you the exact code. The posts start as client-side slices (lectures 02–07), then
move to RTK Query (lectures 09–10): you build both ways and see why the second exists.

## The concept ladder

Each term relies only on terms above it.

1. **Redux recap**: state, immutable update, action, reducer, slice, store, dispatch, middleware, selector, thunk, action creator
2. **Redux Toolkit / `configureStore` / default middleware / immutability check / serializability check / `getDefaultMiddleware` / `Tuple`**
3. **Immer / draft / `produce` (`createNextState`) / auto-freeze**
4. **`createSlice` / case reducer / `PayloadAction` / generated action creator / `.match` / `createAction`**
5. **prepare callback / `nanoid` / `extraReducers` / builder / slice selectors**
6. **`Provider` / `useSelector` / `useDispatch` / `.withTypes()` / feature folder**
7. **`createAsyncThunk` / payload creator / lifecycle actions / `requestId` / `condition` / `SerializedError` / `.unwrap()` / `createAppAsyncThunk`**
8. **`React.memo` / `createSelector` / selector with arguments / `recomputations()`**
9. **normalized state / `createEntityAdapter` / `EntityState` / CRUD methods / `getSelectors` / `sortComparer`**
10. **reactive logic / listener / `createListenerMiddleware` / effect / listener API / matcher / `isAnyOf`**
11. **server vs client state / RTK Query / API slice / `createApi` / `fetchBaseQuery` / endpoint / generated hooks / cache entry / subscription / `keepUnusedDataFor` / tags**
12. **tag with id / `injectEndpoints` / `transformResponse` / `select()` / `selectFromResult` / optimistic update / `onQueryStarted` / `updateQueryData` / `undo()` / streaming update / `onCacheEntryAdded`**
13. the full picture

## Lectures

| # | Lecture | Terms it introduces | Files it fills | Status |
|---|---|---|---|---|
| 01 | [From Redux to Redux Toolkit](01-from-redux-to-redux-toolkit.md) | RTK, `configureStore`, default middleware, immutability/serializability checks, `getDefaultMiddleware`, `Tuple` | `authSlice.ts` (by hand), `logger.ts`, `store.ts` | written |
| 02 | [createSlice and Immer](02-create-slice-and-immer.md) | Immer, draft, `produce`, auto-freeze, `createSlice`, case reducer, `PayloadAction`, `.match`, `createAction` | `naiveProduce.ts`, `authSlice.ts`, `postsSlice.ts` | written |
| 03 | [Prepare callbacks and extraReducers](03-prepare-and-extra-reducers.md) | prepare callback, `nanoid`, `extraReducers`, builder, slice selectors | `postsSlice.ts`, `authSlice.ts` | written |
| 04 | [React with Redux Toolkit](04-react-with-redux-toolkit.md) | `.withTypes()`, feature folder | `hooks.ts`, `usersSlice.ts`, the components, `App.tsx`, `main.tsx` | written |
| 05 | [createAsyncThunk](05-create-async-thunk.md) | `createAsyncThunk`, payload creator, lifecycle actions, `requestId`, `condition`, `SerializedError`, `.unwrap()`, `createAppAsyncThunk` | `withTypes.ts`, posts & users slices, `PostsList`, `AddPostForm` | written |
| 06 | [Selectors and performance](06-selectors-and-performance.md) | `React.memo`, `createSelector`, selector with arguments, `recomputations()` | `postsSlice.ts`, `PostsList`, `PostExcerpt`, `Navbar` | written |
| 07 | [Normalized state with createEntityAdapter](07-normalized-state-with-entity-adapter.md) | `createEntityAdapter`, `EntityState`, CRUD methods, `getSelectors`, `sortComparer` | posts & users slices, `PostsList`, `PostExcerpt`, `Navbar` | written |
| 08 | [The listener middleware](08-listener-middleware.md) | reactive logic, listener, `createListenerMiddleware`, effect, listener API, matcher, `isAnyOf` | `toastsSlice.ts`, `listenerMiddleware.ts`, `toastListeners.ts`, `Toasts.tsx` | written |
| 09 | [RTK Query basics](09-rtk-query-basics.md) | server vs client state, RTK Query, API slice, `createApi`, `fetchBaseQuery`, endpoint, hooks, cache entry, subscription, `keepUnusedDataFor`, tags | `apiSlice.ts`, the posts components, `store.ts`, `logger.ts` | written |
| 10 | [RTK Query advanced](10-rtk-query-advanced.md) | tag with id, `injectEndpoints`, `transformResponse`, `select()`, `selectFromResult`, optimistic update, `onQueryStarted`, `updateQueryData`, streaming, `onCacheEntryAdded` | `apiSlice.ts`, `usersSlice.ts`, `notificationsApi.ts`, `NotificationsList.tsx` | written |
| 11 | [The full picture](11-the-full-picture.md) | (none) | `demos/11` | written |

## Glossary

| Term | Meaning | Lecture |
|---|---|---|
| Redux Toolkit (RTK) | the official package for writing Redux, with helpers and development checks | 01 |
| `configureStore` | creates the store: combines reducers, adds default middleware and DevTools | 01 |
| default middleware | thunk + (development) immutability, serializability and action-creator checks | 01 |
| immutability check | throws when the state was mutated instead of copied | 01 |
| serializability check | warns when an action or the state contains non-plain data | 01 |
| `getDefaultMiddleware` | returns the default middleware list, in `configureStore`'s `middleware` callback | 01 |
| `Tuple` | RTK's typed array of middleware (`.concat`, `.prepend`) | 01 |
| Immer | turns "mutations" on a draft into immutable updates with structural sharing | 02 |
| draft | the stand-in for the state that a case reducer may mutate | 02 |
| `produce` / `createNextState` | Immer's `(base, recipe) => newState` | 02 |
| auto-freeze | Immer freezes what it produces (development) | 02 |
| `createSlice` | generates a slice reducer and its action creators | 02 |
| case reducer | a function in `reducers` that handles one action | 02 |
| `PayloadAction<P>` | the type of an action with a payload `P` | 02 |
| generated action creator | `slice.actions.x(payload)`, with `.type` and `.match` | 02 |
| `createAction` | builds one action creator | 02 |
| prepare callback | turns an action creator's arguments into `{ payload }` | 03 |
| `nanoid` | RTK's random id generator | 03 |
| `extraReducers` / builder | responding to actions defined elsewhere: `addCase`, `addMatcher`, `addDefaultCase` | 03 |
| slice selectors | selectors declared in `createSlice({ selectors })`, called with the root state | 03 |
| `.withTypes()` | the same function with the app's types fixed (hooks, `createAsyncThunk`, listeners) | 04 |
| feature folder | everything about one feature in one folder | 04 |
| `createAsyncThunk` | a thunk creator that dispatches pending/fulfilled/rejected around an async function | 05 |
| payload creator | the async function given to `createAsyncThunk` | 05 |
| lifecycle actions | `x.pending`, `x.fulfilled`, `x.rejected` | 05 |
| `requestId` | the unique id of one call, in `meta` | 05 |
| `condition` | cancels an async thunk before it starts | 05 |
| `SerializedError` | the plain-object form of an error | 05 |
| `.unwrap()` | "the payload, or throw" for a dispatched async thunk (or RTK Query trigger) | 05 |
| `createAppAsyncThunk` | `createAsyncThunk.withTypes<{ state; dispatch }>()` | 05 |
| `React.memo` | skips re-rendering a component whose props are all unchanged | 06 |
| `createSelector` | memoized selectors (Reselect) | 06 |
| selector with arguments | `selector(state, arg)`; the argument becomes an input | 06 |
| normalized state | `{ ids, entities }` | 07 |
| `createEntityAdapter` | CRUD reducer functions and selectors for a normalized collection | 07 |
| `EntityState<T, Id>` | `{ ids: Id[]; entities: Record<Id, T> }` | 07 |
| `getSelectors` | the adapter's selectors for the root state | 07 |
| `sortComparer` | keeps an adapter's `ids` sorted | 07 |
| reactive logic | code that runs because an action happened | 08 |
| listener / effect | "which actions" + "what to do" / the function that does it | 08 |
| `createListenerMiddleware` | the middleware that runs listeners after the reducers | 08 |
| listener API | `getState`, `getOriginalState`, `dispatch`, `delay`, `condition`, `take`… | 08 |
| matcher / `isAnyOf` | a function selecting actions / builds one from several action creators | 08 |
| server state vs client state | data owned by a server (cache it) vs data owned by the app (reducers) | 09 |
| RTK Query / API slice | RTK's fetching and caching tool / the object `createApi` returns | 09 |
| `createApi` / `fetchBaseQuery` | defines an API slice / the default `fetch`-based base query | 09 |
| endpoint (query / mutation) | one server operation: read / change | 09 |
| generated hooks | `useXQuery`, `useXMutation` | 09 |
| cache entry / cache key | one stored result / endpoint name + serialized argument | 09 |
| subscription | "something is using this entry" | 09 |
| `keepUnusedDataFor` | seconds an unused entry is kept (default 60) | 09 |
| tags | `providesTags` / `invalidatesTags`: what a mutation makes refetch | 09 |
| tag with id | `{ type, id }`: marks one item | 10 |
| `injectEndpoints` | adds endpoints to an API slice from another file | 10 |
| `transformResponse` | reshapes a response before caching | 10 |
| `endpoint.select(arg)` | a selector for one cache entry | 10 |
| `selectFromResult` | a hook option: select part of the result; re-render only for that | 10 |
| optimistic update | change the cache before the server confirms; undo on failure | 10 |
| `onQueryStarted` | endpoint option called when a request starts | 10 |
| `updateQueryData` / patch / `undo()` | patch a cache entry with Immer / the recorded change / its reversal | 10 |
| streaming update / `onCacheEntryAdded` | keep an entry updated from a live connection / the option that does it | 10 |
