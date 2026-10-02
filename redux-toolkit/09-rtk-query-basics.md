# Lecture 09. RTK Query basics: fetching and caching server data

> **By the end you can:** explain the difference between server state and client state; define an API with
> `createApi` and `fetchBaseQuery`; read data with a generated query hook and change it with a mutation hook;
> explain cache entries, subscriptions and why a second component doesn't send a second request; refresh data
> automatically with tags.
> **New terms in this lesson:** server state vs client state, RTK Query, API slice, `createApi`, base query,
> `fetchBaseQuery`, endpoint (query / mutation), generated hooks, cache entry, cache key, subscription,
> `keepUnusedDataFor`, tags (`providesTags` / `invalidatesTags`), structural sharing of results
> **You should already know:** `createAsyncThunk` and its lifecycle actions, `condition`, `.unwrap()`
> ([05](05-create-async-thunk.md)); `React.memo` ([06](06-selectors-and-performance.md)); listeners and matchers
> ([08](08-listener-middleware.md))
> **Project files you fill in:** `src/features/api/apiSlice.ts` (🧩 09.1), and changes to `src/app/logger.ts`,
> `src/app/store.ts`, `src/features/posts/*`, `src/components/Navbar.tsx`, `src/features/toasts/toastListeners.ts`,
> `demos/09-rtk-query-basics.tsx` (🧩 09.8)

## 1. The problem: server data in slices is a lot of code, and stale

Look at what lectures 05–07 wrote **just to show the posts**: a status field with four values, an error field, a
`fetchPosts` thunk with a `condition`, three `extraReducers` cases, an `addNewPost` thunk and its case, an effect in
`PostsList`, the entity adapter… And it still doesn't:
- refresh the list when the data changes on the server;
- remember **when** it was loaded, or forget it when nobody needs it anymore;
- let two components ask for the same data without one of them knowing about the other.

The underlying reason: the posts aren't really *our* state. They're a **copy of data that lives on the server**.
That's **server state**: data owned by a server, which we fetch, cache and keep up to date. **Client state** is
data owned by the app: who's logged in, the toasts, the half-typed form. They need different tools: client state
needs reducers; server state needs a **cache** that knows how to fetch, deduplicate, refresh and expire.

## 2. RTK Query

**RTK Query** is the data-fetching and caching tool included in Redux Toolkit (`@reduxjs/toolkit/query`). You
describe your server's **endpoints**; it generates the thunks, the reducer, the middleware and React hooks that
fetch, cache and refresh, and it stores everything in your Redux store (in one slice, `state.api`).

```text
component ──► useGetPostsQuery() ──► is there a fresh cache entry for "getPosts(undefined)"?
                  ▲                     ├─ yes → return it (no request)
                  │                     └─ no  → dispatch the request thunk ──► server
                  └──────── re-render with { data, isLoading, isFetching, … } ◄── fulfilled: store the result
```

### Build step 09.1: the API slice

The object that describes the API and holds the generated code is called the **API slice**. An app usually has
one per server.

Open `src/features/api/apiSlice.ts`. Replace the placeholder `🧩 09.1` with:

```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { serverUrl } from '../../api/server';
import type { NewPost, Post, ReactionName } from '../posts/postsSlice';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: serverUrl }),
  tagTypes: ['Post'],
  endpoints: (builder) => ({
    getPosts: builder.query<Post[], void>({
      query: () => '/posts',
      providesTags: ['Post'],
    }),
    getPost: builder.query<Post, string>({
      query: (postId) => `/posts/${postId}`,
    }),
    addNewPost: builder.mutation<Post, NewPost>({
      query: (newPost) => ({ url: '/posts', method: 'POST', body: newPost }),
      invalidatesTags: ['Post'],
    }),
    addReaction: builder.mutation<Post, { postId: string; reaction: ReactionName }>({
      query: ({ postId, reaction }) => ({ url: `/posts/${postId}/reactions`, method: 'POST', body: { reaction } }),
      invalidatesTags: ['Post'],
    }),
  }),
});

export const { useGetPostsQuery, useGetPostQuery, useAddNewPostMutation, useAddReactionMutation } = apiSlice;
```

> **API card: `createApi` (package `@reduxjs/toolkit/query/react`)**
>
> **What it is:** creates an API slice from a list of endpoints.
>
> ```ts
> function createApi(options: {
>   reducerPath?: string;                         // where its state lives: state[reducerPath] (default 'api')
>   baseQuery: BaseQueryFn;                       // how to send a request (below)
>   tagTypes?: string[];                          // the names of the tags used for refreshing (section 5)
>   endpoints: (builder) => {                     // one entry per endpoint
>     [name: string]: builder.query<Result, Arg>({ query, providesTags?, … })
>                   | builder.mutation<Result, Arg>({ query, invalidatesTags?, … });
>   };
>   keepUnusedDataFor?: number;                   // seconds a cache entry is kept with no subscriber (default 60)
> }): Api;  // { reducerPath, reducer, middleware, endpoints, util, use…Query / use…Mutation hooks }
> ```
>
> **What it does:** for each endpoint, generates a request thunk (built on `createAsyncThunk`), selectors to read its
> cache, and (from `/react`) a hook named after it: `getPosts` → `useGetPostsQuery`, `addNewPost` →
> `useAddNewPostMutation`. It also generates one reducer (the cache) and one middleware (subscriptions, expiry,
> refreshing), which you add to the store.

> **API card: `fetchBaseQuery` (package `@reduxjs/toolkit/query`)**
>
> ```ts
> function fetchBaseQuery(options: { baseUrl: string; prepareHeaders?: (headers, api) => Headers }): BaseQueryFn;
> ```
>
> **What it is:** a small `fetch` wrapper; the default **base query**, the one function every endpoint uses to send
> its request. An endpoint's `query` returns either a URL path (`'/posts'`, a GET) or `{ url, method, body }`;
> `fetchBaseQuery` adds the `baseUrl`, sends JSON, parses the JSON answer, and returns `{ data }` or, for a 4xx/5xx
> answer, `{ error: { status, data } }` (a **`FetchBaseQueryError`**).

What each part of our API slice does:
- `reducerPath: 'api'`: the cache lives in `state.api`.
- `baseUrl: serverUrl`: the given server's address (`http://127.0.0.1:<port>`). In a browser app it would be your
  API's URL, e.g. `'/api'`.
- An **endpoint** is one operation of the server. There are two kinds:
  - a **query** reads data: `builder.query<Result, Arg>`. `getPosts` takes no argument (`void`) and returns
    `Post[]`; `getPost` takes a post id (`string`) and returns one `Post`.
  - a **mutation** changes data on the server: `builder.mutation<Result, Arg>`. `addNewPost` sends a `NewPost` and
    gets back the saved `Post`; `addReaction` sends a reaction.
- `providesTags` / `invalidatesTags`: section 5.
- The last line exports the generated hooks.

## 3. The store gets the API slice

### Build step 09.2: the reducer and the middleware

In `src/app/store.ts`, import the API slice:

```ts
import { apiSlice } from '../features/api/apiSlice';
```

In `reducer`, **remove** `posts: postsReducer` (and its import), and add the API slice's reducer:

```ts
  reducer: {
    auth: authReducer,
    users: usersReducer,
    toasts: toastsReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
```

and add its middleware before the logger:

```ts
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware).concat(apiSlice.middleware, logger),
```

What each part does:
- `[apiSlice.reducerPath]: apiSlice.reducer`: a computed key, `api: …`. The cache is a normal slice of the state.
- `apiSlice.middleware`: manages subscriptions, removes unused cache entries after `keepUnusedDataFor`, refetches
  after a mutation (section 5). Without it, RTK Query throws a clear error telling you to add it.
- The posts slice is gone from the store: the posts are server state now, and live in `state.api`.

### Build step 09.3: the posts file keeps only the types

Replace the **whole** content of `src/features/posts/postsSlice.ts` with:

```ts
// The posts' types. Since lecture 09 the posts themselves live in RTK Query's cache (features/api/apiSlice.ts).
export interface Reactions {
  thumbsUp: number;
  heart: number;
  rocket: number;
}
export type ReactionName = keyof Reactions;

export interface Post {
  id: string;
  title: string;
  content: string;
  user: string; // the author's user id
  date: string; // ISO date
  reactions: Reactions;
}

export type NewPost = Pick<Post, 'title' | 'content' | 'user'>;
```

The thunks, the status, the adapter, the reducers and the selectors of the posts are all replaced by the four
endpoints of step 09.1.

### Build step 09.4: a quieter logger

RTK Query dispatches some internal bookkeeping actions (`api/config/middlewareRegistered`,
`api/internalSubscriptions/subscriptionsUpdated`, …). They're useful in the DevTools, but noise in our demos. And
for its request actions, the interesting detail is the endpoint's name. Replace the whole content of
`src/app/logger.ts` with:

```ts
import { isAction, type Middleware } from '@reduxjs/toolkit';

// RTK Query actions we want to see; its other `api/…` actions are internal bookkeeping.
const shownApiActions = ['api/executeQuery', 'api/executeMutation', 'api/queries/queryResultPatched', 'api/util/resetApiState'];

type ActionMeta = { meta?: { arg?: { endpointName?: string }; condition?: boolean } };

export const logger: Middleware = () => (next) => (action) => {
  if (isAction(action)) {
    const hidden = action.type.startsWith('api/') && !shownApiActions.some((prefix) => action.type.startsWith(prefix));
    if (!hidden) {
      const { meta } = action as ActionMeta;
      const details = [meta?.arg?.endpointName, meta?.condition ? 'skipped by condition' : undefined].filter(Boolean);
      console.log(`    📝 ${action.type}${details.length ? ` (${details.join(', ')})` : ''}`);
    }
  }
  return next(action);
};
```

It prints, for example, `📝 api/executeQuery/fulfilled (getPosts)`. The "skipped by condition" part is explained
in section 4.

## 4. Queries: the hook, the cache entry, the subscription

```ts
const { data, isLoading, isFetching, isSuccess, isError, error, refetch } = useGetPostsQuery();
```

> **API card: a query hook, e.g. `useGetPostsQuery` (generated by `createApi`)**
>
> ```ts
> function useGetPostsQuery(arg: void, options?: { skip?: boolean; pollingInterval?: number;
>   refetchOnMountOrArgChange?: boolean | number; selectFromResult?: (result) => any }): {
>   data?: Post[];           // the latest result (kept while a refetch runs)
>   isLoading: boolean;      // the FIRST request is running (there's no data yet)
>   isFetching: boolean;     // any request is running (first load or refetch)
>   isSuccess, isError: boolean;  error?: FetchBaseQueryError | SerializedError;
>   refetch: () => void;     // force a new request
> };
> ```
>
> **What it does, step by step:**
> 1. On render: reads the **cache entry** for this endpoint and argument, and returns its state.
> 2. After mounting (in an effect): dispatches the endpoint's request thunk with this argument. That thunk's
>    `condition` checks the cache: if the data is already there (or already being fetched), it does **nothing**,
>    except registering this component as a **subscriber** of the entry.
> 3. Re-renders the component when the entry changes (pending → fulfilled, new data).
> 4. On unmount: removes the subscription. When an entry has no subscribers left, it's kept for
>    `keepUnusedDataFor` seconds (60 by default), then removed from the cache.

The words:
- A **cache entry** is one stored result: `state.api.queries['getPosts(undefined)']`. Its **cache key** is the
  endpoint's name plus its argument, serialized: `getPosts(undefined)`, `getPost("p1")`. Same endpoint and same
  argument → same entry.
- A **subscription** is "a component (or code) is using this entry". Two components using `useGetPostsQuery()`
  share one entry, one request, and count as two subscriptions.
- When the request thunk's `condition` says "no need", RTK Query still **dispatches** the `rejected` action, with
  `meta.condition: true` (it sets `createAsyncThunk`'s `dispatchConditionRejection` option), so that its middleware
  can count the new subscriber. It doesn't change the cache. Our logger shows it as `(getPosts, skipped by
  condition)`.

### Build step 09.5: the components use the hooks

Replace the whole content of `src/features/posts/PostsList.tsx` with:

```tsx
import { useMemo } from 'react';
import { useGetPostsQuery } from '../api/apiSlice';
import { PostExcerpt } from './PostExcerpt';

export function PostsList() {
  const { data: posts = [], isLoading, isFetching, isError } = useGetPostsQuery();
  console.log('        🖼  PostsList renders');
  const newestFirst = useMemo(() => posts.slice().sort((a, b) => b.date.localeCompare(a.date)), [posts]);

  return (
    <section>
      <h2>Posts</h2>
      {isLoading && <p>Loading…</p>}
      {!isLoading && isFetching && <p>Refreshing…</p>}
      {isError && <p>❌ The posts could not be loaded</p>}
      {newestFirst.map((post) => (
        <PostExcerpt key={post.id} post={post} />
      ))}
    </section>
  );
}
```

Replace the whole content of `src/features/posts/PostExcerpt.tsx` with:

```tsx
import { memo } from 'react';
import type { Post } from './postsSlice';
import { PostAuthor } from './PostAuthor';
import { ReactionButtons } from './ReactionButtons';

export const PostExcerpt = memo(function PostExcerpt({ post }: { post: Post }) {
  console.log(`        🖼  PostExcerpt "${post.title}" renders`);
  return (
    <article>
      <h3>{post.title}</h3>
      <p>
        <PostAuthor userId={post.user} />
      </p>
      <p>{post.content}</p>
      <ReactionButtons post={post} />
    </article>
  );
});
```

In `src/components/Navbar.tsx`, replace the import of `selectPostsByUser` with:

```ts
import { useGetPostsQuery } from '../features/api/apiSlice';
```

and the `postCount` line with:

```tsx
  const { data: posts = [] } = useGetPostsQuery();
  const postCount = posts.filter((post) => post.user === currentUserId).length;
```

What each part does:
- `PostsList`: no `useEffect`, no dispatch, no status selector: the hook loads, caches and reports. `data: posts =
  []` gives an empty list while there's no data. `isLoading` is only for the very first load; `isFetching` is true
  during **any** request, so a refetch shows "Refreshing…" over the existing list. The sorting is memoized with
  React's `useMemo` (recomputed only when `posts` changes).
- `PostExcerpt` receives the post object again (the list comes from the hook), memoized like in lecture 06.
- `Navbar` also calls `useGetPostsQuery()`: it **shares** the same cache entry as `PostsList`. No second request.

## 5. Mutations and tags

> **API card: a mutation hook, e.g. `useAddNewPostMutation` (generated by `createApi`)**
>
> ```ts
> function useAddNewPostMutation(): [
>   trigger: (arg: NewPost) => { unwrap(): Promise<Post>; … },   // call it to send the request
>   result: { isLoading: boolean; isSuccess; isError; data?: Post; error?; reset(): void },  // this component's last call
> ];
> ```
>
> **What it does:** the hook sends nothing by itself. Calling `trigger(arg)` dispatches the endpoint's mutation
> thunk; `result` tracks that call. `trigger(arg).unwrap()` works like `createAsyncThunk`'s: the data, or throws the
> error (for a server error: a `FetchBaseQueryError`, `{ status, data }`).

After a new post is saved, the cached `getPosts` result is **out of date**. RTK Query solves this with **tags**:
labels attached to cache entries.

- `providesTags: ['Post']` on `getPosts`: "this cache entry contains `Post` data".
- `invalidatesTags: ['Post']` on `addNewPost` / `addReaction`: "after this succeeds, `Post` data is out of date".

When a mutation that invalidates `'Post'` succeeds, the API middleware finds every cache entry that provides
`'Post'` and that someone is subscribed to, and **refetches** it. The tag names must be declared in `tagTypes`.

### Build step 09.6: `AddPostForm` and `ReactionButtons` use mutations

Replace the whole content of `src/features/posts/AddPostForm.tsx` with:

```tsx
import { useState } from 'react';
import { useAppSelector } from '../../app/hooks';
import { useAddNewPostMutation } from '../api/apiSlice';
import { selectCurrentUserId } from '../auth/authSlice';

export function AddPostForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const currentUserId = useAppSelector(selectCurrentUserId);
  const [addNewPost, { isLoading }] = useAddNewPostMutation();
  console.log('        🖼  AddPostForm renders');

  async function handleSave() {
    if (!currentUserId) return;
    setError(null);
    try {
      await addNewPost({ title, content, user: currentUserId }).unwrap();
      setTitle('');
      setContent('');
    } catch {
      setError('The post could not be saved');
    }
  }

  return (
    <section>
      <h2>Add a new post</h2>
      <p>
        <input placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />{' '}
        <textarea placeholder="Content" value={content} onChange={(event) => setContent(event.target.value)} />{' '}
        <button disabled={!title || !content || isLoading} onClick={handleSave}>
          Save post
        </button>
      </p>
      {isLoading && <p>Saving…</p>}
      {error && <p>❌ {error}</p>}
    </section>
  );
}
```

In `src/features/posts/ReactionButtons.tsx`, replace the imports with:

```tsx
import { useAddReactionMutation } from '../api/apiSlice';
import type { Post, ReactionName } from './postsSlice';
```

replace `const dispatch = useAppDispatch();` with:

```tsx
  const [addReaction] = useAddReactionMutation();
```

and the button's `onClick` with:

```tsx
        <button key={name} onClick={() => addReaction({ postId: post.id, reaction: name })}>
```

What changed: the form's "saving" state comes from the mutation's `isLoading` (no local status anymore). A reaction
is now sent to the server, which invalidates `'Post'`: the whole list is refetched after each reaction. Lecture 10
makes that instant with an optimistic update.

### Build step 09.7: the toast listener matches the mutation

`addNewPost.fulfilled` (the thunk of lecture 05) doesn't exist anymore. Every endpoint has **matchers** for its
request actions: `apiSlice.endpoints.addNewPost.matchFulfilled` matches the successful end of an `addNewPost`
mutation. In `src/features/toasts/toastListeners.ts`, replace the import of `addNewPost` with:

```ts
import { apiSlice } from '../api/apiSlice';
```

and `actionCreator: addNewPost.fulfilled,` with:

```ts
    matcher: apiSlice.endpoints.addNewPost.matchFulfilled,
```

The effect doesn't change: `action.payload` is still the saved `Post`, typed by the matcher.

## Build step 09.8: the demo

Open `demos/09-rtk-query-basics.tsx`. Replace the placeholder `🧩 09.8` with:

```tsx
// Lecture 09 demo: the cache without React, then the hooks: caching, sharing, mutation, refetch by tag.
import { rootElement, find, findButton, typeText, choose, click, wait, inAct, printScreen } from '../src/debug/testDom';
import { store } from '../src/app/store';
import { apiSlice } from '../src/features/api/apiSlice';
import { renderApp } from '../src/main';

console.log('— 1. A query without React —');
const request = store.dispatch(apiSlice.endpoints.getPosts.initiate());
console.log('  cache entry right away:', apiSlice.endpoints.getPosts.select()(store.getState()).status);
const result = await request;
console.log('  after the answer:', result.status, '|', result.data?.length, 'posts');
console.log('  cache keys:', Object.keys(store.getState().api.queries));
const second = store.dispatch(apiSlice.endpoints.getPosts.initiate());
await second;
request.unsubscribe();
second.unsubscribe();

console.log('\n— 2. The app: Ada logs in, the posts come from the cache —');
await inAct(() => renderApp(rootElement));
await wait(300);
await choose(find<HTMLSelectElement>('select'), 'u1');
await click(findButton('Log in'));
await wait(1100);

console.log('\n— 3. A new post: the mutation, then the refetch triggered by the tag —');
await typeText(find<HTMLInputElement>('input'), 'RTK Query');
await typeText(find<HTMLTextAreaElement>('textarea'), 'Caching for free');
await click(findButton('Save post'));
await wait(300);
printScreen('saved, the list is refreshing');
await wait(300);
printScreen('refreshed');

process.exit(0); // RTK Query keeps timers for unused cache entries (60 s): don't wait for them
```

What it does:
- Part 1 uses an endpoint **without React**: `endpoints.getPosts.initiate()` is the request thunk the hook
  dispatches; dispatching it returns an object you can `await` (the result) and `unsubscribe()`.
  `endpoints.getPosts.select()` makes a selector for the cache entry of the argument `undefined`.
- Part 2 waits a little more than one second after the login, so the welcome toast of lecture 08 is gone before part 3.
- `process.exit(0)` ends the demo: after part 1's `unsubscribe()`, RTK Query keeps a 60-second timer before
  removing the unused entry, and Node would wait for it.

## Run it

```bash
npm run lesson 09
```

Expected output (not run). As in every lecture, a `🌐` line can sit a line earlier or later.

```text
— 1. A query without React —
    📝 api/executeQuery/pending (getPosts)
  cache entry right away: pending
  🌐 server: GET /posts (answers in 200 ms)
    📝 api/executeQuery/fulfilled (getPosts)
  after the answer: fulfilled | 2 posts
  cache keys: [ 'getPosts(undefined)' ]
    📝 api/executeQuery/rejected (getPosts, skipped by condition)

— 2. The app: Ada logs in, the posts come from the cache —
    📝 users/fetchUsers/pending
        🖼  App renders
        🖼  Toasts renders
        🖼  LoginForm renders
  🌐 server: GET /users (answers in 200 ms)
    📝 users/fetchUsers/fulfilled
        🖼  LoginForm renders
        🖼  LoginForm renders
    📝 auth/userLoggedIn
    📝 toasts/toastShown
        🖼  App renders
        🖼  Toasts renders
        🖼  Navbar renders
        🖼  AddPostForm renders
        🖼  PostsList renders
        🖼  PostExcerpt "Redux Toolkit" renders
        🖼  PostExcerpt "First post!" renders
    📝 api/executeQuery/rejected (getPosts, skipped by condition)
    📝 api/executeQuery/rejected (getPosts, skipped by condition)
    📝 toasts/toastHidden
        🖼  Toasts renders

— 3. A new post: the mutation, then the refetch triggered by the tag —
        🖼  AddPostForm renders
        🖼  AddPostForm renders
    📝 api/executeMutation/pending (addNewPost)
        🖼  AddPostForm renders
  🌐 server: POST /posts {"title":"RTK Query","content":"Caching for free","user":"u1"} (answers in 200 ms)
    📝 api/executeMutation/fulfilled (addNewPost)
    📝 api/executeQuery/pending (getPosts)
    📝 toasts/toastShown
  🌐 server: GET /posts (answers in 200 ms)
        🖼  Toasts renders
        🖼  Navbar renders
        🖼  AddPostForm renders
        🖼  PostsList renders
  ┌─ saved, the list is refreshing
  │ 🍞 Post saved: "RTK Query"
  │ Logged in as Ada Lovelace, 1 post(s) (Log out)
  │ Add a new post
  │ [Title] [Content] (Save post)⊘
  │ Posts
  │ Refreshing…
  │ Redux Toolkit
  │ by Linus Torvalds
  │ Less boilerplate, same ideas.
  │ (👍 0)(❤️ 0)(🚀 0)
  │ First post!
  │ by Ada Lovelace
  │ Hello, everyone.
  │ (👍 0)(❤️ 0)(🚀 0)
  └─
    📝 api/executeQuery/fulfilled (getPosts)
        🖼  Navbar renders
        🖼  PostsList renders
        🖼  PostExcerpt "RTK Query" renders
  ┌─ refreshed
  │ 🍞 Post saved: "RTK Query"
  │ Logged in as Ada Lovelace, 2 post(s) (Log out)
  │ Add a new post
  │ [Title] [Content] (Save post)⊘
  │ Posts
  │ RTK Query
  │ by Ada Lovelace
  │ Caching for free
  │ (👍 0)(❤️ 0)(🚀 0)
  │ Redux Toolkit
  │ by Linus Torvalds
  │ Less boilerplate, same ideas.
  │ (👍 0)(❤️ 0)(🚀 0)
  │ First post!
  │ by Ada Lovelace
  │ Hello, everyone.
  │ (👍 0)(❤️ 0)(🚀 0)
  └─
```

Walk-through:
- **Part 1.** `initiate()` dispatched the request thunk: `pending` immediately (the entry's status is `pending` on
  the next line), the request, then `fulfilled`. The cache now has one entry, keyed `getPosts(undefined)`. The second
  `initiate()` found fresh data in that entry: its `condition` said "no need", and the `rejected … skipped by
  condition` action only registered the second subscriber. No second request. Then both unsubscribed: the entry
  stays in the cache for 60 seconds.
- **Part 2, the cache at work.** After the login, `Navbar` and `PostsList` rendered **with the posts right away**:
  their hooks found the entry from part 1. Their effects then dispatched two request thunks, both skipped by
  `condition` (two subscribers, no request). Compare with lecture 05: no effect, no status check, no `condition` to
  write.
- **Part 3, mutation and tags.** "Save post" called the mutation's trigger: `executeMutation/pending`, the form shows
  "Saving…" (its button disabled). When the server answered, `executeMutation/fulfilled`; the API middleware saw that
  `addNewPost` invalidates `'Post'`, found the subscribed `getPosts(undefined)` entry that provides `'Post'`, and
  dispatched a refetch: `executeQuery/pending (getPosts)`. Then the listener of lecture 08 matched
  `addNewPost.matchFulfilled` and showed the toast. The screen "refreshing" shows the **old** data with
  "Refreshing…" (`isFetching` true, `isLoading` false). `Navbar` re-rendered too, although its count didn't change:
  its hook's result object changed (`isFetching`). Lecture 10 fixes that with `selectFromResult`.
- **Part 3, the refetch.** The new list arrived. Only **one** excerpt rendered: RTK Query keeps the unchanged posts
  as the **same objects** as in the previous result (it compares the new JSON with the old data and reuses what's
  equal: structural sharing of results), so `memo` skipped "Redux Toolkit" and "First post!".

## The whole picture

```text
apiSlice = createApi({ baseQuery: fetchBaseQuery({ baseUrl }), tagTypes: ['Post'], endpoints })
  state.api.queries['getPosts(undefined)'] = { status, data, … }      ◄── the cache entry (tag: 'Post')
     ▲ read by                                         ▲ written by
  useGetPostsQuery() in Navbar, PostsList           executeQuery/pending → fulfilled
     └─ (effect) initiate() → condition: cached? → skip (subscription only) │ fetch
useAddNewPostMutation() → trigger(newPost) → executeMutation/pending → fulfilled
                                                       └─ invalidatesTags ['Post'] → refetch every subscribed entry
                                                                                     that provides 'Post'
```

## Summary

| Term | What it is, in one line |
|---|---|
| **server state vs client state** | data copied from a server (needs a cache) vs data owned by the app (needs reducers) |
| **RTK Query** | RTK's data fetching and caching tool, stored in the Redux store |
| **API slice** | the object `createApi` returns: endpoints, reducer, middleware, hooks |
| **`createApi`** | defines an API slice from a base query and endpoints |
| **base query / `fetchBaseQuery`** | the one function that sends requests; `fetchBaseQuery` is the `fetch`-based default |
| **endpoint (query / mutation)** | one server operation: a query reads, a mutation changes |
| **generated hooks** | `useXQuery` (read + cache + re-render), `useXMutation` (trigger + result) |
| **cache entry / cache key** | one stored result / its key, endpoint name + serialized argument |
| **subscription** | "something is using this entry"; entries without subscribers expire |
| **`keepUnusedDataFor`** | how long (seconds) an unused entry is kept (default 60) |
| **tags** | `providesTags` labels entries; `invalidatesTags` makes a mutation refetch the matching entries |
| **structural sharing of results** | a refetched result reuses the previous objects that are equal |

**Next lecture:** [10-rtk-query-advanced](10-rtk-query-advanced.md): refetch only what changed, reshape responses,
select part of a result, instant (optimistic) reactions, users from the API, and live notifications.
