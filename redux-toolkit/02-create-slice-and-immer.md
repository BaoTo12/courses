# Lecture 02. `createSlice` and Immer: reducers that look like mutations

> **By the end you can:** explain how Immer turns "mutating" code into an immutable update, and what structural
> sharing it keeps; write a slice with `createSlice`; use the action creators and the reducer it generates; type
> a case reducer with `PayloadAction`; explain the "mutate the draft *or* return a new value" rule.
> **New terms in this lesson:** Immer, draft, `produce` (`createNextState`), auto-freeze, `createSlice`, case
> reducer, `PayloadAction`, generated action creator, `.match`
> **You should already know:** immutable update, structural sharing ([Redux 02](../redux/02-immutability.md));
> action, reducer, action creator ([01](01-from-redux-to-redux-toolkit.md) §1); `configureStore`, `RootState` ([01](01-from-redux-to-redux-toolkit.md))
> **Project files you fill in:** `src/from-scratch/naiveProduce.ts` (🧩 02.1), `src/features/auth/authSlice.ts`
> (replaced, step 02.2), `src/features/posts/postsSlice.ts` (🧩 02.3), `src/app/store.ts` (change, step 02.4),
> `demos/02-create-slice-and-immer.ts` (🧩 02.5)

## 1. The problem: immutable updates are long and fragile

Adding a 👍 to one post, immutably, by hand:

```ts
return {
  ...state,
  posts: state.posts.map((post) =>
    post.id === postId ? { ...post, reactions: { ...post.reactions, thumbsUp: post.reactions.thumbsUp + 1 } } : post,
  ),
};
```

Four levels copied by hand, to change one number. Compare with what you'd write if mutation were allowed:

```ts
const post = state.posts.find((post) => post.id === postId);
if (post) post.reactions.thumbsUp++;
```

The second is shorter, and you can see what it does at a glance. But it mutates, which breaks Redux (change
detection with `===`, lecture 02 of the Redux course).

## 2. The idea: write the mutation on a copy, get an immutable update

What if the reducer received not the state, but a **stand-in** for it: an object that looks exactly like the state,
on which you may write whatever you want, and which records your changes? Afterwards, a library builds the new
state from those changes, copying only what changed, and leaves the old state untouched.

That library is **Immer**. The stand-in is called a **draft**. The function that does the whole thing is called
**`produce`**: `produce(base, recipe)` gives `recipe` a draft of `base`, lets it "mutate" the draft, and returns the
new state.

```text
 base state ──► produce(base, recipe) ──► recipe(draft): draft.posts[0].reactions.thumbsUp++
                    │                                    (writes are recorded, base is untouched)
                    └──► new state: copies of posts[0], its reactions, the posts array, the root;
                                    everything else SHARED with base
```

### Build step 02.1: a naive `produce`, built by hand

The simplest way to get "mutate freely, keep the old one untouched" is to copy everything first. Open
`src/from-scratch/naiveProduce.ts`. Replace the placeholder `🧩 02.1` with:

```ts
// The naive version of Immer's produce: copy EVERYTHING, then let the recipe mutate the copy.
export function naiveProduce<T>(base: T, recipe: (draft: T) => void): T {
  const draft = structuredClone(base); // a deep copy: every object and array, at every level
  recipe(draft); // the recipe may mutate the copy freely: base is not touched
  return draft;
}
```

What it does:
- `structuredClone(base)` is a built-in function that makes a **deep copy**: a new object for every object inside.
- The recipe mutates the copy; `base` stays as it was. So the result is a correct immutable update.

What's wrong with it: it copies **everything**, every time. Every untouched post becomes a new object, so `===` says
"changed" for all of them, and every component showing a post would re-render (Redux course, lecture 10). We lost
**structural sharing**. The demo shows it.

## 3. The real thing: Immer

Immer does what our naive version does, but cleverly. The draft is a **Proxy**: a JavaScript object that intercepts
every read and write made on it. Immer only copies an object the first time something **writes** into it, and then
copies its parents up to the root. Everything never written to is shared with the old state.

Redux Toolkit includes Immer. Its `produce` is re-exported under the name `createNextState`.

> **API card: `createNextState` (Immer's `produce`, re-exported by `@reduxjs/toolkit`)**
>
> **What it is:** computes a new immutable state from "mutations" made on a draft.
>
> ```ts
> function createNextState<T>(
>   base: T,                                    // the current state (never modified)
>   recipe: (draft: Draft<T>) => void | T,      // mutate the draft, OR return a completely new value
> ): T;                                         // the new state (or `base` itself if nothing changed)
> ```
>
> **What it does, step by step:**
> 1. Wraps `base` in a Proxy: the draft.
> 2. Runs `recipe(draft)`. Each write records "this object was modified" and makes a shallow copy of it (and of its
>    parents) the first time.
> 3. If the recipe **returned** a value, that value is the new state (the draft must then be untouched).
>    Otherwise, it builds the new state from the copies, sharing everything that wasn't written to.
> 4. If nothing was written, it returns `base` itself: same reference, "nothing changed".
> 5. In development it **freezes** the new state (`Object.freeze`, deeply), so a later mutation outside Immer
>    throws. This is called **auto-freeze**.
>
> **If the recipe mutates the draft AND returns a new value**, Immer can't know which one you mean: it throws.

You'll rarely call it yourself: `createSlice` (next section) calls it for every reducer you write.

## 4. `createSlice`: a slice, written once

A slice, by hand, is: a state type, an action union, action creators, a reducer with a `switch`, and immutable
updates. **`createSlice`** generates all of it from one object: you write, for each action, only the code that
updates the state, as a function. Such a function is called a **case reducer** (it handles one `case` of the old
`switch`).

```ts
const authSlice = createSlice({
  name: 'auth',                                  // the "domain" part of the action types
  initialState,
  reducers: {
    userLoggedIn(state, action: PayloadAction<string>) {   // → action type 'auth/userLoggedIn'
      state.currentUserId = action.payload;                // "mutating" an Immer draft
    },
  },
});
authSlice.actions.userLoggedIn('u1');   // { type: 'auth/userLoggedIn', payload: 'u1' }
authSlice.reducer;                      // the slice reducer, for configureStore
```

> **API card: `createSlice` (package `@reduxjs/toolkit`)**
>
> **What it is:** generates a slice reducer and its action creators from case reducers.
>
> ```ts
> function createSlice(options: {
>   name: string;                         // prefix of every action type: `${name}/${caseReducerName}`
>   initialState: State;                  // the slice's initial state (its type becomes the slice's state type)
>   reducers: {                           // one case reducer per action
>     [caseName: string]: (state: Draft<State>, action: PayloadAction<any>) => void | State;
>   };
>   extraReducers?: (builder) => void;    // react to actions defined elsewhere (lecture 03)
>   selectors?: { … };                    // selectors bundled with the slice (lecture 03)
> }): {
>   name: string;
>   reducer: Reducer<State>;              // the slice reducer
>   actions: { [caseName]: ActionCreator }; // one generated action creator per case reducer
>   selectors: { … };
> };
> ```
>
> **What it does, step by step:**
> 1. For each case reducer `userLoggedIn`, it builds the action type `'auth/userLoggedIn'` and an action creator
>    (with `createAction`, below).
> 2. It builds one reducer: given `(state, action)`, it looks up the case reducer for `action.type`; if there is
>    one, it calls it inside Immer's `produce`; if there isn't, it returns `state` unchanged. If `state` is
>    `undefined`, it uses `initialState`.
> 3. It returns `{ name, reducer, actions, … }`.
>
> **If you left it out:** you'd write the action union, the creators, the `switch` and the copying yourself, as in
> lecture 01's auth slice.

> **API card: `PayloadAction` (type, package `@reduxjs/toolkit`)**
>
> ```ts
> type PayloadAction<P = void> = { type: string; payload: P };
> ```
>
> You type a case reducer's `action` parameter with it: `action: PayloadAction<string>` means "the payload is a
> string". `createSlice` reads this type to type the generated action creator: `userLoggedIn(payload: string)`. A
> case reducer that needs no payload doesn't declare `action` at all, and its action creator takes no argument.

Each generated action creator also has:
- `.type`: the action type string (`userLoggedIn.type === 'auth/userLoggedIn'`);
- `.match(action)`: a type guard, true if an action has this type (and then TypeScript knows its payload type).

### Build step 02.2: the auth slice, again, with `createSlice`

Replace the **whole** content of `src/features/auth/authSlice.ts` (lecture 01's hand-written version) with:

```ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  currentUserId: string | null;
}

const initialState: AuthState = { currentUserId: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    userLoggedIn(state, action: PayloadAction<string>) {
      state.currentUserId = action.payload;
    },
    userLoggedOut(state) {
      state.currentUserId = null;
    },
  },
});

export const { userLoggedIn, userLoggedOut } = authSlice.actions;
export const authReducer = authSlice.reducer;
```

What each part does:
- `name: 'auth'`: the action types become `'auth/userLoggedIn'` and `'auth/userLoggedOut'`, the same strings as in
  lecture 01. The rest of the app doesn't notice the change.
- `userLoggedIn(state, action: PayloadAction<string>)`: `state` is an Immer **draft** of `AuthState`, so assigning
  `state.currentUserId = …` is allowed: Immer turns it into an immutable update. No `return`.
- `userLoggedOut(state)`: no payload, so no `action` parameter; `userLoggedOut()` takes no argument.
- `authSlice.actions` holds the generated action creators; we export them under their own names. `authSlice.reducer`
  is exported as `authReducer`, the name `store.ts` already imports, so `store.ts` doesn't change.
- Gone: the `AuthAction` union, the `switch`, the spread copies.

### Build step 02.3: the posts slice

Open `src/features/posts/postsSlice.ts`. Replace the placeholder `🧩 02.3` with:

```ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

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
  date: string; // ISO date, e.g. '2026-01-01T10:01:00.000Z'
  reactions: Reactions;
}

export interface PostsState {
  posts: Post[];
}

const initialState: PostsState = { posts: [] };

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    postAdded(state, action: PayloadAction<Post>) {
      state.posts.push(action.payload);
    },
    postUpdated(state, action: PayloadAction<{ id: string; title: string; content: string }>) {
      const { id, title, content } = action.payload;
      const post = state.posts.find((p) => p.id === id);
      if (post) {
        post.title = title;
        post.content = content;
      }
    },
    reactionAdded(state, action: PayloadAction<{ postId: string; reaction: ReactionName }>) {
      const { postId, reaction } = action.payload;
      const post = state.posts.find((p) => p.id === postId);
      if (post) post.reactions[reaction]++;
    },
  },
});

export const { postAdded, postUpdated, reactionAdded } = postsSlice.actions;
export const postsReducer = postsSlice.reducer;
```

What each part does:
- The types describe a post as the server sends it (`src/api/server.ts` has the same shape). `ReactionName` is
  `keyof Reactions`: the union of the keys, `'thumbsUp' | 'heart' | 'rocket'`, so `post.reactions[reaction]` is
  always a valid field.
- `postAdded`: `push` on the draft array. Immer makes the new array.
- `postUpdated`: finds the post on the draft and assigns two fields. If the id doesn't exist, nothing is written,
  and Immer returns the **same** state.
- `reactionAdded`: the four-level update of section 1, as two lines.

### Build step 02.4: the store gets the posts slice

In `src/app/store.ts`, add the import:

```ts
import { postsReducer } from '../features/posts/postsSlice';
```

and add `posts: postsReducer,` to the `reducer` object:

```ts
  reducer: {
    auth: authReducer,
    posts: postsReducer,
  },
```

`RootState` is now `{ auth: AuthState; posts: PostsState }`, with no other change: it's read from the store.

## 5. The rule: mutate the draft, **or** return a new value

A case reducer may do one of two things:
- **mutate the draft** and return nothing (all the reducers above);
- **return a completely new value** for the slice, without touching the draft. Useful to replace the whole state:
  `userLoggedOut: () => initialState` (lecture 03 uses this).

Never both. And never `state = newValue`: that only changes the local variable `state`, not the draft, so it does
nothing (`return newValue` is what you meant).

## 6. `createAction`

`createSlice` builds its action creators with **`createAction`**, which you can also use alone, for an action that
isn't owned by one slice.

> **API card: `createAction` (package `@reduxjs/toolkit`)**
>
> ```ts
> function createAction<P = void>(type: string): {
>   (payload: P): PayloadAction<P>;    // call it to build the action
>   type: string;                      // the type string
>   match(action: unknown): action is PayloadAction<P>;   // type guard
> };
> ```
>
> **Example:** `const tick = createAction<number>('clock/tick')`; `tick(5)` → `{ type: 'clock/tick', payload: 5 }`.

## Build step 02.5: the demo

Open `demos/02-create-slice-and-immer.ts`. Replace the placeholder `🧩 02.5` with:

```ts
// Lecture 02 demo: Immer, createSlice and the generated action creators.
import { createNextState, createSlice } from '@reduxjs/toolkit';
import { naiveProduce } from '../src/from-scratch/naiveProduce';
import { store } from '../src/app/store';
import { userLoggedIn } from '../src/features/auth/authSlice';
import { postAdded, reactionAdded, type Post, type PostsState } from '../src/features/posts/postsSlice';

const makePost = (id: string, title: string): Post => ({
  id,
  title,
  content: '…',
  user: 'u1',
  date: '2026-01-01T10:00:00.000Z',
  reactions: { thumbsUp: 0, heart: 0, rocket: 0 },
});
const base: PostsState = { posts: [makePost('p1', 'First'), makePost('p2', 'Second')] };

console.log('— 1. naiveProduce vs Immer: +1 👍 on p1 —');
const addThumb = (draft: PostsState) => {
  draft.posts[0].reactions.thumbsUp++;
};
const naive = naiveProduce(base, addThumb);
const immer = createNextState(base, addThumb);
console.log('  base untouched?', base.posts[0].reactions.thumbsUp === 0);
console.log('  naive: p1 new?', naive.posts[0] !== base.posts[0], '| p2 shared?', naive.posts[1] === base.posts[1]);
console.log('  immer: p1 new?', immer.posts[0] !== base.posts[0], '| p2 shared?', immer.posts[1] === base.posts[1]);
console.log('  immer with no write → same object?', createNextState(base, () => {}) === base);

console.log('\n— 2. Auto-freeze: Immer\'s result can\'t be mutated —');
try {
  immer.posts[1].title = 'changed';
} catch (error) {
  console.log('  ❌', (error as Error).message);
}

console.log('\n— 3. Generated action creators —');
console.log('  userLoggedIn("u1") →', JSON.stringify(userLoggedIn('u1')));
console.log('  reactionAdded.type →', reactionAdded.type);
console.log('  reactionAdded.match(userLoggedIn("u1")) →', reactionAdded.match(userLoggedIn('u1')));

console.log('\n— 4. The slices in the store —');
store.dispatch(userLoggedIn('u1'));
store.dispatch(postAdded(makePost('p1', 'Hello')));
store.dispatch(reactionAdded({ postId: 'p1', reaction: 'rocket' }));
store.dispatch(reactionAdded({ postId: 'nope', reaction: 'rocket' }));
console.log('  getState():', JSON.stringify(store.getState()));

console.log('\n— 5. Mutating AND returning: Immer refuses —');
const brokenSlice = createSlice({
  name: 'broken',
  initialState: { count: 0 },
  reducers: {
    both(state) {
      state.count++;
      return { count: 100 };
    },
  },
});
try {
  brokenSlice.reducer(undefined, brokenSlice.actions.both());
} catch (error) {
  console.log('  ❌', (error as Error).message);
}
```

What it does:
- Part 1 runs the same recipe through our naive version and through Immer, and compares references with the base.
- Part 2 tries to change a post of Immer's result directly.
- Part 3 looks at the generated action creators. `.match` with an action of another type returns `false`.
- Part 4 uses the store; the last `reactionAdded` names a post that doesn't exist.
- Part 5 calls a broken slice's reducer directly (no store needed: a reducer is just a function).

## Run it

```bash
npm run lesson 02
```

Expected output (not run):

```text
— 1. naiveProduce vs Immer: +1 👍 on p1 —
  base untouched? true
  naive: p1 new? true | p2 shared? false
  immer: p1 new? true | p2 shared? true
  immer with no write → same object? true

— 2. Auto-freeze: Immer's result can't be mutated —
  ❌ Cannot assign to read only property 'title' of object '#<Object>'

— 3. Generated action creators —
  userLoggedIn("u1") → {"type":"auth/userLoggedIn","payload":"u1"}
  reactionAdded.type → posts/reactionAdded
  reactionAdded.match(userLoggedIn("u1")) → false

— 4. The slices in the store —
    📝 auth/userLoggedIn
    📝 posts/postAdded
    📝 posts/reactionAdded
    📝 posts/reactionAdded
  getState(): {"auth":{"currentUserId":"u1"},"posts":{"posts":[{"id":"p1","title":"Hello","content":"…","user":"u1","date":"2026-01-01T10:00:00.000Z","reactions":{"thumbsUp":0,"heart":0,"rocket":1}}]}}

— 5. Mutating AND returning: Immer refuses —
  ❌ [Immer] An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.
```

Walk-through:
- **Part 1.** Both versions left `base` untouched and gave a new p1. The difference is p2, which the recipe never
  touched: the naive version copied it anyway (`shared? false`), Immer kept the same object (`shared? true`). And
  with a recipe that writes nothing, Immer returns `base` itself: "nothing changed", detectable with `===`.
- **Part 2.** Immer froze its result (auto-freeze, in development). Writing to it throws, like `deepFreeze` did in
  the Redux course.
- **Part 3.** `userLoggedIn('u1')` built a plain action, with the type made of the slice's name and the case
  reducer's name.
- **Part 4.** Each dispatch passed through the logger. The rocket count of p1 is 1. The reaction for `'nope'` found
  no post, wrote nothing, so the posts slice returned the same state (the store didn't change at all).
- **Part 5.** The case reducer both incremented the draft and returned a new object: Immer threw its message.

## The whole picture

```text
createSlice({ name: 'posts', initialState, reducers: { reactionAdded(state, action) { … } } })
   │
   ├─ actions.reactionAdded(payload)  → { type: 'posts/reactionAdded', payload }      (createAction)
   └─ reducer(state, action):
        action.type === 'posts/reactionAdded' ?
          yes → produce(state, draft => reactionAdded(draft, action))   (Immer: copies only the written path,
          no  → state (unchanged)                                        returns it frozen)
```

## Summary

| Term | What it is, in one line |
|---|---|
| **Immer** | a library that turns "mutations" on a draft into an immutable update with structural sharing |
| **draft** | the Proxy stand-in for the state that a recipe or case reducer may mutate |
| **`produce` / `createNextState`** | Immer's function: `(base, recipe) => newState`; RTK re-exports it as `createNextState` |
| **auto-freeze** | in development, Immer freezes the states it produces |
| **`createSlice`** | generates a slice reducer and action creators from case reducers |
| **case reducer** | a function in `reducers` that updates the state for one action |
| **`PayloadAction<P>`** | the type of an action with a payload of type `P`; types the action creator too |
| **generated action creator** | `slice.actions.x(payload)`; has `.type` and `.match(action)` |
| **`createAction`** | builds one action creator for a given type |

**Next lecture:** [03-prepare-and-extra-reducers](03-prepare-and-extra-reducers.md): action creators that compute
part of their payload, a slice that reacts to another slice's action, and selectors bundled with a slice.
