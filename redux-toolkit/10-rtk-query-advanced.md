# Lecture 10. RTK Query advanced: precise refetching, transformed and selected results, optimistic and streaming updates

> **By the end you can:** refetch only the cache entries that contain a changed item (tags with ids); split an API
> across files with `injectEndpoints`; reshape a response with `transformResponse`; re-render a component only for
> the part of a result it uses (`selectFromResult`); update the cache **before** the server answers, and undo it on
> failure; keep a cache entry updated from a live connection.
> **New terms in this lesson:** tag with id, `injectEndpoints`, `transformResponse`, `endpoint.select()`,
> `selectFromResult`, optimistic update, `onQueryStarted`, `updateQueryData`, patch / `undo()`, streaming update,
> `onCacheEntryAdded`, `updateCachedData`
> **You should already know:** RTK Query basics: API slice, endpoints, hooks, cache entry, subscription, tags
> ([09](09-rtk-query-basics.md)); entity adapter ([07](07-normalized-state-with-entity-adapter.md)); `createSelector`
> ([06](06-selectors-and-performance.md)); Immer drafts ([02](02-create-slice-and-immer.md))
> **Project files you fill in:** `src/features/api/apiSlice.ts`, `src/features/users/usersSlice.ts`,
> `src/components/Navbar.tsx`, `src/app/store.ts`, `src/main.tsx`, `src/App.tsx` (changes),
> `src/features/notifications/notificationsApi.ts` (🧩 10.5), `src/features/notifications/NotificationsList.tsx`
> (🧩 10.6), `demos/10-rtk-query-advanced.tsx` (🧩 10.7)

## 1. Tags with ids: refetch only what contains the changed item

With `invalidatesTags: ['Post']`, **any** post mutation refetches **every** entry that provides `'Post'`. Editing
post p1 would also refetch `getPost('p2')`, which can't have changed.

A tag can carry an **id**: `{ type: 'Post', id: 'p1' }`. A query declares which items its result contains; a
mutation declares which item it changed; only entries that contain that item are refetched.

| Endpoint | Tags | Meaning |
|---|---|---|
| `getPosts` | `providesTags: (result = []) => ['Post', ...result.map(({ id }) => ({ type: 'Post', id }))]` | "the list" + one tag per post in it |
| `getPost` | `providesTags: (result, error, postId) => [{ type: 'Post', id: postId }]` | "this one post" |
| `addNewPost` | `invalidatesTags: ['Post']` | "the list changed" (a new post isn't in any id tag yet) |
| `editPost` | `invalidatesTags: (result, error, arg) => [{ type: 'Post', id: arg.id }]` | "this post changed" |

`providesTags` / `invalidatesTags` can be functions of `(result, error, arg)`: they're called with the request's
result (or error) and argument. A plain `'Post'` tag matches every `{ type: 'Post', … }` tag.

### Build step 10.1: tags with ids, and an `editPost` mutation

In `src/features/posts/postsSlice.ts` (the types file), add:

```ts
export type PostUpdate = Pick<Post, 'id' | 'title' | 'content'>;
```

In `src/features/api/apiSlice.ts`, import it next to the other types, and replace `getPosts` and `getPost` with:

```ts
    getPosts: builder.query<Post[], void>({
      query: () => '/posts',
      providesTags: (result = []) => ['Post', ...result.map(({ id }) => ({ type: 'Post' as const, id }))],
    }),
    getPost: builder.query<Post, string>({
      query: (postId) => `/posts/${postId}`,
      providesTags: (_result, _error, postId) => [{ type: 'Post', id: postId }],
    }),
```

and add this endpoint after `addNewPost`:

```ts
    editPost: builder.mutation<Post, PostUpdate>({
      query: ({ id, ...changes }) => ({ url: `/posts/${id}`, method: 'PATCH', body: changes }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Post', id }],
    }),
```

What each part does:
- `(result = []) =>`: when the request failed, `result` is `undefined`; the default makes it an empty list.
- `'Post' as const`: tells TypeScript the type is the literal `'Post'` (one of `tagTypes`), not any `string`.
- `editPost`: `({ id, ...changes })` takes the id out and sends the rest as the PATCH body. It invalidates only
  that post's tag: `getPosts` (which provides it, since p1 is in the list) is refetched; `getPost('p2')` isn't.

## 2. `injectEndpoints`: one API, endpoints in the feature folders

In a big app, one file with every endpoint grows long, and it imports types from every feature. **`injectEndpoints`**
adds endpoints to an existing API slice from another file, so each feature keeps its endpoints.

> **API card: `injectEndpoints` (on an API slice)**
>
> ```ts
> apiSlice.injectEndpoints({ endpoints: (builder) => ({ … }) }): ApiSliceWithTheNewEndpoints;
> ```
>
> **What it does:** adds the endpoints to `apiSlice` itself (same reducer, same middleware, same cache) and returns
> the **same object**, typed with the new endpoints and hooks. Use the returned value: it's the one whose type
> knows them. The file must be imported (somewhere in the app) before the endpoints are used.

## 3. `transformResponse`: reshape what the server sent before caching it

The server sends users as an array. Our components look users up by id (`selectUserById`), which an entity state
does best (lecture 07). **`transformResponse`** is an endpoint option: a function that receives the response body
and returns what to store in the cache instead.

## 4. Reading a cache entry from selectors: `endpoint.select()`

Components can use the hook; but `PostAuthor`, `LoginForm` and the toast listener use **selectors**
(`selectUserById(state, id)`). `apiSlice.endpoints.getUsers.select(arg)` returns a selector for one cache entry
(`{ status, data, … }`), which we can combine with `createSelector` and the adapter's selectors. The rest of the app
doesn't change: same selector names, same arguments.

### Build step 10.2: the users come from an injected endpoint

Replace the whole content of `src/features/users/usersSlice.ts` with:

```ts
import { createEntityAdapter, createSelector, type EntityState } from '@reduxjs/toolkit';
import { apiSlice } from '../api/apiSlice';
import type { RootState } from '../../app/store';

export interface User {
  id: string;
  name: string;
}

const usersAdapter = createEntityAdapter<User>();
const initialState = usersAdapter.getInitialState();

export const apiSliceWithUsers = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<EntityState<User, string>, void>({
      query: () => '/users',
      transformResponse: (response: User[]) => usersAdapter.setAll(initialState, response),
    }),
  }),
});

export const { useGetUsersQuery } = apiSliceWithUsers;

const selectUsersResult = apiSliceWithUsers.endpoints.getUsers.select();
const selectUsersData = createSelector([selectUsersResult], (result) => result.data ?? initialState);

export const { selectAll: selectAllUsers, selectById: selectUserById } = usersAdapter.getSelectors(
  (state: RootState) => selectUsersData(state),
);
```

What each part does:
- `apiSliceWithUsers`: `apiSlice` with a `getUsers` endpoint, declared in the users' folder.
- `builder.query<EntityState<User, string>, void>`: the **cached** type is the entity state, not the array.
- `transformResponse(response: User[])`: the server's array → `usersAdapter.setAll(initialState, response)`, which,
  called outside a reducer, simply returns a new entity state.
- `selectUsersResult`: the cache entry of `getUsers(undefined)`. `selectUsersData`: its data, or an empty entity
  state while it's not loaded (memoized, so the empty fallback is always the same object).
- `getSelectors(selectUsersData)`: the adapter's selectors, reading from the cache instead of a slice. Same names as
  before (`selectAllUsers`, `selectUserById`), so `LoginForm`, `PostAuthor`, `Navbar` and the toast listener don't
  change.

In `src/app/store.ts`, **remove** `users: usersReducer` and its import: the users are in `state.api` now.

In `src/main.tsx`, replace the `fetchUsers` import and its dispatch with:

```tsx
import { apiSliceWithUsers } from './features/users/usersSlice';
```

```tsx
  store.dispatch(apiSliceWithUsers.endpoints.getUsers.initiate());
```

The app subscribes to the users once, at start, for its whole life (the subscription is never removed).

## 5. `selectFromResult`: re-render only for the part you use

Lecture 09's demo showed `Navbar` re-rendering on every refetch, although it only shows a count: the hook's result
object (`isFetching`, `data`…) changed. **`selectFromResult`** is a hook option: a function that receives the
result and returns only what the component needs. The component re-renders only when that **returned object**
changes (compared field by field with `===`, a shallow comparison).

### Build step 10.3: `Navbar` selects only the count

In `src/components/Navbar.tsx`, replace the two lines

```tsx
  const { data: posts = [] } = useGetPostsQuery();
  const postCount = posts.filter((post) => post.user === currentUserId).length;
```

with

```tsx
  const { postCount } = useGetPostsQuery(undefined, {
    selectFromResult: ({ data }) => ({
      postCount: data?.filter((post) => post.user === currentUserId).length ?? 0,
    }),
  });
```

`Navbar` now re-renders only when the number changes. It's still a subscriber of the same cache entry: no extra
request. (The first argument, `undefined`, is the query's argument: `getPosts` takes none.)

## 6. Optimistic update: show the change before the server confirms

Lecture 09's reactions invalidate `'Post'`: one click → request → refetch the whole list → the number changes 400 ms
later. For a "like" button, the user expects the number to change **immediately**.

An **optimistic update** changes the cached data right away, assuming the request will succeed; if it fails, the
change is undone. RTK Query gives an endpoint a hook for this moment:

> **API card: `onQueryStarted` (endpoint option) and `util.updateQueryData`**
>
> ```ts
> async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) { … }   // runs when the request starts
> apiSlice.util.updateQueryData(endpointName, queryArg, (draft) => { … }): Thunk<PatchResult>;
> // PatchResult: { patches, inversePatches, undo(): void }
> ```
>
> **What they do:** `onQueryStarted` is called as soon as the mutation (or query) starts, with its argument;
> `queryFulfilled` is a Promise that resolves with the result, or rejects if the request fails.
> `updateQueryData('getPosts', undefined, recipe)` is a thunk: dispatching it runs `recipe` on an Immer draft of that
> cache entry's data, stores the result, and returns a **patch**: the list of changes made, and `undo()`, which
> applies the reverse changes. The cache update is dispatched as an `api/queries/queryResultPatched` action.

### Build step 10.4: optimistic reactions

In `src/features/api/apiSlice.ts`, replace the `addReaction` endpoint with:

```ts
    addReaction: builder.mutation<Post, { postId: string; reaction: ReactionName }>({
      query: ({ postId, reaction }) => ({ url: `/posts/${postId}/reactions`, method: 'POST', body: { reaction } }),
      async onQueryStarted({ postId, reaction }, lifecycleApi) {
        const patch = lifecycleApi.dispatch(
          apiSlice.util.updateQueryData('getPosts', undefined, (draft) => {
            const post = draft.find((p) => p.id === postId);
            if (post) post.reactions[reaction]++;
          }),
        );
        try {
          await lifecycleApi.queryFulfilled;
        } catch {
          patch.undo(); // the server refused: put the cache back as it was
        }
      },
    }),
```

What each part does:
- No `invalidatesTags` anymore: we update the cache ourselves, so there's nothing to refetch.
- `onQueryStarted({ postId, reaction }, lifecycleApi)`: called when the mutation starts, with its argument.
- `updateQueryData('getPosts', undefined, …)`: the cache entry `getPosts(undefined)`; the recipe increments the
  reaction on the draft, Immer-style (lecture 02). Every component using that entry re-renders right away.
- `await lifecycleApi.queryFulfilled`: wait for the server. On success, keep the change. On failure, `patch.undo()`.
- `apiSlice` is used inside its own definition: fine, because `onQueryStarted` runs later, when `apiSlice` exists.

## 7. Streaming updates: a cache entry that a live connection keeps up to date

Notifications should appear **when the server sends them**, not when we ask. Servers push messages through a
long-lived connection, usually a WebSocket. The given server has a small stand-in: `openNotificationsChannel()`
returns an object with `addEventListener('message', …)` and `close()`, like a WebSocket, and
`server.pushNotification(text)` (a test knob) sends a message to every open channel.

> **API card: `onCacheEntryAdded` (endpoint option)**
>
> ```ts
> async onCacheEntryAdded(arg, { cacheDataLoaded, cacheEntryRemoved, updateCachedData, dispatch, getState }) { … }
> ```
>
> **What it does:** called once when a cache entry is **created** (its first subscriber arrives).
> `cacheDataLoaded` resolves when the first request's data is in the cache (rejects if the entry is removed before).
> `updateCachedData(recipe)` updates **this** entry's data with an Immer recipe (it's `updateQueryData` for the entry
> at hand). `cacheEntryRemoved` resolves when the entry is removed (no subscribers for `keepUnusedDataFor`): the
> place to close the connection. This is a **streaming update**: the cache entry keeps receiving data.

### Build step 10.5: the notifications endpoint

Open `src/features/notifications/notificationsApi.ts`. Replace the placeholder `🧩 10.5` with:

```ts
import { openNotificationsChannel } from '../../api/server';
import { apiSlice } from '../api/apiSlice';

export interface Notification {
  id: string;
  message: string;
  date: string;
}

export const apiSliceWithNotifications = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<Notification[], void>({
      query: () => '/notifications',
      async onCacheEntryAdded(_arg, lifecycleApi) {
        const channel = openNotificationsChannel();
        try {
          await lifecycleApi.cacheDataLoaded;
          channel.addEventListener('message', (event) => {
            const incoming: Notification[] = JSON.parse(event.data);
            lifecycleApi.updateCachedData((draft) => {
              draft.push(...incoming);
            });
          });
        } catch {
          // the entry was removed before its first data arrived: nothing to listen for
        }
        await lifecycleApi.cacheEntryRemoved;
        channel.close();
      },
    }),
  }),
});

export const { useGetNotificationsQuery } = apiSliceWithNotifications;
```

What each part does:
- The connection opens as soon as the entry is created, so no message sent during the first request is lost.
- `await cacheDataLoaded`: start applying messages only once the initial list is in the cache.
- Each message carries an array of new notifications (`event.data` is JSON text); `updateCachedData` appends them.
- `await cacheEntryRemoved` keeps this function waiting for the whole life of the entry; then the channel closes.

### Build step 10.6: `NotificationsList`

Open `src/features/notifications/NotificationsList.tsx`. Replace the placeholder `🧩 10.6` with:

```tsx
import { useGetNotificationsQuery } from './notificationsApi';

export function NotificationsList() {
  const { data: notifications = [] } = useGetNotificationsQuery();
  console.log('        🖼  NotificationsList renders');
  return (
    <section>
      <h2>Notifications ({notifications.length})</h2>
      {notifications.map((notification) => (
        <p key={notification.id}>🔔 {notification.message}</p>
      ))}
    </section>
  );
}
```

In `src/App.tsx`, import it and add `<NotificationsList />` right after `<Navbar />` in the feed.

## Build step 10.7: the demo

Open `demos/10-rtk-query-advanced.tsx`. Replace the placeholder `🧩 10.7` with:

```tsx
// Lecture 10 demo: tags with ids, injected + transformed users, optimistic and streaming updates.
import { rootElement, find, findAll, findButton, choose, click, wait, inAct } from '../src/debug/testDom';
import { server } from '../src/api/server';
import { store } from '../src/app/store';
import { apiSlice } from '../src/features/api/apiSlice';
import { apiSliceWithUsers, selectAllUsers } from '../src/features/users/usersSlice';
import { renderApp } from '../src/main';

const buttonsStartingWith = (emoji: string) =>
  findAll<HTMLButtonElement>('button').filter((button) => button.textContent?.startsWith(emoji));
const showReactions = (label: string) =>
  console.log(
    `  ${label}: ` +
      findAll('article')
        .map((a) => `${a.querySelector('h3')!.textContent} ${findAllIn(a, 'button').join(' ')}`)
        .join(' | '),
  );
const findAllIn = (element: Element, selector: string) =>
  [...element.querySelectorAll(selector)].map((e) => e.textContent);

console.log('— 1. Tags with ids: editing p1 refetches only what contains p1 —');
const postsRequest = store.dispatch(apiSlice.endpoints.getPosts.initiate());
const postRequest = store.dispatch(apiSlice.endpoints.getPost.initiate('p2'));
await Promise.all([postsRequest, postRequest]);
const invalidated = apiSlice.util.selectInvalidatedBy(store.getState(), [{ type: 'Post', id: 'p1' }]);
console.log('  entries containing p1:', invalidated.map((entry) => entry.queryCacheKey));
await store.dispatch(
  apiSlice.endpoints.editPost.initiate({ id: 'p1', title: 'First post (edited)', content: 'Hello, everyone.' }),
);
await wait(300);
console.log('  p1 in the list:', apiSlice.endpoints.getPosts.select()(store.getState()).data?.find((p) => p.id === 'p1')?.title);

console.log('\n— 2. Users: an injected endpoint, transformed into an entity state —');
await store.dispatch(apiSliceWithUsers.endpoints.getUsers.initiate());
console.log('  cached data keys:', Object.keys(apiSliceWithUsers.endpoints.getUsers.select()(store.getState()).data ?? {}));
console.log('  selectAllUsers:', selectAllUsers(store.getState()).map((user) => user.name));

console.log('\n— 3. The app: Ada logs in —');
await inAct(() => renderApp(rootElement));
await choose(find<HTMLSelectElement>('select'), 'u1');
await click(findButton('Log in'));
await wait(1100);

console.log('\n— 4. An optimistic reaction —');
await click(buttonsStartingWith('🚀')[1]);
showReactions('right after the click');
await wait(300);
showReactions('after the server answered');

console.log('\n— 5. An optimistic reaction the server refuses —');
server.failNext('POST /posts/p1/reactions');
await click(buttonsStartingWith('❤️')[1]);
showReactions('right after the click');
await wait(300);
showReactions('after the failure');

console.log('\n— 6. The server pushes a notification —');
await inAct(() => server.pushNotification('Linus reacted to your post'));
console.log('  on screen:', findAll('p').map((p) => p.textContent).filter((text) => text?.startsWith('🔔')));

process.exit(0); // RTK Query and the notifications channel keep running; end the demo here
```

What it does:
- `showReactions(label)` prints each post's title and its three buttons, on one line, to keep the output short.
- Part 1 uses `apiSlice.util.selectInvalidatedBy(state, tags)`, which lists the cache entries that the given tags
  would invalidate, to check the tags before editing.
- Part 6 pushes from the server inside `inAct`, so React's re-render happens before the next line.

## Run it

```bash
npm run lesson 10
```

Expected output (not run). As always, a `🌐` line can sit a line earlier or later.

```text
— 1. Tags with ids: editing p1 refetches only what contains p1 —
    📝 api/executeQuery/pending (getPosts)
    📝 api/executeQuery/pending (getPost)
  🌐 server: GET /posts (answers in 200 ms)
  🌐 server: GET /posts/p2 (answers in 200 ms)
    📝 api/executeQuery/fulfilled (getPosts)
    📝 api/executeQuery/fulfilled (getPost)
  entries containing p1: [ 'getPosts(undefined)' ]
    📝 api/executeMutation/pending (editPost)
  🌐 server: PATCH /posts/p1 {"title":"First post (edited)","content":"Hello, everyone."} (answers in 200 ms)
    📝 api/executeMutation/fulfilled (editPost)
    📝 api/executeQuery/pending (getPosts)
  🌐 server: GET /posts (answers in 200 ms)
    📝 api/executeQuery/fulfilled (getPosts)
  p1 in the list: First post (edited)

— 2. Users: an injected endpoint, transformed into an entity state —
    📝 api/executeQuery/pending (getUsers)
  🌐 server: GET /users (answers in 200 ms)
    📝 api/executeQuery/fulfilled (getUsers)
  cached data keys: [ 'ids', 'entities' ]
  selectAllUsers: [ 'Ada Lovelace', 'Linus Torvalds' ]

— 3. The app: Ada logs in —
    📝 api/executeQuery/rejected (getUsers, skipped by condition)
        🖼  App renders
        🖼  Toasts renders
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
        🖼  PostExcerpt "Redux Toolkit" renders
        🖼  PostExcerpt "First post (edited)" renders
    📝 api/executeQuery/rejected (getPosts, skipped by condition)
    📝 api/executeQuery/pending (getNotifications)
  🔌 channel opened
    📝 api/executeQuery/rejected (getPosts, skipped by condition)
        🖼  NotificationsList renders
  🌐 server: GET /notifications (answers in 200 ms)
    📝 api/executeQuery/fulfilled (getNotifications)
    📝 toasts/toastHidden
        🖼  Toasts renders
        🖼  NotificationsList renders

— 4. An optimistic reaction —
    📝 api/executeMutation/pending (addReaction)
    📝 api/queries/queryResultPatched
        🖼  PostsList renders
        🖼  PostExcerpt "First post (edited)" renders
  right after the click: Redux Toolkit 👍 0 ❤️ 0 🚀 0 | First post (edited) 👍 0 ❤️ 0 🚀 1
  🌐 server: POST /posts/p1/reactions {"reaction":"rocket"} (answers in 200 ms)
    📝 api/executeMutation/fulfilled (addReaction)
  after the server answered: Redux Toolkit 👍 0 ❤️ 0 🚀 0 | First post (edited) 👍 0 ❤️ 0 🚀 1

— 5. An optimistic reaction the server refuses —
    📝 api/executeMutation/pending (addReaction)
    📝 api/queries/queryResultPatched
        🖼  PostsList renders
        🖼  PostExcerpt "First post (edited)" renders
  right after the click: Redux Toolkit 👍 0 ❤️ 0 🚀 0 | First post (edited) 👍 0 ❤️ 1 🚀 1
  🌐 server: POST /posts/p1/reactions {"reaction":"heart"} (answers in 200 ms)
    📝 api/executeMutation/rejected (addReaction)
    📝 api/queries/queryResultPatched
        🖼  PostsList renders
        🖼  PostExcerpt "First post (edited)" renders
  after the failure: Redux Toolkit 👍 0 ❤️ 0 🚀 0 | First post (edited) 👍 0 ❤️ 0 🚀 1

— 6. The server pushes a notification —
  🔌 server pushes: "Linus reacted to your post"
    📝 api/queries/queryResultPatched
        🖼  NotificationsList renders
  on screen: [ '🔔 Linus reacted to your post' ]
```

Walk-through:
- **Part 1.** Two entries: `getPosts(undefined)` (tags: `'Post'`, `{Post, p1}`, `{Post, p2}`) and `getPost("p2")`
  (tag `{Post, p2}`). The tag `{Post, p1}` matches only the list. After `editPost` succeeded, only `getPosts` was
  refetched; `getPost("p2")` wasn't touched. The list now has the new title.
- **Part 2.** The injected endpoint used the same cache (`state.api`) and the same logger name format.
  `transformResponse` turned the server's array into `{ ids, entities }` before caching it, and the adapter's
  selectors read it like a slice.
- **Part 3.** `renderApp`'s `getUsers.initiate()` found the users in the cache (part 2): skipped. So the login form
  had its users at the first render, with no request. After the login, `getPosts` came from the cache (part 1);
  `getNotifications` was a new entry: its request started, and `onCacheEntryAdded` opened the channel at once.
  When the (empty) list arrived, `NotificationsList` re-rendered: "Notifications (0)".
- **Part 4, optimistic.** The click started the mutation; `onQueryStarted` patched the `getPosts` entry
  immediately (`queryResultPatched`): the 🚀 count is 1 **before** the request reached the server. When the server
  confirmed, nothing more happened: no refetch, no re-render. `Navbar` didn't re-render at all, in parts 4 and 5:
  its `selectFromResult` returned the same count.
- **Part 5, rollback.** Same start: ❤️ 1 at once. The server answered 500: `rejected`, then `queryFulfilled`
  rejected inside `onQueryStarted`, `patch.undo()` dispatched a second `queryResultPatched` with the reverse change:
  ❤️ back to 0. The 🚀 from part 4 is untouched: undo reverses only its own patch.
- **Part 6, streaming.** The server pushed a message on the channel; the listener registered in
  `onCacheEntryAdded` called `updateCachedData`, which patched the entry: `NotificationsList` re-rendered with the
  new notification, without any request.

## The whole picture

```text
state.api (one cache, one middleware)
 ├─ getPosts(undefined)    tags: Post, {Post,p1}, {Post,p2}  ◄─ editPost({id:'p1'}) invalidates {Post,p1} → refetch
 │                                                           ◄─ addReaction: onQueryStarted → updateQueryData (patch)
 │                                                                            queryFulfilled fails → patch.undo()
 ├─ getPost("p2")          tags: {Post,p2}                   (untouched by p1's edit)
 ├─ getUsers(undefined)    injected; transformResponse → { ids, entities } → adapter selectors (selectUserById…)
 └─ getNotifications(undefined)  onCacheEntryAdded: channel ── message ──► updateCachedData (push)
components: useGetPostsQuery(undefined, { selectFromResult }) → re-render only for the selected part
```

## Summary

| Term | What it is, in one line |
|---|---|
| **tag with id** | `{ type: 'Post', id }`: marks one item, so only entries containing it are refetched |
| **`injectEndpoints`** | adds endpoints to an existing API slice from another file |
| **`transformResponse`** | reshapes the response body before it's cached |
| **`endpoint.select(arg)`** | a selector for one cache entry, usable with `createSelector` and adapters |
| **`selectFromResult`** | a hook option: return only what the component needs; re-render only when it changes |
| **optimistic update** | changing the cache before the server confirms; undone if the request fails |
| **`onQueryStarted`** | endpoint option called when a request starts; `queryFulfilled` tells how it ended |
| **`updateQueryData`** | a thunk that patches a cache entry with an Immer recipe; returns a patch |
| **patch / `undo()`** | the recorded changes of an update / the function that reverses them |
| **streaming update** | keeping a cache entry updated from a live connection |
| **`onCacheEntryAdded`** | endpoint option called when an entry is created; gives `cacheDataLoaded`, `cacheEntryRemoved`, `updateCachedData` |

**Next lecture:** [11-the-full-picture](11-the-full-picture.md): one interaction traced through RTK Query, the
listener middleware and React, and a map of the whole course.
