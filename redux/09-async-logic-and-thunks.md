# Lecture 09. Async logic and thunks: code that waits for a server

> **By the end you can:** explain why async code can't go in reducers or actions; build the thunk middleware in
> four lines; write thunks and thunk creators that load and save data; trace a thunk from `dispatch` through
> `await` to the reducer; use `redux-thunk`.
> **New terms in this lesson:** async logic, thunk, thunk middleware, thunk creator, `redux-thunk`
> **You should already know:** side effect, pure function ([03](03-actions-and-reducers.md)); `dispatch` is
> synchronous, closure ([05](05-the-store.md)); middleware, `next`, `storeAPI` ([06](06-middleware-and-enhancers.md));
> `useDispatch` ([08](08-react-redux.md)); JavaScript Promises and `async`/`await`
> **Project files you fill in:** `src/from-scratch/thunkMiddleware.js` (🧩 09.1), `src/app/store.js` (change),
> `src/features/todos/todosSlice.js` (change + 🧩 09.4), `src/ui/Header.jsx` (change), `src/main.jsx` (change),
> `demos/09-async-logic-and-thunks.jsx` (🧩 09.8)

## 1. The project's fake server

Until now the todos lived only in memory. Real apps keep data on a server. The project gives you one, already
written: `src/api/client.js` (not part of the course). It behaves like an HTTP API:

| Call | What the "server" does | Resolves to |
|---|---|---|
| `client.get('/fakeApi/todos')` | returns every todo | `{ todos: [...] }` |
| `client.post('/fakeApi/todos', { todo: { text } })` | saves a new todo, **the server chooses the id** | `{ todo: { id, text, completed: false, color: '' } }` |

Both return a Promise that resolves after **300 ms**, and print a `🌐 server:` line when called. The server starts
with two todos: `#1 Learn Redux` (completed, green) and `#2 Build the todo app` (blue).

## 2. The problem: where does code that waits go?

**Async logic** is code that starts something and gets the result **later**: a server request, a timer, reading a
file. In JavaScript it's written with Promises and `async`/`await`.

To add a todo, we must now: send the text to the server, **wait**, then put the saved todo (with its id) in the
state. Where can this code go?

- **Not in a reducer.** A reducer must be pure, with no side effects (lecture 03), and `dispatch` uses its result
  immediately (lecture 05): it can't wait.
- **Not in an action.** An action is a plain object: a description. It can't run code.
- **In the component?**

### Naive version: in the component

```js
async function handleKeyDown(event) {
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

Open `src/from-scratch/thunkMiddleware.js`. Replace the placeholder `🧩 09.1` with:

```js
// Our own version of redux-thunk, to see how it works.
export const thunkMiddleware = (storeAPI) => (next) => (action) => {
  if (typeof action === 'function') {
    console.log(`   🔧 thunk middleware: a FUNCTION → calling it`);
    return action(storeAPI.dispatch, storeAPI.getState);
  }
  console.log(`   🔧 thunk middleware: an OBJECT (${action.type}) → next()`);
  return next(action);
};
```

What each part does:
- It's a middleware: three nested functions (lecture 06).
- `typeof action === 'function'`: the thunk is called with `storeAPI.dispatch` and `storeAPI.getState`. It does
  **not** call `next`: a function never reaches the reducer.
- `return action(…)`: whatever the thunk returns becomes the return value of `store.dispatch(thunk)`. An `async`
  thunk returns a Promise, so `dispatch(thunk)` returns that Promise. Lecture 11 uses this.
- `storeAPI.dispatch` is the **whole chain** (lecture 06, `applyMiddleware`). So when the thunk later dispatches a
  normal action, that action goes through the thunk middleware again (as an OBJECT this time), then the logger,
  then the reducer.
- The two `🔧` log lines are there for the course, to show which way each value goes.

### Build step 09.2: the store uses it

Replace the whole content of `src/app/store.js` with:

```js
import { legacy_createStore as createStore, applyMiddleware } from 'redux';
import { rootReducer } from './rootReducer.js';
import { logger } from './middleware/logger.js';
import { thunkMiddleware } from '../from-scratch/thunkMiddleware.js';

export const store = createStore(rootReducer, applyMiddleware(thunkMiddleware, logger));
```

The thunk middleware comes **first**: it's the outermost layer, so it sees everything first, and functions stop
there. The logger only ever sees real actions (it reads `action.type`, which a function doesn't have).

## 4. Loading the todos from the server

### Build step 09.3: the reducer learns two changes

In `src/features/todos/todosSlice.js`, two changes to `todosReducer`:

1. A new case, `'todos/todosLoaded'`: the payload is the array of todos from the server; it **replaces** the list.
2. `'todos/todoAdded'` changes meaning: the payload is no longer a text, it's the **saved todo** returned by the
   server, with its id. The reducer just appends it. The server chooses ids now, so `nextTodoId` is no longer
   needed: delete that function.

Old lines:

```js
    case 'todos/todoAdded':
      return [...state, { id: nextTodoId(state), text: action.payload, completed: false, color: '' }];
```

New lines:

```js
    case 'todos/todosLoaded':
      return action.payload;
    case 'todos/todoAdded':
      return [...state, action.payload];
```

Why `return action.payload` is fine for `todosLoaded`: the server's array is a brand-new array (it arrived over
the "network"), so it is already a new reference, and nobody else holds it.

### Build step 09.4: the thunks

In the same file, replace the placeholder `🧩 09.4` with:

```js
export async function fetchTodos(dispatch, getState) {
  console.log('  ▶ fetchTodos thunk starts');
  const response = await client.get('/fakeApi/todos');
  console.log('  ▶ fetchTodos continues after await');
  dispatch({ type: 'todos/todosLoaded', payload: response.todos });
}

export function saveNewTodo(text) {
  return async function saveNewTodoThunk(dispatch, getState) {
    console.log(`  ▶ saveNewTodo thunk starts (text = "${text}")`);
    const response = await client.post('/fakeApi/todos', { todo: { text } });
    console.log('  ▶ saveNewTodo continues after await');
    dispatch({ type: 'todos/todoAdded', payload: response.todo });
  };
}
```

And add this import at the top of the file:

```js
import { client } from '../../api/client.js';
```

What each part does:
- **`fetchTodos`** is a thunk: a function of `(dispatch, getState)`. You dispatch the function itself:
  `store.dispatch(fetchTodos)`, without `()`. It asks the server, waits, then dispatches a normal action with the
  result.
- **`saveNewTodo`** is different: it needs an argument, the text. But the thunk middleware always calls a thunk
  with `(dispatch, getState)`; there's no slot for our own arguments. So `saveNewTodo(text)` doesn't save anything:
  it **builds and returns** a thunk. The returned function remembers `text` (a closure). A function that returns a
  thunk is called a **thunk creator** (the thunk version of "a function that builds an action").
- `dispatch(saveNewTodo('Buy milk'))`: JavaScript runs `saveNewTodo('Buy milk')` first, which returns the thunk;
  then `dispatch` receives that function, and the thunk middleware calls it.
- Both thunks only dispatch **after** the server answered. The reducer stays pure; the waiting happens in the thunk.
- `getState` is unused here; lecture 11 uses it.

## 5. Using the thunks from the UI

### Build step 09.5: `Header` dispatches `saveNewTodo`

In `src/ui/Header.jsx`, add the import:

```js
import { saveNewTodo } from '../features/todos/todosSlice.js';
```

and in `handleKeyDown`, replace:

```js
      dispatch({ type: 'todos/todoAdded', payload: trimmed });
```

with:

```js
      dispatch(saveNewTodo(trimmed));
```

`Header` no longer knows anything about the server: it dispatches "save this text", and the thunk does the rest.

### Build step 09.6: load the todos when the app starts

In `src/main.jsx`, add the import:

```js
import { fetchTodos } from './features/todos/todosSlice.js';
```

and make `store.dispatch(fetchTodos);` the **first line** of `renderApp`:

```jsx
export function renderApp(container) {
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

## 6. The real thing: `redux-thunk`

Our middleware without the log lines **is** redux-thunk. The library's whole source is about this:

```js
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
> const thunk: Middleware;  // pass it to applyMiddleware, usually first
> // a thunk you dispatch has this shape:
> type Thunk = (dispatch: Dispatch, getState: () => RootState, extraArgument?: unknown) => any;
> ```
>
> **What it does, step by step:** for each dispatched value: 1. function? call it with `(dispatch, getState,
> extraArgument)` and return what it returns; 2. otherwise call `next(action)` and return that.
>
> **What our project passes / gets back:** `applyMiddleware(thunk, logger)`; `store.dispatch(fetchTodos)` returns
> the Promise of the `async` function.
>
> **`withExtraArgument(value)`** creates the same middleware but passes `value` as the thunk's third argument,
> for example an API client, so thunks don't import it and tests can pass a fake one. We don't need it.
>
> **If you left it out:** `store.dispatch(fetchTodos)` would reach the store's real dispatch, which throws "Actions
> must be plain objects…" (lecture 05).

### Build step 09.7: switch to `redux-thunk`

In `src/app/store.js`, replace:

```js
import { thunkMiddleware } from '../from-scratch/thunkMiddleware.js';

export const store = createStore(rootReducer, applyMiddleware(thunkMiddleware, logger));
```

with:

```js
import { thunk } from 'redux-thunk';

export const store = createStore(rootReducer, applyMiddleware(thunk, logger));
```

The app's store now uses the real library (which prints no `🔧` lines). The demo's part 1 still uses our version,
to show the 🔧 lines.

## Build step 09.8: the demo

Open `demos/09-async-logic-and-thunks.jsx`. Replace the placeholder `🧩 09.8` with:

```jsx
// Lecture 09 demo: thunks, from dispatch through await to the reducer.
import { rootElement, find, typeText, pressEnter, wait, inAct, printScreen } from '../src/debug/testDom.js';
import { legacy_createStore, applyMiddleware } from 'redux';
import { thunkMiddleware } from '../src/from-scratch/thunkMiddleware.js';
import { rootReducer } from '../src/app/rootReducer.js';
import { logger } from '../src/app/middleware/logger.js';
import { fetchTodos } from '../src/features/todos/todosSlice.js';
import { renderApp } from '../src/main.jsx';

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
const input = find('input');
await typeText(input, 'Buy milk');
await pressEnter(input);
printScreen('right after Enter');
await wait(350);
printScreen('350 ms later');
```

Part 1 builds a separate store with **our** thunk middleware (to see the 🔧 lines). Parts 2 and 3 use the app.
`wait(350)` lets 350 ms pass, enough for the fake server's 300 ms.

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
| 0 ms | `testStore.dispatch(fetchTodos)` → thunk middleware: a function → calls `fetchTodos(dispatch, getState)` | `🔧 … FUNCTION` |
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

Step 09.3 changed what `todoAdded`'s payload means. The demos of lectures 03–08 dispatch `todoAdded` with a text, so
running them now gives different output than in their lectures. Each demo shows the project as it was at the end
of its lecture.

## The whole picture

```text
Header: dispatch(saveNewTodo('Buy milk'))
          │            └─ thunk creator: returns a thunk that remembers 'Buy milk'
          ▼
   thunk middleware ── a function? ── yes ──► call thunk(dispatch, getState)
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

**Next lecture:** [10-action-creators-and-selectors](10-action-creators-and-selectors.md): no more hand-typed
action objects, filtered lists, and stopping the "every item re-renders" problem with memoized selectors.
