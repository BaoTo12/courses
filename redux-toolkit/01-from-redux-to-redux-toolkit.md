# Lecture 01. From Redux to Redux Toolkit: `configureStore`

> **By the end you can:** name the problems of hand-written Redux that Redux Toolkit solves; create a store with
> `configureStore`; explain what its default middleware does, including the two development checks; add your own
> middleware; get `RootState` and `AppDispatch` from the store.
> **New terms in this lesson:** Redux Toolkit (RTK), `configureStore`, default middleware, immutability check,
> serializability check, `getDefaultMiddleware`, `Tuple`
> **You should already know:** the [Redux course](../redux/00-roadmap.md), or at least the terms in section 1;
> TypeScript basics (types, interfaces, unions, generics)
> **Project files you fill in:** `src/features/auth/authSlice.ts` (🧩 01.1), `src/app/logger.ts` (🧩 01.2),
> `src/app/store.ts` (🧩 01.3), `demos/01-from-redux-to-redux-toolkit.ts` (🧩 01.4)

## 0. The course project

All the code of this course lives in ONE small project: [project/](project/). It's a tiny **social feed**: you log
in as one of the users, read the posts, write a post, react to posts (👍 ❤️ 🚀), and see notifications. The data
comes from a small HTTP server running on your machine (given, in `src/api/server.ts`).

The project is a TypeScript **skeleton**: every file exists, but the parts this course teaches are 🧩
placeholders. Each lecture's **build steps** give you the exact code to put in place of each placeholder; each
lecture ends with a demo:

```bash
cd project
npm install
npm run lesson 01
npm run typecheck     # whenever you like
```

The course follows the official [Redux Essentials](https://redux.js.org/tutorials/essentials/part-1-overview-concepts)
tutorial, which teaches Redux the modern way, with Redux Toolkit.

## 1. Redux in one table

This course builds on plain Redux. If you did the [Redux course](../redux/00-roadmap.md), this is a reminder; if not,
these are the words you need, each in one line:

| Term | What it is | Redux course |
|---|---|---|
| **state** | everything the app remembers right now, in one object | [01](../redux/01-why-redux.md) |
| **immutable update** | changing data by building a new object, never modifying the old one | [02](../redux/02-immutability.md) |
| **action** | a plain object describing what happened: `{ type: 'posts/postAdded', payload: … }` | [03](../redux/03-actions-and-reducers.md) |
| **reducer** | a pure function `(state, action) => newState` that never mutates | [03](../redux/03-actions-and-reducers.md) |
| **slice / slice reducer** | one top-level field of the state, and the reducer that manages it | [04](../redux/04-combining-reducers.md) |
| **store** | the object that keeps the state; `getState()`, `dispatch(action)`, `subscribe(listener)` | [05](../redux/05-the-store.md) |
| **dispatch** | sending an action into the store: the only way to change the state | [05](../redux/05-the-store.md) |
| **middleware** | a checkpoint every dispatched value passes through before the reducer | [06](../redux/06-middleware-and-enhancers.md) |
| **selector** | a function `(state) => value` that reads or derives data from the state | [07](../redux/07-redux-and-a-ui.md) |
| **thunk** | a function you dispatch; the thunk middleware calls it with `dispatch` and `getState`, so it can wait | [09](../redux/09-async-logic-and-thunks.md) |
| **action creator** | a function that returns an action object | [10](../redux/10-action-creators-and-selectors.md) |

## 2. The problem: hand-written Redux is long, and easy to get wrong

Writing Redux by hand works, but every app repeats the same work, and the same mistakes:

- **The store setup** takes several imports and calls: `createStore`, `combineReducers`, `applyMiddleware`, the thunk
  middleware, the DevTools enhancer, and the types `RootState` and `AppDispatch`.
- **Every action** needs a type string, a member in a union type, an action creator, and a `case` in a `switch`.
- **Every update** must be immutable, which means copying every level by hand: `{ ...state, entities: {
  ...state.entities, [id]: { ...todo, completed: true } } }`. One forgotten level is a mutation, and nothing warns
  you (the Redux course needed `deepFreeze` to see it).
- **Async logic** (loading status, errors, request ids) is written by hand for every request.

## 3. Redux Toolkit

**Redux Toolkit** (**RTK**, package `@reduxjs/toolkit`) is the official, recommended way to write Redux. It is
Redux: the same store, actions, reducers and middleware, but with functions that write the repetitive parts for
you, and development checks that catch the classic mistakes. Each lecture of this course introduces one of them.

| Hand-written Redux | Redux Toolkit | Lecture |
|---|---|---|
| `createStore` + `combineReducers` + `applyMiddleware` + thunk + DevTools | `configureStore` | 01 |
| action types + creators + `switch` + copying every level | `createSlice` (with Immer) | 02, 03 |
| loading/success/failure actions for each request | `createAsyncThunk` | 05 |
| memoized selectors | `createSelector` (Reselect, included) | 06 |
| normalized `{ ids, entities }` state | `createEntityAdapter` | 07 |
| "when this action happens, do that" logic | `createListenerMiddleware` | 08 |
| fetching and caching server data | RTK Query: `createApi` | 09, 10 |

## 4. A slice written by hand, one last time

To see what `configureStore` does, we need a reducer. Our first slice keeps who is logged in: the id of the current
user, or `null`. We write it the hand-written way you know; lecture 02 rewrites it with Redux Toolkit.

### Build step 01.1: the auth slice, by hand

Open `src/features/auth/authSlice.ts`. Replace the placeholder `🧩 01.1` with:

```ts
export interface AuthState {
  currentUserId: string | null;
}

type AuthAction = { type: 'auth/userLoggedIn'; payload: string } | { type: 'auth/userLoggedOut' };

const initialState: AuthState = { currentUserId: null };

export function authReducer(state: AuthState = initialState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'auth/userLoggedIn':
      return { ...state, currentUserId: action.payload };
    case 'auth/userLoggedOut':
      return { ...state, currentUserId: null };
    default:
      return state;
  }
}
```

Nothing new: a state type, a discriminated union of actions, a reducer with a `switch` and immutable updates.

## 5. `configureStore`

### The idea

`configureStore` creates the store with good defaults, in one call:

```ts
const store = configureStore({ reducer: { auth: authReducer } });
```

> **API card: `configureStore` (package `@reduxjs/toolkit`)**
>
> **What it is:** creates a Redux store, with the setup every app needs already done.
>
> ```ts
> function configureStore<S, A, M, E>(options: {
>   reducer: Reducer<S, A> | { [key: string]: Reducer };     // the root reducer, or an object of slice reducers
>   middleware?: (getDefaultMiddleware) => Tuple<Middleware[]>; // optional: change the middleware list
>   devTools?: boolean;                                       // optional: connect Redux DevTools (default true)
>   preloadedState?: Partial<S>;                              // optional: a starting state
> }): EnhancedStore<S, A>;                                    // a Redux store, with dispatch typed by the middleware
> ```
>
> **What it does, step by step:**
> 1. If `reducer` is an object, it calls `combineReducers(reducer)` to build the root reducer.
> 2. It builds the middleware list: by default the **thunk middleware**, plus, in development only, a few
>    **checks** (section 6).
> 3. It applies the middleware (`applyMiddleware`) and, if the Redux DevTools browser extension is present,
>    connects it (`composeWithDevTools`).
> 4. It calls Redux's `createStore` with all of that, and returns the store.
>
> **What our project passes / gets back:** `{ reducer: { auth: authReducer }, middleware: … }` (step 01.3) → a
> store whose state is `{ auth: { currentUserId: null } }`.
>
> **If you left it out:** you'd write lecture 05–09 of the Redux course again: `createStore`, `combineReducers`,
> `applyMiddleware`, `thunk`, the DevTools compose.

"In development" means: when `process.env.NODE_ENV` isn't `'production'`. Build tools set it to `'production'` for
the real app, which removes the checks (they cost time). Our demos run in development.

## 6. The default middleware, and the two checks

`configureStore` adds these middlewares unless you say otherwise:

- the **thunk middleware**: `dispatch` accepts functions (Redux course, lecture 09);
- the **immutability check** (development only): after every dispatch it compares the state before and after,
  and **throws** if something was mutated instead of copied. It does automatically what `deepFreeze` did by hand.
- the **serializability check** (development only): it **warns** (with `console.error`) when an action or the
  state contains a value that isn't plain data: a `Date`, a class instance, a function, a Promise. Such values
  break the DevTools (they can't be saved or replayed) and the "compare with `===`" rules.
- a small **action-creator check** (development only): it warns if you dispatch an action creator itself
  (`dispatch(userLoggedIn)`) instead of calling it (`dispatch(userLoggedIn('u1'))`).

The list of default middleware is called the **default middleware**. To add your own, `configureStore` takes a
`middleware` callback. It receives **`getDefaultMiddleware`**, a function returning the default list, and must
return the final list:

```ts
middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
```

The list is a **`Tuple`**: an array type from Redux Toolkit that remembers the exact type of each middleware in it,
so that `dispatch`'s type knows what each one adds (for example: "accepts thunks"). `.concat(…)` adds at the end,
`.prepend(…)` at the start; both return a new `Tuple`. The first middleware in the list sees each action first.

### Build step 01.2: a logger middleware

The logger prints the type of every action, so the demos show what's dispatched. Open `src/app/logger.ts`.
Replace the placeholder `🧩 01.2` with:

```ts
import { isAction, type Middleware } from '@reduxjs/toolkit';

export const logger: Middleware = () => (next) => (action) => {
  if (isAction(action)) console.log(`    📝 ${action.type}`);
  return next(action);
};
```

This is the middleware shape you know: `storeAPI => next => action`. It doesn't need `storeAPI`, so the first
function takes no parameter. `isAction` checks that the dispatched value is an action object (a thunk is not).
Redux Toolkit re-exports everything from `redux`, so `isAction` and the `Middleware` type come from
`@reduxjs/toolkit` too.

### Build step 01.3: the store

Open `src/app/store.ts`. Replace the placeholder `🧩 01.3` with:

```ts
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../features/auth/authSlice';
import { logger } from './logger';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
});

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
```

What each part does:
- `reducer: { auth: authReducer }`: one slice for now. Each lecture adds one.
- `middleware`: the default list, then our logger at the end. The thunk middleware is before it, so a dispatched
  function stops there and never reaches the logger.
- The three types are read **from the store**, so they're always right:
  - `AppStore`: the store's own type;
  - `RootState`: what `getState` returns. `AppStore['getState']` is an indexed access type (the type of the
    `getState` property); `ReturnType` takes what it returns: `{ auth: AuthState }`;
  - `AppDispatch`: the type of `dispatch`. Because of the thunk middleware in the `Tuple`, it accepts actions
    **and** thunks.

## Build step 01.4: the demo

Open `demos/01-from-redux-to-redux-toolkit.ts`. Replace the placeholder `🧩 01.4` with:

```ts
// Lecture 01 demo: configureStore, its default middleware, and its development checks.
import { configureStore, type Action } from '@reduxjs/toolkit';
import { store } from '../src/app/store';

console.log('— 1. The store configureStore built —');
console.log('  getState():', JSON.stringify(store.getState()));

console.log('\n— 2. Dispatching actions —');
store.dispatch({ type: 'auth/userLoggedIn', payload: 'u1' });
console.log('  getState():', JSON.stringify(store.getState()));
store.dispatch({ type: 'auth/userLoggedOut' });

console.log('\n— 3. Thunks work out of the box —');
const result = store.dispatch((dispatch, getState) => {
  console.log('  ▶ a thunk runs; currentUserId =', getState().auth.currentUserId);
  return 42;
});
console.log('  dispatch returned', result);

console.log('\n— 4. Development check: a reducer that mutates —');
function mutatingCounter(state = { count: 0 }, action: Action) {
  if (action.type === 'counter/incremented') state.count++; // ✗ mutation
  return state;
}
const checkedStore = configureStore({ reducer: { counter: mutatingCounter } });
try {
  checkedStore.dispatch({ type: 'counter/incremented' });
} catch (error) {
  console.log('  ❌', (error as Error).message.split('. ')[0]);
}

console.log('\n— 5. Development check: a value that is not serializable —');
const clockStore = configureStore({ reducer: { clock: (state: number = 0) => state } });
clockStore.dispatch({ type: 'clock/ticked', payload: new Date(0) });
console.log('  (the action was still dispatched: this check only warns)');
```

What it does:
- Part 3 dispatches an inline thunk: `(dispatch, getState) => …`. Thanks to `AppDispatch`, TypeScript knows
  `getState()` returns a `RootState`, so `.auth.currentUserId` is checked.
- Part 4 builds a second store with a reducer that mutates on purpose. Only the first sentence of the error is
  printed.
- Part 5 dispatches an action whose payload is a `Date`, which isn't serializable.

## Run it

```bash
npm run lesson 01
```

Expected output (not run):

```text
— 1. The store configureStore built —
  getState(): {"auth":{"currentUserId":null}}

— 2. Dispatching actions —
    📝 auth/userLoggedIn
  getState(): {"auth":{"currentUserId":"u1"}}
    📝 auth/userLoggedOut

— 3. Thunks work out of the box —
  ▶ a thunk runs; currentUserId = null
  dispatch returned 42

— 4. Development check: a reducer that mutates —
  ❌ A state mutation was detected inside a dispatch, in the path: counter.count

— 5. Development check: a value that is not serializable —
A non-serializable value was detected in an action, in the path: `payload`. Value: 1970-01-01T00:00:00.000Z
Take a look at the logic that dispatched this action:  { type: 'clock/ticked', payload: 1970-01-01T00:00:00.000Z }
(…the message continues with two links to the Redux docs…)
  (the action was still dispatched: this check only warns)
```

Walk-through:
- **Part 1.** `configureStore` combined `{ auth: authReducer }` and dispatched Redux's init action: the state is
  `{ auth: { currentUserId: null } }`.
- **Part 2.** Each dispatch went through the default middleware, then our logger (`📝`), then the reducer.
- **Part 3.** The thunk middleware (part of the default list) called our function and returned its result, `42`.
  The logger printed nothing: the thunk stopped before reaching it.
- **Part 4.** The immutability check recorded the state before the dispatch, let the reducer run, then compared:
  `counter.count` had changed **inside the same object**. That's a mutation, and it threw, naming the path. In
  the Redux course we had to freeze the state ourselves to see this.
- **Part 5.** The serializability check found a `Date` in `payload` and printed a `console.error` (the message is
  long; its exact formatting depends on Node). It doesn't throw: the action went through.

## The whole picture

```text
configureStore({ reducer: { auth }, middleware: gDM => gDM().concat(logger) })
   │
   ├─ combineReducers({ auth })                         → the root reducer
   ├─ middleware: [ checks…, thunk, …checks, logger ]   → applyMiddleware(…)
   ├─ Redux DevTools, if the browser extension exists
   └─ createStore(…)                                     → store
                                                           RootState  = ReturnType<typeof store.getState>
                                                           AppDispatch = typeof store.dispatch   (accepts thunks)
```

## Summary

| Term | What it is, in one line |
|---|---|
| **Redux Toolkit (RTK)** | the official package for writing Redux: the same Redux, with helpers and development checks |
| **`configureStore`** | creates the store: combines the reducers, adds default middleware and DevTools |
| **default middleware** | thunk + (in development) the immutability, serializability and action-creator checks |
| **immutability check** | throws when the state was mutated instead of copied |
| **serializability check** | warns when an action or the state contains non-plain data (Date, function, class instance…) |
| **`getDefaultMiddleware`** | the function `configureStore` passes to your `middleware` callback; returns the default list |
| **`Tuple`** | RTK's typed array of middleware; `.concat()` / `.prepend()` add to it |

**Next lecture:** [02-create-slice-and-immer](02-create-slice-and-immer.md): writing the auth slice again, without
the action union, the `switch` or the copying, and the posts slice the same way.
