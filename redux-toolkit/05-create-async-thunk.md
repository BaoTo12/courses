# Lecture 05. `createAsyncThunk`: loading data from the server

> **By the end you can:** write async thunks with `createAsyncThunk` and handle their `pending` / `fulfilled` /
> `rejected` actions; track a request's status in a slice; stop duplicate requests with `condition`; wait for a
> thunk in a component with `.unwrap()` and show its error; type all of it once with `.withTypes()`.
> **New terms in this lesson:** `createAsyncThunk`, payload creator, lifecycle actions, `requestId`, `condition`,
> `SerializedError`, `.unwrap()`, `createAppAsyncThunk`
> **You should already know:** thunk ([01](01-from-redux-to-redux-toolkit.md) §1); `extraReducers` and the builder
> ([03](03-prepare-and-extra-reducers.md)); typed hooks, the components ([04](04-react-with-redux-toolkit.md));
> Promises, `async`/`await`
> **Project files you fill in:** `src/app/withTypes.ts` (🧩 05.1), `src/features/posts/postsSlice.ts`,
> `src/features/users/usersSlice.ts`, `src/features/posts/PostsList.tsx`, `AddPostForm.tsx`, `src/main.tsx`
> (changes), `demos/05-create-async-thunk.tsx` (🧩 05.6)

## 1. The server

From now on the posts and users live on a server: `src/api/server.ts` (given) is a real HTTP server running inside
the demo's process, and `src/api/client.ts` (given) calls it with `fetch`:

| Call | Answer |
|---|---|
| `client.get<User[]>('/users')` | the two users |
| `client.get<Post[]>('/posts')` | every post; at the start: `p1` "First post!" by Ada, `p2` "Redux Toolkit" by Linus |
| `client.post<Post>('/posts', { title, content, user })` | the saved post: the **server** chooses its id (`p3`, …) and date |

The `<T>` says what the JSON answer is. Each request prints a `🌐 server:` line when it **arrives at the server**,
and is answered after 200 ms. Because the server runs alongside the app, that line can appear one or two lines
earlier or later than shown in the expected outputs; the rest of the order is fixed.

## 2. The problem: every request needs the same three actions

The Redux course wrote it by hand (its lectures 09 and 11): a thunk that dispatches "loading", waits, then
dispatches "loaded" or "failed"; three action types; three reducer cases; a status field; a request id against
late answers; and an error message. For **every** request. All of that is the same each time, except two things:
the request itself, and the action type's name.

## 3. `createAsyncThunk`

**`createAsyncThunk`** generates that whole pattern from a type prefix and one async function:

```ts
export const fetchPosts = createAsyncThunk('posts/fetchPosts', async () => {
  return client.get<Post[]>('/posts');   // whatever this returns becomes the `fulfilled` action's payload
});

dispatch(fetchPosts());   // dispatches 'posts/fetchPosts/pending', runs the function, then
                          // 'posts/fetchPosts/fulfilled' (payload: the posts) or 'posts/fetchPosts/rejected' (error)
```

The async function you give is called the **payload creator**: it does the async work and returns the payload.
The three actions it dispatches are the thunk's **lifecycle actions**.

> **API card: `createAsyncThunk` (package `@reduxjs/toolkit`)**
>
> **What it is:** creates a thunk creator that runs an async function and dispatches its lifecycle actions.
>
> ```ts
> function createAsyncThunk<Returned, Arg>(
>   typePrefix: string,                                  // 'posts/fetchPosts'
>   payloadCreator: (arg: Arg, thunkAPI: {               // your async function
>     dispatch, getState, extra, requestId, signal, rejectWithValue
>   }) => Promise<Returned>,
>   options?: { condition?: (arg: Arg, { getState, extra }) => boolean | undefined },
> ): ((arg: Arg) => AppThunk<Promise<Action>>) & {     // call it to get a thunk, then dispatch that
>   pending, fulfilled, rejected;                        // the three lifecycle action creators (for extraReducers)
>   typePrefix: string;
> };
> ```
>
> **What it does, step by step,** when you `dispatch(fetchPosts(arg))`:
> 1. Creates a unique **`requestId`** for this call.
> 2. Calls `condition(arg, …)` if you gave one; if it returns `false`, it stops here: **nothing is dispatched**.
> 3. Dispatches `pending`: `{ type: 'posts/fetchPosts/pending', meta: { arg, requestId, … } }`.
> 4. Calls `payloadCreator(arg, thunkAPI)` and waits for its Promise.
> 5. If it resolves: dispatches `fulfilled` with `payload` = the resolved value (and the same `meta`).
>    If it throws or rejects: dispatches `rejected` with `error` = the error, converted to a plain object
>    `{ name, message, stack }` (a **`SerializedError`**: an `Error` instance isn't serializable, lecture 01).
> 6. Returns (through `dispatch`) a Promise of the **final action** (`fulfilled` or `rejected`). It never rejects.
>
> **What our project passes / gets back:** `fetchPosts`, `addNewPost`, `fetchUsers` (steps 05.2–05.4).

Every lifecycle action carries `meta.requestId`, which is the request-id idea of the Redux course's lecture 11, done
for you. And the thunk's `typePrefix` + `/pending` naming means the logger shows exactly which request is where.

### Build step 05.1: `createAppAsyncThunk`, typed once

A payload creator often needs `getState()` (typed `RootState`) or `dispatch` (typed `AppDispatch`).
`createAsyncThunk` has a `.withTypes()` like the hooks. Open `src/app/withTypes.ts`. Replace the placeholder
`🧩 05.1` with:

```ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from './store';

export const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
}>();
```

`createAppAsyncThunk` is `createAsyncThunk`, with `getState()` returning `RootState` and `dispatch` typed as
`AppDispatch` in every payload creator and `condition`. The app uses it everywhere instead of the original.

## 4. Loading the posts

The posts slice now needs: the request's status, an error message, the thunks, and the cases for their actions.
Posts are created by the **server** (id, date), so the prepare callback of lecture 03 isn't needed anymore:
`postAdded` is replaced by an `addNewPost` thunk.

### Build step 05.2: the posts slice, with async thunks

In `src/features/posts/postsSlice.ts`:

1. Change the imports at the top to:

```ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { client } from '../../api/client';
import { createAppAsyncThunk } from '../../app/withTypes';
import { userLoggedOut } from '../auth/authSlice';
```

2. Replace `PostsState` and `initialState` with:

```ts
export type NewPost = Pick<Post, 'title' | 'content' | 'user'>;

export interface PostsState {
  posts: Post[];
  status: 'idle' | 'pending' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: PostsState = { posts: [], status: 'idle', error: null };

export const fetchPosts = createAppAsyncThunk(
  'posts/fetchPosts',
  async () => client.get<Post[]>('/posts'),
  {
    condition(_arg, { getState }) {
      if (selectPostsStatus(getState()) !== 'idle') return false; // already loading or loaded
    },
  },
);

export const addNewPost = createAppAsyncThunk('posts/addNewPost', async (newPost: NewPost) =>
  client.post<Post>('/posts', newPost),
);
```

3. In `reducers`, **delete** the whole `postAdded` entry (reducer and prepare).

4. Replace the `extraReducers` field with:

```ts
  extraReducers: (builder) => {
    builder
      .addCase(userLoggedOut, () => initialState)
      .addCase(fetchPosts.pending, (state) => {
        state.status = 'pending';
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.posts = action.payload;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Unknown error';
      })
      .addCase(addNewPost.fulfilled, (state, action) => {
        state.posts.push(action.payload);
      });
  },
```

5. Add two selectors to the `selectors` field:

```ts
    selectPostsStatus: (postsState) => postsState.status,
    selectPostsError: (postsState) => postsState.error,
```

and export them, and drop `postAdded` from the actions export:

```ts
export const { postUpdated, reactionAdded } = postsSlice.actions;
export const { selectAllPosts, selectPostById, selectPostsStatus, selectPostsError } = postsSlice.selectors;
```

What each part does:
- `NewPost`: `Pick<T, keys>` builds a type with only some fields of `T`. A new post is what the user provides; the
  server adds the rest.
- `status` is a loading status with four values (the Redux course's lecture 11 had two): `'idle'` (never
  requested), `'pending'`, `'succeeded'`, `'failed'`.
- **`fetchPosts`**: the payload creator has no argument (so `fetchPosts()` takes none) and returns the server's
  `Post[]`, which becomes `action.payload` in `fulfilled`, typed `Post[]`.
- **`condition`**: runs before anything is dispatched. If the posts are already loading or loaded, it returns
  `false` and the thunk stops: no request, no actions. `getState()` is a `RootState`, thanks to
  `createAppAsyncThunk`. It uses `selectPostsStatus`, defined further down in the file; that's fine, because
  `condition` only runs later, when the thunk is dispatched.
- **`addNewPost(newPost)`**: sends the new post; the server's answer (with id and date) becomes the payload.
- In `extraReducers`, `fetchPosts.pending`, `.fulfilled` and `.rejected` are action creators, like `userLoggedOut`:
  `addCase` gets their exact types, so `action.payload` is `Post[]` in `fulfilled`, and `action.error` is a
  `SerializedError` in `rejected` (its `message` may be `undefined`, hence `??`).
- `addNewPost.fulfilled` appends the saved post. Nothing handles `addNewPost.pending` or `.rejected` here: the form
  that sends it will track that itself (step 05.5).

### Build step 05.3: the users come from the server too

Replace the whole content of `src/features/users/usersSlice.ts` with:

```ts
import { createSlice } from '@reduxjs/toolkit';
import { client } from '../../api/client';
import { createAppAsyncThunk } from '../../app/withTypes';

export interface User {
  id: string;
  name: string;
}

export const fetchUsers = createAppAsyncThunk('users/fetchUsers', async () => client.get<User[]>('/users'));

const initialState: User[] = [];

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchUsers.fulfilled, (_state, action) => action.payload);
  },
  selectors: {
    selectAllUsers: (users) => users,
    selectUserById: (users, userId: string | null) => users.find((user) => user.id === userId),
  },
});

export const { selectAllUsers, selectUserById } = usersSlice.selectors;
export const usersReducer = usersSlice.reducer;
```

The initial state is now empty. `fetchUsers.fulfilled` **returns** the server's list: it replaces the whole slice
(the "return a new value" option; `_state` is unused, hence the underscore).

## 5. Dispatching the thunks from the app

### Build step 05.4: load the users at start, the posts when the list appears

In `src/main.tsx`, import `fetchUsers` and dispatch it as the first line of `renderApp`:

```tsx
import { fetchUsers } from './features/users/usersSlice';
```

```tsx
export function renderApp(container: HTMLElement): Root {
  store.dispatch(fetchUsers());
  const root = createRoot(container);
  // … unchanged
```

Replace the whole content of `src/features/posts/PostsList.tsx` with:

```tsx
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchPosts, selectAllPosts, selectPostsError, selectPostsStatus } from './postsSlice';
import { PostExcerpt } from './PostExcerpt';

export function PostsList() {
  const posts = useAppSelector(selectAllPosts);
  const status = useAppSelector(selectPostsStatus);
  const error = useAppSelector(selectPostsError);
  const dispatch = useAppDispatch();
  console.log('        🖼  PostsList renders');

  useEffect(() => {
    dispatch(fetchPosts()); // condition() skips it if the posts are already loading or loaded
  }, [dispatch]);

  const newestFirst = posts.slice().sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section>
      <h2>Posts</h2>
      {status === 'pending' && <p>Loading…</p>}
      {status === 'failed' && <p>❌ {error}</p>}
      {newestFirst.map((post) => (
        <PostExcerpt key={post.id} post={post} />
      ))}
    </section>
  );
}
```

What each part does:
- The users are needed by the login form, so they load as soon as the app starts.
- The posts are needed only once someone looks at the list, so `PostsList` asks for them when it appears:
  `useEffect(…, [dispatch])` runs once after the first render (`dispatch` never changes).
- If the list is shown again later (after logging out and in), the effect runs again; the `condition` decides
  whether a request is needed. The component doesn't have to know. (Logging out resets the posts slice to
  `'idle'`, lecture 03, so logging in again reloads them.)
- The status selects what to show: "Loading…", the error, or the posts.

## 6. Waiting for a thunk in a component: `.unwrap()`

`AddPostForm` must clear its fields **only if** the save worked, and show the error otherwise. `dispatch(addNewPost(…))`
returns a Promise of the final action. That Promise never rejects: a failure resolves to a `rejected` action. You
could check `addNewPost.fulfilled.match(result)`, but RTK gives a shortcut:

> **API card: `.unwrap()` (on the Promise returned by dispatching an async thunk)**
>
> ```ts
> dispatch(addNewPost(newPost)).unwrap(): Promise<Post>;   // the payload, or throws the error
> ```
>
> **What it does:** if the final action is `fulfilled`, resolves with its `payload`; if it's `rejected`, **throws**
> its `error` (a `SerializedError`, a plain object with `message`) or the value given to `rejectWithValue`. So you can
> use `try` / `catch` like with any async call.

### Build step 05.5: `AddPostForm` with `addNewPost`

Replace the whole content of `src/features/posts/AddPostForm.tsx` with:

```tsx
import { useState } from 'react';
import type { SerializedError } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectCurrentUserId } from '../auth/authSlice';
import { addNewPost } from './postsSlice';

export function AddPostForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending'>('idle');
  const [error, setError] = useState<string | null>(null);
  const currentUserId = useAppSelector(selectCurrentUserId);
  const dispatch = useAppDispatch();
  console.log('        🖼  AddPostForm renders');

  async function handleSave() {
    if (!currentUserId) return;
    setStatus('pending');
    setError(null);
    try {
      await dispatch(addNewPost({ title, content, user: currentUserId })).unwrap();
      setTitle('');
      setContent('');
    } catch (err) {
      setError((err as SerializedError).message ?? 'Unknown error');
    } finally {
      setStatus('idle');
    }
  }

  return (
    <section>
      <h2>Add a new post</h2>
      <p>
        <input placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />{' '}
        <textarea placeholder="Content" value={content} onChange={(event) => setContent(event.target.value)} />{' '}
        <button disabled={!title || !content || status === 'pending'} onClick={handleSave}>
          Save post
        </button>
      </p>
      {status === 'pending' && <p>Saving…</p>}
      {error && <p>❌ {error}</p>}
    </section>
  );
}
```

What changed:
- `status` and `error` are component state: only this form shows them.
- `await dispatch(addNewPost(…)).unwrap()`: waits for the server; resolves with the saved post, or throws.
- `(err as SerializedError).message`: what `unwrap` throws for a failed request is a `SerializedError` (plain
  object), not an `Error` instance, so `instanceof Error` would be `false`; the assertion says what it is.
- The fields are emptied only after a successful save; on failure, the text stays and the error shows.
- The button is disabled while saving, so a double click can't send the post twice.

## 7. What the demo checks

Part 1 dispatches `fetchPosts()` **twice** in a row, without React, to see `condition` at work. Parts 2–4 use the
app. `server.failNext('POST /posts')` (a knob of the given server) makes the next POST fail with a 500 error.

## Build step 05.6: the demo

Open `demos/05-create-async-thunk.tsx`. Replace the placeholder `🧩 05.6` with:

```tsx
// Lecture 05 demo: createAsyncThunk's lifecycle actions, condition, unwrap and errors.
import { rootElement, find, findButton, typeText, choose, click, wait, inAct, printScreen } from '../src/debug/testDom';
import { server } from '../src/api/server';
import { store } from '../src/app/store';
import { fetchPosts } from '../src/features/posts/postsSlice';
import { renderApp } from '../src/main';

console.log('— 1. createAsyncThunk, without React —');
const first = store.dispatch(fetchPosts());
const second = store.dispatch(fetchPosts()); // the first is still running
console.log('  posts status right after dispatching:', store.getState().posts.status);
const [firstResult, secondResult] = await Promise.all([first, second]);
console.log('  first  →', firstResult.type, '| posts in the store:', store.getState().posts.posts.length);
console.log('  second →', secondResult.type, '| cancelled by condition:', fetchPosts.rejected.match(secondResult) && secondResult.meta.condition);

console.log('\n— 2. The app starts: the users load, Linus logs in —');
await inAct(() => renderApp(rootElement));
printScreen('users loading');
await wait(300);
await choose(find<HTMLSelectElement>('select'), 'u2');
await click(findButton('Log in'));
printScreen('logged in');

console.log('\n— 3. A new post —');
await typeText(find<HTMLInputElement>('input'), 'Thunks');
await typeText(find<HTMLTextAreaElement>('textarea'), 'createAsyncThunk is neat');
await click(findButton('Save post'));
printScreen('saving');
await wait(300);

console.log('\n— 4. A post the server refuses —');
server.failNext('POST /posts');
await typeText(find<HTMLInputElement>('input'), 'Oops');
await typeText(find<HTMLTextAreaElement>('textarea'), 'This will fail');
await click(findButton('Save post'));
await wait(300);
printScreen('after the failure');
```

## Run it

```bash
npm run lesson 05
```

Expected output (not run):

```text
— 1. createAsyncThunk, without React —
    📝 posts/fetchPosts/pending
  posts status right after dispatching: pending
  🌐 server: GET /posts (answers in 200 ms)
    📝 posts/fetchPosts/fulfilled
  first  → posts/fetchPosts/fulfilled | posts in the store: 2
  second → posts/fetchPosts/rejected | cancelled by condition: true

— 2. The app starts: the users load, Linus logs in —
    📝 users/fetchUsers/pending
        🖼  App renders
        🖼  LoginForm renders
  ┌─ users loading
  │ Welcome! Please log in
  │ <Choose a user> (Log in)⊘
  └─
  🌐 server: GET /users (answers in 200 ms)
    📝 users/fetchUsers/fulfilled
        🖼  LoginForm renders
        🖼  LoginForm renders
    📝 auth/userLoggedIn
        🖼  App renders
        🖼  Navbar renders
        🖼  AddPostForm renders
        🖼  PostsList renders
        🖼  PostExcerpt "Redux Toolkit" renders
        🖼  PostExcerpt "First post!" renders
  ┌─ logged in
  │ Logged in as Linus Torvalds (Log out)
  │ Add a new post
  │ [Title] [Content] (Save post)⊘
  │ Posts
  │ Redux Toolkit
  │ by Linus Torvalds
  │ Less boilerplate, same ideas.
  │ (👍 0)(❤️ 0)(🚀 0)
  │ First post!
  │ by Ada Lovelace
  │ Hello, everyone.
  │ (👍 0)(❤️ 0)(🚀 0)
  └─

— 3. A new post —
        🖼  AddPostForm renders
        🖼  AddPostForm renders
    📝 posts/addNewPost/pending
        🖼  AddPostForm renders
  ┌─ saving
  │ Logged in as Linus Torvalds (Log out)
  │ Add a new post
  │ [Thunks] [createAsyncThunk is neat] (Save post)⊘
  │ Saving…
  │ Posts
  │ Redux Toolkit
  │ by Linus Torvalds
  │ Less boilerplate, same ideas.
  │ (👍 0)(❤️ 0)(🚀 0)
  │ First post!
  │ by Ada Lovelace
  │ Hello, everyone.
  │ (👍 0)(❤️ 0)(🚀 0)
  └─
  🌐 server: POST /posts {"title":"Thunks","content":"createAsyncThunk is neat","user":"u2"} (answers in 200 ms)
    📝 posts/addNewPost/fulfilled
        🖼  AddPostForm renders
        🖼  PostsList renders
        🖼  PostExcerpt "Thunks" renders
        🖼  PostExcerpt "Redux Toolkit" renders
        🖼  PostExcerpt "First post!" renders

— 4. A post the server refuses —
        🖼  AddPostForm renders
        🖼  AddPostForm renders
    📝 posts/addNewPost/pending
        🖼  AddPostForm renders
  🌐 server: POST /posts {"title":"Oops","content":"This will fail","user":"u2"} (answers in 200 ms)
    📝 posts/addNewPost/rejected
        🖼  AddPostForm renders
  ┌─ after the failure
  │ Logged in as Linus Torvalds (Log out)
  │ Add a new post
  │ [Oops] [This will fail] (Save post)
  │ ❌ 500: the server failed
  │ Posts
  │ Thunks
  │ by Linus Torvalds
  │ createAsyncThunk is neat
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
- **Part 1, the lifecycle.** The first `dispatch(fetchPosts())` ran `condition` (status `'idle'` → go on),
  dispatched `pending` **synchronously** (the status is already `pending` on the next line), and started the
  request. The second `dispatch` ran `condition` again: status `'pending'` → `false` → nothing dispatched, no
  request. Both dispatches returned Promises. 200 ms later the server answered; `fulfilled` stored the two posts.
  The first Promise resolved with the `fulfilled` action; the second with a `rejected` action marked
  `meta.condition: true`, which was **not** dispatched (no `📝` line for it).
- **Part 2.** `renderApp` dispatched `fetchUsers()` (pending), then React drew the login form with an empty list.
  When the users arrived, `LoginForm` re-rendered with them; choosing Linus re-rendered it again. After the login,
  `PostsList` appeared and its effect dispatched `fetchPosts()`, but the posts were already `'succeeded'` (part 1):
  `condition` returned `false`, so nothing at all was dispatched or requested. The posts are shown newest first:
  "Redux Toolkit" (10:02) above "First post!" (10:01).
- **Part 3.** Typing re-rendered the form twice. "Save post" set the form's status to `'pending'` and dispatched
  `addNewPost`: `pending` was logged, and the form shows "Saving…" with its button disabled. When the server
  answered, `fulfilled` appended the post (id `p3`, date 10:03): `PostsList` and its excerpts re-rendered, the new
  post on top. Then `.unwrap()` resolved, and the form emptied its fields.
- **Part 4.** The server answered 500: the payload creator's `client.post` threw, `createAsyncThunk` dispatched
  `rejected` with a `SerializedError` whose message is the thrown error's message, and `.unwrap()` threw that error
  into the form's `catch`. Only the form re-rendered: the text is still there, the error is shown, the button is
  enabled again. No post was added.

## The whole picture

```text
dispatch(addNewPost({ title, content, user }))
   └─ thunk middleware calls the generated thunk:
        condition? ── false → return a rejected action { meta.condition: true }, dispatch nothing
          │ true / none
          ├─ dispatch(addNewPost.pending(requestId, arg))                → extraReducers: (nothing for this one)
          ├─ await payloadCreator(arg, thunkAPI)   ··· server ···
          ├─ ok    → dispatch(addNewPost.fulfilled(payload, requestId)) → extraReducers: posts.push(payload)
          └─ error → dispatch(addNewPost.rejected(error, requestId))    → (SerializedError)
   returns Promise<final action>  ── .unwrap() → payload, or throws the error
```

## Summary

| Term | What it is, in one line |
|---|---|
| **`createAsyncThunk`** | builds a thunk creator that runs an async function and dispatches pending/fulfilled/rejected |
| **payload creator** | the async function you give it; its result becomes the `fulfilled` payload |
| **lifecycle actions** | `x.pending`, `x.fulfilled`, `x.rejected`: action creators, used in `extraReducers` |
| **`requestId`** | the unique id of one call, in every lifecycle action's `meta` |
| **`condition`** | an option that can cancel the thunk before anything is dispatched |
| **`SerializedError`** | the plain-object form of an error, `{ name, message, stack }`, in `rejected` actions |
| **`.unwrap()`** | turns the dispatched thunk's result into "the payload, or throw" |
| **`createAppAsyncThunk`** | `createAsyncThunk.withTypes<{ state: RootState; dispatch: AppDispatch }>()` |

**Next lecture:** [06-selectors-and-performance](06-selectors-and-performance.md): measuring which components
re-render, and using memoized selectors and `React.memo` so that only the right ones do.
