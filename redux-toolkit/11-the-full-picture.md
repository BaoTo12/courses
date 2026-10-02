# Lecture 11. The full picture: one click through React, RTK Query and the store

> **By the end you can:** trace a user action in a Redux Toolkit app through every layer (React, the hook, the
> request thunk, the middleware chain, the reducers, the cache, the subscriptions) and back to the screen; say
> which tool of the course handles which kind of state.
> **New terms in this lesson:** none: this lecture puts the course together.
> **You should already know:** lectures 01–10 (see the [roadmap](00-roadmap.md)'s glossary)
> **Project files you fill in:** `demos/11-the-full-picture.tsx` (🧩 11.1)

## 1. How the app is wired, before any click

When `renderApp` runs, these pieces exist and are connected:

1. **The store** (`configureStore`, lecture 01) with four slices: `auth` and `toasts` (client state,
   `createSlice`, lectures 02–03, 08) and `api` (the RTK Query cache, lectures 09–10: posts, users, notifications).
2. **The middleware chain**, in this order:

   ```text
   dispatch ═ listenerMiddleware ─► [dev checks] ─► thunk ─► [dev checks] ─► apiSlice.middleware ─► logger ─► reducers
              (lecture 08)            (lecture 01)   (01)                      (09)                   (01)
   ```

   Whatever is dispatched enters at the top. A function stops at the thunk middleware, which calls it.
3. **The API slice** knows its endpoints, including those injected by the users and notifications files.
   `main.tsx` subscribes to `getUsers` for the app's whole life.
4. **React**: `<Provider store>` around `<App>`. Every `useAppSelector` and every RTK Query hook is a subscriber of
   the store. After each dispatch, each one re-runs its selector and re-renders its component only if the selected
   value changed.

## Build step 11.1: the demo

Open `demos/11-the-full-picture.tsx`. Replace the placeholder `🧩 11.1` with:

```tsx
// Lecture 11 demo: one click traced through React, RTK Query, the middleware and the cache.
import { rootElement, find, findAll, findButton, choose, click, wait, inAct } from '../src/debug/testDom';
import { store } from '../src/app/store';
import { apiSlice } from '../src/features/api/apiSlice';
import { renderApp } from '../src/main';

const rocketsOfP1 = () =>
  apiSlice.endpoints.getPosts.select()(store.getState()).data?.find((post) => post.id === 'p1')?.reactions.rocket;

console.log('— Setup: Ada logs in, the posts and the notifications load —');
await inAct(() => renderApp(rootElement));
await wait(300);
await choose(find<HTMLSelectElement>('select'), 'u1');
await click(findButton('Log in'));
await wait(1100);

console.log('\n— One click: 🚀 on "First post!" —');
console.log('  cache before: p1 🚀 =', rocketsOfP1());
const rocket = findAll<HTMLButtonElement>('button').filter((button) => button.textContent?.startsWith('🚀'))[1];
console.log('👆 click');
await click(rocket);
console.log('👆 click handled; cache now: p1 🚀 =', rocketsOfP1());
await wait(300);
console.log('✅ the server confirmed; cache: p1 🚀 =', rocketsOfP1());

process.exit(0);
```

## Run it

```bash
npm run lesson 11
```

Expected output (not run). As always, a `🌐` line can sit a line earlier or later.

```text
— Setup: Ada logs in, the posts and the notifications load —
    📝 api/executeQuery/pending (getUsers)
        🖼  App renders
        🖼  Toasts renders
        🖼  LoginForm renders
  🌐 server: GET /users (answers in 200 ms)
    📝 api/executeQuery/fulfilled (getUsers)
        🖼  LoginForm renders
        🖼  LoginForm renders
    📝 auth/userLoggedIn
    📝 toasts/toastShown
        🖼  App renders
        🖼  Toasts renders
        🖼  Navbar renders
        🖼  NotificationsList renders
        🖼  AddPostForm renders
        🖼  PostsList renders
    📝 api/executeQuery/pending (getPosts)
    📝 api/executeQuery/pending (getNotifications)
  🔌 channel opened
    📝 api/executeQuery/rejected (getPosts, skipped by condition)
        🖼  NotificationsList renders
        🖼  PostsList renders
  🌐 server: GET /posts (answers in 200 ms)
  🌐 server: GET /notifications (answers in 200 ms)
    📝 api/executeQuery/fulfilled (getPosts)
    📝 api/executeQuery/fulfilled (getNotifications)
    📝 toasts/toastHidden
        🖼  Toasts renders
        🖼  Navbar renders
        🖼  NotificationsList renders
        🖼  PostsList renders
        🖼  PostExcerpt "Redux Toolkit" renders
        🖼  PostExcerpt "First post!" renders

— One click: 🚀 on "First post!" —
  cache before: p1 🚀 = 0
👆 click
    📝 api/executeMutation/pending (addReaction)
    📝 api/queries/queryResultPatched
        🖼  PostsList renders
        🖼  PostExcerpt "First post!" renders
👆 click handled; cache now: p1 🚀 = 1
  🌐 server: POST /posts/p1/reactions {"reaction":"rocket"} (answers in 200 ms)
    📝 api/executeMutation/fulfilled (addReaction)
✅ the server confirmed; cache: p1 🚀 = 1
```

### Reading the setup

- `renderApp` subscribed to `getUsers` (pending), React drew the login form with no users yet; the users arrived
  and `LoginForm` re-rendered; choosing Ada re-rendered it again.
- The login: a **client-state** action (`auth/userLoggedIn`), then the **listener** (lecture 08) reacted with a toast.
  React drew the feed. Each component's hook then subscribed in an effect: `Navbar` started `getPosts`,
  `NotificationsList` started `getNotifications` (and its `onCacheEntryAdded` opened the channel), `PostsList` found
  `getPosts` already in progress (skipped by condition, one request for two components).
- `Navbar` did **not** re-render on the `pending` actions: its `selectFromResult` returns only a count, still 0.
  `NotificationsList` and `PostsList` did (their hook results changed).
- The answers arrived, the toast expired: one render pass for everything.

## 2. The click, step by step

1. The user clicks 🚀 in the `ReactionButtons` of "First post!".
2. Its `onClick` calls the mutation hook's trigger, `addReaction({ postId: 'p1', reaction: 'rocket' })`.
3. The trigger dispatches the endpoint's request thunk (`initiate`). It enters the chain at the top: the listener
   middleware passes it on, the thunk middleware calls it.
4. The thunk (built on `createAsyncThunk`, lecture 05) dispatches `api/executeMutation/pending` **synchronously**. That
   action goes down the whole chain: the logger prints it, the API slice's reducer records "mutation pending".
5. On its way back up, the **API middleware** sees the pending mutation and calls `addReaction`'s `onQueryStarted`
   (lecture 10). It dispatches `updateQueryData('getPosts', …)`, a thunk that runs our Immer recipe
   (`post.reactions.rocket++`) on the `getPosts` cache entry and dispatches `api/queries/queryResultPatched`.
6. The store notifies its subscribers. `PostsList`'s hook sees a new `data` array: re-render scheduled. `Navbar`'s
   `selectFromResult` returns the same count: nothing. Inside `PostsList`, `memo` (lecture 06) will skip "Redux
   Toolkit" (same object, thanks to Immer's structural sharing), and re-render "First post!".
7. Meanwhile the thunk has started the request (`fetchBaseQuery` → `fetch`) and paused at `await`. The click
   handler returns. React renders. **The screen shows 🚀 1 before the request has reached the server.**
8. 200 ms later the server confirms: `api/executeMutation/fulfilled`. `onQueryStarted`'s `await queryFulfilled`
   resolves; nothing to undo. No refetch: `addReaction` invalidates no tags anymore.

The call stack at the deepest moment, step 5, while our recipe runs (top = running now; each line waits for the one
above):

```text
our recipe: post.reactions[reaction]++             ← Immer draft of the getPosts cache entry
updateQueryData's thunk                            ← runs the recipe with Immer, dispatches queryResultPatched next
addReaction's onQueryStarted                       ← lifecycleApi.dispatch(apiSlice.util.updateQueryData(…))
API middleware (query lifecycle), after next(pending)   ← the pending action already reached the reducers
… the chain for the pending action (thunk middleware, listener middleware)
createAsyncThunk's thunk for executeMutation       ← dispatch(pending) — synchronously, before any await
thunk middleware                                   ← "a function? call it"
listener middleware                                ← passes the thunk on (it isn't an action)
the mutation trigger                               ← dispatch(apiSlice.endpoints.addReaction.initiate(arg))
ReactionButtons' onClick
React's event handling
the click                                          ← the bottom: the first call
```

The timeline:

| Time | What happens | Printed |
|---|---|---|
| 0 ms | click → trigger → thunk → `pending` → `onQueryStarted` → cache patched | `📝 …/pending`, `📝 …queryResultPatched` |
| 0 ms | the thunk awaits the request; the handler returns; React re-renders | `🖼 PostsList`, `🖼 PostExcerpt "First post!"` |
| 0 ms | the demo reads the cache | `cache now: p1 🚀 = 1` |
| ~5 ms | the request reaches the server | `🌐 server: POST …` |
| 200 ms | the server answers; the thunk continues after `await`, dispatches `fulfilled`; `queryFulfilled` resolves | `📝 …/fulfilled` |

## 3. The whole course, in one map

```text
                    ┌──────────────────── store (configureStore, 01) ─────────────────────┐
 React              │  client state                       server state                    │
 (04, 06)           │  auth   ← createSlice (02, 03)      api ← createApi (09, 10)         │
 useAppSelector ────┤  toasts ← createSlice + listener    │  getPosts    tags, optimistic  │
 useXQuery ─────────┤          (08)                        │  getUsers    injected, transformResponse, adapter (07)
 useXMutation ──────┤                                      │  getNotifications  streaming   │
                    │  middleware: listener (08) · thunk + checks (01) · api (09) · logger  │
                    └──────────────────────────────────────────────────────────────────────┘
 Before RTK Query, server data used: createAsyncThunk (05) · createSelector/memo (06) · createEntityAdapter (07)
```

Which tool for which job:

| You have… | Use | Lecture |
|---|---|---|
| state the app owns, changed by user actions | `createSlice` (+ prepare, `extraReducers`, slice selectors) | 02, 03 |
| data that lives on a server | RTK Query: `createApi`, query and mutation hooks, tags | 09, 10 |
| a collection you look up by id | `createEntityAdapter` (in a slice, or in `transformResponse`) | 07, 10 |
| derived data | `createSelector`, `selectFromResult` | 06, 10 |
| logic that must run when an action happens | the listener middleware | 08 |
| an async process the UI starts that isn't "fetch/cache data" | `createAsyncThunk` | 05 |
| a component that re-renders too often | measure, then `memo`, ids instead of objects, memoized selectors | 06, 07 |

## Summary

The course in one sentence: **Redux Toolkit is Redux with the repetitive parts generated: `configureStore` sets up
the store, `createSlice` writes reducers and actions with Immer, `createAsyncThunk` and the listener middleware
handle side effects, and RTK Query turns server data into a cache that components simply subscribe to.**

**Back to:** [the roadmap](00-roadmap.md) · [the Redux course](../redux/00-roadmap.md), for what all of this
generates.
