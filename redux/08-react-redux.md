# Lecture 08. React-Redux: connecting React components to the store

> **By the end you can:** build `Provider`, `useSelector` and `useDispatch` yourself on top of React's own hooks;
> explain exactly when a component re-renders; build the todo app's components; switch to the real `react-redux`;
> decide what belongs in Redux and what stays in a component.
> **New terms in this lesson:** JSX and tsx, re-render, React context, `useSyncExternalStore`, `Provider`,
> `useSelector`, `useDispatch`, component state vs global state
> **You should already know:** selector, UI binding ([07](07-redux-and-a-ui.md)); store, `subscribe`
> ([05](05-the-store.md)); `===` on references ([02](02-immutability.md)); React basics: components, props,
> `useState`
> **Project files you fill in:** `src/from-scratch/reactRedux.jsx` (🧩 08.1), `src/app/redux-bindings.js` (🧩 08.2),
> `src/ui/Header.jsx`, `TodoListItem.jsx`, `TodoList.jsx`, `Footer.jsx`, `App.jsx` (🧩 08.3–08.7),
> `src/main.jsx` (🧩 08.8), `demos/08-react-redux.jsx` (🧩 08.10)

Lecture 07 connected a plain page to the store with three connections: read, dispatch, redraw. React needs the same
three. This lecture builds them with React's own tools, then swaps in the real library.

## 1. JSX, and running it with tsx

React components are usually written in **JSX**: HTML-like tags inside JavaScript (`<li>{todo.text}</li>`). Node
can't run JSX directly. The project's `npm run lesson` runs each demo with **tsx**, a tool that translates JSX (and
TypeScript) to plain JavaScript on the fly. The given `tsconfig.json` tells it to use React's JSX format. Files
containing JSX end in `.jsx`.

## 2. Re-render: when React calls a component again

A React component is a function that returns what to show. React calls it to draw the component, and calls it
**again** whenever it must draw it again. Calling a component again is a **re-render**. React re-renders a
component when:

1. its own state changes (`useState`'s setter was called with a new value);
2. its **parent** re-renders (by default, every child of a re-rendering component is re-rendered too);
3. a value it reads from outside React (like our store) has changed, and React was told so.

Point 3 is what a Redux binding must arrange: "re-render this component when the part of the store **it** uses
changes, and not otherwise". Each component in this lecture prints a `🖼 … renders` line, so the demo shows every
re-render.

## 3. React context: giving the store to every component

Many components need the store. Passing it as a prop through every level (`<App store={store}>` →
`<TodoList store={store}>` → …) is tedious, and middle components that don't use it must still pass it on.

**React context** lets a component make a value available to **all** components below it, at any depth, without
props:

```jsx
const StoreContext = createContext(null);              // 1. create a context (once)

<StoreContext.Provider value={store}>                  // 2. a component near the top provides a value
  <App />
</StoreContext.Provider>

const store = useContext(StoreContext);               // 3. any component below reads it
```

## 4. `useSyncExternalStore`: subscribing a component to a store

React has a hook made for exactly connection 3 of lecture 07: **`useSyncExternalStore`**. You give it two
functions:

```js
const value = useSyncExternalStore(subscribe, getSnapshot);
```

- `subscribe(callback)`: React calls it once and passes a callback; you must call that callback whenever the
  outside data may have changed. It must return an unsubscribe function. A Redux store's `subscribe` has exactly
  this shape.
- `getSnapshot()`: returns the current value the component uses.

What React does with them: it calls `getSnapshot()` to render; when the callback fires, it calls `getSnapshot()`
again and compares the result with the previous one using `Object.is` (which, for objects, is the same as `===`).
**Only if it's different** does it re-render the component. That's the `todos === lastTodos` check of lecture 07,
done by React.

## 5. Build the binding by hand

### Build step 08.1: `Provider`, `useDispatch`, `useSelector`

Open `src/from-scratch/reactRedux.jsx`. Replace the placeholder `🧩 08.1` with:

```jsx
// Our own version of react-redux's Provider, useSelector and useDispatch, to see how they work.
import { createContext, useContext, useSyncExternalStore } from 'react';

const StoreContext = createContext(null);

export function Provider({ store, children }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('No store found: wrap your app in <Provider store={store}>');
  return store;
}

export function useDispatch() {
  return useStore().dispatch;
}

export function useSelector(selector) {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}
```

What each part does:
- **`Provider`** is a component that puts the store into the context, so everything inside it can find the store.
- `useStore()` reads the store from the context. If a component is rendered outside a `Provider`, it throws a clear
  error instead of failing later with "cannot read properties of null".
- **`useDispatch()`** returns the store's `dispatch`: connection 2 (screen → actions).
- **`useSelector(selector)`** is connections 1 and 3 together. It subscribes the component to the store, and its
  snapshot is "the selector applied to the current state". After every dispatch, React runs the selector again and
  re-renders the component only if the selected value is a different reference.

Run it by hand: `Footer` calls `useSelector(selectRemainingCount)`, then `todoToggled` is dispatched:
1. The store runs the reducer, then calls its subscribers, including React's callback for `Footer`.
2. React calls `getSnapshot()` → `selectRemainingCount(newState)` → `0`. The last value was `1`.
3. `0 !== 1` → React schedules a re-render of `Footer`.
4. A `filters/…` action instead: the snapshot is `1` again → same → no re-render.

So the **selector decides** which store changes a component reacts to.

### Build step 08.2: one place to import the bindings from

Open `src/app/redux-bindings.js`. Replace the placeholder `🧩 08.2` with:

```js
// Where every component imports Provider / useSelector / useDispatch from.
export { Provider, useSelector, useDispatch } from '../from-scratch/reactRedux.jsx';
```

All components import from this file. In step 08.9 we change this one line to switch the whole app to the real
library.

## 6. The components

The page is four components inside `App`:

```text
App
├── Header         the input; dispatches todoAdded
├── TodoList       selects the todos; renders one TodoListItem per todo
│   └── TodoListItem × n   checkbox, text, color dropdown, delete button
└── Footer         selects the remaining count; "Clear completed" button
```

### Build step 08.3: `Header`

Open `src/ui/Header.jsx`. Replace the placeholder `🧩 08.3` with:

```jsx
import { useState } from 'react';
import { useDispatch } from '../app/redux-bindings.js';

export function Header() {
  const [text, setText] = useState('');
  const dispatch = useDispatch();
  console.log('        🖼  Header renders');

  function handleKeyDown(event) {
    const trimmed = text.trim();
    if (event.key === 'Enter' && trimmed) {
      dispatch({ type: 'todos/todoAdded', payload: trimmed });
      setText('');
    }
  }

  return (
    <header>
      <input
        placeholder="What needs to be done?"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
      />
    </header>
  );
}
```

What each part does:
- `text` is the text being typed, kept in the **component's own state** (`useState`), not in Redux. Section 8
  explains why.
- `onChange` updates `text` on every key, so `Header` re-renders on every key. Only `Header`: no other component
  uses `text`.
- On Enter with some text: dispatch `todoAdded`, then empty the input. Like the plain page of lecture 07, `Header`
  doesn't add the todo to the list itself; it reports the event, and the list re-renders because the state changed.

### Build step 08.4: `TodoListItem`

Open `src/ui/TodoListItem.jsx`. Replace the placeholder `🧩 08.4` with:

```jsx
import { useDispatch } from '../app/redux-bindings.js';

const COLORS = ['green', 'blue', 'red'];

export function TodoListItem({ todo }) {
  const dispatch = useDispatch();
  console.log(`        🖼  TodoListItem #${todo.id} renders`);

  return (
    <li>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => dispatch({ type: 'todos/todoToggled', payload: todo.id })}
      />{' '}
      {todo.text}{' '}
      <select
        value={todo.color}
        onChange={(event) =>
          dispatch({ type: 'todos/colorSelected', payload: { todoId: todo.id, color: event.target.value } })
        }
      >
        <option value=""></option>
        {COLORS.map((color) => (
          <option key={color} value={color}>
            {color}
          </option>
        ))}
      </select>{' '}
      <button onClick={() => dispatch({ type: 'todos/todoDeleted', payload: todo.id })}>✕</button>
    </li>
  );
}
```

What each part does:
- It receives the todo object as a prop from `TodoList`.
- The checkbox, the dropdown and the ✕ button each dispatch one of the actions of lecture 03, with the payload that
  action expects.
- `checked={todo.completed}` and `value={todo.color}`: what the controls show comes **from the state**. Clicking the
  checkbox doesn't tick it directly; it dispatches, the state changes, and the new render shows it ticked.
- `{' '}` puts a space between the parts, so the printed screen is readable.

### Build step 08.5: `TodoList`

Open `src/ui/TodoList.jsx`. Replace the placeholder `🧩 08.5` with:

```jsx
import { useSelector } from '../app/redux-bindings.js';
import { selectTodos } from '../features/todos/todosSlice.js';
import { TodoListItem } from './TodoListItem.jsx';

export function TodoList() {
  const todos = useSelector(selectTodos);
  console.log('        🖼  TodoList renders');

  return (
    <ul>
      {todos.map((todo) => (
        <TodoListItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
```

`useSelector(selectTodos)`: `TodoList` re-renders whenever the todos array is a new reference, which is after every
todos action (the reducer returns a new array), and never after a filters action.

### Build step 08.6: `Footer`

Open `src/ui/Footer.jsx`. Replace the placeholder `🧩 08.6` with:

```jsx
import { useDispatch, useSelector } from '../app/redux-bindings.js';
import { selectRemainingCount } from '../features/todos/todosSlice.js';

export function Footer() {
  const remaining = useSelector(selectRemainingCount);
  const dispatch = useDispatch();
  console.log('        🖼  Footer renders');

  return (
    <footer>
      {remaining} item(s) left{' '}
      <button onClick={() => dispatch({ type: 'todos/completedCleared' })}>Clear completed</button>
    </footer>
  );
}
```

`selectRemainingCount` returns a **number**. Numbers are compared by value, so `Footer` re-renders only when the
count actually changes: adding a todo (count +1) re-renders it; changing a color doesn't.

### Build step 08.7: `App`

Open `src/ui/App.jsx`. Replace the placeholder `🧩 08.7` with:

```jsx
import { Header } from './Header.jsx';
import { TodoList } from './TodoList.jsx';
import { Footer } from './Footer.jsx';

export function App() {
  return (
    <main>
      <Header />
      <TodoList />
      <Footer />
    </main>
  );
}
```

### Build step 08.8: `renderApp`

Open `src/main.jsx`. Replace the placeholder `🧩 08.8` with:

```jsx
import { createRoot } from 'react-dom/client';
import { Provider } from './app/redux-bindings.js';
import { store } from './app/store.js';
import { App } from './ui/App.jsx';

export function renderApp(container) {
  const root = createRoot(container);
  root.render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
  return root;
}
```

What each part does:
- `createRoot(container)` (from `react-dom`) prepares React to draw into a DOM element; `root.render(…)` draws.
- `<Provider store={store}>` wraps the **whole** app, so every component can use the hooks.
- In a browser app, this code would run on page load with `document.getElementById('root')`. Our demo calls
  `renderApp(rootElement)` itself, so it can control when things happen.

## 7. The real thing: `react-redux`

The real library does the same job, with much more care for edge cases (for example: a child component must never
see a newer state than its parent during the same update).

> **API card: `Provider` (package `react-redux`)**
>
> **What it is:** the component that makes the store available to every component inside it.
>
> ```ts
> function Provider(props: {
>   store: Store;           // the Redux store
>   children: ReactNode;    // the app
> }): JSX.Element;
> ```
>
> **What it does, step by step:** 1. creates one subscription to the store for the whole app; 2. puts the store and
> that subscription into a React context; 3. renders its children.
>
> **What our project passes:** `store` from `src/app/store.js`, and `<App />`.
>
> **If you left it out:** the first `useSelector` or `useDispatch` call throws: react-redux can't find the context
> value (our version's message: "No store found…").

> **API card: `useSelector` (package `react-redux`)**
>
> **What it is:** reads a value from the store with a selector, and re-renders the component when that value
> changes.
>
> ```ts
> function useSelector<Selected>(
>   selector: (state: RootState) => Selected,               // what to read
>   equalityFn?: (a: Selected, b: Selected) => boolean,     // how to compare; default: ===
> ): Selected;
> ```
>
> **What it does, step by step:**
> 1. On render: runs `selector(store.getState())` and returns the result.
> 2. Subscribes the component (once) to the store, through `Provider`'s subscription.
> 3. After every dispatch: runs the selector on the new state and compares the result with the last one using
>    `equalityFn` (default `===`). Different → re-render the component. Same → do nothing.
> 4. In development, on the first call, it runs the selector **twice** with the same state and warns if the two
>    results are not `===` (lecture 10 explains this check).
>
> **What our project passes / gets back:** `useSelector(selectTodos)` → the todos array;
> `useSelector(selectRemainingCount)` → a number.
>
> **If you selected too much** (`useSelector((state) => state)`): the component would re-render after **every**
> action, because the root state is a new object after every change.

> **API card: `useDispatch` (package `react-redux`)**
>
> ```ts
> function useDispatch(): Dispatch;   // the store's dispatch (with its middleware chain)
> ```
>
> **What it does:** returns `store.dispatch` from the context. It's always the same function, so using it never
> causes a re-render.

### Build step 08.9: switch to the real library

In `src/app/redux-bindings.js`, replace:

```js
export { Provider, useSelector, useDispatch } from '../from-scratch/reactRedux.jsx';
```

with:

```js
export { Provider, useSelector, useDispatch } from 'react-redux';
```

No component changes: they import from `redux-bindings.js`, and the real functions have the same names and
arguments.

### You may meet `connect`

Code written before hooks (before 2019) uses `connect(mapStateToProps, mapDispatchToProps)(Component)` from
react-redux instead of the hooks. It does the same three connections, but it passes the selected values and the
dispatching functions to the component as **props**. You read it the same way: `mapStateToProps` is a selector
returning an object of props. New code uses the hooks.

## 8. Component state or global state?

`Header` keeps the text being typed in `useState`, not in Redux. The rule of thumb from the Redux docs: put data
in Redux when **other parts of the app** care about it, when it must survive the component disappearing, or when
you want to see it in the DevTools. Keep it in the component when only that component uses it.

The half-typed text is used by `Header` alone, and changes on every key. In Redux it would mean one action per
key, through the logger and every subscriber's selector, for nothing. A todo, once added, is needed by the list
and the footer: that is global state.

## Build step 08.10: the demo

Open `demos/08-react-redux.jsx`. Replace the placeholder `🧩 08.10` with:

```jsx
// Lecture 08 demo: the React app, connected with react-redux.
import { rootElement, find, findAll, typeText, pressEnter, click, inAct, printScreen } from '../src/debug/testDom.js';
import { renderApp } from '../src/main.jsx';
import { store } from '../src/app/store.js';

console.log('— 1. First render —');
await inAct(() => renderApp(rootElement));
printScreen();

console.log('\n— 2. Typing: component state, only Header re-renders —');
const input = find('input');
await typeText(input, 'Learn Redux');

console.log('\n— 3. Enter: dispatch → reducer → the components whose selected value changed re-render —');
await pressEnter(input);
printScreen();

console.log('\n— 4. A second todo, then tick the first one —');
await typeText(input, 'Walk the dog');
await pressEnter(input);
await click(findAll('li input[type=checkbox]')[0]);
printScreen();

console.log('\n— 5. A filters action: no component selected the filters —');
await inAct(() => store.dispatch({ type: 'filters/statusFilterChanged', payload: 'active' }));
```

`inAct(work)` (from `testDom.js`) runs `work` and then waits until React has finished all the re-renders it
caused; the helpers `typeText`, `pressEnter` and `click` use it too. Without it, the demo could print the screen
before React has updated it.

## Run it

```bash
npm run lesson 08
```

Expected output (not run):

```text
— 1. First render —
        🖼  Header renders
        🖼  TodoList renders
        🖼  Footer renders
  ┌─ screen
  │ [What needs to be done?]
  │ 0 item(s) left (Clear completed)
  └─

— 2. Typing: component state, only Header re-renders —
        🖼  Header renders

— 3. Enter: dispatch → reducer → the components whose selected value changed re-render —
    📝 logger: ⟶ todos/todoAdded
    📝 logger: ⟵ todos/todoAdded (changed: todos)
        🖼  Header renders
        🖼  TodoList renders
        🖼  TodoListItem #1 renders
        🖼  Footer renders
  ┌─ screen
  │ [What needs to be done?]
  │ [ ] Learn Redux <no color> (✕)
  │ 1 item(s) left (Clear completed)
  └─

— 4. A second todo, then tick the first one —
        🖼  Header renders
    📝 logger: ⟶ todos/todoAdded
    📝 logger: ⟵ todos/todoAdded (changed: todos)
        🖼  Header renders
        🖼  TodoList renders
        🖼  TodoListItem #1 renders
        🖼  TodoListItem #2 renders
        🖼  Footer renders
    📝 logger: ⟶ todos/todoToggled
    📝 logger: ⟵ todos/todoToggled (changed: todos)
        🖼  TodoList renders
        🖼  TodoListItem #1 renders
        🖼  TodoListItem #2 renders
        🖼  Footer renders
  ┌─ screen
  │ [What needs to be done?]
  │ [x] Learn Redux <no color> (✕)
  │ [ ] Walk the dog <no color> (✕)
  │ 1 item(s) left (Clear completed)
  └─

— 5. A filters action: no component selected the filters —
    📝 logger: ⟶ filters/statusFilterChanged
    📝 logger: ⟵ filters/statusFilterChanged (changed: filters)
```

Walk-through:
- **Part 1.** React rendered the tree in order: `Header`, `TodoList` (no todos, so no items), `Footer`.
- **Part 2.** `setText` changed `Header`'s own state: only `Header` re-rendered. The store was not involved.
- **Part 3.** Enter → `dispatch(todoAdded)`: the action went through the logger and the reducer, and the store
  notified the subscribers. Notice that, unlike the plain page of lecture 07, **no component rendered between the
  two logger lines**: the subscribers only *scheduled* re-renders, and React performed them together after the
  event handler finished. Then:
  - `Header` re-rendered because `setText('')` changed its state;
  - `TodoList` because `selectTodos` returned a new array;
  - `TodoListItem #1` is new;
  - `Footer` because the count went from 0 to 1.
- **Part 4.** Look at the tick: only todo #1 changed, but **both** items re-rendered. `TodoList` re-rendered
  (new array), and a re-rendering parent re-renders all its children (section 2, point 2). With 1,000 todos,
  ticking one would re-render 1,000 items. Lecture 10 fixes this. `Header` didn't re-render for the tick: it
  doesn't select anything.
- **Part 5.** The store notified the subscribers, every selector returned the same value as before, so React
  re-rendered nothing.

## The whole picture

```text
<Provider store>                      context: every component below can reach the store
  <App>
    <Header>        useState(text)    useDispatch() ──────────────► dispatch(todoAdded)
    <TodoList>      useSelector(selectTodos) ◄─┐                          │
      <TodoListItem todo>  useDispatch()       │                    logger → reducer → new state
    <Footer>        useSelector(selectRemainingCount) ◄─┐                  │
                                               │        │           store notifies subscribers
                                               └────────┴── each selector runs again:
                                                            different (!==) → re-render that component
                                                            same            → nothing
```

## Summary

| Term | What it is, in one line |
|---|---|
| **JSX / tsx** | HTML-like tags in JavaScript / the tool that translates them so Node can run them |
| **re-render** | React calling a component again: own state changed, parent re-rendered, or subscribed data changed |
| **React context** | a value made available to all components below a provider, without props |
| **`useSyncExternalStore`** | React's hook to subscribe a component to outside data; re-renders when the snapshot changes |
| **`Provider`** | puts the Redux store into context for the whole app |
| **`useSelector`** | runs a selector on the state; re-renders the component when the result changes (`===`) |
| **`useDispatch`** | returns the store's `dispatch` |
| **component state vs global state** | data only one component uses stays in `useState`; data the app shares goes in Redux |

**Next lecture:** [09-async-logic-and-thunks](09-async-logic-and-thunks.md): the todos now come from a server, and
saving one takes time. Where does code that waits go?
