# Lecture 08. React-Redux: connecting React components to the store

> **By the end you can:** build `Provider`, `useSelector` and `useDispatch` yourself on top of React's own hooks;
> give them the app's types; explain exactly when a component re-renders; build the todo app's components; switch
> to the real `react-redux`; decide what belongs in Redux and what stays in a component.
> **New terms in this lesson:** TSX and tsx, re-render, React context, `useSyncExternalStore`, `Provider`,
> `useSelector`, `useDispatch`, typed hooks (`useAppSelector`, `useAppDispatch`), component state vs global state
> **You should already know:** selector, UI binding ([07](07-redux-and-a-ui.md)); store, `subscribe`, `AppDispatch`
> ([05](05-the-store.md)); `RootState` ([04](04-combining-reducers.md)); `===` on references
> ([02](02-immutability.md)); React basics: components, props, `useState`
> **Project files you fill in:** `src/from-scratch/reactRedux.tsx` (🧩 08.1), `src/app/redux-bindings.ts` (🧩 08.2),
> `src/ui/Header.tsx`, `TodoListItem.tsx`, `TodoList.tsx`, `Footer.tsx`, `App.tsx` (🧩 08.3–08.7),
> `src/main.tsx` (🧩 08.8), `demos/08-react-redux.tsx` (🧩 08.10)

Lecture 07 connected a plain page to the store with three connections: read, dispatch, redraw. React needs the same
three. This lecture builds them with React's own tools, then swaps in the real library.

## 1. TSX, and running it with tsx

React components are written in **JSX**: HTML-like tags inside code (`<li>{todo.text}</li>`). In TypeScript the
same syntax is called **TSX**, and files containing it end in `.tsx`. TypeScript type-checks the tags too: a
missing prop or a wrong prop type is a compile error. Node can't run TSX directly; `tsx` (the tool that runs our
demos) translates it on the fly, as told by `"jsx": "react-jsx"` in `tsconfig.json`.

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

```tsx
const StoreContext = createContext<AnyStore | null>(null);   // 1. create a context (once), with its value's type

<StoreContext.Provider value={store}>                         // 2. a component near the top provides a value
  <App />
</StoreContext.Provider>

const store = useContext(StoreContext);                       // 3. any component below reads it
```

## 4. `useSyncExternalStore`: subscribing a component to a store

React has a hook made for exactly connection 3 of lecture 07: **`useSyncExternalStore`**. You give it two
functions:

```ts
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

Open `src/from-scratch/reactRedux.tsx`. Replace the placeholder `🧩 08.1` with:

```tsx
// Our own version of react-redux's Provider, useSelector and useDispatch, to see how they work.
import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';

// The part of a store these bindings need. Any Redux store fits this shape.
interface AnyStore {
  getState(): any;
  subscribe(listener: () => void): () => void;
  dispatch(action: any): any;
}

const StoreContext = createContext<AnyStore | null>(null);

export function Provider({ store, children }: { store: AnyStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

function useStore(): AnyStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('No store found: wrap your app in <Provider store={store}>');
  return store;
}

export function useDispatch(): any {
  return useStore().dispatch;
}

export function useSelector<Selected>(selector: (state: any) => Selected): Selected {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}
```

What each part does:
- `AnyStore` describes what the bindings use from a store. It's typed with `any` on purpose: this file must work
  with **any** app's store, so it can't know `RootState` or `AppDispatch`. Step 08.2 adds the app's types on top.
- **`Provider`** is a component that puts the store into the context, so everything inside it can find the store.
  Its props are typed inline: `store` and `children` (`ReactNode` is "anything React can render").
- `useStore()` reads the store from the context. If a component is rendered outside a `Provider`, the context
  value is `null`, and it throws a clear error instead of failing later with "cannot read properties of null".
  After the `if`, TypeScript knows `store` isn't `null`.
- **`useDispatch()`** returns the store's `dispatch`: connection 2 (screen → actions).
- **`useSelector(selector)`** is connections 1 and 3 together. It subscribes the component to the store, and its
  snapshot is "the selector applied to the current state". After every dispatch, React runs the selector again and
  re-renders the component only if the selected value is a different reference. The type parameter `Selected` is
  inferred from the selector: `useSelector(selectRemainingCount)` returns a `number`.

Run it by hand: `Footer` calls `useSelector(selectRemainingCount)`, then `todoToggled` is dispatched:
1. The store runs the reducer, then calls its subscribers, including React's callback for `Footer`.
2. React calls `getSnapshot()` → `selectRemainingCount(newState)` → `0`. The last value was `1`.
3. `0 !== 1` → React schedules a re-render of `Footer`.
4. A `filters/…` action instead: the snapshot is `1` again → same → no re-render.

So the **selector decides** which store changes a component reacts to.

### Build step 08.2: typed hooks, in one place

With `state: any`, a component could write `useSelector((state) => state.todoz)` and TypeScript wouldn't notice.
We want the hooks to know the app's types: `state` is a `RootState`, and `dispatch` is an `AppDispatch`. Instead of
writing those types in every component, we create, once, **typed hooks**: the same functions, exported under new
names with the app's types attached.

Open `src/app/redux-bindings.ts`. Replace the placeholder `🧩 08.2` with:

```ts
// Where every component imports Provider and the hooks from.
import type { TypedUseSelectorHook } from 'react-redux';
import { Provider, useDispatch, useSelector } from '../from-scratch/reactRedux';
import type { RootState } from './rootReducer';
import type { AppDispatch } from './store';

export { Provider };

// The same hooks, with the app's types attached.
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

What each part does:
- `useAppDispatch` **is** `useDispatch`; only its declared type differs: "a function returning an `AppDispatch`".
  So `dispatch(…)` in components is checked against `RootAction`.
- `useAppSelector` **is** `useSelector`, declared with the type `TypedUseSelectorHook<RootState>`, a type from
  react-redux meaning "a `useSelector` whose `state` is a `RootState`". Now `useAppSelector((state) =>
  state.todoz)` is a compile error, and `useAppSelector((state) => state.todos)` returns `TodosState`.
- All components import from this file. In step 08.9 we change one line here to switch the whole app to the real
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

Open `src/ui/Header.tsx`. Replace the placeholder `🧩 08.3` with:

```tsx
import { useState, type KeyboardEvent } from 'react';
import { useAppDispatch } from '../app/redux-bindings';

export function Header() {
  const [text, setText] = useState('');
  const dispatch = useAppDispatch();
  console.log('        🖼  Header renders');

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
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
  explains why. `useState('')` infers the type `string`.
- `KeyboardEvent<HTMLInputElement>`: React's type for a key event on an `<input>`. (In `onChange`, the event's type
  is inferred from the JSX, so it needs no annotation.)
- `onChange` updates `text` on every key, so `Header` re-renders on every key. Only `Header`: no other component
  uses `text`.
- On Enter with some text: dispatch `todoAdded`, then empty the input. Like the plain page of lecture 07, `Header`
  doesn't add the todo to the list itself; it reports the event, and the list re-renders because the state changed.

### Build step 08.4: `TodoListItem`

Open `src/ui/TodoListItem.tsx`. Replace the placeholder `🧩 08.4` with:

```tsx
import { useAppDispatch } from '../app/redux-bindings';
import type { Todo } from '../features/todos/todosSlice';

const COLORS = ['green', 'blue', 'red'];

export function TodoListItem({ todo }: { todo: Todo }) {
  const dispatch = useAppDispatch();
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
- It receives the todo object as a prop, typed `{ todo: Todo }`.
- The checkbox, the dropdown and the ✕ button each dispatch one of the actions of lecture 03, with the payload that
  action's type requires.
- `checked={todo.completed}` and `value={todo.color}`: what the controls show comes **from the state**. Clicking the
  checkbox doesn't tick it directly; it dispatches, the state changes, and the new render shows it ticked.
- `{' '}` puts a space between the parts, so the printed screen is readable.

### Build step 08.5: `TodoList`

Open `src/ui/TodoList.tsx`. Replace the placeholder `🧩 08.5` with:

```tsx
import { useAppSelector } from '../app/redux-bindings';
import { selectTodos } from '../features/todos/todosSlice';
import { TodoListItem } from './TodoListItem';

export function TodoList() {
  const todos = useAppSelector(selectTodos);
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

`useAppSelector(selectTodos)`: `TodoList` re-renders whenever the todos array is a new reference, which is after
every todos action (the reducer returns a new array), and never after a filters action.

### Build step 08.6: `Footer`

Open `src/ui/Footer.tsx`. Replace the placeholder `🧩 08.6` with:

```tsx
import { useAppDispatch, useAppSelector } from '../app/redux-bindings';
import { selectRemainingCount } from '../features/todos/todosSlice';

export function Footer() {
  const remaining = useAppSelector(selectRemainingCount);
  const dispatch = useAppDispatch();
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

Open `src/ui/App.tsx`. Replace the placeholder `🧩 08.7` with:

```tsx
import { Header } from './Header';
import { TodoList } from './TodoList';
import { Footer } from './Footer';

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

Open `src/main.tsx`. Replace the placeholder `🧩 08.8` with:

```tsx
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from './app/redux-bindings';
import { store } from './app/store';
import { App } from './ui/App';

export function renderApp(container: HTMLElement): Root {
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
- `createRoot(container)` (from `react-dom`) prepares React to draw into a DOM element and returns a `Root`;
  `root.render(…)` draws.
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
> **What our project passes:** `store` from `src/app/store.ts`, and `<App />`.
>
> **If you left it out:** the first `useSelector` or `useDispatch` call throws: react-redux can't find the context
> value (our version's message: "No store found…").

> **API card: `useSelector` (package `react-redux`)**
>
> **What it is:** reads a value from the store with a selector, and re-renders the component when that value
> changes.
>
> ```ts
> function useSelector<State, Selected>(
>   selector: (state: State) => Selected,                     // what to read
>   equalityFn?: (a: Selected, b: Selected) => boolean,       // how to compare; default: ===
> ): Selected;
> type TypedUseSelectorHook<State> = <Selected>(selector: (state: State) => Selected, …) => Selected;
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
> **What our project passes / gets back:** `useAppSelector(selectTodos)` → `TodosState`;
> `useAppSelector(selectRemainingCount)` → `number`.
>
> **If you selected too much** (`useAppSelector((state) => state)`): the component would re-render after **every**
> action, because the root state is a new object after every change.

> **API card: `useDispatch` (package `react-redux`)**
>
> ```ts
> function useDispatch<D = Dispatch>(): D;   // the store's dispatch (with its middleware chain)
> ```
>
> **What it does:** returns `store.dispatch` from the context. It's always the same function, so using it never
> causes a re-render.
>
> **Newer shortcut for typed hooks:** react-redux 9.1+ also offers `useSelector.withTypes<RootState>()` and
> `useDispatch.withTypes<AppDispatch>()`, which return the same typed hooks as our step 08.2.

### Build step 08.9: switch to the real library

In `src/app/redux-bindings.ts`, replace:

```ts
import { Provider, useDispatch, useSelector } from '../from-scratch/reactRedux';
```

with:

```ts
import { Provider, useDispatch, useSelector } from 'react-redux';
```

No component changes: they import from `redux-bindings.ts`, and the real functions have the same names, arguments
and types.

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

Open `demos/08-react-redux.tsx`. Replace the placeholder `🧩 08.10` with:

```tsx
// Lecture 08 demo: the React app, connected with react-redux.
import { rootElement, find, findAll, typeText, pressEnter, click, inAct, printScreen } from '../src/debug/testDom';
import { renderApp } from '../src/main';
import { store } from '../src/app/store';

console.log('— 1. First render —');
await inAct(() => renderApp(rootElement));
printScreen();

console.log('\n— 2. Typing: component state, only Header re-renders —');
const input = find<HTMLInputElement>('input');
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

`inAct(work)` (from `testDom.ts`) runs `work` and then waits until React has finished all the re-renders it
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
    <Header>        useState(text)    useAppDispatch() ───────────► dispatch(todoAdded)   (checked: RootAction)
    <TodoList>      useAppSelector(selectTodos) ◄─┐                       │
      <TodoListItem todo>  useAppDispatch()       │                 logger → reducer → new state
    <Footer>        useAppSelector(selectRemainingCount) ◄─┐              │
                                                  │        │        store notifies subscribers
                                                  └────────┴── each selector runs again:
                                                               different (!==) → re-render that component
                                                               same            → nothing
```

## Summary

| Term | What it is, in one line |
|---|---|
| **TSX / tsx** | JSX in TypeScript files (`.tsx`) / the tool that translates it so Node can run it |
| **re-render** | React calling a component again: own state changed, parent re-rendered, or subscribed data changed |
| **React context** | a value made available to all components below a provider, without props |
| **`useSyncExternalStore`** | React's hook to subscribe a component to outside data; re-renders when the snapshot changes |
| **`Provider`** | puts the Redux store into context for the whole app |
| **`useSelector`** | runs a selector on the state; re-renders the component when the result changes (`===`) |
| **`useDispatch`** | returns the store's `dispatch` |
| **typed hooks** | `useAppSelector` / `useAppDispatch`: the same hooks, declared with `RootState` / `AppDispatch` |
| **component state vs global state** | data only one component uses stays in `useState`; data the app shares goes in Redux |

**Next lecture:** [09-async-logic-and-thunks](09-async-logic-and-thunks.md): the todos now come from a server, and
saving one takes time. Where does code that waits go?
