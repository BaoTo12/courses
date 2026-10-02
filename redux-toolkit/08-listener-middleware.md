# Lecture 08. The listener middleware: "when this happens, do that"

> **By the end you can:** write logic that reacts to dispatched actions with `createListenerMiddleware`; choose
> which actions a listener runs for (`actionCreator`, `matcher`, `isAnyOf`); use the listener API (`getState`,
> `dispatch`, `delay`); type it all with `.withTypes()`; say when to use a listener, a thunk or a custom middleware.
> **New terms in this lesson:** reactive logic, listener, `createListenerMiddleware`, effect, listener API,
> matcher, `isAnyOf`
> **You should already know:** middleware ([01](01-from-redux-to-redux-toolkit.md)); `createSlice`, prepare callback
> ([02](02-create-slice-and-immer.md), [03](03-prepare-and-extra-reducers.md)); `createAsyncThunk`'s lifecycle
> actions ([05](05-create-async-thunk.md)); entity adapter selectors ([07](07-normalized-state-with-entity-adapter.md))
> **Project files you fill in:** `src/features/toasts/toastsSlice.ts` (🧩 08.1), `src/app/listenerMiddleware.ts`
> (🧩 08.2), `src/features/toasts/toastListeners.ts` (🧩 08.3), `src/features/toasts/Toasts.tsx` (🧩 08.4),
> `src/app/store.ts`, `src/App.tsx` (changes), `demos/08-listener-middleware.tsx` (🧩 08.6)

## 1. The problem: logic that should run *after* an action

We want a small message, a **toast**, to appear for one second when a post is saved ("Post saved: …"), and when
someone logs in or out. Where does that code go?

- **In the reducer?** No: showing then hiding after a delay is a side effect and needs a timer.
- **In `AddPostForm`, after `unwrap()`?** Then every place that saves a post must remember to show the toast, and a
  post saved from elsewhere (a future "import" feature) wouldn't show one.
- **In the `addNewPost` thunk?** The thunk would then know about toasts; and logging in isn't a thunk at all.

What we want is the other direction: not "the code that saves also shows a toast", but "**whenever** a post-saved
action happens, show a toast", written once, in one place. Logic that runs in response to actions is called
**reactive logic**.

## 2. The idea: a listener

A **listener** is a pair: "which actions" + "what to do". A special middleware keeps a list of listeners. For every
dispatched action, after the reducers have run, it checks each listener and runs the matching ones:

```text
dispatch(addNewPost.fulfilled(post))
   └─ listener middleware ─► next(action) ─► … reducers …
                          └─ then, for each listener whose "which actions" matches:
                                run its "what to do" (it may read the state, dispatch, wait…)
```

The "what to do" function is called the listener's **effect**.

## 3. The toasts slice

The toasts themselves are state: a list of messages on screen.

### Build step 08.1: `toastsSlice`

Open `src/features/toasts/toastsSlice.ts`. Replace the placeholder `🧩 08.1` with:

```ts
import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export interface Toast {
  id: string;
  text: string;
}

const initialState: Toast[] = [];

const toastsSlice = createSlice({
  name: 'toasts',
  initialState,
  reducers: {
    toastShown: {
      reducer(state, action: PayloadAction<Toast>) {
        state.push(action.payload);
      },
      prepare(text: string) {
        return { payload: { id: nanoid(), text } };
      },
    },
    toastHidden(state, action: PayloadAction<string>) {
      return state.filter((toast) => toast.id !== action.payload);
    },
  },
  selectors: {
    selectToasts: (toasts) => toasts,
  },
});

export const { toastShown, toastHidden } = toastsSlice.actions;
export const { selectToasts } = toastsSlice.selectors;
export const toastsReducer = toastsSlice.reducer;
```

Nothing new: `toastShown(text)` gets an id from a prepare callback (lecture 03); `toastHidden(id)` returns a new
array without that toast ("return a new value", lecture 02).

## 4. `createListenerMiddleware`

> **API card: `createListenerMiddleware` (package `@reduxjs/toolkit`)**
>
> **What it is:** creates a middleware that runs **listeners** after matching actions.
>
> ```ts
> function createListenerMiddleware(): {
>   middleware: Middleware;                       // add it to the store
>   startListening(options: {
>     actionCreator?: ActionCreator;              // run for this exact action (typed from the creator)
>     matcher?: (action) => boolean;              // or: for every action the matcher accepts
>     predicate?: (action, currentState, previousState) => boolean;  // or: any condition, even on the state
>     effect: (action, listenerApi) => void | Promise<void>;         // what to do
>   }): () => void;                               // returns a function that removes the listener
>   stopListening(options): boolean;
>   clearListeners(): void;
> };
> ```
>
> **What the middleware does, step by step, for each dispatched action:**
> 1. Lets the action go on (`next(action)`): the rest of the chain and the reducers run first.
> 2. For each listener, checks its `actionCreator` / `matcher` / `predicate` against the action.
> 3. Calls each matching listener's `effect(action, listenerApi)`. It doesn't wait for it: an `async` effect keeps
>    running in the background while the app continues.
>
> **The listener API** (the second argument of the effect) includes: `getState()` (the state after the action),
> `getOriginalState()` (before it), `dispatch`, `delay(ms)` (a Promise that resolves after `ms`, and is cancelled if
> the listener is), `condition(predicate)` (wait until something is true), `take(predicate)` (wait for a future
> action), `cancelActiveListeners()` (cancel other running instances of this listener, e.g. for "only the latest").

### Build step 08.2: the listener middleware, typed

Open `src/app/listenerMiddleware.ts`. Replace the placeholder `🧩 08.2` with:

```ts
import { addListener, createListenerMiddleware } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from './store';
import { addToastListeners } from '../features/toasts/toastListeners';

export const listenerMiddleware = createListenerMiddleware();

export const startAppListening = listenerMiddleware.startListening.withTypes<RootState, AppDispatch>();
export type AppStartListening = typeof startAppListening;

export const addAppListener = addListener.withTypes<RootState, AppDispatch>();

addToastListeners(startAppListening);
```

What each part does:
- `listenerMiddleware`: the middleware and its `startListening` method.
- `startAppListening`: `startListening` with `getState()` returning `RootState` and `dispatch` typed `AppDispatch`
  in every effect. `AppStartListening` is its type, so feature files can receive it.
- `addAppListener`: an **action** that adds a listener when dispatched (from a component, say). We don't use it in
  this project; it's the typed version you'd use.
- `addToastListeners(startAppListening)`: the toasts feature registers its listeners (next step). The middleware
  file calls each feature's "add listeners" function; the features don't import the middleware's value (only its
  type), so there's no import circle.

### Build step 08.3: the toast listeners

Open `src/features/toasts/toastListeners.ts`. Replace the placeholder `🧩 08.3` with:

```ts
import { isAnyOf } from '@reduxjs/toolkit';
import type { AppStartListening } from '../../app/listenerMiddleware';
import { userLoggedIn, userLoggedOut } from '../auth/authSlice';
import { addNewPost } from '../posts/postsSlice';
import { selectUserById } from '../users/usersSlice';
import { toastHidden, toastShown } from './toastsSlice';

export function addToastListeners(startAppListening: AppStartListening) {
  startAppListening({
    actionCreator: addNewPost.fulfilled,
    effect: async (action, listenerApi) => {
      const { payload: toast } = listenerApi.dispatch(toastShown(`Post saved: "${action.payload.title}"`));
      await listenerApi.delay(1000);
      listenerApi.dispatch(toastHidden(toast.id));
    },
  });

  startAppListening({
    matcher: isAnyOf(userLoggedIn, userLoggedOut),
    effect: async (action, listenerApi) => {
      const text = userLoggedIn.match(action)
        ? `Welcome, ${selectUserById(listenerApi.getState(), action.payload)?.name}!`
        : 'See you soon!';
      const { payload: toast } = listenerApi.dispatch(toastShown(text));
      await listenerApi.delay(1000);
      listenerApi.dispatch(toastHidden(toast.id));
    },
  });
}
```

What each part does:
- First listener: `actionCreator: addNewPost.fulfilled`. The effect's `action` is typed from it, so
  `action.payload.title` is the saved post's title.
- `listenerApi.dispatch(toastShown(…))` returns the dispatched action; we keep its payload (the toast, with its id)
  to hide that exact toast later.
- `await listenerApi.delay(1000)`: wait one second **inside the effect**. Nothing else waits: the app keeps
  running. Then `toastHidden`.
- Second listener: a **matcher** is a function `(action) => boolean` that says whether an action matches. **`isAnyOf`**
  builds one from several action creators: "the action is `userLoggedIn` or `userLoggedOut`". The effect then uses
  `userLoggedIn.match(action)` (a type guard, lecture 02) to tell which, and reads the user's name from the state.
- `listenerApi.getState()` is the state **after** the action: the user is already logged in.

> **API card: `isAnyOf` (package `@reduxjs/toolkit`)**
>
> ```ts
> function isAnyOf(...matchers: Array<ActionCreator | Matcher>): (action: unknown) => action is Union;
> ```
>
> Returns a matcher (a type guard) that accepts an action if **any** of the given action creators (or matchers)
> match it. Also usable in `extraReducers` with `builder.addMatcher(isAnyOf(a, b), caseReducer)`. RTK has more:
> `isAllOf`, and for async thunks `isPending(thunk1, thunk2)`, `isFulfilled(…)`, `isRejected(…)`.

## 5. Showing the toasts

### Build step 08.4: `Toasts`

Open `src/features/toasts/Toasts.tsx`. Replace the placeholder `🧩 08.4` with:

```tsx
import { useAppSelector } from '../../app/hooks';
import { selectToasts } from './toastsSlice';

export function Toasts() {
  const toasts = useAppSelector(selectToasts);
  console.log('        🖼  Toasts renders');
  return (
    <div>
      {toasts.map((toast) => (
        <p key={toast.id}>🍞 {toast.text}</p>
      ))}
    </div>
  );
}
```

### Build step 08.5: wire it into the store and the app

In `src/app/store.ts`, import the reducer and the middleware:

```ts
import { toastsReducer } from '../features/toasts/toastsSlice';
import { listenerMiddleware } from './listenerMiddleware';
```

add `toasts: toastsReducer,` to `reducer`, and replace the `middleware` line with:

```ts
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware).concat(logger),
```

`.prepend` puts the listener middleware **first** in the chain, before the thunk middleware and the checks, as the
RTK docs recommend: it sees every action, including those dispatched by thunks and by other listeners.

In `src/App.tsx`, import `Toasts`:

```tsx
import { Toasts } from './features/toasts/Toasts';
```

and add `<Toasts />` as the **first** child of `<main>` in **both** returns (the login screen and the feed), so
toasts show on both screens.

## 6. Listener, thunk, or custom middleware?

| You want… | Use |
|---|---|
| async logic that the UI **starts** ("load the posts", "save this post") | a thunk (`createAsyncThunk`) |
| logic that runs **because** an action happened, wherever it was dispatched from | a listener |
| to change how `dispatch` itself works (accept new kinds of values, log, transform every action) | a custom middleware |

A listener is middleware too, but you write only the effect: no `next`, no chain.

## Build step 08.6: the demo

Open `demos/08-listener-middleware.tsx`. Replace the placeholder `🧩 08.6` with:

```tsx
// Lecture 08 demo: toasts shown by listeners, after login and after saving a post.
import { rootElement, find, findButton, typeText, choose, click, wait, inAct, printScreen } from '../src/debug/testDom';
import { renderApp } from '../src/main';

console.log('— 1. Ada logs in: a listener shows a toast —');
await inAct(() => renderApp(rootElement));
await wait(300);
await choose(find<HTMLSelectElement>('select'), 'u1');
await click(findButton('Log in'));
await wait(300);
printScreen('right after the login');
await wait(900);
console.log('  … one second later');

console.log('\n— 2. Ada saves a post: another listener, another toast —');
await typeText(find<HTMLInputElement>('input'), 'Listeners');
await typeText(find<HTMLTextAreaElement>('textarea'), 'React to actions');
await click(findButton('Save post'));
await wait(300);
printScreen('the post is saved');
await wait(1000);
console.log('  … one second later');
```

The last `wait(1000)` matters: the second toast's effect is still waiting in `delay(1000)`. Without it, the demo's
last line would run before the toast is hidden, and the `toastHidden` would happen after the demo, outside the
helpers that wait for React (React would then print a warning about an update "not wrapped in act").

## Run it

```bash
npm run lesson 08
```

Expected output (not run):

```text
— 1. Ada logs in: a listener shows a toast —
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
    📝 posts/fetchPosts/pending
        🖼  PostsList renders
  🌐 server: GET /posts (answers in 200 ms)
    📝 posts/fetchPosts/fulfilled
        🖼  Navbar renders
        🖼  PostsList renders
        🖼  PostExcerpt "Redux Toolkit" renders
        🖼  PostExcerpt "First post!" renders
  ┌─ right after the login
  │ 🍞 Welcome, Ada Lovelace!
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
    📝 toasts/toastHidden
        🖼  Toasts renders
  … one second later

— 2. Ada saves a post: another listener, another toast —
        🖼  AddPostForm renders
        🖼  AddPostForm renders
    📝 posts/addNewPost/pending
        🖼  AddPostForm renders
  🌐 server: POST /posts {"title":"Listeners","content":"React to actions","user":"u1"} (answers in 200 ms)
    📝 posts/addNewPost/fulfilled
    📝 toasts/toastShown
        🖼  Toasts renders
        🖼  Navbar renders
        🖼  AddPostForm renders
        🖼  PostsList renders
        🖼  PostExcerpt "Listeners" renders
  ┌─ the post is saved
  │ 🍞 Post saved: "Listeners"
  │ Logged in as Ada Lovelace, 2 post(s) (Log out)
  │ Add a new post
  │ [Title] [Content] (Save post)⊘
  │ Posts
  │ Listeners
  │ by Ada Lovelace
  │ React to actions
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
    📝 toasts/toastHidden
        🖼  Toasts renders
  … one second later
```

Walk-through:
- **Part 1.** `📝 auth/userLoggedIn` is immediately followed by `📝 toasts/toastShown`: the listener middleware let
  the login action reach the reducers, then ran the matching listener (`isAnyOf(userLoggedIn, userLoggedOut)`),
  whose effect read Ada's name from the state and dispatched the toast. Then the effect paused at `delay(1000)`,
  and the app went on: React drew the feed with the toast on top, the posts loaded. One second after the login,
  the effect continued and dispatched `toastHidden`: only `Toasts` re-rendered.
- **Part 2.** The same pattern with the other listener: `addNewPost.fulfilled` reached the reducers (the post was
  added), then the listener dispatched `toastShown` with the post's title. Neither `AddPostForm` nor the thunk
  knows about toasts.

## The whole picture

```text
store middleware: [ listenerMiddleware, …default (thunk, checks)…, logger ]
                       │
dispatch(action) ──────┤ next(action) → … → reducers                      (the state is updated first)
                       └ for each listener:
                           actionCreator: addNewPost.fulfilled ─────┐
                           matcher: isAnyOf(userLoggedIn, userLoggedOut) ┤ matches? → effect(action, listenerApi)
                                                                     │     ├─ dispatch(toastShown(text))
                                                                     │     ├─ await delay(1000)   (in the background)
                                                                     │     └─ dispatch(toastHidden(id))
```

## Summary

| Term | What it is, in one line |
|---|---|
| **reactive logic** | code that runs in response to actions, instead of being called by the code that dispatches them |
| **listener** | "which actions" (actionCreator / matcher / predicate) + "what to do" (effect) |
| **`createListenerMiddleware`** | creates the middleware that runs listeners after the reducers |
| **effect** | the listener's function `(action, listenerApi)`; may be async |
| **listener API** | `getState`, `getOriginalState`, `dispatch`, `delay`, `condition`, `take`, `cancelActiveListeners`… |
| **matcher** | a function `(action) => boolean` (a type guard) that selects actions |
| **`isAnyOf`** | builds a matcher that accepts any of the given action creators |

**Next lecture:** [09-rtk-query-basics](09-rtk-query-basics.md): letting RTK Query fetch, cache and refresh the
posts, with hooks that replace the thunks, the status fields and the effects.
