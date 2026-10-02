# Lecture 03. Prepare callbacks, `extraReducers` and slice selectors

> **By the end you can:** keep reducers pure when an action needs a random id or the current date; make a slice
> respond to an action defined in another slice; bundle selectors with their slice.
> **New terms in this lesson:** prepare callback, `nanoid`, `extraReducers`, builder (`addCase`, `addMatcher`,
> `addDefaultCase`), slice selectors
> **You should already know:** `createSlice`, case reducer, `PayloadAction`, generated action creator, the "mutate or
> return" rule ([02](02-create-slice-and-immer.md)); pure function, selector ([01](01-from-redux-to-redux-toolkit.md) §1)
> **Project files you fill in:** `src/features/posts/postsSlice.ts` (changes), `src/features/auth/authSlice.ts`
> (change), `demos/03-prepare-and-extra-reducers.ts` (🧩 03.4)

## 1. The problem: where does the new post's id come from?

When the user writes a post, it needs an **id** and a **date**. A random id and the current date are, by nature,
different on every call. A reducer must be pure (same input → same output), so it must not generate them. The
component could build them before dispatching:

```ts
dispatch(postAdded({ id: makeRandomId(), date: new Date().toISOString(), title, content, user, reactions: { … } }));
```

But then **every** place that adds a post must remember how to build a complete post: the id format, the date
format, the zeroed reactions. That knowledge belongs to the posts slice.

## 2. Prepare callback: the action creator computes part of the payload

The idea: let the **action creator** do it. Action creators may have side effects (they're called before the
reducer, once). `createSlice` lets you give a case reducer a **prepare callback**: a function that receives the
action creator's arguments and returns `{ payload }`, the action to dispatch. Then the case reducer receives that
action, already complete, and stays pure.

```text
postAdded('Hello', 'My text', 'u1')
   └─ prepare('Hello', 'My text', 'u1') → { payload: { id: 'V1StGXR8_Z5jdHi6B-myT', date: '2026-…', … } }
                                            └─ { type: 'posts/postAdded', payload } is what gets dispatched
                                                 └─ reducer: state.posts.push(action.payload)   (pure)
```

> **API card: `nanoid` (package `@reduxjs/toolkit`)**
>
> ```ts
> function nanoid(size?: number): string;   // a random 21-character id, e.g. 'V1StGXR8_Z5jdHi6B-myT'
> ```
>
> A small random id generator, included in RTK for prepare callbacks. Not meant for security tokens.

### Build step 03.1: `postAdded` with a prepare callback

In `src/features/posts/postsSlice.ts`, add `nanoid` to the import:

```ts
import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
```

and replace the `postAdded` case reducer with:

```ts
    postAdded: {
      reducer(state, action: PayloadAction<Post>) {
        state.posts.push(action.payload);
      },
      prepare(title: string, content: string, userId: string) {
        return {
          payload: {
            id: nanoid(),
            date: new Date().toISOString(),
            title,
            content,
            user: userId,
            reactions: { thumbsUp: 0, heart: 0, rocket: 0 },
          },
        };
      },
    },
```

What each part does:
- Instead of a function, `postAdded` is now an object with two functions: `reducer` (the case reducer, unchanged)
  and `prepare`.
- `prepare(title, content, userId)`: its **parameters become the action creator's parameters**. TypeScript reads
  them: `postAdded` is now called `postAdded(title, content, userId)`, and calling it with a `Post` is a compile
  error.
- It returns `{ payload }`. The object must match what the reducer expects (`PayloadAction<Post>`): TypeScript
  checks that the prepared payload is a valid `Post`.
- The randomness (`nanoid()`) and the clock (`new Date()`) run in the action creator, before dispatch. The reducer
  receives fixed values: same action → same new state.

## 3. `extraReducers`: responding to another slice's action

When the user logs out, their posts should disappear from the screen: the posts slice must react to
`'auth/userLoggedOut'`, an action created by the **auth** slice. The `reducers` field can't do that: each entry
there **creates** a new action type `posts/…`.

**`extraReducers`** is the field for actions defined elsewhere. It's a function that receives a **builder**, an
object with methods to register a case reducer for an existing action:

> **API card: the builder of `extraReducers` (package `@reduxjs/toolkit`)**
>
> ```ts
> extraReducers: (builder) => {
>   builder
>     .addCase(actionCreator, caseReducer)     // exactly this action type; the action is typed from the creator
>     .addMatcher(matcher, caseReducer)        // every action for which matcher(action) is true (lecture 08)
>     .addDefaultCase(caseReducer);            // every other action
> }
> ```
>
> **Rules:** calls must come in this order (all `addCase`, then `addMatcher`, then `addDefaultCase`). The case
> reducers work exactly like those in `reducers`: Immer drafts, "mutate or return". Each method returns the
> builder, so the calls are chained.
>
> **What our project registers:** `addCase(userLoggedOut, () => initialState)` (step 03.2); lecture 05 adds the
> loading actions of async thunks.

### Build step 03.2: logging out clears the posts

In `src/features/posts/postsSlice.ts`, add the import:

```ts
import { userLoggedOut } from '../auth/authSlice';
```

and add this field to the `createSlice` options, right after `reducers: { … },`:

```ts
  extraReducers: (builder) => {
    builder.addCase(userLoggedOut, () => initialState);
  },
```

What it does: when `'auth/userLoggedOut'` is dispatched, the posts slice returns `initialState`: a **new value**,
without touching the draft (the second option of the "mutate or return" rule, lecture 02). The auth slice still
handles the same action with its own case reducer: every action reaches every slice reducer (Redux course,
lecture 04).

## 4. Slice selectors: reading the slice, defined next to it

Selectors read the state (Redux course, lecture 07). A slice's selectors depend on the slice's shape, so they belong
next to it. `createSlice` has a field for them: **`selectors`**. Each one receives the **slice's** state (not the
root state). `createSlice` returns versions that take the **root** state, by first picking the slice under its
`name` (`rootState.posts`).

```ts
selectors: {
  selectAllPosts: (postsState) => postsState.posts,        // you write it for the slice's state
},
// …
postsSlice.selectors.selectAllPosts(store.getState())       // you call it with the root state
```

### Build step 03.3: the selectors

In `src/features/posts/postsSlice.ts`, add this field after `extraReducers`:

```ts
  selectors: {
    selectAllPosts: (postsState) => postsState.posts,
    selectPostById: (postsState, postId: string) => postsState.posts.find((post) => post.id === postId),
  },
```

and export them, under the other exports:

```ts
export const { selectAllPosts, selectPostById } = postsSlice.selectors;
```

In `src/features/auth/authSlice.ts`, add this field after `reducers: { … },`:

```ts
  selectors: {
    selectCurrentUserId: (authState) => authState.currentUserId,
  },
```

and export it:

```ts
export const { selectCurrentUserId } = authSlice.selectors;
```

What each part does:
- `postsState` is typed from `initialState`: `PostsState`. No annotation needed.
- `selectPostById(postsState, postId)` takes an extra argument; the exported version is
  `selectPostById(rootState, postId)` and returns `Post | undefined`.
- The exported selectors accept any state with a `posts` (or `auth`) field of the right type, which our `RootState`
  is.

## Build step 03.4: the demo

Open `demos/03-prepare-and-extra-reducers.ts`. Replace the placeholder `🧩 03.4` with:

```ts
// Lecture 03 demo: a prepared action, slice selectors, and a slice reacting to another slice's action.
import { store } from '../src/app/store';
import { selectCurrentUserId, userLoggedIn, userLoggedOut } from '../src/features/auth/authSlice';
import { postAdded, selectAllPosts, selectPostById } from '../src/features/posts/postsSlice';

console.log('— 1. A prepared action —');
const action = postAdded('Hello', 'My first post', 'u1');
console.log('  type:', action.type);
console.log('  payload keys:', Object.keys(action.payload).join(', '));
console.log('  id:', typeof action.payload.id, 'of', action.payload.id.length, 'characters');

console.log('\n— 2. Selectors bundled with the slices —');
store.dispatch(userLoggedIn('u1'));
store.dispatch(action);
store.dispatch(postAdded('Second', 'More text', 'u1'));
console.log('  selectCurrentUserId →', selectCurrentUserId(store.getState()));
console.log('  selectAllPosts → titles', selectAllPosts(store.getState()).map((post) => post.title));
console.log('  selectPostById(first id) →', selectPostById(store.getState(), action.payload.id)?.title);

console.log("\n— 3. Another slice's action: logging out clears the posts —");
store.dispatch(userLoggedOut());
console.log('  getState():', JSON.stringify(store.getState()));
```

The id and the date are random/current, so the demo prints only their type and length, not their value.

## Run it

```bash
npm run lesson 03
```

Expected output (not run):

```text
— 1. A prepared action —
  type: posts/postAdded
  payload keys: id, date, title, content, user, reactions
  id: string of 21 characters

— 2. Selectors bundled with the slices —
    📝 auth/userLoggedIn
    📝 posts/postAdded
    📝 posts/postAdded
  selectCurrentUserId → u1
  selectAllPosts → titles [ 'Hello', 'Second' ]
  selectPostById(first id) → Hello

— 3. Another slice's action: logging out clears the posts —
    📝 auth/userLoggedOut
  getState(): {"auth":{"currentUserId":null},"posts":{"posts":[]}}
```

Walk-through:
- **Part 1.** Calling `postAdded('Hello', 'My first post', 'u1')` ran the prepare callback: the payload has an id
  (a 21-character `nanoid`), a date, the three given values and zeroed reactions. Nothing was dispatched yet: an
  action creator only builds the object.
- **Part 2.** The prepared action was dispatched as it was, so the post in the state has the same id; the selector
  found it by that id. The selectors were called with the **root** state.
- **Part 3.** One action, two slices: the auth slice set `currentUserId` to `null` (its `reducers` case), and the
  posts slice returned its initial state (its `extraReducers` case).

## The whole picture

```text
                       postsSlice = createSlice({
postAdded(t, c, u) ──►   reducers: { postAdded: { prepare → { payload: full Post }, reducer → push } … }
                         extraReducers: builder.addCase(userLoggedOut, () => initialState)   ◄── auth's action
                         selectors: { selectAllPosts(postsState), selectPostById(postsState, id) }
                       })
postsSlice.selectors.selectAllPosts(rootState) = selectAllPosts(rootState.posts)
```

## Summary

| Term | What it is, in one line |
|---|---|
| **prepare callback** | a function next to a case reducer that turns the action creator's arguments into `{ payload }` |
| **`nanoid`** | RTK's random id generator, for prepare callbacks |
| **`extraReducers`** | the `createSlice` field for responding to actions defined elsewhere |
| **builder** | the object `extraReducers` receives: `addCase`, `addMatcher`, `addDefaultCase` |
| **slice selectors** | selectors written for the slice's state in `createSlice({ selectors })`, called with the root state |

**Next lecture:** [04-react-with-redux-toolkit](04-react-with-redux-toolkit.md): the React UI: logging in, the list
of posts, a form to add one, and reaction buttons, with typed hooks.
