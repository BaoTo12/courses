# Lecture 05. The store: where the state lives

> **By the end you can:** build a working, typed Redux store yourself, in ~30 lines; explain what `getState`,
> `dispatch` and `subscribe` do and in which order; explain why `dispatch` is synchronous; create the real store
> with Redux, and type `dispatch` so a wrong action is a compile error.
> **New terms in this lesson:** store, `getState`, `dispatch`, subscriber, `subscribe`, unsubscribe, closure, init
> action, preloaded state, `AppDispatch`
> **You should already know:** action, reducer, initial state ([03](03-actions-and-reducers.md)); root reducer,
> `combineReducers`, `RootState`, `RootAction` ([04](04-combining-reducers.md))
> **Project files you fill in:** `src/from-scratch/createStore.ts` (🧩 05.1), `src/app/store.ts` (🧩 05.3),
> `demos/05-the-store.ts` (🧩 05.5)

## 1. The problem: who keeps the state, who calls the reducer?

We have a root reducer: give it a state and an action, it returns the next state. But in lecture 04 our demo did
all the work by hand: it kept the state in a variable, called the reducer, and stored the result. A real app needs
one object that does this for everyone:

- **keeps** the current state;
- when an action happens, **runs** the root reducer and keeps the result;
- **tells** the view that the state changed, so it can redraw (the last arrow of the lecture 01 loop).

That object is the **store**.

## 2. The idea

```text
                 ┌──────────────────────── store ────────────────────────┐
 dispatch(action)│   state = reducer(state, action)                      │
 ───────────────►│   then call every subscriber ─────────────┐           │
                 │                                           ▼           │
 getState() ◄────│   state (the one source of truth)    subscribers ─────┼──► "redraw!"
                 └───────────────────────────────────────────────────────┘
```

A store has three methods:
- **`getState()`** returns the current state. You never read the state any other way.
- **`dispatch(action)`** is "send an action into the store". The store runs the reducer with the current state and
  that action, and keeps the result. This is **the only way to change the state**.
- **`subscribe(listener)`** registers a function that the store calls after every dispatch. Such a function is a
  **subscriber** (also called a *listener*). The view subscribes, so it hears about every change.

## 3. Build a tiny store

### Build step 05.1: version 1, state + `getState` + `dispatch`

Open `src/from-scratch/createStore.ts`. Replace the placeholder `🧩 05.1` (the whole `createStore` function) with:

```ts
// Our own version of Redux's createStore, to see how it works.
export function createStore<S, A extends { type: string }>(
  reducer: (state: S | undefined, action: A) => S,
  preloadedState?: S,
) {
  let state = preloadedState;

  function getState(): S {
    return state as S;
  }

  function dispatch(action: A): A {
    state = reducer(state, action); // compute the next state, keep it
    return action;
  }

  return { getState, dispatch };
}
```

What each part does:
- `createStore(reducer, preloadedState)` is called **once**, at startup. It receives the root reducer.
- `<S, A extends { type: string }>`: two type parameters. `S` is the state's type, `A` the action's type, which must
  at least have a `type` string. TypeScript **infers** both from the reducer you pass: for our `rootReducer`, `S` is
  `RootState` and `A` is `RootAction`. You never write them.
- `let state` lives inside `createStore`. Nobody outside can touch it directly; they can only call the functions
  that `createStore` returns. A function that keeps access to a variable of the function that created it is called
  a **closure**; here `getState` and `dispatch` are closures over `state`.
- `dispatch(action)` replaces `state` with what the reducer returns. The reducer never mutates, so the old state
  object stays untouched; the store just points at the new one.
- `dispatch` returns the action it received. Nothing uses it yet; lecture 09 will.

Run it by hand: `const store = createStore(rootReducer)`, then `store.getState()`.
1. `preloadedState` is `undefined`, so `state` is `undefined`.
2. `getState()` returns `undefined`, although its type says `RootState`. The `as S` assertion **lied**.

That's a problem: the app starts with **no state** until the first action arrives. The reducers know their initial
state (lecture 03), but nobody has asked them yet. The fix: dispatch one action right at creation, an action that
no reducer handles. Every slice reducer receives `undefined`, returns its initial state, and the store is filled.
This first action is called the **init action**. After it, the assertion is true.

### Build step 05.2: version 2, `subscribe` and the init action

Replace the whole `createStore` function with:

```ts
// Our own version of Redux's createStore, to see how it works.
export interface OurStore<S, A> {
  getState(): S;
  subscribe(listener: () => void): () => void;
  dispatch(action: A): A;
}

export function createStore<S, A extends { type: string }>(
  reducer: (state: S | undefined, action: A) => S,
  preloadedState?: S,
): OurStore<S, A> {
  let state = preloadedState as S; // filled by the init action below
  let listeners: Array<() => void> = [];

  function getState(): S {
    return state;
  }

  function subscribe(listener: () => void): () => void {
    listeners.push(listener);
    return function unsubscribe() {
      listeners = listeners.filter((existing) => existing !== listener);
    };
  }

  function dispatch(action: A): A {
    state = reducer(state, action); // 1. compute the next state
    listeners.forEach((listener) => listener()); // 2. tell every subscriber
    return action;
  }

  dispatch({ type: '@@init' } as A); // fill the state with every reducer's initial state

  return { getState, subscribe, dispatch };
}
```

What's new:
- `OurStore<S, A>` names the shape of what `createStore` returns: three methods.
- `listeners` is the list of subscribers. A listener is a function with no arguments that returns nothing:
  `() => void`.
- `subscribe(listener)` adds a function to the list, and **returns another function**: calling that one removes the
  listener again. Removing yourself from the list is called **unsubscribing**. A screen that disappears must
  unsubscribe, otherwise the store keeps calling it.
- `dispatch` now calls every listener after the reducer. Listeners get **no arguments**: they call `getState()` to
  read whatever they need.
- `dispatch({ type: '@@init' } as A)` runs once, at creation. No reducer has a case for `'@@init'`, so each one
  returns its initial state. The assertion is needed because `'@@init'` is not one of the app's actions (which is
  the point: no reducer may handle it).

Run it by hand: `createStore(rootReducer)`.

| Step | What happens | `state` afterwards |
|---|---|---|
| 1 | `state = undefined`, `listeners = []` | `undefined` |
| 2 | `dispatch({ type: '@@init' })` → `rootReducer(undefined, init)` → each slice reducer returns its initial state | `{ todos: [], filters: { status: 'all', colors: [] } }` |
| 3 | `listeners.forEach(…)`: the list is empty, nothing happens | same |
| 4 | returns `{ getState, subscribe, dispatch }` | |

## 4. `dispatch` is synchronous

When `dispatch(action)` returns, **everything is already done**: the reducer has run, the state is new, and every
subscriber has been called. There is no waiting, no "later". Look at our `dispatch`: it's two plain function calls.

```ts
console.log('before');
store.dispatch(action);   // reducer runs, then every subscriber runs
console.log('after');     // the new state is already there
```

This is why a reducer can't wait for a server (lecture 03, rule 3): the store calls it and uses the result
immediately. Lecture 09 shows where waiting goes instead.

## 5. The app's store

### Build step 05.3: `src/app/store.ts`

Open `src/app/store.ts`. Replace the placeholder `🧩 05.3` with:

```ts
import { createStore } from '../from-scratch/createStore';
import { rootReducer } from './rootReducer';

export const store = createStore(rootReducer);

export type AppDispatch = typeof store.dispatch;
```

What each part does:
- The app has exactly **one** store, created once when this file is first imported. Every other file that needs the
  store imports this `store`.
- **`AppDispatch`** is the type of this store's `dispatch` function. `typeof store.dispatch` reads it from the
  store itself. Right now it's `(action: RootAction) => RootAction`; when middleware is added (lectures 06, 09),
  `dispatch` gains abilities, and `AppDispatch` follows automatically. React components will use this type
  (lecture 08).

Because `dispatch` is typed with `RootAction`, a wrong action no longer compiles:

```ts
store.dispatch({ type: 'todos/todoAdded', payload: 'Learn Redux' }); // ✓
store.dispatch({ type: 'todos/todoAded', payload: 'Learn Redux' });  // ✗ not one of the RootAction types
store.dispatch({ type: 'todos/todoToggled', payload: '1' });          // ✗ payload must be a number
```

## 6. The real thing: Redux's `createStore`

> **API card: `legacy_createStore` (package `redux`)**
>
> **What it is:** creates the store. It's the same function as Redux's `createStore`; see the note on the name
> below.
>
> ```ts
> function legacy_createStore<S, A extends Action>(
>   reducer: Reducer<S, A>,            // the root reducer
>   preloadedState?: Partial<S>,       // optional: a starting state (instead of the reducers' initial states)
>   enhancer?: StoreEnhancer,          // optional: adds features to the store (lecture 06)
> ): Store<S, A>;                      // { getState, dispatch, subscribe, replaceReducer }
> ```
>
> **What it does, step by step:**
> 1. Keeps `reducer` and `state = preloadedState`, and an empty list of listeners.
> 2. Defines `getState`, `subscribe` (which returns an unsubscribe function) and `dispatch`.
> 3. `dispatch(action)` first **checks the action** at runtime: it must be a plain object and its `type` must not
>    be `undefined`; otherwise it throws (for JavaScript users, who have no compiler to catch it). It also refuses
>    to run if a reducer is currently running (a reducer must not dispatch). Then: `state = reducer(state,
>    action)`, then it calls every listener, then returns the action.
> 4. Dispatches its own init action, whose type is `'@@redux/INIT'` followed by random letters, so no reducer can
>    accidentally handle it.
> 5. Returns the store. (`replaceReducer(newReducer)` swaps the root reducer; lecture 12 uses it.)
>
> **What our project passes / gets back:** `rootReducer` → `store: Store<RootState, RootAction>`, with
> `store.getState()` = `{ todos: [], filters: { status: 'all', colors: [] } }` right after creation.
>
> **About the name:** Redux exports this function both as `createStore` and as `legacy_createStore`. The Redux team
> marks `createStore` as deprecated, to push new apps towards Redux Toolkit's `configureStore` (the next course). It
> still works exactly the same; the only effect is that editors show `createStore` crossed out.
> `legacy_createStore` is the same function without the crossed-out warning. We use it because this course's goal
> is to understand what `configureStore` does for you.

### Build step 05.4: switch to the real store

In `src/app/store.ts`, replace the first line:

```ts
import { createStore } from '../from-scratch/createStore';
```

with:

```ts
import { legacy_createStore as createStore } from 'redux';
```

`import { a as b }` imports `a` under the local name `b`, so the rest of the file doesn't change.

## 7. Preloaded state

The second argument of `createStore` is a **preloaded state**: a full state to start from, instead of the reducers'
initial states. It's used to restore a state saved earlier (for example in the browser's storage) or sent by a
server. The init action still runs, but every slice reducer receives its slice (not `undefined`), so it returns it
unchanged.

## 8. Redux's three principles

Now that the store exists, the three rules of lecture 01 can be stated the way the Redux docs state them:

1. **Single source of truth.** The global state of the app lives in one object tree, inside one store.
2. **State is read-only.** The only way to change it is to dispatch an action.
3. **Changes are made with pure functions.** Reducers compute the next state from the previous state and an action.

## Build step 05.5: the demo

Open `demos/05-the-store.ts`. Replace the placeholder `🧩 05.5` with:

```ts
// Lecture 05 demo: the store, ours and the real one.
import { legacy_createStore, type Action } from 'redux';
import { createStore as ourCreateStore } from '../src/from-scratch/createStore';
import { rootReducer, type RootAction, type RootState } from '../src/app/rootReducer';
import { store } from '../src/app/store';

const summary = (state: RootState) => `${state.todos.length} todo(s), filter = ${state.filters.status}`;

console.log('— 1. Our store —');
const ourStore = ourCreateStore(rootReducer);
console.log('  getState() right after creation:', summary(ourStore.getState()));
const unsubscribe = ourStore.subscribe(() => console.log(`    🔔 subscriber: ${summary(ourStore.getState())}`));
ourStore.dispatch({ type: 'todos/todoAdded', payload: 'Learn Redux' });
ourStore.dispatch({ type: 'filters/statusFilterChanged', payload: 'active' });
unsubscribe();
ourStore.dispatch({ type: 'todos/todoAdded', payload: 'Walk the dog' });
console.log('  after unsubscribe + one more dispatch:', summary(ourStore.getState()), '(no 🔔 line)');

console.log('\n— 2. dispatch is synchronous —');
ourStore.subscribe(() => console.log('    🔔 subscriber runs'));
console.log('  before dispatch');
ourStore.dispatch({ type: 'todos/todoToggled', payload: 1 });
console.log('  after dispatch: the reducer AND the subscribers have already run');

console.log('\n— 3. The real store (src/app/store.ts) —');
console.log('  getState():', JSON.stringify(store.getState()));
store.subscribe(() => console.log(`    🔔 subscriber: ${summary(store.getState())}`));
const returned = store.dispatch({ type: 'todos/todoAdded', payload: 'Learn Redux' });
console.log('  dispatch returned:', JSON.stringify(returned));

console.log('\n— 4. What the real createStore does on creation —');
legacy_createStore((state: number = 0, action: Action) => {
  console.log(`  🧮 reducer called with state = ${state}, action.type = ${action.type}`);
  return state;
});

console.log('\n— 5. A preloaded state —');
const restored = legacy_createStore(rootReducer, {
  todos: [{ id: 7, text: 'Saved yesterday', completed: false, color: '' }],
  filters: { status: 'all', colors: [] },
});
console.log('  getState():', summary(restored.getState()), '→', restored.getState().todos[0].text);

console.log('\n— 6. The real store refuses bad actions at runtime —');
for (const bad of [() => {}, { payload: 'no type' }]) {
  try {
    store.dispatch(bad as unknown as RootAction); // TypeScript would refuse both: we force them through
  } catch (error) {
    console.log('  ❌', (error as Error).message.split('. ')[0] + '.');
  }
}
```

What it does:
- Part 4 creates a store with a tiny reducer that prints every call, to see the init action. `Action` is Redux's
  type for "any object with a `type` string".
- Part 6 forces two invalid values through TypeScript (with a double assertion), because TypeScript would stop them
  at compile time; we want to see Redux's runtime check. It prints only the first sentence of each error message
  (the messages are long).

## Run it

```bash
npm run lesson 05
```

Expected output (not run):

```text
— 1. Our store —
  getState() right after creation: 0 todo(s), filter = all
    🔔 subscriber: 1 todo(s), filter = all
    🔔 subscriber: 1 todo(s), filter = active
  after unsubscribe + one more dispatch: 2 todo(s), filter = active (no 🔔 line)

— 2. dispatch is synchronous —
  before dispatch
    🔔 subscriber runs
  after dispatch: the reducer AND the subscribers have already run

— 3. The real store (src/app/store.ts) —
  getState(): {"todos":[],"filters":{"status":"all","colors":[]}}
    🔔 subscriber: 1 todo(s), filter = all
  dispatch returned: {"type":"todos/todoAdded","payload":"Learn Redux"}

— 4. What the real createStore does on creation —
  🧮 reducer called with state = 0, action.type = @@redux/INITx.k.3.q.9.f

— 5. A preloaded state —
  getState(): 1 todo(s), filter = all → Saved yesterday

— 6. The real store refuses bad actions at runtime —
  ❌ Actions must be plain objects.
  ❌ Actions may not have an undefined "type" property.
```

(The letters after `@@redux/INIT` are random: yours will differ.)

Walk-through:
- **Part 1.** Right after creation, the init action has already filled the state (0 todos, filter `all`). Each
  dispatch is followed by one 🔔 line: `dispatch` called our subscriber, which read the new state with
  `getState()`. After `unsubscribe()`, the third dispatch still changed the state (2 todos) but printed no 🔔.
- **Part 2.** `🔔 subscriber runs` appears **between** "before" and "after": by the time `dispatch` returns, the
  reducer and the subscribers are finished.
- **Part 3.** The real store behaves like ours. `dispatch` returns the action it received.
- **Part 4.** The real `createStore` called the reducer **once**, during creation, with `state` undefined (→ the
  default `0`) and its own init action type.
- **Part 5.** With a preloaded state, the store starts with "Saved yesterday" instead of an empty list.
- **Part 6.** A function and an object without `type` are both refused **before** the reducer runs, so the state
  and the subscriber of part 3 are untouched. Keep the first message in mind: dispatching a function is exactly what
  lecture 09 will need, and the full message even names the solution (a "middleware" called redux-thunk).

## The whole picture

```text
store = createStore(rootReducer)          ← once, at startup: init action fills the state
     │                                       store: Store<RootState, RootAction>
     ├─ getState()          → the current state (RootState)
     ├─ subscribe(fn)       → adds fn to listeners; returns unsubscribe()
     └─ dispatch(action)    → state = rootReducer(state, action)        action must be a RootAction (compile time)
                              → every listener()                         (all of this before dispatch returns)
                              → returns action
AppDispatch = typeof store.dispatch
```

## Summary

| Term | What it is, in one line |
|---|---|
| **store** | the object that keeps the state, runs the reducer on each action, and notifies subscribers |
| **`getState`** | returns the current state |
| **`dispatch`** | sends an action into the store; the only way to change the state; synchronous |
| **subscriber** | a function the store calls (with no arguments) after every dispatch; also called listener |
| **`subscribe`** | registers a subscriber; returns the function that unsubscribes it |
| **unsubscribe** | removing a subscriber, so the store stops calling it |
| **closure** | a function that keeps access to variables of the function that created it |
| **init action** | the action the store dispatches at creation, so every reducer returns its initial state |
| **preloaded state** | a complete state given to `createStore` to start from |
| **`AppDispatch`** | the type of the app store's `dispatch`: `typeof store.dispatch` |

**Next lecture:** [06-middleware-and-enhancers](06-middleware-and-enhancers.md): adding behaviour around `dispatch`
(logging first) without touching the store's code.
