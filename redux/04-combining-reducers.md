# Lecture 04. Combining reducers: one state tree, one reducer per slice

> **By the end you can:** design and type the state tree of an app; write a second slice reducer; build
> `combineReducers` yourself and explain why it returns the same object when nothing changed; use Redux's
> `combineReducers`; get the type of the whole state from the root reducer.
> **New terms in this lesson:** state tree, derived data, slice, slice reducer, root reducer, `combineReducers`,
> `RootState`, `RootAction`
> **You should already know:** action, discriminated union, reducer, initial state ([03](03-actions-and-reducers.md));
> immutable update, structural sharing, type assertion ([02](02-immutability.md))
> **Project files you fill in:** `src/features/filters/filtersSlice.ts` (🧩 04.1),
> `src/from-scratch/combineReducers.ts` (🧩 04.2), `src/app/rootReducer.ts` (🧩 04.3),
> `demos/04-combining-reducers.ts` (🧩 04.5)

## 1. The problem: one reducer for everything gets huge

Our app has two kinds of data: the **todos**, and the **filters** (show all / only active / only completed todos,
and which colors to show). We could put both in one object and handle every action in one giant reducer:

```ts
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'todos/todoAdded':             return { ...state, todos: [...state.todos, …] };
    case 'filters/statusFilterChanged': return { ...state, filters: { ...state.filters, status: … } };
    // … 20 more cases, all copying the outer object too
  }
}
```

Every case must copy the outer object as well as its own part; every developer edits the same function. It doesn't
scale. Redux's answer: **split the state into parts, and write one small reducer per part.**

## 2. State tree and derived data: designing the state

The whole state of a Redux app is one object, usually with one field per area of the app. Because it nests
(objects inside objects), it's often called the **state tree**. Ours:

```ts
{
  todos: [ { id: 1, text: 'Learn Redux', completed: false, color: '' }, … ],
  filters: { status: 'all', colors: [] },
}
```

What do we **not** put in it? "How many todos are left", "the list of todos the filters let through". Those can be
computed from what's already there. A value that can be computed from other state is called **derived data**. Keep
it **out** of the state. If you stored it, you'd have two copies of the same information, which is the lecture 01
bug: someone forgets to update one of them. Lecture 07 shows where derived data is computed instead.

## 3. Slice and slice reducer

Each top-level field of the state tree is called a **slice** of the state: `state.todos` is the todos slice,
`state.filters` is the filters slice. A reducer that manages one slice is a **slice reducer**. It receives **only
its own slice** as `state`, not the whole tree.

Our `todosReducer` from lecture 03 is already a slice reducer: its `state` is the todos array. Now we write the
filters one.

### Build step 04.1: the filters slice

Open `src/features/filters/filtersSlice.ts`. Replace the placeholder `🧩 04.1` (the comment and the
`filtersReducer` stub under it) with:

```ts
export type StatusFilter = 'all' | 'active' | 'completed';

export const statusFilters: StatusFilter[] = ['all', 'active', 'completed'];

export interface FiltersState {
  status: StatusFilter;
  colors: string[];
}

export type FiltersAction =
  | { type: 'filters/statusFilterChanged'; payload: StatusFilter }
  | { type: 'filters/colorFilterChanged'; payload: { color: string; changeType: 'added' | 'removed' } };

const initialState: FiltersState = {
  status: 'all',
  colors: [],
};

export function filtersReducer(state: FiltersState = initialState, action: FiltersAction): FiltersState {
  switch (action.type) {
    case 'filters/statusFilterChanged':
      return { ...state, status: action.payload };
    case 'filters/colorFilterChanged': {
      const { color, changeType } = action.payload;
      if (changeType === 'added') {
        if (state.colors.includes(color)) return state; // already there: nothing changes
        return { ...state, colors: [...state.colors, color] };
      }
      return { ...state, colors: state.colors.filter((existing) => existing !== color) }; // 'removed'
    }
    default:
      return state;
  }
}
```

What each part does:
- `StatusFilter` lists the three allowed status values as a union of string literals. A typo like `'actve'`
  anywhere in the app is a compile error. `statusFilters` is the same three values as an array, for code that
  needs to loop over them (the footer's buttons, lecture 10).
- `FiltersState`: the filters slice's type. `FiltersAction`: its two actions, a discriminated union (lecture 03).
- `initialState`: show all todos, no color filter.
- `'filters/statusFilterChanged'`: payload is the new status. A new filters object with `status` replaced.
- `'filters/colorFilterChanged'`: payload is `{ color, changeType }`. After the `if (changeType === 'added')`
  block, TypeScript knows the only possibility left is `'removed'`. Adding a color that's already selected returns
  the **same** state: nothing changed, so we must not make a new object (a new object would tell everyone
  "changed!" for nothing).

## 4. Root reducer: the reducer of the whole tree

Redux needs ONE reducer for the whole state tree. That one is called the **root reducer**. Its job is simple: give
each slice reducer its slice, and put the results together.

### The naive root reducer

```ts
function handWrittenRoot(state: Partial<RootState> = {}, action: RootAction): RootState {
  return {
    todos: todosReducer(state.todos, action as TodosAction),
    filters: filtersReducer(state.filters, action as FiltersAction),
  };
}
```

(`Partial<T>` makes every field of `T` optional: before the first action, there are no slices yet.)

Notice the two `as`: **every** action is given to **every** slice reducer, so `todosReducer` does receive filters
actions, although its type says it only accepts `TodosAction`. That's why lecture 03's `default: return state`
matters, and why we needed an assertion in its demo. The real `combineReducers` hides this mismatch in its own
types, so your code doesn't need the assertions.

Run it by hand with an action nobody handles, `{ type: 'nothing/happened' }`:
1. `todosReducer(state.todos, action)` hits `default` → returns the **same** todos array.
2. `filtersReducer(state.filters, action)` hits `default` → returns the **same** filters object.
3. `return { … }` builds a **new** root object around them.

So nothing changed, but the root object is new: `newState !== oldState`. Anyone checking "did the state change?"
with `===` gets a wrong "yes". The demo (part 1) shows it.

### Build step 04.2: our own `combineReducers`

The fix: build the new root object only if at least one slice changed. Because this pattern is the same for every
app, we write it once, as a function that **builds** a root reducer from an object of slice reducers.

Open `src/from-scratch/combineReducers.ts`. Replace the placeholder `🧩 04.2` with:

```ts
// Our own version of Redux's combineReducers, to see how it works.
type AnyReducer = (state: any, action: any) => any;

export function combineReducers<M extends Record<string, AnyReducer>>(reducers: M) {
  type State = { [K in keyof M]: ReturnType<M[K]> }; // { todos: TodosState, filters: FiltersState }
  type Action = Parameters<M[keyof M]>[1]; // TodosAction | FiltersAction

  const keys = Object.keys(reducers) as (keyof M)[]; // ['todos', 'filters']

  return function combination(state: Partial<State> = {}, action: Action): State {
    let hasChanged = false;
    const nextState = {} as State;
    for (const key of keys) {
      const previousSlice = state[key];
      const nextSlice = reducers[key](previousSlice, action); // each reducer gets ONLY its own slice
      nextState[key] = nextSlice;
      hasChanged = hasChanged || nextSlice !== previousSlice;
    }
    return hasChanged ? nextState : (state as State); // nothing changed → the SAME root object
  };
}
```

What each part does, the code first:
- `combineReducers(reducers)` runs **once**, when the app starts. It receives `{ todos: todosReducer, filters:
  filtersReducer }` and returns a new function, `combination`. That returned function **is** the root reducer.
- `combination(state, action)` runs on **every** action. For each key, it calls that slice's reducer with only that
  slice (`state[key]`) and stores the result under the same key.
- `hasChanged` becomes `true` as soon as one slice reducer returns a different object.
- At the end: something changed → the new root; nothing changed → the **old** root, unchanged.

Then the types, which compute the state's type from the reducers you pass:
- `AnyReducer`: "any function of (state, action)". `any` switches type checking off for those values; we use it
  because this helper must accept every possible reducer.
- `M extends Record<string, AnyReducer>`: `M` is the type of the object you pass, e.g.
  `{ todos: typeof todosReducer; filters: typeof filtersReducer }`.
- `State` is a **mapped type**: "for each key `K` of `M`, the type that `M[K]` returns". `ReturnType<F>` is a
  built-in type that gives a function type's return type. Result: `{ todos: TodosState; filters: FiltersState }`.
- `Action`: `Parameters<F>` gives a function's parameter types as a tuple; `[1]` takes the second one (the action).
  Over all reducers it gives `TodosAction | FiltersAction`.
- `{} as State` and `state as State`: assertions where TypeScript can't follow the loop's logic (it doesn't know
  that the loop fills every key).

Run it by hand with `{ type: 'filters/statusFilterChanged', payload: 'active' }`:

| key | previousSlice | nextSlice | same? | hasChanged |
|---|---|---|---|---|
| `todos` | `[]` | `[]` (default case) | yes | `false` |
| `filters` | `{ status: 'all', … }` | `{ status: 'active', … }` (new) | no | `true` |

→ returns `nextState` = `{ todos: <the same array>, filters: <the new object> }`. The todos slice is shared, not
copied: structural sharing at the root level.

### Build step 04.3: the app's root reducer, and the app's types

Open `src/app/rootReducer.ts`. Replace the placeholder `🧩 04.3` (the comment and the stub) with:

```ts
import { combineReducers } from '../from-scratch/combineReducers';
import { todosReducer, type TodosAction } from '../features/todos/todosSlice';
import { filtersReducer, type FiltersAction } from '../features/filters/filtersSlice';

export const rootReducer = combineReducers({
  todos: todosReducer,
  filters: filtersReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export type RootAction = TodosAction | FiltersAction;
```

What each part does:
- The **keys** of the object you pass become the **keys of the state tree**: `todos:` → `state.todos`.
- **`RootState`**: the type of the whole state. We don't write it by hand: `typeof rootReducer` is the root
  reducer's function type, and `ReturnType<…>` takes what it returns: `{ todos: TodosState; filters:
  FiltersState }`. When a slice is added or changed, `RootState` follows automatically.
- **`RootAction`**: every action of the app, the union of the slices' unions. Lecture 05 uses it to type
  `dispatch`.

## 5. The real thing: Redux's `combineReducers`

Redux ships the same function. It works like ours, plus a few safety checks.

> **API card: `combineReducers` (package `redux`)**
>
> **What it is:** builds a root reducer from an object of slice reducers.
>
> ```ts
> function combineReducers<M extends ReducersMapObject>(
>   reducers: M,   // one slice reducer per key of the state tree
> ): Reducer<StateFromReducersMapObject<M>, ActionFromReducersMapObject<M>, Partial<…>>;
> //  └ the root reducer: (state, action) => newState, with the state type computed from M (like our `State`)
> ```
>
> **What it does, step by step:**
> 1. When you call it: it keeps the keys whose value is a function, and **checks every slice reducer**: it calls
>    each one with `state = undefined` and a special init action. If one returns `undefined`, it remembers the
>    error.
> 2. When the root reducer is called: if step 1 found a problem, it throws that error now.
> 3. For each key: calls the slice reducer with its slice; if a slice reducer returns `undefined`, it throws.
> 4. Returns the new root object if any slice changed (or if the state had extra/missing keys), otherwise the old
>    one. That's our `hasChanged` logic.
>
> **What our project passes / gets back:** `{ todos: todosReducer, filters: filtersReducer }` → `rootReducer`,
> whose state is `{ todos: TodosState; filters: FiltersState }`.
>
> **If you left it out:** you would write the root reducer by hand, with an assertion per slice, and probably make
> the "new root object for nothing" mistake of section 4.

### Build step 04.4: switch to the real `combineReducers`

In `src/app/rootReducer.ts`, replace the first line:

```ts
import { combineReducers } from '../from-scratch/combineReducers';
```

with:

```ts
import { combineReducers } from 'redux';
```

Nothing else changes: the real one takes the same argument, returns the same kind of function, and `RootState` is
still `{ todos: TodosState; filters: FiltersState }`. Your version stays in `src/from-scratch/` so you can compare.

### Build step 04.5: the demo

Open `demos/04-combining-reducers.ts`. Replace the placeholder `🧩 04.5` with:

```ts
// Lecture 04 demo: two slice reducers, combined into the root reducer.
import { combineReducers } from 'redux';
import { todosReducer, type TodosAction } from '../src/features/todos/todosSlice';
import { filtersReducer, type FiltersAction } from '../src/features/filters/filtersSlice';
import { combineReducers as ourCombineReducers } from '../src/from-scratch/combineReducers';
import { rootReducer, type RootAction, type RootState } from '../src/app/rootReducer';

// An action no reducer handles. RootAction doesn't include it, so we force the type.
const nothingHappened = { type: 'nothing/happened' } as unknown as RootAction;
const firstAction: RootAction = { type: 'todos/completedCleared' };

console.log('— 1. A root reducer written by hand —');
function handWrittenRoot(state: Partial<RootState> = {}, action: RootAction): RootState {
  return {
    todos: todosReducer(state.todos, action as TodosAction),
    filters: filtersReducer(state.filters, action as FiltersAction),
  };
}
const s1 = handWrittenRoot(undefined, firstAction);
console.log('  initial state:', JSON.stringify(s1));
const s1b = handWrittenRoot(s1, nothingHappened);
console.log('  after an unknown action: same root object?', s1b === s1, '| same todos?', s1b.todos === s1.todos);

console.log('\n— 2. Our combineReducers —');
const ourRoot = ourCombineReducers({ todos: todosReducer, filters: filtersReducer });
const s2 = ourRoot(undefined, firstAction);
console.log('  initial state:', JSON.stringify(s2));
console.log('  after an unknown action: same root object?', ourRoot(s2, nothingHappened) === s2);

console.log('\n— 3. The real rootReducer, action by action —');
let state = rootReducer(undefined, firstAction);
const actions: RootAction[] = [
  { type: 'todos/todoAdded', payload: 'Learn Redux' },
  { type: 'filters/statusFilterChanged', payload: 'active' },
  { type: 'filters/colorFilterChanged', payload: { color: 'red', changeType: 'added' } },
  { type: 'filters/colorFilterChanged', payload: { color: 'red', changeType: 'added' } },
  nothingHappened,
];
for (const action of actions) {
  const before = state;
  state = rootReducer(before, action);
  const changed = (Object.keys(state) as (keyof RootState)[]).filter((key) => state[key] !== before[key]);
  console.log(`  🧮 ${action.type.padEnd(28)} changed: ${changed.join(', ') || 'nothing'} | new root: ${state !== before}`);
}
console.log('  final state:', JSON.stringify(state));

console.log('\n— 4. Redux checks every slice reducer —');
// A reducer with no initial state and no default case. `any` switches off type checking for it,
// so that we can see Redux's own check at runtime.
const forgotDefault: any = (state: number | undefined, action: RootAction) => {
  if (action.type === 'todos/completedCleared') return 1;
};
const brokenRoot = combineReducers({ todos: todosReducer, forgotDefault });
try {
  brokenRoot(undefined, nothingHappened);
} catch (error) {
  console.log('  ❌', (error as Error).message);
}
```

What it does:
- `nothingHappened` is an action no reducer handles. Since `RootAction` lists only real actions, TypeScript would
  refuse it: in your app, that's a feature (a misspelled type is caught). In this demo we want one on purpose.
- `firstAction` plays the role of Redux's init action for the first call.
- Part 3 prints, for each action, which slices changed (the same `!==` check `combineReducers` makes).
  `Object.keys` returns `string[]`; the assertion says the keys are keys of `RootState`, so `state[key]` is allowed.
- Part 4 makes a slice reducer that forgets its initial state and its `default` case, to see Redux's check.

## Run it

```bash
npm run lesson 04
```

Expected output (not run):

```text
— 1. A root reducer written by hand —
  initial state: {"todos":[],"filters":{"status":"all","colors":[]}}
  after an unknown action: same root object? false | same todos? true

— 2. Our combineReducers —
  initial state: {"todos":[],"filters":{"status":"all","colors":[]}}
  after an unknown action: same root object? true

— 3. The real rootReducer, action by action —
  🧮 todos/todoAdded              changed: todos | new root: true
  🧮 filters/statusFilterChanged  changed: filters | new root: true
  🧮 filters/colorFilterChanged   changed: filters | new root: true
  🧮 filters/colorFilterChanged   changed: nothing | new root: false
  🧮 nothing/happened             changed: nothing | new root: false
  final state: {"todos":[{"id":1,"text":"Learn Redux","completed":false,"color":""}],"filters":{"status":"active","colors":["red"]}}

— 4. Redux checks every slice reducer —
  ❌ The slice reducer for key "forgotDefault" returned undefined during initialization. If the state passed to the reducer is undefined, you must explicitly return the initial state. The initial state may not be undefined. If you don't want to set a value for this reducer, you can use null instead of undefined.
```

Walk-through:
- **Part 1.** The initial state shows the tree: each slice reducer filled in its own initial state. After an
  unknown action, the hand-written root is a **new** object (`false`) even though its todos slice is the same
  (`true`): the bug of section 4.
- **Part 2.** Our `combineReducers` returns the **same** root (`true`) when no slice changed.
- **Part 3.** Each action changes only the slice it belongs to: `todos/…` → `todos`, `filters/…` → `filters`.
  The second "add red" changes nothing, because `filtersReducer` returned the same object (red was already
  there), so `combineReducers` returned the same root: `new root: false`.
- **Part 4.** Redux called `forgotDefault` with `state = undefined` while checking, got `undefined` back, and
  threw a message that tells you exactly what to fix. (With proper types, TypeScript would already complain that
  the function can return `undefined`: that's why the demo had to switch checking off.)

## The whole picture

```text
                         rootReducer = combineReducers({ todos, filters })
action: RootAction ──►  ┌────────────────────────────────────────────────┐
                        │  todosReducer(state.todos, action)    ──► todos  │
state: RootState = {    │  filtersReducer(state.filters, action) ─► filters│ ──► same root if no slice changed,
  todos,   ───────────► │                                                │     else { todos, filters } (new)
  filters               └────────────────────────────────────────────────┘
}
RootState = ReturnType<typeof rootReducer>      RootAction = TodosAction | FiltersAction
```

Every action goes to **every** slice reducer. Each one decides for itself whether the action concerns it.

## Summary

| Term | What it is, in one line |
|---|---|
| **state tree** | the whole state: one object, one field per area of the app |
| **derived data** | a value that can be computed from the state; don't store it |
| **slice** | one top-level field of the state tree (`state.todos`) |
| **slice reducer** | a reducer that receives and returns only its own slice |
| **root reducer** | the one reducer for the whole tree; calls every slice reducer |
| **`combineReducers`** | builds a root reducer from `{ key: sliceReducer }`; returns the same root when nothing changed |
| **`RootState`** | the type of the whole state: `ReturnType<typeof rootReducer>` |
| **`RootAction`** | the union of every action type of the app |

**Next lecture:** [05-the-store](05-the-store.md): the object that keeps the state, runs the root reducer on every
action, and tells the rest of the app when the state changed.
