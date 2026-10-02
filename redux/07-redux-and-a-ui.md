# Lecture 07. Redux and a UI: the binding, by hand

> **By the end you can:** connect a store to a web page with nothing but `subscribe`, `getState` and `dispatch`;
> write typed selectors, including selectors for derived data; explain why a UI compares references before
> redrawing.
> **New terms in this lesson:** DOM, jsdom, selector, `Store` type, UI binding
> **You should already know:** derived data, `RootState` ([04](04-combining-reducers.md)); store, `dispatch`,
> `subscribe` ([05](05-the-store.md)); middleware, the logger ([06](06-middleware-and-enhancers.md)); reference,
> `===` ([02](02-immutability.md))
> **Project files you fill in:** `src/features/todos/todosSlice.ts` (🧩 07.1), `src/ui/vanilla.ts` (🧩 07.2),
> `demos/07-redux-and-a-ui.ts` (🧩 07.3)

Redux doesn't know anything about screens. Any UI can use it: plain web pages, React, Vue, a terminal. This
lecture connects our store to a plain web page with no framework at all, so you see the **whole** job a UI library
does for you. Lecture 08 then does the same with React.

## 1. A web page inside Node: the DOM and jsdom

A browser turns HTML into a tree of objects that code can read and change: one object per element (`<ul>`, `<li>`,
`<input>`…). That tree is the **DOM** (Document Object Model). You change the page by changing the DOM:
`document.createElement('li')`, `element.textContent = '…'`, `element.addEventListener('click', …)`. TypeScript
knows the DOM's types (`HTMLElement`, `HTMLInputElement`, …) through the `"DOM"` entry in `tsconfig.json`.

Node has no browser, so no DOM. **jsdom** is a library that builds a DOM inside Node: a page with `document`,
elements and events, just without pixels. The project gives you `src/debug/testDom.ts` (already written, not part
of the course). Import it first in a demo, and it:

- creates a page with one empty `<div id="root">`, exported as `rootElement`;
- gives helpers that act like a user: `typeText(input, text)`, `pressEnter(input)`, `click(element)`;
- gives `find(selector)` and `findAll(selector)` to get elements; you can say which element type you expect:
  `find<HTMLInputElement>('input')`;
- gives `printScreen()`, which prints the page as text, one line per block element (`[x]` is a ticked checkbox,
  `[text]` an input showing its value or placeholder, `(text)` a button, `<color>` a dropdown).

## 2. Selector: a function that reads from the state

The UI needs pieces of the state: the todos; "how many are left". We could write `store.getState().todos`
everywhere. But if the shape of the state changes (it will, in lecture 11), every place that reads it must change.
And "how many are left" is **derived data** (lecture 04): it must be computed, not stored. Where should that
computation live?

A **selector** is a function that takes the whole state and returns one piece of it, or a value computed from it:

```ts
const selectTodos = (state: RootState) => state.todos;
```

Selectors give each piece of the state **one** way to be read, defined next to its reducer. The UI calls selectors
and never digs into the state itself. When the state's shape changes, only the selectors change.

By convention, selector names start with `select`.

### Build step 07.1: the first selectors

Open `src/features/todos/todosSlice.ts`. Add this import at the top of the file:

```ts
import type { RootState } from '../../app/rootReducer';
```

Then replace the placeholder `🧩 07.1` with:

```ts
export const selectTodos = (state: RootState) => state.todos;

export const selectRemainingCount = (state: RootState) => selectTodos(state).filter((todo) => !todo.completed).length;
```

What each part does:
- `import type`: only the **type** `RootState` is imported. `rootReducer.ts` itself imports this file, so a normal
  import would make the two files import each other. A type-only import is removed before the code runs, so that
  circle doesn't exist at runtime.
- `selectTodos` returns the todos slice. It receives the **whole** state (unlike a slice reducer, which receives
  only its slice). Its return type, `TodosState`, is inferred.
- `selectRemainingCount` computes derived data: it calls `selectTodos` (selectors can use other selectors) and
  counts the todos not completed. The count is never stored; it's computed from the one source of truth whenever
  someone asks.

## 3. UI binding: the three connections

Connecting a UI to a store always takes the same three connections:

```text
        ┌────────────── store ──────────────┐
        │                                   │
   (1) getState() + selectors      (3) subscribe(render)
        │                                   │
        ▼                                   │
   ┌─────────┐   (2) user acts → dispatch(action)
   │  page   │ ─────────────────────────────┘
   └─────────┘
```

1. **state → screen**: read the state (through selectors) and draw it.
2. **screen → actions**: turn user events (typing, clicks) into dispatched actions.
3. **change → redraw**: subscribe, so that after every dispatch the page is drawn again.

Code that makes these connections between a store and a UI is called a **UI binding**. For React, the
`react-redux` library is the UI binding (lecture 08). Here we write one by hand.

One detail matters a lot: subscribers are called after **every** dispatch, even when the action changed nothing
the page shows. Redrawing a long list for nothing is wasted work. Lecture 02 gave us the tool to avoid it: if
`selectTodos(state)` returns the **same** array (`===`) as last time, the todos didn't change, so we skip drawing.
This only works because reducers never mutate.

> **API card: the `Store` type (package `redux`)**
>
> ```ts
> interface Store<S, A extends Action> {
>   getState(): S;
>   dispatch: Dispatch<A>;                       // accepts only actions of type A
>   subscribe(listener: () => void): () => void; // returns unsubscribe
>   replaceReducer(nextReducer: Reducer<S, A>): void;
> }
> ```
>
> **Why we use it here:** `mountVanillaUI` should accept "a Redux store holding a `RootState` and accepting
> `RootAction`s", not specifically our `store` object. Our store (with its middleware) fits this type.

### Build step 07.2: the page

Open `src/ui/vanilla.ts`. Replace the placeholder `🧩 07.2` with:

```ts
import type { Store } from 'redux';
import type { RootAction, RootState } from '../app/rootReducer';
import { selectRemainingCount, selectTodos, type Todo } from '../features/todos/todosSlice';

export function mountVanillaUI(store: Store<RootState, RootAction>, root: HTMLElement): () => void {
  // build the parts of the page that never change
  const input = document.createElement('input');
  input.placeholder = 'What needs to be done?';
  const list = document.createElement('ul');
  const footer = document.createElement('p');
  root.append(input, list, footer);

  // (1) state → screen
  let lastTodos: Todo[] | undefined;
  function render(): void {
    const state = store.getState();
    const todos = selectTodos(state);
    if (todos === lastTodos) {
      console.log('       🖥  render skipped: the todos did not change');
      return;
    }
    lastTodos = todos;
    list.replaceChildren(
      ...todos.map((todo) => {
        const item = document.createElement('li');
        item.dataset.id = String(todo.id);
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        item.append(checkbox, ` ${todo.text}`);
        return item;
      }),
    );
    footer.textContent = `${selectRemainingCount(state)} item(s) left`;
    console.log(`       🖥  render: ${todos.length} todo(s)`);
  }

  // (2) screen → actions
  input.addEventListener('keydown', (event) => {
    const text = input.value.trim();
    if (event.key === 'Enter' && text) {
      store.dispatch({ type: 'todos/todoAdded', payload: text });
      input.value = '';
    }
  });
  list.addEventListener('click', (event) => {
    const item = (event.target as HTMLElement).closest('li');
    if (item) store.dispatch({ type: 'todos/todoToggled', payload: Number(item.dataset.id) });
  });

  // (3) every state change → render again
  const unsubscribe = store.subscribe(render);
  render();
  return unsubscribe;
}
```

What each part does:
- `mountVanillaUI(store, root)` receives the store and the element to draw into. It returns the unsubscribe
  function (type `() => void`), so whoever removes the page can stop the updates.
- The input, the list and the footer are created **once**. Only their contents change later.
- `render()`:
  - reads the state through selectors;
  - `if (todos === lastTodos)`: same array as last time → nothing to draw. This is one `===`, however many todos
    there are. `lastTodos` starts `undefined`, hence its type `Todo[] | undefined`;
  - otherwise rebuilds the list: one `<li>` per todo, holding a checkbox and the text. `item.dataset.id` stores the
    todo's id on the element (as `data-id="1"`), so a click can find out which todo it was;
  - the text goes in with `append` (a text node), never as HTML. A todo text like `<img onerror=…>` would otherwise
    be turned into real HTML and run: always put user text in the page as text.
- The keydown listener: on Enter, with some text typed, dispatch `todoAdded` and empty the input. TypeScript checks
  this action against `RootAction`. The page doesn't add the `<li>` itself: it only reports the event. The new
  `<li>` appears because the state changed and `render` ran. That is one-way data flow (lecture 01).
- The click listener sits on the whole list, not on each `<li>` (the `<li>`s are replaced on every render).
  `event.target` is typed as a generic `EventTarget`; the assertion says it's an element, so we can call
  `closest('li')`, which finds the `<li>` that was clicked. `data-id` says which todo to toggle; `Number(…)` turns
  the string `'1'` back into the number `1` that the reducer compares with `===` (and that the action's type
  requires).
- `store.subscribe(render)` connects (3); the first `render()` draws the initial state.

### Build step 07.3: the demo

Open `demos/07-redux-and-a-ui.ts`. Replace the placeholder `🧩 07.3` with:

```ts
// Lecture 07 demo: a plain web page connected to the store by hand.
import { rootElement, find, findAll, typeText, pressEnter, click, printScreen } from '../src/debug/testDom';
import { store } from '../src/app/store';
import { mountVanillaUI } from '../src/ui/vanilla';
import type { RootAction } from '../src/app/rootReducer';

console.log('— 1. Mount the page —');
mountVanillaUI(store, rootElement);
printScreen();

console.log('\n— 2. The user types a todo and presses Enter —');
const input = find<HTMLInputElement>('input');
await typeText(input, 'Learn Redux');
await pressEnter(input);
printScreen();

console.log('\n— 3. The user clicks the todo —');
await click(findAll('li')[0]);
printScreen();

console.log('\n— 4. An action that does not touch the todos —');
const showActive: RootAction = { type: 'filters/statusFilterChanged', payload: 'active' };
store.dispatch(showActive);
```

`testDom.ts` is imported **first**: it must create `document` before any code uses it. The demo uses `await` at
the top level of the file, which modules allow.

## Run it

```bash
npm run lesson 07
```

Expected output (not run):

```text
— 1. Mount the page —
       🖥  render: 0 todo(s)
  ┌─ screen
  │ [What needs to be done?]
  │   0 item(s) left
  └─

— 2. The user types a todo and presses Enter —
    📝 logger: ⟶ todos/todoAdded
       🖥  render: 1 todo(s)
    📝 logger: ⟵ todos/todoAdded (changed: todos)
  ┌─ screen
  │ [What needs to be done?]
  │   [ ] Learn Redux
  │   1 item(s) left
  └─

— 3. The user clicks the todo —
    📝 logger: ⟶ todos/todoToggled
       🖥  render: 1 todo(s)
    📝 logger: ⟵ todos/todoToggled (changed: todos)
  ┌─ screen
  │ [What needs to be done?]
  │   [x] Learn Redux
  │   0 item(s) left
  └─

— 4. An action that does not touch the todos —
    📝 logger: ⟶ filters/statusFilterChanged
       🖥  render skipped: the todos did not change
    📝 logger: ⟵ filters/statusFilterChanged (changed: filters)
```

Walk-through:
- **Part 1.** `mountVanillaUI` drew the initial state: no todos, "0 item(s) left". The input shows its placeholder.
  (The empty `<ul>` has no line.)
- **Part 2.** Typing changed only the input. Pressing Enter ran the keydown listener → `store.dispatch(todoAdded)`.
  The action went through the logger (`⟶`), then the reducer, then the store called our subscriber `render`
  (`🖥 render: 1 todo(s)`), and only then did the logger print its `⟵` line. The render line sits **between** the
  two logger lines because the subscribers run inside `next(action)` (lecture 06, part 4). Then the listener
  emptied the input: the screen shows the placeholder again, and the new todo.
- **Part 3.** The click on the `<li>` found `data-id="1"` and dispatched `todoToggled` with payload `1`. The reducer
  returned a new array, so `render` redrew: `[x]`, and "0 item(s) left", computed by `selectRemainingCount`.
- **Part 4.** The filters action made the store call `render` (subscribers are called on **every** dispatch), but
  `selectTodos` returned the same array, so the render was skipped. The logger confirms that only `filters`
  changed.

## The whole picture

```text
 keydown Enter ──► store.dispatch(todoAdded) ──► logger ⟶ ──► rootReducer ──► new state
                                                                    │
                                                    subscribers: render()
                                                       │  selectTodos(state) === lastTodos ?
                                                       │     yes → skip
                                                       │     no  → rebuild <li>s, footer = selectRemainingCount(state)
                                                logger ⟵ ◄──────────┘
```

Everything a UI library does for Redux is in this file: read with selectors, dispatch on events, subscribe, and
skip work when the selected data is the same reference.

## Summary

| Term | What it is, in one line |
|---|---|
| **DOM** | the tree of objects a browser builds from HTML; changing it changes the page |
| **jsdom** | a library that builds a DOM inside Node, so UI code runs without a browser |
| **selector** | `(state: RootState) => value`: reads one piece of the state, or computes derived data from it |
| **`Store` type** | `Store<S, A>`: the type of a Redux store holding `S` and accepting actions `A` |
| **UI binding** | code connecting a store to a UI: read (getState + selectors), write (dispatch), redraw (subscribe) |

**Next lecture:** [08-react-redux](08-react-redux.md): the same three connections in React, first built by hand
with React's own tools, then with the `react-redux` library.
