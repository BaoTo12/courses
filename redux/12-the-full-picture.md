# Lecture 12. The full picture: one click, through every layer

> **By the end you can:** trace any interaction in a Redux app from the DOM event to the re-rendered screen, naming
> every function on the way; draw the call stack at the deepest moment; explain what happens during an `await`;
> list which parts of this course Redux Toolkit writes for you.
> **New terms in this lesson:** `replaceReducer`
> **You should already know:** every term of lectures 01–11 (see the [roadmap](00-roadmap.md)'s glossary)
> **Project files you fill in:** `demos/12-the-full-picture.tsx` (🧩 12.1)

Nothing new is built in this lecture. We instrument the finished app, run two interactions (one synchronous, one
that waits for the server), and read the output line by line.

## 1. How the pieces are wired, before anything runs

When `renderApp` runs for the first time, these objects are created and connected, in this order:

1. `rootReducer = combineReducers({ todos: todosReducer, filters: filtersReducer })` (lecture 04): a function that
   calls each slice reducer with its slice. `RootState` is computed from it.
2. `store = createStore(rootReducer, applyMiddleware(thunk, logger))` (lectures 05, 06, 09):
   - `applyMiddleware` (an enhancer) builds a plain store, which dispatches its init action: every slice reducer
     returns its initial state;
   - it builds the chain from the end: `loggerLayer = logger(storeAPI)(realDispatch)`, then
     `thunkLayer = thunk(storeAPI)(loggerLayer)`;
   - `store.dispatch` is `thunkLayer`; `storeAPI.dispatch` calls `store.dispatch`, so anything dispatched from
     inside a thunk starts again at the top. `AppDispatch` is that function's type: it accepts `RootAction`s and
     `AppThunk`s.
3. `<Provider store={store}>` (lecture 08) puts the store in a React context and subscribes **once** to the store.
4. Each `useAppSelector` registers its component with `Provider`'s subscription. After every dispatch, each of them
   runs its selector and compares the result.

```text
store.dispatch ═ thunkLayer ──next──► loggerLayer ──next──► realDispatch
                                                              ├─ state = rootReducer(state, action)
                                                              └─ listeners: [ …, Provider's subscription ]
                                                                                 └─ each useAppSelector: select, compare
```

## 2. The new tool: `replaceReducer`

To see the reducer and the subscribers in the output, the demo wraps the root reducer with a function that prints a
line and then calls the real one. The store has a method for exactly this.

> **API card: `store.replaceReducer` (package `redux`)**
>
> ```ts
> store.replaceReducer(nextReducer: Reducer<RootState, RootAction>): void;
> ```
>
> **What it does, step by step:** 1. the store's reducer becomes `nextReducer`; 2. it dispatches an internal action,
> `'@@redux/REPLACE'` followed by random letters, through the store's own dispatch (not through the middleware), so
> the new reducer can add any slice it needs.
>
> **What it's used for:** loading parts of an app later (a reducer for a page that wasn't loaded at startup), hot
> reloading during development, and, here, adding a log line. The new reducer must have the same state and action
> types as the old one.

## Build step 12.1: the demo

Open `demos/12-the-full-picture.tsx`. Replace the placeholder `🧩 12.1` with:

```tsx
// Lecture 12 demo: two interactions traced through every layer of the app.
import { rootElement, find, findAll, typeText, pressEnter, click, wait, inAct } from '../src/debug/testDom';
import { store } from '../src/app/store';
import { rootReducer } from '../src/app/rootReducer';
import { renderApp } from '../src/main';

// Make the two silent layers print: the root reducer and the store's subscribers.
store.replaceReducer((state, action) => {
  console.log(`      🧮 rootReducer runs for ${action.type}`);
  return rootReducer(state, action);
});
store.subscribe(() => console.log('      🔔 store notifies its subscribers'));

console.log('— Setup: load the app —');
await inAct(() => renderApp(rootElement));
await wait(350);

console.log('\n— A. A synchronous action: tick todo #2 —');
console.log('👆 click on the checkbox of todo #2');
await click(findAll('li input[type=checkbox]')[1]);
console.log('👆 click handled, React has re-rendered');

console.log('\n— B. An asynchronous action: add "Buy milk" —');
const input = find<HTMLInputElement>('input');
await typeText(input, 'Buy milk');
console.log('👆 press Enter');
await pressEnter(input);
console.log('👆 the key handler is waiting: the server has not answered yet');
await wait(350);
console.log('✅ todos now:', JSON.stringify(Object.values(store.getState().todos.entities).map((todo) => todo.text)));
```

The wrapper `(state, action) => …` needs no annotations: `replaceReducer`'s parameter type gives `state` and
`action` their types, so `action.type` and `rootReducer(state, action)` are checked.

## Run it

```bash
npm run lesson 12
```

Expected output (not run):

```text
      🧮 rootReducer runs for @@redux/REPLACEp.3.k.z.8.w
— Setup: load the app —
  ▶ fetchTodos #1 starts
    📝 logger: ⟶ todos/todosLoading
      🧮 rootReducer runs for todos/todosLoading
      🔔 store notifies its subscribers
    📝 logger: ⟵ todos/todosLoading (changed: todos)
  🌐 server: GET /fakeApi/todos (answers in 300 ms)
        🖼  Header renders
      🧠 selectFilteredTodos recomputes
        🖼  TodoList renders
        🖼  Footer renders
  ▶ fetchTodos #1 continues after await
    📝 logger: ⟶ todos/todosLoaded
      🧮 rootReducer runs for todos/todosLoaded
      🔔 store notifies its subscribers
      🧠 selectFilteredTodos recomputes
    📝 logger: ⟵ todos/todosLoaded (changed: todos)
        🖼  TodoList renders
        🖼  TodoListItem #1 renders
        🖼  TodoListItem #2 renders
        🖼  Footer renders

— A. A synchronous action: tick todo #2 —
👆 click on the checkbox of todo #2
    📝 logger: ⟶ todos/todoToggled
      🧮 rootReducer runs for todos/todoToggled
      🔔 store notifies its subscribers
      🧠 selectFilteredTodos recomputes
    📝 logger: ⟵ todos/todoToggled (changed: todos)
        🖼  TodoListItem #2 renders
        🖼  Footer renders
👆 click handled, React has re-rendered

— B. An asynchronous action: add "Buy milk" —
        🖼  Header renders
👆 press Enter
  ▶ saveNewTodo thunk starts (text = "Buy milk")
  🌐 server: POST /fakeApi/todos {"todo":{"text":"Buy milk"}} (answers in 300 ms)
        🖼  Header renders
👆 the key handler is waiting: the server has not answered yet
  ▶ saveNewTodo continues after await
    📝 logger: ⟶ todos/todoAdded
      🧮 rootReducer runs for todos/todoAdded
      🔔 store notifies its subscribers
      🧠 selectFilteredTodos recomputes
    📝 logger: ⟵ todos/todoAdded (changed: todos)
        🖼  Header renders
        🖼  TodoList renders
        🖼  TodoListItem #1 renders
        🖼  TodoListItem #2 renders
        🖼  TodoListItem #3 renders
        🖼  Footer renders
✅ todos now: ["Learn Redux","Build the todo app","Buy milk"]
```

(The letters after `@@redux/REPLACE` are random.)

The first line comes from `replaceReducer`'s internal action: it went straight to the reducer, with no logger
lines, because it doesn't pass through the middleware. The setup lines are lecture 11's part 1, with the two new
kinds of lines (🧮, 🔔) added. The two interactions are read below.

## 3. Interaction A: a synchronous action, step by step

The steps in plain words:
1. The user clicks the checkbox of todo #2.
2. React calls `TodoListItem`'s `onChange` handler, which dispatches `todoToggled(2)`.
3. The action passes through the thunk middleware (an object: `next`) and the logger (`⟶`).
4. The real dispatch runs the root reducer (`🧮`): `todosReducer` returns a new state with a new todo #2.
5. The real dispatch calls the subscribers (`🔔`): our demo's, then `Provider`'s, which makes every
   `useAppSelector` run its selector. `TodoList`'s selector recomputes the filtered list (`🧠`).
6. Control returns up the chain: the logger prints `⟵`.
7. The handler returns; React re-renders the components whose selected value changed: item #2 (new object) and
   `Footer` (count 1 → 0). `TodoList`'s ids are shallow-equal, so it doesn't re-render.

The call stack at the deepest moment, while `selectFilteredTodos` recomputes (top = the function running now; each
line is waiting for the one above it to return):

```text
selectFilteredTodos's result function        ← prints 🧠
selectFilteredTodoIds                         ← its input selector (a memoized selector)
TodoList's useAppSelector check               ← react-redux: run the selector, compare with shallowEqual
Provider's subscription                       ← notifies every useAppSelector
realDispatch: listeners.forEach(…)            ← the reducer already returned; now the subscribers
loggerLayer (action) =>                       ← printed ⟶, waiting inside next(action)
thunkLayer (action) =>                        ← an object → next(action)
TodoListItem's onChange                       ← dispatch(todoToggled(todo.id))
React's event handling                        ← turned the DOM click into onChange
the click (testDom's click helper)            ← the bottom: the first call
```

Read the printed lines against this stack: `⟶` was printed by the loggerLayer floor before it called `next`; `🧮`
by the reducer, which already returned; `🔔` by the first subscriber; `🧠` at the top. Then the stack unwinds:
the subscriber check finishes, `realDispatch` returns, the logger prints `⟵`, the thunk layer returns, the handler
returns. Only then does React re-render (the `🖼` lines come after `⟵`).

## 4. Interaction B: an asynchronous action, step by step

The steps in plain words:
1. Typing re-renders `Header` (component state).
2. Enter: `handleKeyDown` sets `status = 'saving'`, then `await dispatch(saveNewTodo('Buy milk'))`.
3. `saveNewTodo('Buy milk')` (thunk creator) returns an `AppThunk<Promise<void>>`; `dispatch` passes it to the
   thunk middleware, which calls it.
4. The thunk prints `▶`, calls `client.post` (`🌐`), and reaches `await`: it pauses and returns a pending Promise.
5. That Promise travels back down: thunk middleware → `dispatch` → `handleKeyDown`'s `await`, which pauses too.
   The handler is "finished" for now; React re-renders `Header` ("Saving…").
6. 300 ms later the server answers. The thunk continues on a **new**, short stack and dispatches
   `todoAdded(savedTodo)`, which travels the same path as interaction A.
7. The thunk finishes; its Promise resolves; `handleKeyDown` continues after its `await`: empties the input, sets
   `status = 'idle'`.
8. React re-renders in one pass: `Header`, `TodoList` (the ids changed: `[1, 2, 3]`), its three items, `Footer`.

The timeline:

| Time | Running | Printed |
|---|---|---|
| 0 ms | `handleKeyDown` → `dispatch(thunk)` → thunk middleware calls the thunk | |
| 0 ms | the thunk: `client.post` | `▶ … starts`, `🌐 server: POST` |
| 0 ms | `await` pauses the thunk → pending Promise → `handleKeyDown`'s `await` pauses → React renders | `🖼 Header` ("Saving…") |
| 0 ms | the demo's next line | `👆 the key handler is waiting…` |
| 0–300 ms | **nothing on the stack**: the page is free; the user could keep clicking | |
| 300 ms | the thunk continues after `await`, dispatches `todoAdded` | `▶ … continues`, `⟶`, `🧮`, `🔔`, `🧠`, `⟵` |
| 300 ms | the thunk ends → `handleKeyDown` continues → `setText('')`, `setStatus('idle')` | |
| 300 ms | React re-renders | `🖼` × 6 |

The call stack at the deepest moment of step 6, while the reducer runs:

```text
rootReducer (the demo's wrapper → combineReducers → todosReducer)   ← 🧮
realDispatch
loggerLayer (action) =>                     ← printed ⟶
thunkLayer (action) =>                      ← an object this time → next(action)
saveNewTodoThunk, after its await           ← dispatch(todoAdded(response.todo))
(the resolved Promise of client.post)       ← the bottom: JavaScript resumed the thunk from here
```

`handleKeyDown` is **not** on this stack: it is paused at its own `await`, waiting for the thunk's Promise. The
click that started everything ended 300 ms ago.

## 5. The whole picture

```text
                    ┌─────────────────────────── React ────────────────────────────┐
 DOM event ───────► │ handler: dispatch(actionCreator(…))  or  dispatch(thunkCreator(…))
                    └──────────────┬────────────────────────────────────────────────┘
                                   ▼                 (AppDispatch: accepts RootAction | AppThunk)
            thunkLayer ── function? ── call it ──► thunk: client.* ··· await ··· dispatch(action) ─┐
                │ object                                                                         │
                ▼                                                                                │
            loggerLayer ⟶                                    (dispatches from thunks start here) ◄┘
                │
                ▼
            realDispatch ── rootReducer ── todosReducer / filtersReducer ── new RootState (immutable)
                │
                └── subscribers ── Provider ── each useAppSelector: selector (memoized) → compare
                                                    changed → React re-renders that component
            loggerLayer ⟵ (changed: …)
```

## 6. What Redux Toolkit writes for you

Everything in this course is how Redux works. **Redux Toolkit** is the official package that writes most of it
for you, with the same ideas underneath. The next course teaches it; here is the map from what you built to what
it gives:

| You wrote by hand (lecture) | Redux Toolkit gives you |
|---|---|
| `createStore` + `applyMiddleware` + `thunk` + DevTools setup (05, 06, 09) | `configureStore`: one call, with thunk, DevTools and development checks included |
| `RootState`, `AppDispatch`, `AppThunk` types (04, 05, 09) | the same three lines, but `RootState` is read from the store and `AppDispatch` knows its middleware automatically |
| `deepFreeze` to catch mutations (02) | a development check that throws when a reducer or component mutates the state |
| action unions + action creators + a `switch` reducer (03, 10) | `createSlice`: write the reducers with a `PayloadAction<T>` type; it generates the action types and creators |
| copying every level by hand (02, 11) | Immer, inside `createSlice`: write `todo.completed = true`, it makes the copies |
| `todosLoading` / `todosLoaded` / failures by hand, request ids (09, 11) | `createAsyncThunk`: dispatches `pending` / `fulfilled` / `rejected` with a `requestId` |
| normalized `entities` + selectors (11) | `createEntityAdapter`: the reducer operations and selectors for `{ ids, entities }` |
| `createSelector` (10) | re-exported from Reselect, the same function |
| typed hooks (08) | the same `useAppSelector` / `useAppDispatch`, via `.withTypes()` |
| fetching, loading status, caching and re-fetching server data (09, 11) | RTK Query: describe the endpoints, get typed hooks that handle all of it |

## Summary

| Term | What it is, in one line |
|---|---|
| **`replaceReducer`** | swaps the store's root reducer at runtime, then dispatches an internal `@@redux/REPLACE` action |

The course in one sentence: **an event is described as a typed action; `dispatch` sends it through the middleware
to a pure reducer that returns a new state; subscribers, through selectors compared by reference, decide what to
draw again.**

**Next course:** [Redux Toolkit](../redux-toolkit/00-roadmap.md).
