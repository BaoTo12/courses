# Lecture 09. Async logic and thunks: code that waits for a server

> **By the end you can:** explain why async code can't go in reducers or actions; build the thunk middleware in
> four lines; write and type thunks and thunk creators that load and save data; trace a thunk from `dispatch`
> through `await` to the reducer; use `redux-thunk`.
> **New terms in this lesson:** async logic, thunk, thunk middleware, thunk creator, `redux-thunk`, `ThunkAction`,
> `AppThunk`
> **You should already know:** side effect, pure function ([03](03-actions-and-reducers.md)); `dispatch` is
> synchronous, closure, `AppDispatch` ([05](05-the-store.md)); middleware, `next`, `storeAPI`, the `Middleware` type
> ([06](06-middleware-and-enhancers.md)); typed hooks ([08](08-react-redux.md)); Promises and `async`/`await`
> **Project files you fill in:** `src/from-scratch/thunkMiddleware.ts` (🧩 09.1), `src/app/store.ts` (change),
> `src/features/todos/todosSlice.ts` (change + 🧩 09.4), `src/ui/Header.tsx` (change), `src/main.tsx` (change),
> `demos/09-async-logic-and-thunks.tsx` (🧩 09.7)

## 1. The project's fake server

Until now the todos lived only in memory. Real apps keep data on a server. The project gives you one, already
written: `src/api/client.ts` (not part of the course). It behaves like an HTTP API:

| Call | What the "server" does | Resolves to |
|---|---|---|
| `client.get('/fakeApi/todos')` | returns every todo | `{ todos: ServerTodo[] }` |
| `client.post('/fakeApi/todos', { todo: { text } })` | saves a new todo, **the server chooses the id** | `{ todo: ServerTodo }` with `completed: false, color: ''` |

`ServerTodo` has the same four fields as our `Todo`, so TypeScript accepts one where the other is expected (it
compares types by their shape). Both calls return a Promise that resolves after **300 ms**, and print a
`🌐 server:` line when called. The server starts with two todos: `#1 Learn Redux` (completed, green) and
`#2 Build the todo app` (blue).

## 2. The problem: where does code that waits go?

**Async logic** is code that starts something and gets the result **later**: a server request, a timer, reading a
file. It's written with Promises and `async`/`await`.

To add a todo, we must now: send the text to the server, **wait**, then put the saved todo (with its id) in the
state. Where can this code go?

- **Not in a reducer.** A reducer must be pure, with no side effects (lecture 03), and `dispatch` uses its result
  immediately (lecture 05): it can't wait.
- **Not in an action.** An action is a plain object: a description. It can't run code.
- **In the component?**

### Naive version: in the component

```ts
async function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === 'Enter' && trimmed) {
    const response = await client.post('/fakeApi/todos', { todo: { text: trimmed } });
    dispatch({ type: 'todos/todoAdded', payload: response.todo });
  }
}
```

It works. But:
- every place that adds a todo (a keyboard shortcut, an "import" feature…) must copy these steps;
- the component now knows the server's URL and the response's shape: UI code and data code are mixed;
- the logic can't use the state at the moment it runs without the component selecting all of it.

We want to write the "save, wait, then dispatch" recipe **once**, next to the reducer, and start it from anywhere
with **one dispatch**. But `dispatch` accepts only plain objects (lecture 05 showed the error). Lecture 06 gave us
the tool to change that: a middleware.

## 3. Thunk and thunk middleware

The idea: let `dispatch` accept a **function**. A middleware sits at the front of the chain and checks what
arrives:
- a **function** → don't send it to the reducer; **call it**, and give it `dispatch` and `getState` so it can do
  its work;
- anything else → a normal action: pass it on with `next`.

The function you dispatch is called a **thunk** (a programming word for "a function that does some work later").
The middleware that calls it is the **thunk middleware**.

### Build step 09.1: the thunk middleware

Open `src/from-scratch/thunkMiddleware.ts`. Replace the placeholder `🧩 09.1` with:

```ts
// Our own version of redux-thunk, to see how it works. (Its TYPE is borrowed from redux-thunk.)
import type { Action } from 'redux';
import type { ThunkMiddleware } from 'redux-thunk';
import type { RootAction, RootState } from '../app/rootReducer';

export const thunkMiddleware: ThunkMiddleware<RootState, RootAction> = (storeAPI) => (next) => (action) => {
  if (typeof action === 'function') {
    console.log(`   🔧 thunk middleware: a FUNCTION → calling it`);
    return action(storeAPI.dispatch, storeAPI.getState, undefined);
  }
  console.log(`   🔧 thunk middleware: an OBJECT (${(action as Action).type}) → next()`);
  return next(action);
};
```

What each part does:
- It's a middleware: three nested functions (lecture 06). The dispatched value arrives as `unknown`.
- `typeof action === 'function'` narrows it to a function: we call it with `storeAPI.dispatch`,
  `storeAPI.getState`, and a third argument (`undefined` here; section 6 explains it). It does **not** call
  `next`: a function never reaches the reducer.
- `return action(…)`: whatever the thunk returns becomes the return value of `store.dispatch(thunk)`. An `async`
  thunk returns a Promise, so `dispatch(thunk)` returns that Promise. Lecture 11 uses this.
- `storeAPI.dispatch` is the **whole chain** (lecture 06, `applyMiddleware`). So when the thunk later dispatches a
  normal action, that action goes through the thunk middleware again (as an OBJECT this time), then the logger,
  then the reducer.
- `(action as Action).type`: here the value is an action object, but TypeScript only knows it isn't a function.
- The type `ThunkMiddleware<RootState, RootAction>` comes from redux-thunk. It is a `Middleware` whose
  `DispatchExt` says "dispatch also accepts thunks" (lecture 06's API card), so a store built with it lets you
  dispatch functions without a type error.
- The two `🔧` log lines are there for the course, to show which way each value goes.

## 4. The real thing: `redux-thunk`

Our middleware without the log lines **is** redux-thunk. The library's whole logic is about this:

```ts
function createThunkMiddleware(extraArgument) {
  const middleware = ({ dispatch, getState }) => (next) => (action) => {
    if (typeof action === 'function') {
      return action(dispatch, getState, extraArgument);
    }
    return next(action);
  };
  return middleware;
}
export const thunk = createThunkMiddleware();
export const withExtraArgument = createThunkMiddleware;
```

> **API card: `thunk` (package `redux-thunk`)**
>
> **What it is:** the thunk middleware: lets `dispatch` accept functions.
>
> ```ts
> const thunk: ThunkMiddleware;   // pass it to applyMiddleware, usually first
> ```
>
> **What it does, step by step:** for each dispatched value: 1. a function? call it with `(dispatch, getState,
> extraArgument)` and return what it returns; 2. otherwise call `next(action)` and return that.
>
> **`withExtraArgument(value)`** creates the same middleware but passes `value` as the thunk's third argument, for
> example an API client, so thunks don't import it and tests can pass a fake one. We don't need it.
>
> **If you left it out:** `store.dispatch(fetchTodos)` would be a type error, and if forced, it would reach the
> store's real dispatch, which throws "Actions must be plain objects…" (lecture 05).

> **API card: `ThunkAction` (package `redux-thunk`)**
>
> **What it is:** the type of a thunk.
>
> ```ts
> type ThunkAction<ReturnType, State, ExtraThunkArg, BasicAction extends Action> = (
>   dispatch: ThunkDispatch<State, ExtraThunkArg, BasicAction>, // a dispatch that accepts actions AND thunks
>   getState: () => State,
>   extraArgument: ExtraThunkArg,
> ) => ReturnType;
> ```
>
> **How we use it:** through one app-specific alias, `AppThunk` (step 09.2), so each thunk only states what it
> returns.

### Build step 09.2: the app's store gets `redux-thunk`, and the thunk type

Replace the whole content of `src/app/store.ts` with:

```ts
import { legacy_createStore as createStore, applyMiddleware } from 'redux';
import { thunk, type ThunkAction } from 'redux-thunk';
import { rootReducer, type RootAction, type RootState } from './rootReducer';
import { logger } from './middleware/logger';

export const store = createStore(rootReducer, applyMiddleware(thunk, logger));

export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, RootAction>;
```

What each part does:
- `applyMiddleware(thunk, logger)`: the thunk middleware comes **first**: it's the outermost layer, so it sees
  everything first, and functions stop there. The logger only ever sees real actions.
- `AppDispatch` hasn't changed as a line of code, but its **type** has: `applyMiddleware` merged the thunk
  middleware's `DispatchExt` into it, so `AppDispatch` now accepts thunks. Components that use `useAppDispatch`
  can dispatch thunks with no other change.
- **`AppThunk<ReturnType>`**: "a thunk of this app": it gets a `dispatch` that accepts `RootAction`s and thunks, a
  `getState` returning `RootState`, an extra argument we don't use (`unknown`), and returns `ReturnType` (by default
  nothing). An `async` thunk is an `AppThunk<Promise<void>>`.

The demo's part 1 builds a separate store with **our** middleware, to show the 🔧 lines; the app uses the library.

## 5. Loading the todos from the server

### Build step 09.3: the reducer learns two changes

In `src/features/todos/todosSlice.ts`, two changes:

1. A new action, `'todos/todosLoaded'`: the payload is the array of todos from the server; it **replaces** the list.
2. `'todos/todoAdded'` changes meaning: the payload is no longer a text, it's the **saved todo** returned by the
   server, with its id. The reducer just appends it. The server chooses ids now, so `nextTodoId` is no longer
   needed: delete that function.

In `TodosAction`, replace the first line with these two:

```ts
  | { type: 'todos/todoAdded'; payload: Todo }
  | { type: 'todos/todosLoaded'; payload: Todo[] }
```

In `todosReducer`, replace the old case:

```ts
    case 'todos/todoAdded':
      return [...state, { id: nextTodoId(state), text: action.payload, completed: false, color: '' }];
```

with:

```ts
    case 'todos/todosLoaded':
      return action.payload;
    case 'todos/todoAdded':
      return [...state, action.payload];
```

Why `return action.payload` is fine for `todosLoaded`: the server's array is a brand-new array (it arrived over the
"network"), so it is already a new reference, and nobody else holds it.

Change a type, and TypeScript shows you everything that must follow: after this step, every place that dispatches
`todoAdded` with a **string** (the `Header` component) is a compile error until step 09.5 fixes it.

### Build step 09.4: the thunks

In the same file, add these imports at the top:

```ts
import { client } from '../../api/client';
import type { AppThunk } from '../../app/store';
```

and replace the placeholder `🧩 09.4` with:

```ts
export const fetchTodos: AppThunk<Promise<void>> = async (dispatch) => {
  console.log('  ▶ fetchTodos thunk starts');
  const response = await client.get('/fakeApi/todos');
  console.log('  ▶ fetchTodos continues after await');
  dispatch({ type: 'todos/todosLoaded', payload: response.todos });
};

export function saveNewTodo(text: string): AppThunk<Promise<void>> {
  return async function saveNewTodoThunk(dispatch) {
    console.log(`  ▶ saveNewTodo thunk starts (text = "${text}")`);
    const response = await client.post('/fakeApi/todos', { todo: { text } });
    console.log('  ▶ saveNewTodo continues after await');
    dispatch({ type: 'todos/todoAdded', payload: response.todo });
  };
}
```

What each part does:
- `import type { AppThunk }`: type-only, because `store.ts` imports `rootReducer.ts`, which imports this file. A
  type-only import is removed at runtime, so the files don't import each other in a circle.
- **`fetchTodos`** is a thunk: a function of `(dispatch, getState)`. Its type `AppThunk<Promise<void>>` gives
  `dispatch` its type, so the parameter needs no annotation. You dispatch the function itself:
  `store.dispatch(fetchTodos)`, without `()`. It asks the server, waits, then dispatches a normal action with the
  result. It doesn't use `getState`, so it doesn't declare it (a function may ignore trailing parameters).
- **`saveNewTodo`** is different: it needs an argument, the text. But the thunk middleware always calls a thunk
  with `(dispatch, getState, extra)`; there's no slot for our own arguments. So `saveNewTodo(text)` doesn't save
  anything: it **builds and returns** a thunk. The returned function remembers `text` (a closure). A function that
  returns a thunk is called a **thunk creator**.
- `dispatch(saveNewTodo('Buy milk'))`: JavaScript runs `saveNewTodo('Buy milk')` first, which returns the thunk;
  then `dispatch` receives that function, and the thunk middleware calls it.
- Both thunks only dispatch **after** the server answered. The reducer stays pure; the waiting happens in the thunk.

## 6. Using the thunks from the UI

### Build step 09.5: `Header` dispatches `saveNewTodo`

In `src/ui/Header.tsx`, add the import:

```ts
import { saveNewTodo } from '../features/todos/todosSlice';
```

and in `handleKeyDown`, replace:

```ts
      dispatch({ type: 'todos/todoAdded', payload: trimmed });
```

with:

```ts
      dispatch(saveNewTodo(trimmed));
```

`Header` no longer knows anything about the server: it dispatches "save this text", and the thunk does the rest.
`useAppDispatch` returns `AppDispatch`, which accepts thunks since step 09.2.

### Build step 09.6: load the todos when the app starts

In `src/main.tsx`, add the import:

```ts
import { fetchTodos } from './features/todos/todosSlice';
```

and make `store.dispatch(fetchTodos);` the **first line** of `renderApp`:

```tsx
export function renderApp(container: HTMLElement): Root {
  store.dispatch(fetchTodos);
  const root = createRoot(container);
  root.render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
  return root;
}
```

The request starts, and React draws the app immediately with the (empty) state it has. When the server answers,
`todosLoaded` changes the state and the list re-renders.

## Build step 09.7: the demo

Open `demos/09-async-logic-and-thunks.tsx`. Replace the placeholder `🧩 09.7` with:

```tsx
// Lecture 09 demo: thunks, from dispatch through await to the reducer.
import { rootElement, find, typeText, pressEnter, wait, inAct, printScreen } from '../src/debug/testDom';
import { legacy_createStore, applyMiddleware } from 'redux';
import { thunkMiddleware } from '../src/from-scratch/thunkMiddleware';
import { rootReducer } from '../src/app/rootReducer';
import { logger } from '../src/app/middleware/logger';
import { fetchTodos } from '../src/features/todos/todosSlice';
import { renderApp } from '../src/main';

console.log('— 1. Our thunk middleware, without React —');
const testStore = legacy_createStore(rootReducer, applyMiddleware(thunkMiddleware, logger));
const promise = testStore.dispatch(fetchTodos);
console.log('  dispatch returned:', promise);
await promise;
console.log('  todos in the store:', testStore.getState().todos.map((todo) => todo.text));

console.log('\n— 2. The app: renderApp starts loading the todos —');
await inAct(() => renderApp(rootElement));
printScreen('while the server is answering');
await wait(350);
printScreen('350 ms later');

console.log('\n— 3. Add a todo: it is saved on the server first —');
const input = find<HTMLInputElement>('input');
await typeText(input, 'Buy milk');
await pressEnter(input);
printScreen('right after Enter');
await wait(350);
printScreen('350 ms later');
```

Part 1 builds a separate store with **our** thunk middleware (to see the 🔧 lines). `testStore.dispatch(fetchTodos)`
is typed as returning `Promise<void>`: the thunk's return type. Parts 2 and 3 use the app. `wait(350)` lets 350 ms
pass, enough for the fake server's 300 ms.

## Run it

```bash
npm run lesson 09
```

Expected output (not run):

```text
— 1. Our thunk middleware, without React —
   🔧 thunk middleware: a FUNCTION → calling it
  ▶ fetchTodos thunk starts
  🌐 server: GET /fakeApi/todos (answers in 300 ms)
  dispatch returned: Promise { <pending> }
  ▶ fetchTodos continues after await
   🔧 thunk middleware: an OBJECT (todos/todosLoaded) → next()
    📝 logger: ⟶ todos/todosLoaded
    📝 logger: ⟵ todos/todosLoaded (changed: todos)
  todos in the store: [ 'Learn Redux', 'Build the todo app' ]

— 2. The app: renderApp starts loading the todos —
  ▶ fetchTodos thunk starts
  🌐 server: GET /fakeApi/todos (answers in 300 ms)
        🖼  Header renders
        🖼  TodoList renders
        🖼  Footer renders
  ┌─ while the server is answering
  │ [What needs to be done?]
  │ 0 item(s) left (Clear completed)
  └─
  ▶ fetchTodos continues after await
    📝 logger: ⟶ todos/todosLoaded
    📝 logger: ⟵ todos/todosLoaded (changed: todos)
        🖼  TodoList renders
        🖼  TodoListItem #1 renders
        🖼  TodoListItem #2 renders
        🖼  Footer renders
  ┌─ 350 ms later
  │ [What needs to be done?]
  │ [x] Learn Redux <green> (✕)
  │ [ ] Build the todo app <blue> (✕)
  │ 1 item(s) left (Clear completed)
  └─

— 3. Add a todo: it is saved on the server first —
        🖼  Header renders
  ▶ saveNewTodo thunk starts (text = "Buy milk")
  🌐 server: POST /fakeApi/todos {"todo":{"text":"Buy milk"}} (answers in 300 ms)
        🖼  Header renders
  ┌─ right after Enter
  │ [What needs to be done?]
  │ [x] Learn Redux <green> (✕)
  │ [ ] Build the todo app <blue> (✕)
  │ 1 item(s) left (Clear completed)
  └─
  ▶ saveNewTodo continues after await
    📝 logger: ⟶ todos/todoAdded
    📝 logger: ⟵ todos/todoAdded (changed: todos)
        🖼  TodoList renders
        🖼  TodoListItem #1 renders
        🖼  TodoListItem #2 renders
        🖼  TodoListItem #3 renders
        🖼  Footer renders
  ┌─ 350 ms later
  │ [What needs to be done?]
  │ [x] Learn Redux <green> (✕)
  │ [ ] Build the todo app <blue> (✕)
  │ [ ] Buy milk <no color> (✕)
  │ 2 item(s) left (Clear completed)
  └─
```

### Walk-through, part 1: the timeline of one thunk

| Time | What runs | Printed |
|---|---|---|
| 0 ms | `testStore.dispatch(fetchTodos)` → thunk middleware: a function → calls `fetchTodos(dispatch, getState, undefined)` | `🔧 … FUNCTION` |
| 0 ms | `fetchTodos` starts, calls `client.get` | `▶ … starts`, `🌐 server: GET` |
| 0 ms | `await` **pauses** `fetchTodos`, which immediately returns a pending Promise. The middleware returns it, `dispatch` returns it | `dispatch returned: Promise { <pending> }` |
| 0–300 ms | nothing runs: the demo is waiting at `await promise` | |
| 300 ms | the server answers; `fetchTodos` **continues after `await`** | `▶ … continues` |
| 300 ms | `dispatch(todosLoaded)`: this `dispatch` is the whole chain, so the object enters the thunk middleware **again** → `next` → logger → reducer | `🔧 … OBJECT`, `📝 ⟶`, `📝 ⟵` |
| 300 ms | `fetchTodos` ends, its Promise resolves, the demo's `await promise` continues | `todos in the store: …` |

The important line is `dispatch returned: Promise { <pending> }`. It is printed **before** the server answered:
`dispatch` is still synchronous (lecture 05); what it started just isn't finished yet.

The call stack at the deepest point, 300 ms in, when the reducer runs (the top is the function running now; each
line waits for the one above it):

```text
rootReducer(state, todosLoaded)        ← computes the new state
store's real dispatch                  ← (end of the chain)
logger's (action) =>                   ← printed "⟶", waiting in next()
thunk middleware's (action) =>         ← printed "OBJECT → next()", waiting in next()
fetchTodos (after await)               ← on the line dispatch({ type: 'todos/todosLoaded', … })
```

`fetchTodos` is at the **bottom**: the code that dispatched the thunk at 0 ms finished long ago. After an `await`,
a function continues on a fresh, short stack.

### Walk-through, parts 2 and 3

- **Part 2.** `renderApp` dispatched `fetchTodos` first (`▶`, `🌐`), then React drew the app with the state it had:
  no todos. That's the screen "while the server is answering". 300 ms later, `todosLoaded` replaced the list:
  `TodoList`, both items and `Footer` re-rendered (the count went from 0 to 1). `Header` didn't: it selects nothing.
- **Part 3.** Enter → `dispatch(saveNewTodo('Buy milk'))`: the thunk started and sent the POST. `setText('')`
  re-rendered `Header`. The screen right after Enter still has 2 todos: **nothing is added until the server has
  answered**. 300 ms later, the thunk dispatched `todoAdded` with the saved todo, id `3` chosen by the server.

Between Enter and the answer, the user sees no sign that something is happening. Lecture 11 adds a loading state.

### A note on earlier demos

Step 09.3 changed what `todoAdded`'s payload means. The demos of lectures 03–08 dispatch `todoAdded` with a text,
so they no longer type-check, and running them gives different output than in their lectures. Each demo shows the
project as it was at the end of its lecture.

## The whole picture

```text
Header: dispatch(saveNewTodo('Buy milk'))
          │            └─ thunk creator: returns an AppThunk that remembers 'Buy milk'
          ▼
   thunk middleware ── a function? ── yes ──► call thunk(dispatch, getState, extra)
          │                                       ├─ client.post(...)      🌐
          │ no (an object)                        ├─ await ··· 300 ms ··· (dispatch already returned a Promise)
          ▼                                       └─ dispatch({ type: 'todos/todoAdded', payload: savedTodo })
       logger ──► reducer ──► new state ──► subscribers ──► React re-renders          │
          ▲                                                                            │
          └───────────────────── enters the chain again, from the top ◄────────────────┘
```

## Summary

| Term | What it is, in one line |
|---|---|
| **async logic** | code that starts something and gets the result later (server calls, timers) |
| **thunk** | a function you dispatch; receives `(dispatch, getState)`; can wait, then dispatch real actions |
| **thunk middleware** | the middleware that calls functions instead of passing them on; `dispatch` returns what the thunk returns |
| **thunk creator** | a function that takes arguments and returns a thunk (which remembers them: a closure) |
| **`redux-thunk`** | the library providing the thunk middleware (`thunk`, `withExtraArgument`) |
| **`ThunkAction`** | redux-thunk's type for a thunk: `(dispatch, getState, extra) => ReturnType` |
| **`AppThunk`** | our alias: `ThunkAction<ReturnType, RootState, unknown, RootAction>` |

**Next lecture:** [10-action-creators-and-selectors](10-action-creators-and-selectors.md): no more hand-typed
action objects, filtered lists, and stopping the "every item re-renders" problem with memoized selectors.
