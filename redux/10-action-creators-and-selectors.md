# Lecture 10. Action creators and memoized selectors

> **By the end you can:** write typed action creators for every action; explain why a selector that returns a new
> array causes extra re-renders; build a memoized selector yourself; use Reselect's `createSelector`; make each list
> item re-render only when its own todo changes.
> **New terms in this lesson:** action creator, memoization, memoized selector, input selector, result function,
> `createSelector`, `shallowEqual`
> **You should already know:** selector, derived data ([07](07-redux-and-a-ui.md), [04](04-combining-reducers.md));
> `useAppSelector` and when components re-render ([08](08-react-redux.md)); thunks ([09](09-async-logic-and-thunks.md))
> **Project files you fill in:** `src/features/todos/todosSlice.ts` (🧩 10.1, 🧩 10.4 + changes),
> `src/features/filters/filtersSlice.ts` (🧩 10.2), `src/from-scratch/createSelector.ts` (🧩 10.3),
> `src/app/redux-bindings.ts`, `src/ui/TodoList.tsx`, `TodoListItem.tsx`, `Footer.tsx` (changes),
> `demos/10-action-creators-and-selectors.tsx` (🧩 10.8)

## 1. Action creator: a function that builds the action

The project writes action objects by hand in many places: `{ type: 'todos/todoToggled', payload: todo.id }` in a
component, `{ type: 'todos/todoAdded', payload: response.todo }` in a thunk. TypeScript already catches typos in
them, but every place must still spell out the type string and know the payload's exact shape (`{ todoId, color }`
or `{ color, todoId }`?). If a payload's shape changes, every one of those places changes.

So we write, once, next to the reducer, a small function that **builds the action object**. That function is an
**action creator**:

```ts
export const todoToggled = (todoId: number): TodosAction => ({ type: 'todos/todoToggled', payload: todoId });

todoToggled(2);   // returns { type: 'todos/todoToggled', payload: 2 }
```

What matters here:
- An action creator **only returns an object**. Calling `todoToggled(2)` changes nothing in the store.
- The change happens only when that object is dispatched: `dispatch(todoToggled(2))`. JavaScript runs
  `todoToggled(2)` first, then `dispatch` receives the object.
- The return type `: TodosAction` makes TypeScript check the object against the union, once, here.
- A thunk creator (lecture 09) has the same role for thunks: it returns a function instead of an object.

By convention, the action creator has the same name as the event in the type: `'todos/todoToggled'` →
`todoToggled`.

### Build step 10.1: the todos action creators

Open `src/features/todos/todosSlice.ts`. Replace the placeholder `🧩 10.1` with:

```ts
export const todoAdded = (todo: Todo): TodosAction => ({ type: 'todos/todoAdded', payload: todo });
export const todoToggled = (todoId: number): TodosAction => ({ type: 'todos/todoToggled', payload: todoId });
export const colorSelected = (todoId: number, color: string): TodosAction => ({
  type: 'todos/colorSelected',
  payload: { todoId, color },
});
export const todoDeleted = (todoId: number): TodosAction => ({ type: 'todos/todoDeleted', payload: todoId });
export const completedCleared = (): TodosAction => ({ type: 'todos/completedCleared' });
export const todosLoaded = (todos: Todo[]): TodosAction => ({ type: 'todos/todosLoaded', payload: todos });
```

`colorSelected(todoId, color)` takes two normal arguments and builds the `{ todoId, color }` payload itself: callers
can't get the shape wrong.

Then use them in the thunks of the same file. In `fetchTodos`, replace:

```ts
  dispatch({ type: 'todos/todosLoaded', payload: response.todos });
```

with:

```ts
  dispatch(todosLoaded(response.todos));
```

In `saveNewTodo`, replace:

```ts
    dispatch({ type: 'todos/todoAdded', payload: response.todo });
```

with:

```ts
    dispatch(todoAdded(response.todo));
```

### Build step 10.2: the filters action creators and selectors

Open `src/features/filters/filtersSlice.ts`. Add this import at the top:

```ts
import type { RootState } from '../../app/rootReducer';
```

Then replace the placeholder `🧩 10.2` with:

```ts
export const statusFilterChanged = (status: StatusFilter): FiltersAction => ({
  type: 'filters/statusFilterChanged',
  payload: status,
});
export const colorFilterChanged = (color: string, changeType: 'added' | 'removed'): FiltersAction => ({
  type: 'filters/colorFilterChanged',
  payload: { color, changeType },
});

export const selectStatusFilter = (state: RootState) => state.filters.status;
export const selectColorFilters = (state: RootState) => state.filters.colors;
```

The two selectors give the filters slice its "one way to be read" (lecture 07).

## 2. The problem: a selector that returns a new array every time

Now the list should show only the todos that pass the filters. That's derived data, so it's a selector:

```ts
// naive version
export const selectFilteredTodos = (state: RootState) =>
  selectTodos(state).filter((todo) => /* status and color match */ true);
```

`filter` returns a **new array on every call**, even when nothing changed. Remember what `useSelector` does after
every dispatch (lecture 08): it runs the selector and compares the result with `===`. A new array is never `===`
the last one. So `TodoList` would re-render after **every** action, even a `filters/…` action that changes nothing
it shows. (In development, `useSelector` notices this on its first call and prints a warning: "Selector unknown
returned a different result when called with the same parameters…")

What we want: if the todos and the filters are the same as last time, return **the same array as last time**,
without filtering again.

## 3. Memoization: remember the last answer

**Memoization** means: remember the result of a function for the arguments it was called with; when it's called
again with the same arguments, return the remembered result instead of computing it again.

A **memoized selector** applies this to selectors. It splits the selector in two:
- **input selectors**: cheap selectors that pick the values the computation needs (`state.todos`,
  `state.filters.status`, …). They return existing references from the state, never new objects;
- a **result function**: the expensive part (`filter`, `map`…), which receives the input selectors' results.

On each call: run the input selectors; if all their results are `===` to last time, return the last result;
otherwise run the result function and remember its result.

### Build step 10.3: our own `createSelector`

Open `src/from-scratch/createSelector.ts`. Replace the placeholder `🧩 10.3` with:

```ts
// Our own memoized-selector builder (it remembers only the LAST inputs and result).
export function createSelector<Args extends unknown[], Result>(
  inputSelectors: Array<(...args: Args) => unknown>,
  resultFunc: (...inputs: any[]) => Result,
): (...args: Args) => Result {
  let lastInputs: unknown[] | null = null;
  let lastResult: Result;

  return function memoizedSelector(...args: Args): Result {
    const inputs = inputSelectors.map((select) => select(...args));
    const previous = lastInputs;
    const sameInputs = previous !== null && inputs.every((value, index) => value === previous[index]);
    if (!sameInputs) {
      lastResult = resultFunc(...inputs);
      lastInputs = inputs;
    }
    return lastResult;
  };
}
```

What each part does:
- `createSelector([input selectors], resultFunc)` runs once and returns `memoizedSelector`, which remembers
  `lastInputs` and `lastResult` (closures).
- The types: `Args` is the selectors' parameter list (for us, `[state: RootState]`), `Result` what the result
  function returns. The memoized selector has the same parameters and returns `Result`. The result function's
  parameters are `any[]`: typing "the parameters are exactly the input selectors' results, in order" needs advanced
  tuple types, which Reselect has and our teaching version skips.
- On each call, `inputs` holds what every input selector returned for these arguments.
- `previous = lastInputs`: a local copy, so that TypeScript keeps knowing it isn't `null` inside the `every`
  callback.
- `sameInputs`: every input is `===` to the one from the last call. This is cheap: a few `===`.
- Only when an input changed does the result function run; its result is remembered and returned.

Run it by hand with `selectDoneTexts = createSelector([(state) => state.todos], (todos) => …filter…map…)`:

| Call | `inputs` | Same as last? | Result function runs? | Returns |
|---|---|---|---|---|
| `selectDoneTexts(state1)` | `[todosA]` | no (first call) | yes | new array `R1` |
| `selectDoneTexts(state1)` | `[todosA]` | yes | no | `R1` again |
| `selectDoneTexts(state2)` | `[todosB]` | no (`todosB !== todosA`) | yes | new array `R2` |

The memoization works **because reducers never mutate**: "same todos reference" reliably means "same todos".

## 4. The real thing: Reselect's `createSelector`

> **API card: `createSelector` (package `reselect`)**
>
> **What it is:** builds a memoized selector from input selectors and a result function.
>
> ```ts
> function createSelector(
>   inputSelectors: [...InputSelectors],                  // pick the values the computation needs
>   resultFunc: (...inputResults: InputResults) => Result, // its parameters are typed from the input selectors
> ): (state, ...args) => Result;                          // the memoized selector
> ```
>
> **What it does, step by step, on each call:**
> 1. If called with exactly the same arguments as an earlier call (the same `state` object), it returns that call's
>    result immediately.
> 2. Otherwise it runs every input selector with the arguments.
> 3. If the input results are the same (`===`) as an earlier set of input results, it returns that earlier result.
> 4. Otherwise it runs `resultFunc(...inputResults)`, remembers and returns the result.
>
> **Differences from ours:** Reselect types the result function's parameters exactly (in our project, `todos` is
> inferred as `TodosState`, `status` as `StatusFilter`…). And our version remembers only the **last** inputs;
> Reselect 5 remembers **every** combination of inputs it has seen (stored in `WeakMap`s, so entries for objects that
> are no longer used anywhere are cleaned up automatically by JavaScript). The demo shows when this matters.
>
> **Development checks:** the first time a selector runs, Reselect runs the input selectors twice and warns if
> they return different references: an input selector must not create new objects, or the memoization never hits.
>
> **What our project passes / gets back:** `selectFilteredTodos` and `selectFilteredTodoIds` (step 10.4).
>
> **If you left it out:** `selectFilteredTodos` would return a new array on every call, and `TodoList` would
> re-render after every dispatch.

### Build step 10.4: the filtered-list selectors

In `src/features/todos/todosSlice.ts`, add these imports at the top:

```ts
import { createSelector } from 'reselect';
import { selectColorFilters, selectStatusFilter } from '../filters/filtersSlice';
```

Then replace the placeholder `🧩 10.4` with:

```ts
export const selectTodoById = (state: RootState, todoId: number) =>
  selectTodos(state).find((todo) => todo.id === todoId);

export const selectFilteredTodos = createSelector(
  [selectTodos, selectStatusFilter, selectColorFilters],
  (todos, status, colors) => {
    console.log('      🧠 selectFilteredTodos recomputes');
    return todos.filter((todo) => {
      const statusMatches = status === 'all' || (status === 'completed' ? todo.completed : !todo.completed);
      const colorMatches = colors.length === 0 || colors.includes(todo.color);
      return statusMatches && colorMatches;
    });
  },
);

export const selectFilteredTodoIds = createSelector([selectFilteredTodos], (todos) => todos.map((todo) => todo.id));
```

What each part does:
- `selectTodoById(state, todoId)`: a selector with an extra argument. It returns the todo object **from the
  state** (not a copy), so it's `===` to last time as long as that todo didn't change. Its return type is
  `Todo | undefined`: `find` may find nothing (for example, right after the todo was deleted).
- `selectFilteredTodos`: three input selectors (the todos, the status, the colors); the result function filters.
  Its parameters need no annotations: Reselect infers `todos: TodosState`, `status: StatusFilter`,
  `colors: string[]` from the input selectors.
  - `statusMatches`: "all" lets everything through; "completed" keeps completed todos; "active" keeps the others.
    (Comparing `status` with `'actve'` would be a compile error: it's not a `StatusFilter`.)
  - `colorMatches`: no color selected lets everything through; otherwise the todo's color must be in the list.
  - The `🧠` line shows each time the result function really runs.
- `selectFilteredTodoIds`: a memoized selector whose input is **another memoized selector**. When the filtered
  list is the same array, the ids array is the same array too. Its type: `(state: RootState) => number[]`.

## 5. One more problem: the same ids in a new array

We want each `TodoListItem` to re-render only when **its own** todo changes. The plan (from the Redux docs):
`TodoList` selects only the **ids**, and each item selects its own todo by id.

But follow a tick of todo #2:
1. `todoToggled` → the todos slice is a new array (with a new #2 object).
2. `selectFilteredTodos` input changed → recomputes → a new filtered array.
3. `selectFilteredTodoIds` input changed → recomputes → a **new** array `[1, 2]`, with the **same** contents.
4. `useSelector`'s `===` says "different" → `TodoList` re-renders, and with it every item (lecture 08).

Memoization can't help: the input really changed. What we need is a different **comparison**: "same contents" instead
of "same reference". `useSelector` accepts one as its second argument.

> **API card: `shallowEqual` (package `react-redux`)**
>
> **What it is:** a comparison function: two objects/arrays are "equal" if they have the same keys and each value is
> `===`. It looks one level deep only (hence "shallow").
>
> ```ts
> function shallowEqual(a: any, b: any): boolean;
> // shallowEqual([1, 2], [1, 2]) → true      shallowEqual([{…}], [{…}]) → true only if the SAME objects
> ```
>
> **How it's used:** `useAppSelector(selectFilteredTodoIds, shallowEqual)`: after a dispatch, `TodoList` re-renders
> only if the list of ids is different, not merely a new array.

### Build step 10.5: `shallowEqual` in the bindings

In `src/app/redux-bindings.ts`, replace the import line and the `export { Provider };` line with:

```ts
import { Provider, shallowEqual, useDispatch, useSelector } from 'react-redux';
```

```ts
export { Provider, shallowEqual };
```

### Build step 10.6: `TodoList` selects ids; `TodoListItem` selects its own todo

Replace the whole content of `src/ui/TodoList.tsx` with:

```tsx
import { shallowEqual, useAppSelector } from '../app/redux-bindings';
import { selectFilteredTodoIds } from '../features/todos/todosSlice';
import { TodoListItem } from './TodoListItem';

export function TodoList() {
  const todoIds = useAppSelector(selectFilteredTodoIds, shallowEqual);
  console.log('        🖼  TodoList renders');

  return (
    <ul>
      {todoIds.map((todoId) => (
        <TodoListItem key={todoId} id={todoId} />
      ))}
    </ul>
  );
}
```

Replace the whole content of `src/ui/TodoListItem.tsx` with:

```tsx
import { useAppDispatch, useAppSelector } from '../app/redux-bindings';
import { colorSelected, selectTodoById, todoDeleted, todoToggled } from '../features/todos/todosSlice';

const COLORS = ['green', 'blue', 'red'];

export function TodoListItem({ id }: { id: number }) {
  const todo = useAppSelector((state) => selectTodoById(state, id));
  const dispatch = useAppDispatch();
  if (!todo) return null; // the todo was just deleted: draw nothing
  console.log(`        🖼  TodoListItem #${todo.id} renders`);

  return (
    <li>
      <input type="checkbox" checked={todo.completed} onChange={() => dispatch(todoToggled(todo.id))} />{' '}
      {todo.text}{' '}
      <select value={todo.color} onChange={(event) => dispatch(colorSelected(todo.id, event.target.value))}>
        <option value=""></option>
        {COLORS.map((color) => (
          <option key={color} value={color}>
            {color}
          </option>
        ))}
      </select>{' '}
      <button onClick={() => dispatch(todoDeleted(todo.id))}>✕</button>
    </li>
  );
}
```

What changed:
- `TodoList` passes only an `id` to each item. Since it re-renders only when the list of ids changes, ticking a
  todo no longer re-renders it.
- `TodoListItem` receives `id` (typed `{ id: number }`) and selects its own todo with `selectTodoById`. The selector
  is written inline, `(state) => selectTodoById(state, id)`, because it needs the `id` prop; `state` is a
  `RootState` thanks to the typed hook. It returns the todo object from the state, so the item re-renders only when
  **that** todo object is replaced.
- `todo` may be `undefined` (`find`'s result), so TypeScript makes us handle it: `if (!todo) return null`. Both
  hooks are called **before** this `return`: React requires every hook to be called on every render, in the same
  order.
- The handlers use action creators instead of hand-written objects.

### Build step 10.7: `Footer` with the status filter

Replace the whole content of `src/ui/Footer.tsx` with:

```tsx
import { useAppDispatch, useAppSelector } from '../app/redux-bindings';
import { completedCleared, selectRemainingCount } from '../features/todos/todosSlice';
import { selectStatusFilter, statusFilterChanged, statusFilters } from '../features/filters/filtersSlice';

export function Footer() {
  const remaining = useAppSelector(selectRemainingCount);
  const status = useAppSelector(selectStatusFilter);
  const dispatch = useAppDispatch();
  console.log('        🖼  Footer renders');

  return (
    <footer>
      {remaining} item(s) left{' '}
      {statusFilters.map((value) => (
        <button key={value} onClick={() => dispatch(statusFilterChanged(value))}>
          {value === status ? `• ${value}` : value}
        </button>
      ))}{' '}
      <button onClick={() => dispatch(completedCleared())}>Clear completed</button>
    </footer>
  );
}
```

One button per status filter (`statusFilters` from lecture 04). The selected one is marked with `•`. A component
can call `useAppSelector` several times: it re-renders when **any** of its selected values changes.

## Build step 10.8: the demo

Open `demos/10-action-creators-and-selectors.tsx`. Replace the placeholder `🧩 10.8` with:

```tsx
// Lecture 10 demo: action creators, memoized selectors, and who re-renders.
import { rootElement, findAll, click, choose, wait, inAct, printScreen } from '../src/debug/testDom';
import { createSelector as ourCreateSelector } from '../src/from-scratch/createSelector';
import { todoToggled, colorSelected } from '../src/features/todos/todosSlice';
import { renderApp } from '../src/main';

console.log('— 1. Action creators only build objects —');
console.log('  todoToggled(2) →', JSON.stringify(todoToggled(2)));
console.log('  colorSelected(1, "red") →', JSON.stringify(colorSelected(1, 'red')));

console.log('\n— 2. Our memoized selector —');
type DemoState = { todos: { text: string; completed: boolean }[] };
const selectDoneTexts = ourCreateSelector([(state: DemoState) => state.todos], (todos: DemoState['todos']) => {
  console.log('    🧠 result function runs');
  return todos.filter((todo) => todo.completed).map((todo) => todo.text);
});
const state1: DemoState = { todos: [{ text: 'Learn Redux', completed: true }] };
const first = selectDoneTexts(state1);
const second = selectDoneTexts(state1);
console.log('  same state twice → same array?', first === second);
const state2: DemoState = { todos: [...state1.todos, { text: 'Walk the dog', completed: true }] };
console.log('  new todos array → new result:', selectDoneTexts(state2));

console.log('\n— 3. The app loads —');
await inAct(() => renderApp(rootElement));
await wait(350);
printScreen();

console.log('\n— 4. Tick todo #2 —');
await click(findAll('li input[type=checkbox]')[1]);

console.log('\n— 5. Choose a color for todo #1 —');
await choose(findAll<HTMLSelectElement>('li select')[0], 'red');

console.log('\n— 6. Filter "active" —');
const filterButton = (label: string) => findAll('footer button').find((button) => button.textContent?.endsWith(label))!;
await click(filterButton('active'));
printScreen();

console.log('\n— 7. Filter "all" again —');
await click(filterButton('all'));
printScreen();
```

`choose(select, value)` (from `testDom.ts`) picks an option in a dropdown, like a user would. `DemoState['todos']`
is an indexed access type: "the type of the `todos` field of `DemoState`". The `!` after `find(…)` tells
TypeScript the button exists (`find` may return `undefined`).

## Run it

```bash
npm run lesson 10
```

Expected output (not run):

```text
— 1. Action creators only build objects —
  todoToggled(2) → {"type":"todos/todoToggled","payload":2}
  colorSelected(1, "red") → {"type":"todos/colorSelected","payload":{"todoId":1,"color":"red"}}

— 2. Our memoized selector —
    🧠 result function runs
  same state twice → same array? true
    🧠 result function runs
  new todos array → new result: [ 'Learn Redux', 'Walk the dog' ]

— 3. The app loads —
  ▶ fetchTodos thunk starts
  🌐 server: GET /fakeApi/todos (answers in 300 ms)
        🖼  Header renders
      🧠 selectFilteredTodos recomputes
        🖼  TodoList renders
        🖼  Footer renders
  ▶ fetchTodos continues after await
    📝 logger: ⟶ todos/todosLoaded
      🧠 selectFilteredTodos recomputes
    📝 logger: ⟵ todos/todosLoaded (changed: todos)
        🖼  TodoList renders
        🖼  TodoListItem #1 renders
        🖼  TodoListItem #2 renders
        🖼  Footer renders
  ┌─ screen
  │ [What needs to be done?]
  │ [x] Learn Redux <green> (✕)
  │ [ ] Build the todo app <blue> (✕)
  │ 1 item(s) left (• all)(active)(completed) (Clear completed)
  └─

— 4. Tick todo #2 —
    📝 logger: ⟶ todos/todoToggled
      🧠 selectFilteredTodos recomputes
    📝 logger: ⟵ todos/todoToggled (changed: todos)
        🖼  TodoListItem #2 renders
        🖼  Footer renders

— 5. Choose a color for todo #1 —
    📝 logger: ⟶ todos/colorSelected
      🧠 selectFilteredTodos recomputes
    📝 logger: ⟵ todos/colorSelected (changed: todos)
        🖼  TodoListItem #1 renders

— 6. Filter "active" —
    📝 logger: ⟶ filters/statusFilterChanged
      🧠 selectFilteredTodos recomputes
    📝 logger: ⟵ filters/statusFilterChanged (changed: filters)
        🖼  TodoList renders
        🖼  Footer renders
  ┌─ screen
  │ [What needs to be done?]
  │ 0 item(s) left (all)(• active)(completed) (Clear completed)
  └─

— 7. Filter "all" again —
    📝 logger: ⟶ filters/statusFilterChanged
    📝 logger: ⟵ filters/statusFilterChanged (changed: filters)
        🖼  TodoList renders
        🖼  TodoListItem #1 renders
        🖼  TodoListItem #2 renders
        🖼  Footer renders
  ┌─ screen
  │ [What needs to be done?]
  │ [x] Learn Redux <red> (✕)
  │ [x] Build the todo app <blue> (✕)
  │ 0 item(s) left (• all)(active)(completed) (Clear completed)
  └─
```

Walk-through:
- **Part 2.** The result function ran for the first call, not for the second (same input → same array, `true`),
  and again for `state2` (new todos array).
- **Part 3.** The first render of `TodoList` ran `selectFilteredTodos` once (`🧠`). When `todosLoaded` arrived, the
  `🧠` line appears **between** the two logger lines: `useSelector` runs the selector inside the store's
  notification, during `dispatch`, to decide whether to re-render. When `TodoList` then re-rendered, `useSelector`
  called the selector again with the same state, and got the remembered result: no second `🧠`.
- **Part 4, the goal of this lecture.** Ticking #2 recomputed the filtered list (the todos changed), and the ids
  array was a new `[1, 2]`. `shallowEqual` found the same ids → `TodoList` did **not** re-render. Item #1's
  selector returned the same object → no re-render. Only item #2 (new object) and `Footer` (1 → 0 left)
  re-rendered. Compare with lecture 08, part 4, where every item re-rendered.
- **Part 5.** Changing #1's color: only #1 re-rendered; the count didn't change, so `Footer` didn't either.
- **Part 6.** "active" with both todos completed → the ids changed from `[1, 2]` to `[]`: `TodoList` re-rendered
  (empty). `Footer` re-rendered because its status selector changed.
- **Part 7.** Back to "all": **no `🧠` line**. The input results (the same todos array, `'all'`, the same colors)
  are a combination Reselect had already seen in part 5, and it remembers every combination, not just the last
  one. It returned the part-5 array without filtering. Our `createSelector`, which remembers only the last inputs
  (from part 6, "active"), would have recomputed. `TodoList` still re-rendered: its ids went from `[]` to `[1, 2]`.

Adding a todo still re-renders every item: `TodoList` re-renders (the ids changed), and a re-rendering parent
re-renders its children. Stopping that takes React's `memo`, which the Redux Toolkit course covers in its
performance lecture.

## The whole picture

```text
dispatch(todoToggled(2)) → reducer → new todos array → store notifies subscribers
   │
   ├─ TodoList:  selectFilteredTodoIds(state)
   │               └─ selectFilteredTodos: inputs changed → 🧠 recompute → new [#1, #2']
   │             ids = new [1, 2] ── shallowEqual(old [1, 2]) → equal → NO re-render
   ├─ Item #1:   selectTodoById(state, 1) → the same #1 object → NO re-render
   ├─ Item #2:   selectTodoById(state, 2) → new #2' object      → re-render
   └─ Footer:    selectRemainingCount → 1 → 0                   → re-render
```

## Summary

| Term | What it is, in one line |
|---|---|
| **action creator** | a function that returns an action object; it dispatches nothing by itself |
| **memoization** | remembering a function's result for given arguments, to return it again without recomputing |
| **memoized selector** | a selector that returns the same result (same reference) when its inputs didn't change |
| **input selector** | a cheap selector that picks the values the computation needs, returning existing references |
| **result function** | the computation of a memoized selector; runs only when an input changed |
| **`createSelector`** | Reselect's builder for memoized selectors; infers types; remembers every input combination |
| **`shallowEqual`** | compares one level deep (same keys, `===` values); `useSelector`'s optional comparison |

**Next lecture:** [11-loading-state-and-normalized-data](11-loading-state-and-normalized-data.md): showing that
something is loading, storing todos by id, handling failed saves, and ignoring a server answer that arrives too
late.
