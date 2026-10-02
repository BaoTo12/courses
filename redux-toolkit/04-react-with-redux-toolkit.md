# Lecture 04. React with Redux Toolkit: the app's screens

> **By the end you can:** create typed hooks with `.withTypes()`; organise an RTK app by feature folders; build
> components that read with selectors and write with action creators; decide which state stays local.
> **New terms in this lesson:** `Provider`, `useSelector` / `useDispatch` (reminder), `.withTypes()`, feature
> folder
> **You should already know:** `createSlice`, generated action creators ([02](02-create-slice-and-immer.md)); prepare
> callbacks, slice selectors ([03](03-prepare-and-extra-reducers.md)); React components, props, `useState`
> **Project files you fill in:** `src/app/hooks.ts` (🧩 04.1), `src/features/users/usersSlice.ts` (🧩 04.2),
> `src/features/auth/LoginForm.tsx` (🧩 04.3), `src/components/Navbar.tsx` (🧩 04.4),
> `src/features/posts/PostAuthor.tsx`, `ReactionButtons.tsx`, `PostExcerpt.tsx`, `PostsList.tsx`, `AddPostForm.tsx`
> (🧩 04.5–04.9), `src/App.tsx` (🧩 04.10), `src/main.tsx` (🧩 04.11), `demos/04-react-with-redux-toolkit.tsx` (🧩 04.12)

## 1. React-Redux in three lines (reminder)

The `react-redux` library connects React to the store; the Redux course built it by hand (its
[lecture 08](../redux/08-react-redux.md)). Three pieces:

- **`<Provider store={store}>`** around the app puts the store in a React context.
- **`useSelector(selector)`** returns `selector(state)` and re-renders the component when that value changes
  (compared with `===`).
- **`useDispatch()`** returns the store's `dispatch`.

Redux Toolkit doesn't replace react-redux: it's used exactly the same way. The demos run the UI in a fake page
(`src/debug/testDom.ts`, given): import it first; `printScreen()` prints the page as text (`[x]` an input showing
its value or placeholder, `(text)` a button, `⊘` after a button means disabled, `<text>` a dropdown's selected
option).

## 2. Typed hooks with `.withTypes()`

`useSelector((state) => …)` doesn't know your state's type, and `useDispatch()` doesn't know your store accepts
thunks. Instead of annotating every call, we create, once, hooks that already know them.

> **API card: `.withTypes()` (on `useSelector` and `useDispatch`, package `react-redux` 9.1+)**
>
> ```ts
> useSelector.withTypes<RootState>(): <Selected>(selector: (state: RootState) => Selected) => Selected;
> useDispatch.withTypes<AppDispatch>(): () => AppDispatch;
> ```
>
> **What it does:** returns the **same** hook, with its type fixed. At runtime, `useAppSelector` *is*
> `useSelector`. RTK has the same pattern for other functions (`createAsyncThunk.withTypes`, lecture 05).

### Build step 04.1: the typed hooks

Open `src/app/hooks.ts`. Replace the placeholder `🧩 04.1` with:

```ts
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

Every component uses these two, never the untyped originals.

## 3. Feature folders

Redux Toolkit's recommended layout groups files **by feature**, not by kind: everything about posts (the slice, the
components that show posts) lives in `src/features/posts/`. The app-wide setup lives in `src/app/`.

```text
src/
├── app/          store.ts, hooks.ts, logger.ts           the setup
├── features/
│   ├── auth/     authSlice.ts, LoginForm.tsx
│   ├── posts/    postsSlice.ts, PostsList.tsx, PostExcerpt.tsx, PostAuthor.tsx, ReactionButtons.tsx, AddPostForm.tsx
│   └── users/    usersSlice.ts
├── components/   Navbar.tsx                               shared UI that belongs to no feature
├── App.tsx       the screens
└── main.tsx      renderApp: Provider + App
```

## 4. The users slice

Posts have an author (`post.user`, a user id); the login form lists the users. For now, the users are written in
the initial state; lecture 05 loads them from the server.

### Build step 04.2: `usersSlice`

Open `src/features/users/usersSlice.ts`. Replace the placeholder `🧩 04.2` with:

```ts
import { createSlice } from '@reduxjs/toolkit';

export interface User {
  id: string;
  name: string;
}

const initialState: User[] = [
  { id: 'u1', name: 'Ada Lovelace' },
  { id: 'u2', name: 'Linus Torvalds' },
];

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  selectors: {
    selectAllUsers: (users) => users,
    selectUserById: (users, userId: string | null) => users.find((user) => user.id === userId),
  },
});

export const { selectAllUsers, selectUserById } = usersSlice.selectors;
export const usersReducer = usersSlice.reducer;
```

`reducers: {}`: no actions yet. `selectUserById` accepts `null` (no one logged in) and then returns `undefined`.

Then in `src/app/store.ts`, add the import and the slice:

```ts
import { usersReducer } from '../features/users/usersSlice';
```

```ts
  reducer: {
    auth: authReducer,
    posts: postsReducer,
    users: usersReducer,
  },
```

## 5. The components

Every component prints a `🖼` line when it renders, so the demo shows which ones re-render.

### Build step 04.3: `LoginForm`

Open `src/features/auth/LoginForm.tsx`. Replace the placeholder `🧩 04.3` with:

```tsx
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectAllUsers } from '../users/usersSlice';
import { userLoggedIn } from './authSlice';

export function LoginForm() {
  const users = useAppSelector(selectAllUsers);
  const dispatch = useAppDispatch();
  const [userId, setUserId] = useState('');
  console.log('        🖼  LoginForm renders');

  return (
    <section>
      <h2>Welcome! Please log in</h2>
      <p>
        <select value={userId} onChange={(event) => setUserId(event.target.value)}>
          <option value="">Choose a user</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>{' '}
        <button disabled={!userId} onClick={() => dispatch(userLoggedIn(userId))}>
          Log in
        </button>
      </p>
    </section>
  );
}
```

What each part does:
- `useAppSelector(selectAllUsers)`: the users for the dropdown. `selectAllUsers` is a slice selector that takes the
  root state, exactly what `useAppSelector` passes.
- The chosen user is **component state** (`useState`): only this form cares about it until the user clicks "Log
  in". Then `dispatch(userLoggedIn(userId))` makes it global.
- `disabled={!userId}`: no login without a choice.

### Build step 04.4: `Navbar`

Open `src/components/Navbar.tsx`. Replace the placeholder `🧩 04.4` with:

```tsx
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectCurrentUserId, userLoggedOut } from '../features/auth/authSlice';
import { selectUserById } from '../features/users/usersSlice';

export function Navbar() {
  const currentUserId = useAppSelector(selectCurrentUserId);
  const user = useAppSelector((state) => selectUserById(state, currentUserId));
  const dispatch = useAppDispatch();
  console.log('        🖼  Navbar renders');

  return (
    <header>
      Logged in as {user?.name}{' '}
      <button onClick={() => dispatch(userLoggedOut())}>Log out</button>
    </header>
  );
}
```

`(state) => selectUserById(state, currentUserId)`: an inline selector, because it needs a value from the
component. `state` is a `RootState`, thanks to the typed hook. `user?.name`: `user` may be `undefined`.

### Build step 04.5: `PostAuthor`

Open `src/features/posts/PostAuthor.tsx`. Replace the placeholder `🧩 04.5` with:

```tsx
import { useAppSelector } from '../../app/hooks';
import { selectUserById } from '../users/usersSlice';

export function PostAuthor({ userId }: { userId: string }) {
  const author = useAppSelector((state) => selectUserById(state, userId));
  return <span>by {author?.name ?? 'Unknown author'}</span>;
}
```

A post stores only its author's **id** (one copy of each user, in the users slice). This component looks the user
up. `??` gives the fallback when the id matches no user.

### Build step 04.6: `ReactionButtons`

Open `src/features/posts/ReactionButtons.tsx`. Replace the placeholder `🧩 04.6` with:

```tsx
import { useAppDispatch } from '../../app/hooks';
import { reactionAdded, type Post, type ReactionName } from './postsSlice';

const reactionEmoji: Record<ReactionName, string> = { thumbsUp: '👍', heart: '❤️', rocket: '🚀' };

export function ReactionButtons({ post }: { post: Post }) {
  const dispatch = useAppDispatch();
  const names = Object.keys(reactionEmoji) as ReactionName[];

  return (
    <div>
      {names.map((name) => (
        <button key={name} onClick={() => dispatch(reactionAdded({ postId: post.id, reaction: name }))}>
          {reactionEmoji[name]} {post.reactions[name]}
        </button>
      ))}
    </div>
  );
}
```

What each part does:
- `Record<ReactionName, string>`: an object with exactly one string per reaction name. Forgetting one (or adding a
  wrong one) is a compile error.
- `Object.keys` returns `string[]`; the assertion says these strings are `ReactionName`s, which is true for this
  object.
- Each button shows the emoji and the count from the post, and dispatches `reactionAdded`.

### Build step 04.7: `PostExcerpt`

Open `src/features/posts/PostExcerpt.tsx`. Replace the placeholder `🧩 04.7` with:

```tsx
import type { Post } from './postsSlice';
import { PostAuthor } from './PostAuthor';
import { ReactionButtons } from './ReactionButtons';

export function PostExcerpt({ post }: { post: Post }) {
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
}
```

One post: title, author, content, reactions.

### Build step 04.8: `PostsList`

Open `src/features/posts/PostsList.tsx`. Replace the placeholder `🧩 04.8` with:

```tsx
import { useAppSelector } from '../../app/hooks';
import { selectAllPosts } from './postsSlice';
import { PostExcerpt } from './PostExcerpt';

export function PostsList() {
  const posts = useAppSelector(selectAllPosts);
  console.log('        🖼  PostsList renders');
  const newestFirst = posts.slice().sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section>
      <h2>Posts</h2>
      {newestFirst.map((post) => (
        <PostExcerpt key={post.id} post={post} />
      ))}
    </section>
  );
}
```

What each part does:
- `posts.slice().sort(…)`: `sort` mutates the array it's called on, and `posts` comes from the store (frozen by
  Immer: sorting it would throw). `slice()` makes a copy first. ISO dates sort correctly as strings.
- The sorting runs on every render. Lecture 06 moves it into a memoized selector.

### Build step 04.9: `AddPostForm`

Open `src/features/posts/AddPostForm.tsx`. Replace the placeholder `🧩 04.9` with:

```tsx
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectCurrentUserId } from '../auth/authSlice';
import { postAdded } from './postsSlice';

export function AddPostForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const currentUserId = useAppSelector(selectCurrentUserId);
  const dispatch = useAppDispatch();
  console.log('        🖼  AddPostForm renders');

  function handleSave() {
    if (!currentUserId) return;
    dispatch(postAdded(title, content, currentUserId));
    setTitle('');
    setContent('');
  }

  return (
    <section>
      <h2>Add a new post</h2>
      <p>
        <input placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />{' '}
        <textarea placeholder="Content" value={content} onChange={(event) => setContent(event.target.value)} />{' '}
        <button disabled={!title || !content} onClick={handleSave}>
          Save post
        </button>
      </p>
    </section>
  );
}
```

What each part does:
- The title and content being typed are component state (lecture 08 of the Redux course: only this form uses them).
- `handleSave` dispatches `postAdded(title, content, currentUserId)`: the prepare callback (lecture 03) adds the id,
  the date and the reactions. The component knows nothing about how a post is built.
- `if (!currentUserId) return`: TypeScript requires it (`currentUserId` is `string | null`); the form is only shown
  to a logged-in user anyway.

### Build step 04.10: `App`

Open `src/App.tsx`. Replace the placeholder `🧩 04.10` with:

```tsx
import { useAppSelector } from './app/hooks';
import { Navbar } from './components/Navbar';
import { LoginForm } from './features/auth/LoginForm';
import { selectCurrentUserId } from './features/auth/authSlice';
import { AddPostForm } from './features/posts/AddPostForm';
import { PostsList } from './features/posts/PostsList';

export function App() {
  const currentUserId = useAppSelector(selectCurrentUserId);
  console.log('        🖼  App renders');

  if (!currentUserId) {
    return (
      <main>
        <LoginForm />
      </main>
    );
  }
  return (
    <main>
      <Navbar />
      <AddPostForm />
      <PostsList />
    </main>
  );
}
```

Two screens: the login form, or the feed. `App` re-renders only when `currentUserId` changes.

### Build step 04.11: `renderApp`

Open `src/main.tsx`. Replace the placeholder `🧩 04.11` with:

```tsx
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { App } from './App';

export function renderApp(container: HTMLElement): Root {
  const root = createRoot(container);
  root.render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
  return root;
}
```

In a browser, this would run on page load with the page's root element; our demos call it themselves.

## Build step 04.12: the demo

Open `demos/04-react-with-redux-toolkit.tsx`. Replace the placeholder `🧩 04.12` with:

```tsx
// Lecture 04 demo: log in, write a post, react to it.
import { rootElement, find, findButton, typeText, choose, click, inAct, printScreen } from '../src/debug/testDom';
import { renderApp } from '../src/main';

console.log('— 1. Not logged in: the login form —');
await inAct(() => renderApp(rootElement));
printScreen();

console.log('\n— 2. Choose Ada and log in —');
await choose(find<HTMLSelectElement>('select'), 'u1');
await click(findButton('Log in'));
printScreen();

console.log('\n— 3. Write a post —');
await typeText(find<HTMLInputElement>('input'), 'Hello');
await typeText(find<HTMLTextAreaElement>('textarea'), 'My first post');
await click(findButton('Save post'));
printScreen();

console.log('\n— 4. React with a rocket —');
await click(findButton('🚀'));
printScreen();
```

`findButton(label)` (from `testDom.ts`) finds the first button whose text contains `label`.

## Run it

```bash
npm run lesson 04
```

Expected output (not run):

```text
— 1. Not logged in: the login form —
        🖼  App renders
        🖼  LoginForm renders
  ┌─ screen
  │ Welcome! Please log in
  │ <Choose a user> (Log in)⊘
  └─

— 2. Choose Ada and log in —
        🖼  LoginForm renders
    📝 auth/userLoggedIn
        🖼  App renders
        🖼  Navbar renders
        🖼  AddPostForm renders
        🖼  PostsList renders
  ┌─ screen
  │ Logged in as Ada Lovelace (Log out)
  │ Add a new post
  │ [Title] [Content] (Save post)⊘
  │ Posts
  └─

— 3. Write a post —
        🖼  AddPostForm renders
        🖼  AddPostForm renders
    📝 posts/postAdded
        🖼  AddPostForm renders
        🖼  PostsList renders
        🖼  PostExcerpt "Hello" renders
  ┌─ screen
  │ Logged in as Ada Lovelace (Log out)
  │ Add a new post
  │ [Title] [Content] (Save post)⊘
  │ Posts
  │ Hello
  │ by Ada Lovelace
  │ My first post
  │ (👍 0)(❤️ 0)(🚀 0)
  └─

— 4. React with a rocket —
    📝 posts/reactionAdded
        🖼  PostsList renders
        🖼  PostExcerpt "Hello" renders
  ┌─ screen
  │ Logged in as Ada Lovelace (Log out)
  │ Add a new post
  │ [Title] [Content] (Save post)⊘
  │ Posts
  │ Hello
  │ by Ada Lovelace
  │ My first post
  │ (👍 0)(❤️ 0)(🚀 1)
  └─
```

Walk-through:
- **Part 1.** No one is logged in: `App` shows `LoginForm`. The dropdown shows its first option and "Log in" is
  disabled.
- **Part 2.** Choosing Ada changed `LoginForm`'s own state (one re-render; the button is now enabled). The click
  dispatched `auth/userLoggedIn`; `App`'s selected `currentUserId` changed, so `App` re-rendered and showed the
  feed: `Navbar`, `AddPostForm`, and an empty `PostsList`.
- **Part 3.** Each typed field re-rendered only `AddPostForm` (component state). "Save post" dispatched
  `posts/postAdded`, built by the prepare callback, then emptied the fields: `AddPostForm` re-rendered (its state),
  `PostsList` re-rendered (new posts array), and the new `PostExcerpt` rendered. `Navbar` and `App` didn't: what
  they select didn't change.
- **Part 4.** The rocket dispatched `posts/reactionAdded`. Immer replaced the post and the posts array, so
  `PostsList` re-rendered, and with it the excerpt. The count is 1.

## The whole picture

```text
<Provider store>
  <App>                        useAppSelector(selectCurrentUserId) → which screen
    <LoginForm>                useAppSelector(selectAllUsers); click → dispatch(userLoggedIn(id))
    <Navbar>                   useAppSelector(selectUserById); click → dispatch(userLoggedOut())
    <AddPostForm>              useState(title, content); click → dispatch(postAdded(title, content, userId))
    <PostsList>                useAppSelector(selectAllPosts) → sort → <PostExcerpt post> × n
      <PostExcerpt>              <PostAuthor userId> (useAppSelector(selectUserById)), <ReactionButtons post>
```

## Summary

| Term | What it is, in one line |
|---|---|
| **`Provider` / `useSelector` / `useDispatch`** | react-redux's three pieces: store in context, read with re-render, dispatch |
| **`.withTypes()`** | returns the same hook with the app's types fixed: `useAppSelector`, `useAppDispatch` |
| **feature folder** | the recommended layout: everything about one feature (slice + components) in one folder |

**Next lecture:** [05-create-async-thunk](05-create-async-thunk.md): the posts and users come from the server, with
loading status, errors and duplicate-request protection written for you.
