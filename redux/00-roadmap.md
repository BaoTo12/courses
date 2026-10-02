# Redux, from zero: course roadmap

## What it is

Redux is a pattern and a small library for keeping the shared data of an app (its "state") in one place, and
changing it only in one predictable way: by describing what happened, and letting a pure function compute the new
state. It works with any UI; with React, the `react-redux` library connects the two.

## The problem it solves

A screen with a list, a counter, a filter bar and a details panel all show the same data. If each part keeps its
own copy, one of them is eventually forgotten during an update, and the screen contradicts itself. If any part may
change the data directly, "why is this value wrong?" has no quick answer. Redux keeps one copy of the data, allows
one way of changing it, and makes every change visible. With TypeScript, the list of possible changes is a type, so
a wrong one is caught before the code runs.

## What you need to know first

| Prerequisite | Why |
|---|---|
| TypeScript: types, interfaces, union types, generics (`f<T>(x: T)`), modules | all the code is strict TypeScript |
| JavaScript: spread `...`, `map`/`filter`/`reduce`, arrow functions | every reducer uses them |
| Promises, `async`/`await` | lecture 09 (code that waits for a server) |
| React basics: components, props, `useState`, JSX | lecture 08 onwards |
| Running a command with Node.js 20+ and npm | every lecture ends by running a demo |

## Version and setup

- `redux` 5.0, `react-redux` 9, `redux-thunk` 3, `reselect` 5, React 19, TypeScript 5 (strict).
- The official tutorials this course covers: [Redux Fundamentals](https://redux.js.org/tutorials/fundamentals/part-1-overview)
  (all eight parts) and the concept parts of [Redux Essentials](https://redux.js.org/tutorials/essentials/part-1-overview-concepts),
  plus Redux's [Usage with TypeScript](https://redux.js.org/usage/usage-with-typescript) guide. The Redux Toolkit
  parts of Essentials are the [next course](../redux-toolkit/00-roadmap.md).
- Setup: `cd project`, `npm install`, then `npm run lesson 01`; `npm run typecheck` checks the types. See
  [project/README.md](project/README.md).

## The project

One small **todo app**: add a todo (saved on a fake server), tick it, give it a color, delete it, clear the
completed ones, filter by status. It runs entirely in Node: from lecture 07 on, the page is a simulated browser page
(jsdom), and every demo prints the screen as text.

The project is a **skeleton**: every file exists, and the code the course teaches is replaced by 🧩 placeholders.
Each lecture's **build steps** give you the exact code to put in place of each placeholder. The file-by-file map is
in [project/README.md](project/README.md).

## The concept ladder

Each term relies only on terms above it.

1. **state**: what the app remembers right now
2. **view**: what the user sees, drawn from the state
3. **event**: something happened
4. **one-way data flow**: state → view → event → new state → view
5. **global state / single source of truth**: data many parts need, kept in one place
6. **reference**: the "address" of an object; `===` compares references
7. **mutation**: changing an object in place
8. **immutable update / shallow copy / structural sharing / freezing / `readonly`**
9. **action / action type / payload**: an event as a plain object `{ type, payload }`
10. **discriminated union / narrowing**: typing the list of actions; TypeScript knows each payload after a check
11. **reducer / pure function / side effect / initial state**: `(state, action) => newState`, with no side effects
12. **state tree / derived data / slice / slice reducer / root reducer / `combineReducers`**
13. **`RootState` / `RootAction`**: the types of the whole state and of every action
14. **store / `getState` / `dispatch` / `subscribe` / subscriber / closure / init action / preloaded state**
15. **`AppDispatch`**: the type of the store's `dispatch`
16. **enhancer / middleware / `next` / middleware chain / `compose` / `applyMiddleware` / `Middleware` type / `isAction`**
17. **DOM / jsdom / selector / `Store` type / UI binding**
18. **re-render / React context / `useSyncExternalStore` / `Provider` / `useSelector` / `useDispatch` / typed hooks**
19. **async logic / thunk / thunk middleware / thunk creator / `redux-thunk` / `ThunkAction` / `AppThunk`**
20. **action creator / memoization / memoized selector / `createSelector` / `shallowEqual`**
21. **loading status / normalized state / entities / `Record` / race condition / request id**
22. **`replaceReducer`**, and the full picture

## Lectures

| # | Lecture | Terms it introduces | Files it fills | Status |
|---|---|---|---|---|
| 01 | [Why Redux](01-why-redux.md) | state, view, event, one-way data flow, global state, single source of truth | `demos/01` | written |
| 02 | [Immutability](02-immutability.md) | reference, mutation, immutable update, shallow copy, structural sharing, freezing, `readonly` | `utils/deepFreeze.ts` | written |
| 03 | [Actions and reducers](03-actions-and-reducers.md) | action, action type, payload, discriminated union, narrowing, reducer, pure function, side effect, initial state | `todosSlice.ts` | written |
| 04 | [Combining reducers](04-combining-reducers.md) | state tree, derived data, slice, slice reducer, root reducer, `combineReducers`, `RootState`, `RootAction` | `filtersSlice.ts`, `rootReducer.ts`, `from-scratch/combineReducers.ts` | written |
| 05 | [The store](05-the-store.md) | store, `getState`, `dispatch`, subscriber, `subscribe`, unsubscribe, closure, init action, preloaded state, `AppDispatch` | `from-scratch/createStore.ts`, `store.ts` | written |
| 06 | [Middleware and enhancers](06-middleware-and-enhancers.md) | enhancer, middleware, `storeAPI`, `next`, middleware chain, `compose`, `applyMiddleware`, `Middleware` type, `isAction` | `logger.ts`, `from-scratch/compose.ts`, `applyMiddleware.ts` | written |
| 07 | [Redux and a UI](07-redux-and-a-ui.md) | DOM, jsdom, selector, `Store` type, UI binding | `ui/vanilla.ts`, selectors | written |
| 08 | [React-Redux](08-react-redux.md) | TSX/tsx, re-render, React context, `useSyncExternalStore`, `Provider`, `useSelector`, `useDispatch`, typed hooks, component vs global state | `from-scratch/reactRedux.tsx`, `redux-bindings.ts`, `ui/*.tsx`, `main.tsx` | written |
| 09 | [Async logic and thunks](09-async-logic-and-thunks.md) | async logic, thunk, thunk middleware, thunk creator, `redux-thunk`, `ThunkAction`, `AppThunk` | `from-scratch/thunkMiddleware.ts`, `store.ts`, thunks | written |
| 10 | [Action creators and selectors](10-action-creators-and-selectors.md) | action creator, memoization, memoized selector, input selector, result function, `createSelector`, `shallowEqual` | `from-scratch/createSelector.ts`, selectors, UI | written |
| 11 | [Loading state and normalized data](11-loading-state-and-normalized-data.md) | loading status, normalized state, entities, `Record`, race condition, request id | `todosSlice.ts`, `Header.tsx`, `TodoList.tsx` | written |
| 12 | [The full picture](12-the-full-picture.md) | `replaceReducer` | `demos/12` | written |

## Glossary

| Term | Meaning | Lecture |
|---|---|---|
| state | everything the app needs to remember right now | 01 |
| view | what the user sees, computed from the state | 01 |
| event | something happened (click, typing, server answer) | 01 |
| one-way data flow | state → view → event → one function computes the new state → view | 01 |
| global state | data that many parts of the app need | 01 |
| single source of truth | all global state kept in one place | 01 |
| reference | the "address" of an object; `===` on objects compares references | 02 |
| mutation | changing an existing object or array in place | 02 |
| immutable update | building a new object/array with the change, leaving the old one untouched | 02 |
| shallow copy | a new top-level object whose fields still point at the same nested objects | 02 |
| structural sharing | the new value reuses every unchanged part of the old value | 02 |
| freezing | `Object.freeze`: later mutations throw; `deepFreeze` freezes every level | 02 |
| `readonly` | a TypeScript marker that makes mutation a compile error | 02 |
| type assertion | `value as T`: tells TypeScript to treat a value as `T`; changes nothing at runtime | 02 |
| action | a plain object describing something that happened: `{ type, payload? }` | 03 |
| action type | the action's name, `'domain/eventName'` | 03 |
| payload | the field holding the action's details | 03 |
| discriminated union | a union whose members each have a different literal in a shared field (`type`) | 03 |
| narrowing | TypeScript reducing a union to the matching member after a check | 03 |
| reducer | `(state, action) => newState`, pure, never mutates | 03 |
| pure function | same input → same output, no side effects | 03 |
| side effect | anything noticeable a function does besides returning a value | 03 |
| initial state | what a reducer returns when called with `state === undefined` | 03 |
| state tree | the whole state, one field per area of the app | 04 |
| derived data | a value computable from the state; not stored | 04 |
| slice | one top-level field of the state tree | 04 |
| slice reducer | a reducer that manages only its own slice | 04 |
| root reducer | the one reducer of the whole tree | 04 |
| `combineReducers` | builds a root reducer from slice reducers; same root when nothing changed | 04 |
| `RootState` | `ReturnType<typeof rootReducer>`: the type of the whole state | 04 |
| `RootAction` | the union of every action type of the app | 04 |
| store | keeps the state, runs the reducer on each action, notifies subscribers | 05 |
| `getState` | returns the current state | 05 |
| `dispatch` | sends an action into the store; the only way to change the state; synchronous | 05 |
| subscriber | a function the store calls after every dispatch (a listener) | 05 |
| `subscribe` / unsubscribe | register a subscriber / remove it | 05 |
| closure | a function keeping access to variables of the function that created it | 05 |
| init action | the action the store dispatches at creation, to collect initial states | 05 |
| preloaded state | a full state given to `createStore` to start from | 05 |
| `AppDispatch` | `typeof store.dispatch`: the type of the app's dispatch | 05 |
| enhancer | `(createStore) => newCreateStore` | 06 |
| middleware | `(storeAPI) => (next) => (action) => result`: a checkpoint inside dispatch | 06 |
| `storeAPI` | `{ getState, dispatch }` given to each middleware | 06 |
| `next` | the next step of the middleware chain | 06 |
| middleware chain | the middlewares connected in order; the first listed is outermost | 06 |
| `compose` | `compose(f, g)(x) === f(g(x))` | 06 |
| `applyMiddleware` | the enhancer that builds the middleware chain | 06 |
| `Middleware` type | `Middleware<DispatchExt, State>`; the dispatched value arrives as `unknown` | 06 |
| `isAction` | type guard: true if a value is an object with a string `type` | 06 |
| DOM | the tree of objects behind a web page | 07 |
| jsdom | a DOM inside Node | 07 |
| selector | `(state: RootState) => value`: reads or derives one piece of the state | 07 |
| `Store` type | `Store<S, A>`: a store holding `S` and accepting actions `A` | 07 |
| UI binding | code connecting a store to a UI: read, dispatch, redraw | 07 |
| TSX / tsx | JSX in TypeScript / the tool that lets Node run it | 08 |
| re-render | React calling a component again | 08 |
| React context | a value available to all components below a provider | 08 |
| `useSyncExternalStore` | React's hook to subscribe a component to outside data | 08 |
| `Provider` | puts the store in context | 08 |
| `useSelector` | selects from the state; re-renders when the result changes | 08 |
| `useDispatch` | returns the store's dispatch | 08 |
| typed hooks | `useAppSelector` / `useAppDispatch`: the hooks with `RootState` / `AppDispatch` attached | 08 |
| component state vs global state | data only one component uses stays in it; shared data goes in Redux | 08 |
| async logic | code that gets its result later | 09 |
| thunk | a function you dispatch; gets `(dispatch, getState, extra)` | 09 |
| thunk middleware | calls dispatched functions; `dispatch` returns what they return | 09 |
| thunk creator | a function that returns a thunk | 09 |
| `redux-thunk` | the library providing the thunk middleware | 09 |
| `ThunkAction` | redux-thunk's type for a thunk | 09 |
| `AppThunk` | `ThunkAction<ReturnType, RootState, unknown, RootAction>` | 09 |
| action creator | a function that returns an action object | 10 |
| memoization | remembering a function's result for given arguments | 10 |
| memoized selector | returns the same reference when its inputs didn't change | 10 |
| input selector / result function | the parts of a memoized selector | 10 |
| `createSelector` | Reselect's memoized-selector builder | 10 |
| `shallowEqual` | one-level comparison; `useSelector`'s optional second argument | 10 |
| loading status | one field with named values describing a request's progress | 11 |
| normalized state / entities | items stored once, in `{ [id]: item }` | 11 |
| `Record<K, V>` | the type of an object with keys `K` and values `V` | 11 |
| race condition | a bug depending on which of two things finishes first | 11 |
| request id | a number per request, to ignore outdated answers | 11 |
| `replaceReducer` | swaps the store's root reducer at runtime | 12 |
