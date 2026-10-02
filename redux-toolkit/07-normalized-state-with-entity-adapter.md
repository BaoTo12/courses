# Lecture 07. Normalized state with `createEntityAdapter`

> **By the end you can:** explain normalized state and why the list component should select ids; store posts and
> users with `createEntityAdapter`; use its update methods in case reducers and its generated selectors; keep a
> collection sorted automatically.
> **New terms in this lesson:** normalized state (reminder), `createEntityAdapter`, `EntityState`, adapter CRUD
> methods, `getSelectors`, `sortComparer`
> **You should already know:** `createSlice`, `extraReducers`, `createAsyncThunk` ([02](02-create-slice-and-immer.md)–[05](05-create-async-thunk.md));
> `React.memo`, `createSelector` ([06](06-selectors-and-performance.md))
> **Project files you fill in:** `src/features/posts/postsSlice.ts`, `src/features/users/usersSlice.ts`,
> `PostsList.tsx`, `PostExcerpt.tsx`, `src/components/Navbar.tsx` (changes), `demos/07-normalized-state-with-entity-adapter.tsx` (🧩 07.6)

## 1. The problem: arrays make every lookup and every update a loop

Our posts are an array:
- `selectPostById` and `reactionAdded` both `find` the post by looping over the whole array;
- `PostsList` selects the whole posts array, so **any** change to **any** post re-renders it (lecture 06 then needed
  `memo` to save the excerpts);
- the list must be sorted by a memoized selector.

## 2. Normalized state (reminder)

The Redux course's lecture 11 stored items **by id**: `entities: { p1: {…}, p2: {…} }`. Redux Toolkit's standard
shape adds one more field, the list of ids in order:

```ts
{
  ids: ['p2', 'p1'],                         // the order (here: newest first)
  entities: { p1: { id: 'p1', … }, p2: { id: 'p2', … } },   // each item once, by id
}
```

- Looking up a post: `entities[id]`, no loop.
- Updating a post: replace one entity; `ids` stays the **same array**.
- The list component selects **`ids`**: it re-renders only when posts are added, removed or reordered, not when one
  post's content changes. Each item component selects its own entity by id.

## 3. `createEntityAdapter`

Writing "add one", "update one", "set all", "keep sorted" and the selectors by hand for every collection is the same
code each time. **`createEntityAdapter`** provides it.

> **API card: `createEntityAdapter` (package `@reduxjs/toolkit`)**
>
> **What it is:** a set of prebuilt reducer functions and selectors for a normalized `{ ids, entities }` collection.
>
> ```ts
> function createEntityAdapter<T extends { id: Id }>(options?: {
>   selectId?: (item: T) => Id;              // where the id is (default: item.id)
>   sortComparer?: (a: T, b: T) => number;   // keep `ids` sorted with this comparison (default: insertion order)
> }): {
>   getInitialState<Extra>(extra?: Extra): EntityState<T, Id> & Extra;
>   // CRUD methods: (state, argument) → update the collection (usable as case reducers, or inside one):
>   addOne, addMany, setOne, setAll, updateOne, upsertOne, removeOne, removeAll, …;
>   getSelectors(selectSlice?: (rootState) => EntityState<T, Id>): {
>     selectIds, selectEntities, selectAll, selectTotal, selectById(state, id);
>   };
> };
> type EntityState<T, Id> = { ids: Id[]; entities: Record<Id, T> };
> ```
>
> **What it does:**
> - `getInitialState({ status: 'idle' })` returns `{ ids: [], entities: {}, status: 'idle' }`: the empty collection
>   plus your extra fields.
> - The **CRUD methods** (Create, Read, Update, Delete) update `ids` and `entities` correctly together, with Immer:
>   `setAll(state, items)` replaces everything, `addOne(state, item)` adds one, `updateOne(state, { id, changes })`
>   merges `changes` into one entity, `removeOne(state, id)`… With a `sortComparer`, `ids` is re-sorted after each
>   change, and replaced only if the order really changed.
> - `getSelectors(selectSlice)` returns selectors that take the **root** state. `selectAll` is memoized: it
>   returns the same array as long as `ids` and `entities` didn't change.

### Build step 07.1: the posts slice, normalized

In `src/features/posts/postsSlice.ts`:

1. Add `createEntityAdapter` and `type EntityState` to the `@reduxjs/toolkit` import.

2. Replace `PostsState` and `initialState` with:

```ts
export interface PostsState extends EntityState<Post, string> {
  status: 'idle' | 'pending' | 'succeeded' | 'failed';
  error: string | null;
}

const postsAdapter = createEntityAdapter<Post>({
  sortComparer: (a, b) => b.date.localeCompare(a.date), // newest first
});

const initialState: PostsState = postsAdapter.getInitialState({ status: 'idle', error: null });
```

3. Replace the two case reducers in `reducers`:

```ts
    postUpdated(state, action: PayloadAction<{ id: string; title: string; content: string }>) {
      const { id, title, content } = action.payload;
      postsAdapter.updateOne(state, { id, changes: { title, content } });
    },
    reactionAdded(state, action: PayloadAction<{ postId: string; reaction: ReactionName }>) {
      const { postId, reaction } = action.payload;
      const post = state.entities[postId];
      if (post) post.reactions[reaction]++;
    },
```

4. In `extraReducers`, replace the `fetchPosts.fulfilled` and `addNewPost.fulfilled` cases with:

```ts
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        postsAdapter.setAll(state, action.payload);
      })
```

```ts
      .addCase(addNewPost.fulfilled, postsAdapter.addOne);
```

5. In the `selectors` field, delete `selectAllPosts` and `selectPostById` (keep the status and error selectors), and
   replace the selector exports with:

```ts
export const { selectPostsStatus, selectPostsError } = postsSlice.selectors;

export const {
  selectAll: selectAllPosts,
  selectById: selectPostById,
  selectIds: selectPostIds,
} = postsAdapter.getSelectors((state: RootState) => state.posts);
```

6. Delete `selectSortedPosts` (the adapter keeps `ids` sorted). Keep `selectPostsByUser`: it uses
   `selectAllPosts`, which still exists. Move it **below** the adapter's selectors, since it uses them when the
   file loads.

What each part does:
- `PostsState extends EntityState<Post, string>`: `ids: string[]` and `entities: Record<string, Post>`, plus our two
  fields. `getInitialState` builds exactly that.
- `sortComparer`: the adapter keeps `ids` sorted newest first after every change it makes.
- `updateOne(state, { id, changes })`: an adapter method called **inside** a case reducer; it works on the draft.
- `reactionAdded`: an `entities[postId]` lookup instead of `find`. Mutating the entity on the draft is fine; `ids`
  isn't touched, so it stays the same array.
- `postsAdapter.addOne` has the shape of a case reducer (`(state, action) => …`, it takes the payload from the
  action), so it can be passed to `addCase` **directly**.
- `getSelectors((state: RootState) => state.posts)` gives selectors that take the root state. We rename them on
  export (`selectAll: selectAllPosts`): every component that imported `selectAllPosts` / `selectPostById` keeps
  working.
- Why move `selectPostsByUser`: `createSelector([selectAllPosts, …])` reads `selectAllPosts` when that line runs;
  a `const` used before its line throws "Cannot access before initialization".

### Build step 07.2: the users slice, normalized

Replace the whole content of `src/features/users/usersSlice.ts` with:

```ts
import { createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { client } from '../../api/client';
import { createAppAsyncThunk } from '../../app/withTypes';
import type { RootState } from '../../app/store';

export interface User {
  id: string;
  name: string;
}

export const fetchUsers = createAppAsyncThunk('users/fetchUsers', async () => client.get<User[]>('/users'));

const usersAdapter = createEntityAdapter<User>();

const usersSlice = createSlice({
  name: 'users',
  initialState: usersAdapter.getInitialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchUsers.fulfilled, usersAdapter.setAll);
  },
});

export const { selectAll: selectAllUsers, selectById: selectUserById } = usersAdapter.getSelectors(
  (state: RootState) => state.users,
);
export const usersReducer = usersSlice.reducer;
```

Same pattern, without sorting (the server's order). `setAll` is passed directly as the case reducer.
`selectUserById(state, id)` now takes a `string`, not `null`.

### Build step 07.3: `PostsList` selects ids

Replace the whole content of `src/features/posts/PostsList.tsx` with:

```tsx
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchPosts, selectPostIds, selectPostsError, selectPostsStatus } from './postsSlice';
import { PostExcerpt } from './PostExcerpt';

export function PostsList() {
  const postIds = useAppSelector(selectPostIds);
  const status = useAppSelector(selectPostsStatus);
  const error = useAppSelector(selectPostsError);
  const dispatch = useAppDispatch();
  console.log('        🖼  PostsList renders');

  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  return (
    <section>
      <h2>Posts</h2>
      {status === 'pending' && <p>Loading…</p>}
      {status === 'failed' && <p>❌ {error}</p>}
      {postIds.map((postId) => (
        <PostExcerpt key={postId} postId={postId} />
      ))}
    </section>
  );
}
```

### Build step 07.4: `PostExcerpt` selects its own post

Replace the whole content of `src/features/posts/PostExcerpt.tsx` with:

```tsx
import { memo } from 'react';
import { useAppSelector } from '../../app/hooks';
import { selectPostById } from './postsSlice';
import { PostAuthor } from './PostAuthor';
import { ReactionButtons } from './ReactionButtons';

export const PostExcerpt = memo(function PostExcerpt({ postId }: { postId: string }) {
  const post = useAppSelector((state) => selectPostById(state, postId));
  if (!post) return null;
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

The prop is now a string id: when `PostsList` does re-render (a post is added), `memo` skips every excerpt whose id
didn't change, and each excerpt re-renders on its own when **its** entity changes. `if (!post)` protects the moment
right after a post is removed.

### Build step 07.5: `Navbar` with the new `selectUserById`

In `src/components/Navbar.tsx`, replace the `user` line with:

```tsx
  const user = useAppSelector((state) => (currentUserId ? selectUserById(state, currentUserId) : undefined));
```

The adapter's `selectById` needs a real id; the ternary handles "no one logged in".

## Build step 07.6: the demo

Open `demos/07-normalized-state-with-entity-adapter.tsx`. Replace the placeholder `🧩 07.6` with:

```tsx
// Lecture 07 demo: the normalized posts slice, and who re-renders after a reaction.
import { rootElement, find, findAll, findButton, choose, click, wait, inAct, printScreen } from '../src/debug/testDom';
import { store } from '../src/app/store';
import { fetchPosts, reactionAdded, selectPostById, selectPostIds } from '../src/features/posts/postsSlice';
import { renderApp } from '../src/main';

console.log('— 1. The normalized posts slice —');
await store.dispatch(fetchPosts());
const posts = store.getState().posts;
console.log('  ids (newest first):', JSON.stringify(posts.ids));
console.log('  entities keys:', Object.keys(posts.entities).join(', '), '| status:', posts.status);
const idsBefore = selectPostIds(store.getState());
store.dispatch(reactionAdded({ postId: 'p1', reaction: 'heart' }));
console.log('  after a reaction: same ids array?', selectPostIds(store.getState()) === idsBefore);
console.log('  p1 hearts:', selectPostById(store.getState(), 'p1')?.reactions.heart);

console.log('\n— 2. The app: Ada logs in —');
await inAct(() => renderApp(rootElement));
await wait(300);
await choose(find<HTMLSelectElement>('select'), 'u1');
await click(findButton('Log in'));

console.log('\n— 3. A 🚀 on "First post!": PostsList does not even re-render —');
const rocketButtons = findAll<HTMLButtonElement>('button').filter((button) => button.textContent?.startsWith('🚀'));
await click(rocketButtons[1]);
printScreen();
```

`await store.dispatch(fetchPosts())`: dispatching an async thunk returns a Promise of its final action, so the demo
can wait for it.

## Run it

```bash
npm run lesson 07
```

Expected output (not run):

```text
— 1. The normalized posts slice —
    📝 posts/fetchPosts/pending
  🌐 server: GET /posts (answers in 200 ms)
    📝 posts/fetchPosts/fulfilled
  ids (newest first): ["p2","p1"]
  entities keys: p1, p2 | status: succeeded
    📝 posts/reactionAdded
  after a reaction: same ids array? true
  p1 hearts: 1

— 2. The app: Ada logs in —
    📝 users/fetchUsers/pending
        🖼  App renders
        🖼  LoginForm renders
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

— 3. A 🚀 on "First post!": PostsList does not even re-render —
    📝 posts/reactionAdded
        🖼  PostExcerpt "First post!" renders
  ┌─ screen
  │ Logged in as Ada Lovelace, 1 post(s) (Log out)
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
  │ (👍 0)(❤️ 1)(🚀 1)
  └─
```

Walk-through:
- **Part 1.** `setAll` stored the server's two posts: `entities` in the server's order (p1, p2), `ids` sorted by the
  `sortComparer`, newest first (p2 is one minute newer). A reaction changed one entity, and `ids` stayed the
  **same array**.
- **Part 2.** The posts were already loaded (part 1), so `PostsList`'s effect was cancelled by `condition`: no
  request. Both excerpts rendered once.
- **Part 3, the result.** The 🚀 changed p1's entity only. `PostsList` selects `ids`, which didn't change: **no
  re-render**. The "Redux Toolkit" excerpt's entity didn't change: no re-render. Only "First post!" re-rendered,
  through its own `useAppSelector`. Compare with lecture 04 (the list and every excerpt) and lecture 06 (the list and
  one excerpt). The heart from part 1 is there too: same store.

## The whole picture

```text
state.posts = { ids: ['p2', 'p1'], entities: { p1, p2 }, status, error }     (postsAdapter, sortComparer)
                  │                     │
   PostsList ─────┘ selectPostIds       │
     <PostExcerpt postId="p2"> ─────────┤ selectPostById(state, 'p2')
     <PostExcerpt postId="p1"> ─────────┘ selectPostById(state, 'p1')
reactionAdded(p1) → entities.p1 replaced; ids untouched → only <PostExcerpt postId="p1"> re-renders
```

## Summary

| Term | What it is, in one line |
|---|---|
| **normalized state** | `{ ids, entities }`: each item once, by id, plus the order |
| **`createEntityAdapter`** | prebuilt CRUD reducer functions and selectors for a normalized collection |
| **`EntityState<T, Id>`** | the type `{ ids: Id[]; entities: Record<Id, T> }` |
| **adapter CRUD methods** | `addOne`, `setAll`, `updateOne`, `removeOne`…: update `ids` and `entities` together |
| **`getSelectors`** | builds `selectIds`, `selectEntities`, `selectAll`, `selectTotal`, `selectById` for the root state |
| **`sortComparer`** | keeps `ids` sorted; the array is replaced only when the order changes |

**Next lecture:** [08-listener-middleware](08-listener-middleware.md): logic that runs *when* an action happens,
for example showing a toast after a post was saved.
