# Lecture 11. Loading state, normalized data, errors and race conditions

> **By the end you can:** track a request's progress in the state; store items by id and explain why; change the
> state's shape without touching a single component; wait for a thunk in a component and handle its failure;
> explain and fix the "late answer overwrites newer data" bug.
> **New terms in this lesson:** loading status, normalized state, entities, `Record`, race condition, request id
> **You should already know:** thunks, thunk creator, `AppThunk`, `dispatch` returns what the thunk returns
> ([09](09-async-logic-and-thunks.md)); action creators, memoized selectors ([10](10-action-creators-and-selectors.md))
> **Project files you fill in:** `src/features/todos/todosSlice.ts` (changes), `src/ui/TodoList.tsx` (change),
> `src/ui/Header.tsx` (change), `demos/11-loading-state-and-normalized-data.tsx` (🧩 11.6)

This lecture rewrites the todos slice once, to add four standard patterns from the Redux docs. Each section shows
the problem, then its part of the new code.

## 1. Loading status: the state knows a request is running

Lecture 09 ended with a problem: between "the app starts" and "the server answered", the screen shows "0 item(s)
left", as if the user had no todos. The UI can't tell "no todos" from "not loaded yet", because the state doesn't
say.

The fix: store the request's progress in the slice. A **loading status** is a field with a few named values,
for example `'idle'` (nothing running) and `'loading'` (a request is running). In TypeScript it's a union of string
literals: `status: 'idle' | 'loading'`. One field with named values is better than several booleans (`isLoading`,
`isLoaded`…): with booleans, impossible combinations like "loading and loaded" can exist.

```text
{ status: 'idle', … }  →  dispatch(todosLoading(…))  →  { status: 'loading', … }  →  todosLoaded → 'idle'
```

## 2. Normalized state: items stored by id

Our todos are an array. To toggle todo #2, the reducer does `state.map(…)` over **every** todo to find it;
`selectTodoById` does `find` over every todo. With thousands of items, and dozens of lookups per render, that adds
up. And if the same item appears in two lists, keeping two copies in sync is the lecture 01 bug again.

**Normalized state** means: each item is stored **once**, in an object keyed by its id. That object is usually
called **`entities`**:

```ts
// array                                      // normalized
[                                             {
  { id: 1, text: 'Learn Redux', … },            1: { id: 1, text: 'Learn Redux', … },
  { id: 2, text: 'Build the todo app', … },     2: { id: 2, text: 'Build the todo app', … },
]                                             }
```

Its type is `Record<number, Todo>`: **`Record<K, V>`** is a built-in type for "an object whose keys are of type
`K` and whose values are of type `V`".

Finding todo #2 is `entities[2]`: no loop. Updating it copies the `entities` object (a shallow copy of one level)
and one todo, instead of mapping over the whole list. Anything that needs "a list" computes it with a memoized
selector.

## 3. Race condition: an old answer arrives last

Suppose the user clicks "Refresh" twice. Two requests start: #2, then #3. The network is unpredictable: #3 might
answer first, and #2 (whose data is older) last. With our current reducer, whatever arrives last wins, so the
screen ends with the **older** data. A bug that depends on which of two things finishes first is called a **race
condition**.

The fix: give each request a number, a **request id**. `todosLoading` stores the id of the latest request in the
state; `todosLoaded` carries the id of the request it answers, and the reducer **ignores** an answer whose id isn't
the latest one. (`fetchTodos` computes the next id with `getState()`: the first time a thunk needs `getState`.)

## 4. The new todos slice

### Build step 11.1: the new state type, initial state and reducer

In `src/features/todos/todosSlice.ts`, replace `TodosState` and `initialState` (from step 03.1) with:

```ts
export interface TodosState {
  status: 'idle' | 'loading';
  requestId: number; // the id of the latest fetchTodos request
  entities: Record<number, Todo>; // { [id]: todo }
}

const initialState: TodosState = {
  status: 'idle',
  requestId: 0,
  entities: {},
};
```

In `TodosAction`, replace the `todosLoaded` line with these two:

```ts
  | { type: 'todos/todosLoading'; payload: number }
  | { type: 'todos/todosLoaded'; payload: { requestId: number; todos: Todo[] } }
```

And replace the whole `todosReducer` function with:

```ts
export function todosReducer(state: TodosState = initialState, action: TodosAction): TodosState {
  switch (action.type) {
    case 'todos/todosLoading':
      return { ...state, status: 'loading', requestId: action.payload };
    case 'todos/todosLoaded': {
      const { requestId, todos } = action.payload;
      if (requestId !== state.requestId) return state; // an older request answered late: ignore it
      const entities: Record<number, Todo> = {};
      for (const todo of todos) entities[todo.id] = todo;
      return { ...state, status: 'idle', entities };
    }
    case 'todos/todoAdded': {
      const todo = action.payload;
      return { ...state, entities: { ...state.entities, [todo.id]: todo } };
    }
    case 'todos/todoToggled': {
      const todo = state.entities[action.payload];
      return { ...state, entities: { ...state.entities, [todo.id]: { ...todo, completed: !todo.completed } } };
    }
    case 'todos/colorSelected': {
      const { todoId, color } = action.payload;
      const todo = state.entities[todoId];
      return { ...state, entities: { ...state.entities, [todoId]: { ...todo, color } } };
    }
    case 'todos/todoDeleted': {
      const entities = { ...state.entities };
      delete entities[action.payload]; // fine: `entities` is our own fresh copy
      return { ...state, entities };
    }
    case 'todos/completedCleared': {
      const entities = { ...state.entities };
      for (const todo of Object.values(entities)) {
        if (todo.completed) delete entities[todo.id];
      }
      return { ...state, entities };
    }
    default:
      return state;
  }
}
```

What each case does:
- `todosLoading`: status becomes `'loading'`, and the payload (the request's id) becomes the latest request id.
- `todosLoaded`: the payload is now `{ requestId, todos }`. If the answer isn't for the latest request, it returns
  the **same** state: nothing changes, nobody re-renders. Otherwise it builds `entities` from the array (the array
  came from the server, so this is a brand-new object) and goes back to `'idle'`.
- `todoAdded`, `todoToggled`, `colorSelected`: copy `state`, copy `entities`, replace one todo. Three levels
  copied on the path to the change (lecture 02); every other todo is shared.
  `{ ...state.entities, [todo.id]: todo }` uses a **computed key**: `[todo.id]` means "the key whose name is the
  value of `todo.id`".
- `todoDeleted`, `completedCleared`: `delete` is a mutation, but it's applied to `entities`, a copy we just made
  and nobody else has seen. Mutating your own fresh copy inside the reducer is allowed; mutating the **state you
  received** is not.
- Changing `TodosState` made TypeScript check every case against the new shape: a case still returning an array
  would be a compile error.

### Build step 11.2: the action creators that changed

In the action creators (step 10.1), replace `todosLoaded` and add `todosLoading`:

```ts
export const todosLoading = (requestId: number): TodosAction => ({ type: 'todos/todosLoading', payload: requestId });
export const todosLoaded = (requestId: number, todos: Todo[]): TodosAction => ({
  type: 'todos/todosLoaded',
  payload: { requestId, todos },
});
```

### Build step 11.3: `fetchTodos` with a request id

Replace the `fetchTodos` thunk with:

```ts
export const fetchTodos: AppThunk<Promise<void>> = async (dispatch, getState) => {
  const requestId = getState().todos.requestId + 1;
  console.log(`  ▶ fetchTodos #${requestId} starts`);
  dispatch(todosLoading(requestId));
  const response = await client.get('/fakeApi/todos');
  console.log(`  ▶ fetchTodos #${requestId} continues after await`);
  dispatch(todosLoaded(requestId, response.todos));
};
```

What it does: reads the latest request id from the state (`getState()` returns a `RootState`, typed by `AppThunk`),
adds 1, and **remembers** it in a local variable. The `await` pauses the thunk, but `requestId` keeps its value for
this call. Each call of `fetchTodos` has its own `requestId`. When the answer comes, the action says which request
it answers, and the reducer compares.

### Build step 11.4: the selectors adapt, the components don't

The state's shape changed (`state.todos` is no longer an array), but the components never read `state.todos`
directly: they use selectors (lecture 07). So only the selectors change.

Replace `selectTodos` (from step 07.1) and `selectTodoById` (from step 10.4) with:

```ts
const selectTodoEntities = (state: RootState) => state.todos.entities;

export const selectTodos = createSelector([selectTodoEntities], (entities) => Object.values(entities));

export const selectTodoById = (state: RootState, todoId: number): Todo | undefined =>
  selectTodoEntities(state)[todoId];

export const selectTodosStatus = (state: RootState) => state.todos.status;
```

What each part does:
- `selectTodoEntities` picks the `entities` object. Not exported: other files use the selectors below.
- `selectTodos` is now **memoized**: `Object.values` builds a new array, so without memoization it would return a
  new array on every call (the problem of lecture 10). It recomputes only when `entities` is a new object. It still
  returns a `Todo[]`, ordered by id (JavaScript orders integer keys numerically).
- `selectTodoById` is now a lookup, `entities[todoId]`: no loop. The return type is written out as
  `Todo | undefined`: TypeScript types `entities[todoId]` as `Todo`, but an id that isn't there gives `undefined`
  at runtime, and `TodoListItem` must keep handling that.
- `selectTodosStatus` gives the UI the loading status.
- `createSelector` is already imported at the top of the file (step 10.4).

`selectRemainingCount`, `selectFilteredTodos` and `selectFilteredTodoIds` call `selectTodos`, which still returns
a `Todo[]`, so they keep working unchanged, and so do the components.

## 5. Showing the loading status

### Build step 11.5a: `TodoList` shows "Loading…"

Replace the whole content of `src/ui/TodoList.tsx` with:

```tsx
import { shallowEqual, useAppSelector } from '../app/redux-bindings';
import { selectFilteredTodoIds, selectTodosStatus } from '../features/todos/todosSlice';
import { TodoListItem } from './TodoListItem';

export function TodoList() {
  const todoIds = useAppSelector(selectFilteredTodoIds, shallowEqual);
  const status = useAppSelector(selectTodosStatus);
  console.log('        🖼  TodoList renders');

  return (
    <section>
      {status === 'loading' && <p>Loading…</p>}
      <ul>
        {todoIds.map((todoId) => (
          <TodoListItem key={todoId} id={todoId} />
        ))}
      </ul>
    </section>
  );
}
```

While a request runs, "Loading…" appears above the list. The list stays visible during a refresh.

## 6. Waiting for a thunk in a component

When the user presses Enter, `Header` empties the input immediately, even if the save then fails: the text is
lost. And nothing shows that a save is running. `Header` must **wait** for the save, and know whether it worked.

Lecture 09 gave us the tool: the thunk middleware returns whatever the thunk returns, and `saveNewTodo(text)` is an
`AppThunk<Promise<void>>`. So `dispatch(saveNewTodo(text))` returns a `Promise<void>` that:
- **resolves** when the thunk finishes;
- **rejects** if the thunk throws, which happens when `await client.post(…)` rejects (the server failed).

The component can `await` it, in a `try`/`catch`. Where does "saving" and the error message live? Only `Header`
uses them, so they're **component state** (lecture 08), not Redux state.

### Build step 11.5b: `Header` waits and handles errors

Replace the whole content of `src/ui/Header.tsx` with:

```tsx
import { useState, type KeyboardEvent } from 'react';
import { useAppDispatch } from '../app/redux-bindings';
import { saveNewTodo } from '../features/todos/todosSlice';

export function Header() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  console.log('        🖼  Header renders');

  async function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const trimmed = text.trim();
    if (event.key === 'Enter' && trimmed) {
      setStatus('saving');
      setError(null);
      try {
        await dispatch(saveNewTodo(trimmed)); // waits until the thunk has finished
        setText(''); // only after a successful save
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err)); // the save failed: keep the text, show why
      } finally {
        setStatus('idle');
      }
    }
  }

  return (
    <header>
      <input
        placeholder="What needs to be done?"
        value={text}
        disabled={status === 'saving'}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      {status === 'saving' && <p>Saving…</p>}
      {error && <p>❌ {error}</p>}
    </header>
  );
}
```

What changed:
- `status` and `error`: component state for "a save is running" and "the last save failed, because…".
  `useState<'idle' | 'saving'>('idle')` gives the type explicitly: inferred from `'idle'` alone, it would be just
  `string`. `useState<string | null>(null)`: inferred from `null` alone, it could never hold a message.
- `handleKeyDown` is `async`: `await dispatch(saveNewTodo(trimmed))` waits for the thunk. The thunk is unchanged:
  it doesn't catch errors, so a server failure makes its Promise reject, and `catch` here receives the error.
- `catch (err)`: in strict TypeScript, `err` is `unknown` (anything can be thrown). `err instanceof Error` narrows
  it to an `Error` before reading `.message`.
- The text is emptied **only** after a successful save; on failure it stays, and the error is shown.
- `disabled` stops the user from editing (or pressing Enter again) while saving.
- This only works because every layer **returns** what it got: the thunk middleware returns the thunk's Promise.
  A middleware that forgot `return next(action)` (lecture 06) would make `dispatch` return `undefined` at runtime,
  and `await` would continue immediately, before the save finished; TypeScript would still believe it's a Promise.

## Build step 11.6: the demo

Open `demos/11-loading-state-and-normalized-data.tsx`. Replace the placeholder `🧩 11.6` with:

```tsx
// Lecture 11 demo: loading status, normalized state, a failed save, a race between two requests.
import { rootElement, find, typeText, pressEnter, wait, inAct, printScreen } from '../src/debug/testDom';
import { server } from '../src/api/client';
import { store } from '../src/app/store';
import { fetchTodos } from '../src/features/todos/todosSlice';
import { renderApp } from '../src/main';

console.log('— 1. Loading, then a normalized state —');
await inAct(() => renderApp(rootElement));
printScreen('loading');
await wait(350);
console.log('  state.todos =', JSON.stringify(store.getState().todos));
printScreen('loaded');

console.log('\n— 2. A save that fails —');
server.failNextPost();
const input = find<HTMLInputElement>('input');
await typeText(input, 'Buy milk');
await pressEnter(input);
printScreen('while saving');
await wait(350);
printScreen('after the failure');

console.log('\n— 3. Press Enter again —');
await pressEnter(input);
await wait(350);
printScreen('after the success');

console.log('\n— 4. Two refreshes: the first answer arrives LAST —');
server.setNextLatencies([600, 100]);
await inAct(() => {
  store.dispatch(fetchTodos);
  store.dispatch(fetchTodos);
});
await wait(200);
console.log('  … 200 ms: request #3 answered, request #2 still on its way');
await wait(500);
console.log('  state.todos.requestId =', store.getState().todos.requestId, '| status =', store.getState().todos.status);
```

`server.failNextPost()` and `server.setNextLatencies([600, 100])` are knobs of the fake server: the next POST fails
with a 500 error; the next two requests take 600 ms and 100 ms.

## Run it

```bash
npm run lesson 11
```

Expected output (not run):

```text
— 1. Loading, then a normalized state —
  ▶ fetchTodos #1 starts
    📝 logger: ⟶ todos/todosLoading
    📝 logger: ⟵ todos/todosLoading (changed: todos)
  🌐 server: GET /fakeApi/todos (answers in 300 ms)
        🖼  Header renders
      🧠 selectFilteredTodos recomputes
        🖼  TodoList renders
        🖼  Footer renders
  ┌─ loading
  │ [What needs to be done?]
  │ Loading…
  │ 0 item(s) left (• all)(active)(completed) (Clear completed)
  └─
  ▶ fetchTodos #1 continues after await
    📝 logger: ⟶ todos/todosLoaded
      🧠 selectFilteredTodos recomputes
    📝 logger: ⟵ todos/todosLoaded (changed: todos)
        🖼  TodoList renders
        🖼  TodoListItem #1 renders
        🖼  TodoListItem #2 renders
        🖼  Footer renders
  state.todos = {"status":"idle","requestId":1,"entities":{"1":{"id":1,"text":"Learn Redux","completed":true,"color":"green"},"2":{"id":2,"text":"Build the todo app","completed":false,"color":"blue"}}}
  ┌─ loaded
  │ [What needs to be done?]
  │ [x] Learn Redux <green> (✕)
  │ [ ] Build the todo app <blue> (✕)
  │ 1 item(s) left (• all)(active)(completed) (Clear completed)
  └─

— 2. A save that fails —
        🖼  Header renders
  ▶ saveNewTodo thunk starts (text = "Buy milk")
  🌐 server: POST /fakeApi/todos {"todo":{"text":"Buy milk"}} (answers in 300 ms)
        🖼  Header renders
  ┌─ while saving
  │ [Buy milk]
  │   Saving…
  │ [x] Learn Redux <green> (✕)
  │ [ ] Build the todo app <blue> (✕)
  │ 1 item(s) left (• all)(active)(completed) (Clear completed)
  └─
        🖼  Header renders
  ┌─ after the failure
  │ [Buy milk]
  │   ❌ 500: the server could not save the todo
  │ [x] Learn Redux <green> (✕)
  │ [ ] Build the todo app <blue> (✕)
  │ 1 item(s) left (• all)(active)(completed) (Clear completed)
  └─

— 3. Press Enter again —
  ▶ saveNewTodo thunk starts (text = "Buy milk")
  🌐 server: POST /fakeApi/todos {"todo":{"text":"Buy milk"}} (answers in 300 ms)
        🖼  Header renders
  ▶ saveNewTodo continues after await
    📝 logger: ⟶ todos/todoAdded
      🧠 selectFilteredTodos recomputes
    📝 logger: ⟵ todos/todoAdded (changed: todos)
        🖼  Header renders
        🖼  TodoList renders
        🖼  TodoListItem #1 renders
        🖼  TodoListItem #2 renders
        🖼  TodoListItem #3 renders
        🖼  Footer renders
  ┌─ after the success
  │ [What needs to be done?]
  │ [x] Learn Redux <green> (✕)
  │ [ ] Build the todo app <blue> (✕)
  │ [ ] Buy milk <no color> (✕)
  │ 2 item(s) left (• all)(active)(completed) (Clear completed)
  └─

— 4. Two refreshes: the first answer arrives LAST —
  ▶ fetchTodos #2 starts
    📝 logger: ⟶ todos/todosLoading
    📝 logger: ⟵ todos/todosLoading (changed: todos)
  🌐 server: GET /fakeApi/todos (answers in 600 ms)
  ▶ fetchTodos #3 starts
    📝 logger: ⟶ todos/todosLoading
    📝 logger: ⟵ todos/todosLoading (changed: todos)
  🌐 server: GET /fakeApi/todos (answers in 100 ms)
        🖼  TodoList renders
        🖼  TodoListItem #1 renders
        🖼  TodoListItem #2 renders
        🖼  TodoListItem #3 renders
  ▶ fetchTodos #3 continues after await
    📝 logger: ⟶ todos/todosLoaded
      🧠 selectFilteredTodos recomputes
    📝 logger: ⟵ todos/todosLoaded (changed: todos)
        🖼  TodoList renders
        🖼  TodoListItem #1 renders
        🖼  TodoListItem #2 renders
        🖼  TodoListItem #3 renders
  … 200 ms: request #3 answered, request #2 still on its way
  ▶ fetchTodos #2 continues after await
    📝 logger: ⟶ todos/todosLoaded
    📝 logger: ⟵ todos/todosLoaded (changed: nothing)
  state.todos.requestId = 3 | status = idle
```

Walk-through:
- **Part 1.** `fetchTodos` read `requestId` 0 from the state and used `#1`. It dispatched `todosLoading` before
  React's first render, so the first screen says "Loading…" instead of pretending there are no todos. The
  `state.todos` line shows the normalized shape: `entities` keyed by id (JSON writes the keys as strings), the
  status back to `idle`, and the latest request id.
- **Part 2.** Enter → `Header` set `status = 'saving'` and dispatched the thunk; the screen shows the text still in
  the input, and "Saving…". The fake server failed: `client.post` rejected, so `await client.post(…)` inside the
  thunk threw, the thunk's Promise rejected, and `await dispatch(…)` in `Header` threw into its `catch`. `Header`
  re-rendered with the error, and **the text is still there**. No action was dispatched: the state didn't change,
  so nothing else re-rendered.
- **Part 3.** The same text saved successfully: `todoAdded`, then `Header`'s `await` continued, emptied the input
  and went back to `idle`. React drew everything in one pass. The new todo got id 3 (the failed POST didn't use an
  id).
- **Part 4, the race.** Both refreshes started at once: #2 (600 ms), then #3 (100 ms). Each `todosLoading` set the
  latest request id: 2, then 3. `TodoList` re-rendered (status `'loading'`) and, being the parent, re-rendered the
  three items. At 100 ms, #3 answered: its id is the latest, so the reducer used it (new todo objects from the
  server, so every item re-rendered). At 600 ms, #2 answered **last**: `requestId 2 !== 3`, so the reducer returned
  the same state: `changed: nothing`, and no component re-rendered. Without the check, the older answer would have
  overwritten the newer one.

## The whole picture

```text
state.todos: TodosState = { status, requestId, entities: { 1: {…}, 2: {…} } }
                              │         │          └─ normalized (Record<number, Todo>): lookups are entities[id];
                              │         │             lists come from memoized selectors
                              │         └─ the latest fetch; late answers with another id are ignored
                              └─ 'loading' while a fetch runs → TodoList shows "Loading…"

Header:  await dispatch(saveNewTodo(text))           (AppThunk<Promise<void>> → dispatch returns Promise<void>)
            ├─ resolves → empty the input
            └─ rejects  → keep the text, show ❌

components ──► selectors ──► state       (the shape changed; only the selectors had to change)
```

## Summary

| Term | What it is, in one line |
|---|---|
| **loading status** | one field with named values (`'idle' \| 'loading'`) describing a request's progress |
| **normalized state** | each item stored once, in an object keyed by id |
| **entities** | the conventional name of that `{ [id]: item }` object |
| **`Record<K, V>`** | TypeScript's type for an object with keys of type `K` and values of type `V` |
| **race condition** | a bug that depends on which of two things finishes first |
| **request id** | a number given to each request, so the reducer can ignore answers to outdated requests |

**Next lecture:** [12-the-full-picture](12-the-full-picture.md): one interaction traced end to end through every
layer, with the call stack at each moment, and a map of what Redux Toolkit automates.
