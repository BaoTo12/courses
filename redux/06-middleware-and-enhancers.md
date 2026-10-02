# Lecture 06. Middleware and enhancers: adding behaviour around `dispatch`

> **By the end you can:** write and type a middleware; explain what `next` is and in which order a chain of
> middleware runs; build `compose` and `applyMiddleware` yourself; explain what an enhancer is and why
> `applyMiddleware` is one.
> **New terms in this lesson:** enhancer, middleware, `storeAPI`, `next`, middleware chain, `compose`,
> `applyMiddleware`, `Middleware` type, `isAction`
> **You should already know:** store, `dispatch`, `getState`, `subscribe`, closure, `AppDispatch`
> ([05](05-the-store.md)); `RootState` ([04](04-combining-reducers.md))
> **Project files you fill in:** `src/app/middleware/logger.ts` (🧩 06.1), `src/from-scratch/compose.ts` (🧩 06.2),
> `src/from-scratch/applyMiddleware.ts` (🧩 06.3), `src/from-scratch/createStore.ts` (change, step 06.4),
> `src/app/store.ts` (change, step 06.5), `demos/06-middleware-and-enhancers.ts` (🧩 06.6)

## 1. The problem: we want extra behaviour on every dispatch

While developing, we'd like to **see** every action: its type, and which slices of the state it changed. Later
(lecture 09) we will want `dispatch` to accept things that aren't actions at all. Both mean "do something extra
around every `dispatch`", without editing Redux's code.

### Naive version: replace `store.dispatch` by hand

```ts
const originalDispatch = store.dispatch;
store.dispatch = (action) => {
  console.log(`    👀 before ${action.type}`);
  const result = originalDispatch(action); // the real dispatch: reducer + subscribers
  console.log(`    👀 after: ${store.getState().todos.length} todo(s)`);
  return result;
};
```

It works (part 1 of the demo). But:
- every feature that wants to wrap `dispatch` must remember to call the previous one, in the right order;
- it changes the store object after creation, from anywhere in the code, which is hard to follow;
- there's no standard shape, so nobody can share such code as a library.

Redux standardises this in two levels: **enhancers** (change anything about the store) and **middleware** (change
only `dispatch`, the common case).

## 2. Enhancer: a function that makes a better `createStore`

An **enhancer** is a function that takes `createStore` and returns a **new** `createStore` that builds an improved
store. Think of it as a "store factory upgrade".

```ts
const countDispatches: OurEnhancer = (createStore) => (reducer, preloadedState) => {
  const store = createStore(reducer, preloadedState); // 1. build a normal store
  let count = 0;
  return {
    ...store, //                                         2. keep getState, subscribe…
    dispatch(action) { //                                3. …but replace dispatch
      count += 1;
      console.log(`    🔢 dispatch number ${count}`);
      return store.dispatch(action);
    },
  };
};
```

Read it from the outside in:
- `countDispatches(createStore)` → returns a function `(reducer, preloadedState) => store`, which has the same shape
  as `createStore` itself;
- that function builds a normal store, then returns a copy of it with a different `dispatch`.

The store accepts an enhancer as its third argument: `createStore(reducer, preloadedState, enhancer)`. Our own
`createStore` doesn't support it yet.

### Build step 06.4: enhancer support in our `createStore`

In `src/from-scratch/createStore.ts`, add these two types right after the `OurStore` interface:

```ts
// The shape of createStore itself (without the enhancer argument).
export type StoreCreator = <S, A extends { type: string }>(
  reducer: (state: S | undefined, action: A) => S,
  preloadedState?: S,
) => OurStore<S, A>;

// An enhancer receives a createStore and returns an improved one.
export type OurEnhancer = (createStore: StoreCreator) => StoreCreator;
```

Then change the start of the function. Old:

```ts
export function createStore<S, A extends { type: string }>(
  reducer: (state: S | undefined, action: A) => S,
  preloadedState?: S,
): OurStore<S, A> {
  let state = preloadedState as S; // filled by the init action below
```

New:

```ts
export function createStore<S, A extends { type: string }>(
  reducer: (state: S | undefined, action: A) => S,
  preloadedState?: S,
  enhancer?: OurEnhancer,
): OurStore<S, A> {
  if (enhancer) {
    return enhancer(createStore)(reducer, preloadedState); // let the enhancer build the store
  }
  let state = preloadedState as S; // filled by the init action below
```

What it does:
- `StoreCreator` is the type of a `createStore` function: generic in `S` and `A`, like ours. Writing it out lets us
  type enhancers: `OurEnhancer` turns one `StoreCreator` into another.
- If an enhancer is given, `createStore` hands **itself** to the enhancer, and lets the "upgraded" `createStore`
  that comes back build the store. That upgraded version calls the plain `createStore` (without an enhancer) inside,
  so this branch runs only once. The rest of the function is unchanged.
- In `countDispatches` above, `(reducer, preloadedState) => …` has no type annotations: TypeScript takes them from
  `StoreCreator`, because the variable is declared `: OurEnhancer`.

## 3. Middleware: a checkpoint inside `dispatch`

Most enhancers just want to wrap `dispatch`. For that, Redux has a simpler, standard shape: the **middleware**.
A middleware is a checkpoint that every dispatched action passes through **before** it reaches the reducer.

```ts
const middleware: Middleware = (storeAPI) => (next) => (action) => {
  // code here runs before the action continues
  const result = next(action);  // hand the action to the next step
  // code here runs after everything behind us is finished (reducer + subscribers)
  return result;
};
```

It's three nested functions. Each layer receives one thing, at a different moment:

| Layer | Receives | When it's called |
|---|---|---|
| `(storeAPI) =>` | **`storeAPI`**: an object `{ getState, dispatch }` | once, when the store is built |
| `(next) =>` | **`next`**: the next step of the chain (the next middleware, or, for the last one, the store's real `dispatch`) | once, when the store is built |
| `(action) =>` | the dispatched value | on **every** dispatch |

Why three functions instead of one function with three parameters? Because `storeAPI` and `next` are known once,
when the store is built, while `action` changes every time. The outer layers run once and "remember" their values
(closures, lecture 05); the inner one runs per action.

A middleware can:
- **log** or measure (our logger);
- **stop** an action: just don't call `next`;
- **change** it: call `next(differentAction)`;
- **dispatch other actions** with `storeAPI.dispatch(…)`;
- **wait**, or accept things that aren't actions: lecture 09.

> **API card: the `Middleware` type and `isAction` (package `redux`)**
>
> ```ts
> type Middleware<DispatchExt = {}, S = any> =
>   (api: { getState(): S; dispatch: Dispatch }) =>   // storeAPI
>     (next: (action: unknown) => unknown) =>         // next
>       (action: unknown) => unknown;                 // the dispatched value
>
> function isAction(value: unknown): value is Action; // true if value is an object with a string `type`
> ```
>
> **Why `action: unknown`:** a middleware sits **before** every other middleware's checks, so it can receive
> anything someone passed to `dispatch` (lecture 09 dispatches functions). `unknown` forces the middleware to check
> what it got before using it. `isAction(value)` is that check: a **type guard** (its return type `value is Action`
> means "if I return true, TypeScript may narrow `value` to `Action`").
>
> **`DispatchExt`:** what this middleware adds to `dispatch`'s type (nothing for a logger: `{}`; lecture 09's thunk
> middleware adds "dispatch also accepts functions"). **`S`:** the state type `getState()` returns.

### Build step 06.1: the logger middleware

Open `src/app/middleware/logger.ts`. Replace the placeholder `🧩 06.1` with:

```ts
import { isAction, type Middleware } from 'redux';
import type { RootState } from '../rootReducer';

export const logger: Middleware<{}, RootState> = (storeAPI) => (next) => (action) => {
  if (!isAction(action)) return next(action); // not an action object: nothing to log, pass it on
  const before = storeAPI.getState();
  console.log(`    📝 logger: ⟶ ${action.type}`);
  const result = next(action); // the action goes on: through the rest of the chain, the reducer, the subscribers
  const after = storeAPI.getState();
  const changed = (Object.keys(after) as (keyof RootState)[]).filter((key) => after[key] !== before[key]);
  console.log(`    📝 logger: ⟵ ${action.type} (changed: ${changed.join(', ') || 'nothing'})`);
  return result;
};
```

What each part does:
- `Middleware<{}, RootState>`: adds nothing to `dispatch`, and `storeAPI.getState()` returns a `RootState`.
- `if (!isAction(action)) return next(action)`: if the value isn't an action, pass it on untouched. After this line,
  TypeScript knows `action` has a `type`.
- `before = storeAPI.getState()`: the state **before** the action reaches the reducer.
- `next(action)`: the action continues. When `next` returns, the reducer has run (dispatch is synchronous, lecture
  05), so `getState()` now returns the **new** state.
- `changed`: the slices whose object is a different reference. This is the `!==` check of lecture 04: a slice
  reducer that didn't handle the action returned the same object.
- `return result`: what `next` returned goes back to whoever called `dispatch`. **Don't forget this `return`.** If
  a middleware drops it, `store.dispatch(…)` returns `undefined` for everyone. Lecture 11 relies on the value that
  comes back. (TypeScript won't catch a missing `return` here, because the inner function's return type is
  `unknown`.)

## 4. Connecting middleware into a chain

With two middlewares, A and B, we want: `dispatch` → A → B → the real dispatch. Each one's `next` must be the
following one. Building this is called creating the **middleware chain**.

The trick is to build it **from the end**: B needs the real dispatch as its `next`; A needs B's `(action) =>`
function as its `next`.

```text
realDispatch                          (the reducer + subscribers)
B(storeAPI)(realDispatch)    → bLayer (its next is realDispatch)
A(storeAPI)(bLayer)          → aLayer (its next is bLayer)        ← this becomes store.dispatch
```

"Apply the last function first, then the one before it…" is what `compose` does.

### Build step 06.2: `compose`

Open `src/from-scratch/compose.ts`. Replace the placeholder `🧩 06.2` with:

```ts
// compose(f, g, h)(x) === f(g(h(x))): the LAST function runs first.
type OneArgFunction = (arg: any) => any;

export function compose(...funcs: OneArgFunction[]): OneArgFunction {
  if (funcs.length === 0) return (arg) => arg;
  return funcs.reduce((a, b) => (arg) => a(b(arg)));
}
```

What it does: with no functions, it returns "give back what you got". Otherwise `reduce` folds the list (lecture
03) into one function. Run it by hand on `compose(f, g, h)`:
1. `a = f`, `b = g` → `x1 = (arg) => f(g(arg))`
2. `a = x1`, `b = h` → `x2 = (arg) => x1(h(arg))` = `f(g(h(arg)))`

The types are loose (`any`) on purpose: the functions in a chain each take and return different types, which
TypeScript can only express with long overloads. Redux's own `compose` has those overloads; ours keeps it readable.

### Build step 06.3: `applyMiddleware`

Open `src/from-scratch/applyMiddleware.ts`. Replace the placeholder `🧩 06.3` with:

```ts
import type { Middleware } from 'redux';
import { compose } from './compose';
import type { OurEnhancer } from './createStore';

// An enhancer that puts a chain of middleware in front of the store's dispatch.
export function applyMiddleware(...middlewares: Middleware[]): OurEnhancer {
  return (createStore) => (reducer, preloadedState) => {
    const store = createStore(reducer, preloadedState);

    let dispatch: (action: any) => any = () => {
      throw new Error('Dispatching while constructing your middleware is not allowed.');
    };
    const storeAPI = {
      getState: store.getState,
      dispatch: (action: any) => dispatch(action), // always the FINAL dispatch (the whole chain)
    };

    const chain = middlewares.map((middleware) => middleware(storeAPI)); // layer 1: give each its storeAPI
    dispatch = compose(...chain)(store.dispatch); // layer 2: connect each to its next, from the end

    return { ...store, dispatch };
  };
}
```

What each part does:
- `applyMiddleware(...middlewares)` returns an **enhancer** (its return type is `OurEnhancer`):
  `(createStore) => (reducer, preloadedState) => store`. So `applyMiddleware` isn't a special feature of the store;
  it's an enhancer like `countDispatches`.
- `store = createStore(…)` builds a normal store. Its `dispatch` (the "real" one) becomes the end of the chain.
- `let dispatch = () => { throw … }`: a temporary dispatch. A middleware must not dispatch while the chain is still
  being built (its `next` doesn't exist yet), so that attempt throws a clear error. It's typed `(action: any) =>
  any` because it will later hold the chain, which accepts whatever the middlewares accept.
- `storeAPI.dispatch` is `(action) => dispatch(action)`, **not** `store.dispatch`. It reads the variable
  `dispatch` at the moment it's called, so once the chain is built, it calls the **whole chain**. That means an
  action dispatched from inside a middleware goes through all middlewares again, from the first one. Lecture 09
  depends on this.
- `chain = middlewares.map(m => m(storeAPI))`: calls the outer layer of each middleware. Each returns its
  `(next) => …` function.
- `compose(...chain)(store.dispatch)`: gives the real dispatch to the last one, the result to the one before, and
  so on (section 4). The result is the first middleware's `(action) => …` function: the new `dispatch`.

Run it by hand: `applyMiddleware(A, B)`, then `dispatch(add)`:

| # | Running | Prints | Then |
|---|---|---|---|
| 1 | A's `(action) =>` | `▶ A: received` | calls `next` = B's layer |
| 2 | B's `(action) =>` | `▶ B: received` | calls `next` = real dispatch |
| 3 | real dispatch | (reducer runs, then the subscriber prints 🔔) | returns the action |
| 4 | B, after `next` | `◀ B: next() returned` | returns to A |
| 5 | A, after `next` | `◀ A: next() returned` | returns to the caller |

The first middleware in the list is the **outermost**: it sees the action first, and finishes last.

## 5. The real thing: Redux's `applyMiddleware` and `compose`

> **API card: `applyMiddleware` (package `redux`)**
>
> **What it is:** an enhancer that puts a chain of middleware in front of the store's `dispatch`.
>
> ```ts
> function applyMiddleware<Ext1, S>(
>   ...middlewares: Middleware<Ext1, S>[]    // each: (storeAPI) => (next) => (action) => result
> ): StoreEnhancer<{ dispatch: Ext1 }>;      // pass it as createStore's last argument
> ```
>
> **What it does, step by step:** exactly our version: 1. builds a normal store; 2. creates `storeAPI` whose
> `dispatch` throws until the chain is ready; 3. calls each middleware with `storeAPI`; 4. composes them around the
> store's dispatch; 5. returns the store with the new `dispatch`. Its types also merge each middleware's
> `DispatchExt` into the store's `dispatch` type (that's how `AppDispatch` learns about thunks in lecture 09).
>
> **What our project passes / gets back:** `applyMiddleware(logger)` → an enhancer; `createStore(rootReducer,
> applyMiddleware(logger))` → a store whose every dispatch prints two 📝 lines.
>
> **If you left it out:** `createStore` would build a plain store; middlewares would never be called.

> **API card: `compose` (package `redux`)**
>
> ```ts
> function compose(...funcs: Function[]): Function;   // compose(f, g, h)(x) === f(g(h(x))), fully typed overloads
> ```
>
> **What it's used for here:** combining several **enhancers** into one, since `createStore` takes only one:
> `createStore(reducer, compose(applyMiddleware(logger), someOtherEnhancer))`.

`createStore(reducer, enhancer)` also works without a preloaded state: when the second argument is a function,
Redux treats it as the enhancer.

### Build step 06.5: the app's store gets the logger

Replace the whole content of `src/app/store.ts` with:

```ts
import { legacy_createStore as createStore, applyMiddleware } from 'redux';
import { rootReducer } from './rootReducer';
import { logger } from './middleware/logger';

export const store = createStore(rootReducer, applyMiddleware(logger));

export type AppDispatch = typeof store.dispatch;
```

From now on, every action dispatched in the app prints two 📝 lines.

## 6. An enhancer you'll use every day: Redux DevTools

The **Redux DevTools** browser extension is an enhancer too. In a browser app, the store setup usually looks like
this:

```ts
const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const store = createStore(rootReducer, composeEnhancers(applyMiddleware(logger)));
```

If the extension is installed, it provides its own `compose`, which also connects the store to the extension: you
then see every action, the state before and after, and a diff, and you can "time-travel" back to an earlier state.
It only exists in a browser, so our Node project doesn't use it. (Not run: needs a browser with the extension.)

## Build step 06.6: the demo

Open `demos/06-middleware-and-enhancers.ts`. Replace the placeholder `🧩 06.6` with:

```ts
// Lecture 06 demo: wrapping dispatch, enhancers, compose, middleware chains.
import { isAction, type Middleware } from 'redux';
import { createStore as ourCreateStore, type OurEnhancer } from '../src/from-scratch/createStore';
import { applyMiddleware as ourApplyMiddleware } from '../src/from-scratch/applyMiddleware';
import { compose } from '../src/from-scratch/compose';
import { rootReducer, type RootAction } from '../src/app/rootReducer';
import { store } from '../src/app/store';

const add: RootAction = { type: 'todos/todoAdded', payload: 'Learn Redux' };

console.log('— 1. Wrapping dispatch by hand —');
const s1 = ourCreateStore(rootReducer);
const originalDispatch = s1.dispatch;
s1.dispatch = (action) => {
  console.log(`    👀 before ${action.type}`);
  const result = originalDispatch(action);
  console.log(`    👀 after: ${s1.getState().todos.length} todo(s)`);
  return result;
};
s1.dispatch(add);

console.log('\n— 2. An enhancer —');
const countDispatches: OurEnhancer = (createStore) => (reducer, preloadedState) => {
  const store = createStore(reducer, preloadedState);
  let count = 0;
  return {
    ...store,
    dispatch(action) {
      count += 1;
      console.log(`    🔢 dispatch number ${count}`);
      return store.dispatch(action);
    },
  };
};
const s2 = ourCreateStore(rootReducer, undefined, countDispatches);
s2.dispatch(add);
s2.dispatch(add);
console.log('  todos in s2:', s2.getState().todos.length);

console.log('\n— 3. compose —');
const double = (x: number) => x * 2;
const increment = (x: number) => x + 1;
console.log('  compose(double, increment)(5) =', compose(double, increment)(5), '← double(increment(5))');

console.log('\n— 4. A middleware chain, with our applyMiddleware —');
const checkpoint =
  (name: string): Middleware =>
  (storeAPI) =>
  (next) =>
  (action) => {
    console.log(`   ▶ ${name}: received ${isAction(action) ? action.type : typeof action}`);
    const result = next(action);
    console.log(`   ◀ ${name}: next() returned`);
    return result;
  };
const s4 = ourCreateStore(rootReducer, undefined, ourApplyMiddleware(checkpoint('A'), checkpoint('B')));
s4.subscribe(() => console.log('      🔔 subscriber'));
s4.dispatch(add);

console.log('\n— 5. The app store, with the logger —');
store.dispatch(add);
store.dispatch({ type: 'nothing/happened' } as unknown as RootAction);
```

`checkpoint(name)` is a function that **creates** a middleware: it lets part 4 make two middlewares, A and B, that
print their own names.

## Run it

```bash
npm run lesson 06
```

Expected output (not run):

```text
— 1. Wrapping dispatch by hand —
    👀 before todos/todoAdded
    👀 after: 1 todo(s)

— 2. An enhancer —
    🔢 dispatch number 1
    🔢 dispatch number 2
  todos in s2: 2

— 3. compose —
  compose(double, increment)(5) = 12 ← double(increment(5))

— 4. A middleware chain, with our applyMiddleware —
   ▶ A: received todos/todoAdded
   ▶ B: received todos/todoAdded
      🔔 subscriber
   ◀ B: next() returned
   ◀ A: next() returned

— 5. The app store, with the logger —
    📝 logger: ⟶ todos/todoAdded
    📝 logger: ⟵ todos/todoAdded (changed: todos)
    📝 logger: ⟶ nothing/happened
    📝 logger: ⟵ nothing/happened (changed: nothing)
```

Walk-through:
- **Part 1.** The hand-made wrapper ran before and after the original dispatch.
- **Part 2.** `ourCreateStore(rootReducer, undefined, countDispatches)` went into the new `if (enhancer)` branch.
  The enhancer built a normal store inside and returned one with a counting `dispatch`. The init action is not
  counted: it was dispatched by the inner `createStore`, with the inner dispatch, before the enhancer replaced it.
- **Part 3.** `compose(double, increment)(5)` runs the **last** function first: `increment(5)` = 6, then
  `double(6)` = 12.
- **Part 4.** The order of the table in section 4: A sees the action first, B second, then the reducer and the
  subscriber run, then B finishes, then A. Note that `🔔 subscriber` appears **inside** the chain: the store's real
  dispatch (the end of the chain) calls the subscribers before returning to B.
- **Part 5.** The app's store now logs every action. `todoAdded` changed the `todos` slice. The unknown action
  changed nothing: both slice reducers returned their old objects, so `combineReducers` did too.

## The whole picture

```text
store = createStore(rootReducer, applyMiddleware(A, B))
          │
          └─ applyMiddleware is an ENHANCER:
               builds the plain store, then   dispatch = A(storeAPI)( B(storeAPI)( realDispatch ) )

store.dispatch(action)
   └─► A: before ─► B: before ─► realDispatch: reducer → subscribers ─► B: after ─► A: after ─► returns
                                                                         (each returns next()'s result)
storeAPI.dispatch(x) from inside any middleware  ─► starts again at A (the whole chain)
```

## Summary

| Term | What it is, in one line |
|---|---|
| **enhancer** | `(createStore) => newCreateStore`: builds a store with extra or changed features |
| **middleware** | `(storeAPI) => (next) => (action) => result`: a checkpoint every dispatch passes through |
| **`storeAPI`** | `{ getState, dispatch }` given to each middleware; its `dispatch` runs the whole chain |
| **`next`** | inside a middleware: the next step of the chain (next middleware, or the real dispatch) |
| **middleware chain** | the middlewares connected in order: the first one listed is the outermost |
| **`compose`** | `compose(f, g, h)(x) === f(g(h(x)))`; combines functions, the last runs first |
| **`applyMiddleware`** | the enhancer that builds the middleware chain in front of `dispatch` |
| **`Middleware` type** | `Middleware<DispatchExt, State>`; the dispatched value arrives as `unknown` |
| **`isAction`** | a type guard: true (and narrows to `Action`) if a value is an object with a string `type` |

**Next lecture:** [07-redux-and-a-ui](07-redux-and-a-ui.md): connecting the store to a real page: drawing the
state, turning clicks into actions, and redrawing only when needed.
