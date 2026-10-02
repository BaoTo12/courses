# Lecture 06. Selectors and render performance

> **By the end you can:** find which components re-render and why; stop a list from re-rendering every item with
> `React.memo`; write memoized selectors with `createSelector`, including selectors that take an argument; explain
> what each technique saves.
> **New terms in this lesson:** `React.memo`, `createSelector` (in RTK), selector with arguments,
> `recomputations()`
> **You should already know:** selectors, slice selectors ([03](03-prepare-and-extra-reducers.md)); the components
> ([04](04-react-with-redux-toolkit.md), [05](05-create-async-thunk.md)); re-render and `===` comparison in
> `useSelector` ([04](04-react-with-redux-toolkit.md) §1); memoization ([Redux 10](../redux/10-action-creators-and-selectors.md))
> **Project files you fill in:** `src/features/posts/postsSlice.ts`, `PostsList.tsx`, `PostExcerpt.tsx`,
> `src/components/Navbar.tsx` (changes), `demos/06-selectors-and-performance.tsx` (🧩 06.5)

## 1. Measure first

Before optimizing, look at what actually happens. Lecture 04's demo, part 4: one 🚀 on one post printed

```text
    📝 posts/reactionAdded
        🖼  PostsList renders
        🖼  PostExcerpt "Hello" renders
```

With one post that's fine. With two posts, **both** excerpts re-render, and with 500 posts, 500 do: `reactionAdded`
makes Immer create a new `posts` array, so `useSelector(selectAllPosts)` sees a new reference, `PostsList`
re-renders, and a re-rendering component re-renders all its children.

Two separate costs hide here:
1. **Re-rendering** components whose data didn't change (the other excerpts).
2. **Recomputing** derived data that didn't change (sorting the list on every `PostsList` render, even a render
   caused by its own "Loading…" status).

In a real browser app you measure with the React DevTools "Profiler" tab; our `🖼` lines play that role.

## 2. `React.memo`: skip a child whose props didn't change

> **API card: `memo` (package `react`)**
>
> ```ts
> function memo<P>(component: (props: P) => ReactNode): (props: P) => ReactNode;
> ```
>
> **What it does:** returns a component that, when its parent re-renders, first compares its new props with the
> previous ones (each prop with `Object.is`, i.e. `===` for objects). All the same → it **skips** rendering and keeps
> its previous output. Its own state changes and its own `useSelector` updates still re-render it normally.

This works so well with Redux because of structural sharing: when one post changes, Immer gives that post a new
object, and keeps **the same object** for every other post. So `PostExcerpt`'s `post` prop is `===` for every post
except the changed one.

### Build step 06.1: `PostExcerpt` becomes memoized

In `src/features/posts/PostExcerpt.tsx`, add the import:

```ts
import { memo } from 'react';
```

and replace the line

```tsx
export function PostExcerpt({ post }: { post: Post }) {
```

with

```tsx
export const PostExcerpt = memo(function PostExcerpt({ post }: { post: Post }) {
```

and the function's closing `}` (the last line of the file) with `});`.

What it does: `PostExcerpt` is now the memoized version of the same function. When `PostsList` re-renders, each
excerpt whose `post` object is unchanged is skipped. Naming the inner function `PostExcerpt` keeps that name in
error messages and the DevTools.

## 3. `createSelector`: compute derived data once per change

The sorting in `PostsList` runs on every render of `PostsList`. More importantly, any selector that **builds** an
array (`filter`, `map`, `slice().sort()`) returns a new array on every call: put inside `useSelector`, it would make
the component re-render after **every** action (the Redux course's lecture 10, section 2). In development,
react-redux even warns about it the first time ("Selector unknown returned a different result when called with the
same parameters…").

The fix is a memoized selector, which RTK re-exports from Reselect.

> **API card: `createSelector` (package `@reduxjs/toolkit`, from Reselect)**
>
> ```ts
> function createSelector(
>   inputSelectors: [...InputSelectors],           // each takes the selector's arguments; returns a piece of state
>   resultFunc: (...inputResults) => Result,       // runs only when an input result changed
> ): ((state, ...args) => Result) & { recomputations(): number; resetRecomputations(): void };
> ```
>
> **What it does:** on each call, runs the input selectors. If their results are the same (`===`) as for a previous
> call, it returns the previous result (the same reference) without running `resultFunc`. Reselect 5 remembers every
> combination of inputs it has seen (lecture 10 of the Redux course built a one-entry version by hand).
> `recomputations()` returns how many times `resultFunc` actually ran: handy to check memoization.
>
> **Typing:** the result function's parameters are typed from the input selectors' return types. Arguments after
> `state` are passed to every input selector, so an input selector like `(_state, userId: string) => userId` turns
> the argument into an input.

### Build step 06.2: two memoized selectors

In `src/features/posts/postsSlice.ts`, add `createSelector` to the `@reduxjs/toolkit` import, and add:

```ts
import type { RootState } from '../../app/store';
```

Then, at the end of the file (after the exports of the selectors), add:

```ts
export const selectSortedPosts = createSelector([selectAllPosts], (posts) => {
  console.log('      🧠 selectSortedPosts recomputes');
  return posts.slice().sort((a, b) => b.date.localeCompare(a.date));
});

export const selectPostsByUser = createSelector(
  [selectAllPosts, (_state: RootState, userId: string | null) => userId],
  (posts, userId) => posts.filter((post) => post.user === userId),
);
```

What each part does:
- `selectSortedPosts`: the sorting, moved out of the component. It recomputes only when `selectAllPosts` returns a
  new array (when a post is added, changed or loaded), not when the status changes. The `🧠` line shows each real
  computation.
- `selectPostsByUser(state, userId)`: a **selector with arguments**. The second input selector ignores the state
  and returns the argument, so the `userId` becomes one of the inputs: the filter runs again only if the posts or
  the user id changed. Its type: `(state: RootState, userId: string | null) => Post[]`.
- `import type { RootState }` from `store.ts`: type-only, because `store.ts` imports this file.

### Build step 06.3: `PostsList` uses `selectSortedPosts`

In `src/features/posts/PostsList.tsx`, replace `selectAllPosts` with `selectSortedPosts` in the import, replace

```tsx
  const posts = useAppSelector(selectAllPosts);
```

with

```tsx
  const newestFirst = useAppSelector(selectSortedPosts);
```

and delete the line that computed `newestFirst` with `posts.slice().sort(…)`.

### Build step 06.4: the navbar shows how many posts you wrote

In `src/components/Navbar.tsx`, add the import:

```ts
import { selectPostsByUser } from '../features/posts/postsSlice';
```

add this line after the `user` line:

```tsx
  const postCount = useAppSelector((state) => selectPostsByUser(state, currentUserId).length);
```

and replace `Logged in as {user?.name}{' '}` with:

```tsx
      Logged in as {user?.name}, {postCount} post(s){' '}
```

The selector returns a number (`.length`), so `Navbar` re-renders only when the count changes. The memoization
saves the filtering: `selectPostsByUser` runs its `filter` only when the posts or the user changed, not on every
action.

## Build step 06.5: the demo

Open `demos/06-selectors-and-performance.tsx`. Replace the placeholder `🧩 06.5` with:

```tsx
// Lecture 06 demo: memoized selectors and React.memo, measured with the 🖼 / 🧠 lines.
import { rootElement, find, findAll, findButton, typeText, choose, click, wait, inAct, printScreen } from '../src/debug/testDom';
import { store, type RootState } from '../src/app/store';
import { selectAllPosts, selectPostsByUser } from '../src/features/posts/postsSlice';
import { renderApp } from '../src/main';

console.log('— 1. A selector that filters: plain vs memoized —');
const plainPostsByUser = (state: RootState, userId: string) => selectAllPosts(state).filter((p) => p.user === userId);
const state = store.getState();
console.log('  plain:    same array for the same state?', plainPostsByUser(state, 'u1') === plainPostsByUser(state, 'u1'));
console.log('  memoized: same array for the same state?', selectPostsByUser(state, 'u1') === selectPostsByUser(state, 'u1'));
console.log('  memoized recomputations:', selectPostsByUser.recomputations());

console.log('\n— 2. The app: Ada logs in, the posts load —');
await inAct(() => renderApp(rootElement));
await wait(300);
await choose(find<HTMLSelectElement>('select'), 'u1');
await click(findButton('Log in'));
await wait(300);
printScreen();

console.log('\n— 3. A 🚀 on "First post!": only that excerpt re-renders —');
const rocketButtons = findAll<HTMLButtonElement>('button').filter((button) => button.textContent?.startsWith('🚀'));
await click(rocketButtons[1]);

console.log('\n— 4. Ada writes a post: the count in the navbar changes —');
await typeText(find<HTMLInputElement>('input'), 'Memo');
await typeText(find<HTMLTextAreaElement>('textarea'), 'Skip what did not change');
await click(findButton('Save post'));
await wait(300);
printScreen();
```

## Run it

```bash
npm run lesson 06
```

Expected output (not run):

```text
— 1. A selector that filters: plain vs memoized —
  plain:    same array for the same state? false
  memoized: same array for the same state? true
  memoized recomputations: 1

— 2. The app: Ada logs in, the posts load —
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
      🧠 selectSortedPosts recomputes
        🖼  PostsList renders
    📝 posts/fetchPosts/pending
        🖼  PostsList renders
  🌐 server: GET /posts (answers in 200 ms)
    📝 posts/fetchPosts/fulfilled
      🧠 selectSortedPosts recomputes
        🖼  Navbar renders
        🖼  PostsList renders
        🖼  PostExcerpt "Redux Toolkit" renders
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
  │ (👍 0)(❤️ 0)(🚀 0)
  └─

— 3. A 🚀 on "First post!": only that excerpt re-renders —
    📝 posts/reactionAdded
      🧠 selectSortedPosts recomputes
        🖼  PostsList renders
        🖼  PostExcerpt "First post!" renders

— 4. Ada writes a post: the count in the navbar changes —
        🖼  AddPostForm renders
        🖼  AddPostForm renders
    📝 posts/addNewPost/pending
        🖼  AddPostForm renders
  🌐 server: POST /posts {"title":"Memo","content":"Skip what did not change","user":"u1"} (answers in 200 ms)
    📝 posts/addNewPost/fulfilled
      🧠 selectSortedPosts recomputes
        🖼  Navbar renders
        🖼  AddPostForm renders
        🖼  PostsList renders
        🖼  PostExcerpt "Memo" renders
  ┌─ screen
  │ Logged in as Ada Lovelace, 2 post(s) (Log out)
  │ Add a new post
  │ [Title] [Content] (Save post)⊘
  │ Posts
  │ Memo
  │ by Ada Lovelace
  │ Skip what did not change
  │ (👍 0)(❤️ 0)(🚀 0)
  │ Redux Toolkit
  │ by Linus Torvalds
  │ Less boilerplate, same ideas.
  │ (👍 0)(❤️ 0)(🚀 0)
  │ First post!
  │ by Ada Lovelace
  │ Hello, everyone.
  │ (👍 0)(❤️ 0)(🚀 1)
  └─
```

Walk-through:
- **Part 1.** With the same state, the plain selector returned two different (empty) arrays; the memoized one
  returned the same array twice, and computed only once.
- **Part 2.** `selectSortedPosts` computed once at the first render of `PostsList`. The `fetchPosts/pending` action
  re-rendered `PostsList` ("Loading…"), but the posts array hadn't changed: no `🧠`, no sorting. When the posts
  arrived, it computed again (the `🧠` appears during the dispatch, when react-redux checks the selector), and the
  navbar's count went from 0 to 1 (p1 is Ada's).
- **Part 3, the goal.** The reaction gave p1 a new object and the posts array a new array, so the sorted list was
  recomputed and `PostsList` re-rendered. But the "Redux Toolkit" excerpt received the **same** post object: `memo`
  skipped it. Only "First post!" re-rendered. The navbar's count stayed 1: no re-render.
- **Part 4.** The new post changed the count (1 → 2): `Navbar` re-rendered, together with the form (its fields were
  emptied) and the list. Only the new excerpt rendered; the two others were skipped by `memo`.

## The whole picture

```text
reactionAdded(p1) ─► Immer: new posts array, new p1, SAME p2
   ├─ selectSortedPosts: input (posts) changed → 🧠 sort → new array → PostsList re-renders
   │     ├─ <PostExcerpt post={p2}>  memo: same prop → skipped
   │     └─ <PostExcerpt post={p1'}> memo: new prop  → renders
   └─ Navbar: selectPostsByUser(state, 'u1').length → 1 (same) → no re-render
```

## Summary

| Term | What it is, in one line |
|---|---|
| **`React.memo`** | wraps a component so it skips re-rendering when its props are all `===` to the previous ones |
| **`createSelector`** | RTK's re-export of Reselect: memoized selectors that return the same reference when inputs didn't change |
| **selector with arguments** | `selector(state, arg)`; an input selector `(_state, arg) => arg` makes the argument an input |
| **`recomputations()`** | how many times a memoized selector's result function really ran |

**Next lecture:** [07-normalized-state-with-entity-adapter](07-normalized-state-with-entity-adapter.md): storing
posts and users by id with `createEntityAdapter`, which also gives the sorted ids and the selectors for free.
