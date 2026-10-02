# Lecture 04. Combining reducers: one state tree, one reducer per slice

> **By the end you can:** design the state tree of an app; write a second slice reducer; build `combineReducers`
> yourself and explain why it returns the same object when nothing changed; use Redux's `combineReducers`.
> **New terms in this lesson:** state tree, derived data, slice, slice reducer, root reducer, `combineReducers`
> **You should already know:** action, payload, reducer, initial state ([03](03-actions-and-reducers.md)); immutable
> update, structural sharing ([02](02-immutability.md))
> **Project files you fill in:** `src/features/filters/filtersSlice.js` (🧩 04.1),
> `src/from-scratch/combineReducers.js` (🧩 04.2), `src/app/rootReducer.js` (🧩 04.3),
> `demos/04-combining-reducers.mjs` (🧩 04.5)

## 1. The problem: one reducer for everything gets huge

Our app has two kinds of data: the **todos**, and the **filters** (show all / only active / only completed todos,
and which colors to show). We could put both in one object and handle every action in one giant reducer:

```js
function appReducer(state, action) {
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

```js
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

Open `src/features/filters/filtersSlice.js`. Replace the placeholder `🧩 04.1` (everything under it) with:

```js
export const StatusFilters = {
  All: 'all',
  Active: 'active',
  Completed: 'completed',
};

const initialState = {
  status: StatusFilters.All,
  colors: [],
};

export function filtersReducer(state = initialState, action) {
  switch (action.type) {
    case 'filters/statusFilterChanged':
      return { ...state, status: action.payload };
    case 'filters/colorFilterChanged': {
      const { color, changeType } = action.payload;
      if (changeType === 'added') {
        if (state.colors.includes(color)) return state; // already there: nothing changes
        return { ...state, colors: [...state.colors, color] };
      }
      if (changeType === 'removed') {
        return { ...state, colors: state.colors.filter((existing) => existing !== color) };
      }
      return state;
    }
    default:
      return state;
  }
}
```

What each part does:
- `StatusFilters` gives the three allowed status values a name, so the rest of the code writes
  `StatusFilters.Active` instead of the string `'active'` (a typo in a name is an error; a typo in a string is a
  silent bug).
- `initialState`: show all todos, no color filter.
- `'filters/statusFilterChanged'`: payload is the new status. A new filters object with `status` replaced.
- `'filters/colorFilterChanged'`: payload is `{ color, changeType }`, where `changeType` is `'added'` or
  `'removed'`. Adding a color that's already selected returns the **same** state: nothing changed, so we must not
  make a new object (a new object would tell everyone "changed!" for nothing).

The two new action types:

| Action type | Payload |
|---|---|
| `'filters/statusFilterChanged'` | `'all'` / `'active'` / `'completed'` |
| `'filters/colorFilterChanged'` | `{ color: 'red', changeType: 'added' }` or `'removed'` |

## 4. Root reducer: the reducer of the whole tree

Redux needs ONE reducer for the whole state tree. That one is called the **root reducer**. Its job is simple: give
each slice reducer its slice, and put the results together.

### The naive root reducer

```js
function handWrittenRoot(state = {}, action) {
  return {
    todos: todosReducer(state.todos, action),
    filters: filtersReducer(state.filters, action),
  };
}
```

Run it by hand with an action nobody handles, `{ type: 'nothing/happened' }`:
1. `todosReducer(state.todos, action)` hits `default` → returns the **same** todos array.
2. `filtersReducer(state.filters, action)` hits `default` → returns the **same** filters object.
3. `return { … }` builds a **new** root object around them.

So nothing changed, but the root object is new: `newState !== oldState`. Anyone checking "did the state change?"
with `===` gets a wrong "yes". The demo (part 1) shows it.

### Build step 04.2: our own `combineReducers`

The fix: build the new root object only if at least one slice changed. Because this pattern is the same for every
app, we write it once, as a function that **builds** a root reducer from an object of slice reducers.

Open `src/from-scratch/combineReducers.js`. Replace the placeholder `🧩 04.2` with:

```js
// Our own version of Redux's combineReducers, to see how it works.
export function combineReducers(reducers) {
  const keys = Object.keys(reducers); // e.g. ['todos', 'filters']

  return function combination(state = {}, action) {
    let hasChanged = false;
    const nextState = {};
    for (const key of keys) {
      const previousSlice = state[key];
      const nextSlice = reducers[key](previousSlice, action); // each reducer gets ONLY its own slice
      nextState[key] = nextSlice;
      hasChanged = hasChanged || nextSlice !== previousSlice;
    }
    return hasChanged ? nextState : state; // nothing changed → the SAME root object
  };
}
```

What each part does:
- `combineReducers(reducers)` runs **once**, when the app starts. It receives `{ todos: todosReducer, filters:
  filtersReducer }` and returns a new function, `combination`. That returned function **is** the root reducer.
- `combination(state, action)` runs on **every** action. For each key, it calls that slice's reducer with only that
  slice (`state[key]`) and stores the result under the same key.
- `hasChanged` becomes `true` as soon as one slice reducer returns a different object.
- At the end: something changed → the new root; nothing changed → the **old** root, unchanged.

Run it by hand with `{ type: 'filters/statusFilterChanged', payload: 'active' }`:

| key | previousSlice | nextSlice | same? | hasChanged |
|---|---|---|---|---|
| `todos` | `[]` | `[]` (default case) | yes | `false` |
| `filters` | `{ status: 'all', … }` | `{ status: 'active', … }` (new) | no | `true` |

→ returns `nextState` = `{ todos: <the same array>, filters: <the new object> }`. The todos slice is shared, not
copied: structural sharing at the root level.

### Build step 04.3: the app's root reducer

Open `src/app/rootReducer.js`. Replace the placeholder `🧩 04.3` with:

```js
import { combineReducers } from '../from-scratch/combineReducers.js';
import { todosReducer } from '../features/todos/todosSlice.js';
import { filtersReducer } from '../features/filters/filtersSlice.js';

export const rootReducer = combineReducers({
  todos: todosReducer,
  filters: filtersReducer,
});
```

The **keys** of the object you pass become the **keys of the state tree**: `todos:` → `state.todos`.

## 5. The real thing: Redux's `combineReducers`

Redux ships the same function. It works like ours, plus a few safety checks.

> **API card: `combineReducers` (package `redux`)**
>
> **What it is:** builds a root reducer from an object of slice reducers.
>
> ```ts
> function combineReducers(
>   reducers: { [key: string]: Reducer },   // one slice reducer per key of the state tree
> ): Reducer;                                // the root reducer: (state, action) => newState
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
> whose state looks like `{ todos: [...], filters: { status, colors } }`.
>
> **If you left it out:** you would write the root reducer by hand, and probably make the "new root object for
> nothing" mistake of section 4.

### Build step 04.4: switch to the real `combineReducers`

In `src/app/rootReducer.js`, replace the first line:

```js
import { combineReducers } from '../from-scratch/combineReducers.js';
```

with:

```js
import { combineReducers } from 'redux';
```

Nothing else changes: the real one takes the same argument and returns the same kind of function. Your version
stays in `src/from-scratch/` so you can compare.

### Build step 04.5: the demo

Open `demos/04-combining-reducers.mjs`. Replace the placeholder `🧩 04.5` with:

```js
// Lecture 04 demo: two slice reducers, combined into the root reducer.
import { combineReducers } from 'redux';
import { todosReducer } from '../src/features/todos/todosSlice.js';
import { filtersReducer } from '../src/features/filters/filtersSlice.js';
import { combineReducers as ourCombineReducers } from '../src/from-scratch/combineReducers.js';
import { rootReducer } from '../src/app/rootReducer.js';

console.log('— 1. A root reducer written by hand —');
function handWrittenRoot(state = {}, action) {
  return {
    todos: todosReducer(state.todos, action),
    filters: filtersReducer(state.filters, action),
  };
}
const s1 = handWrittenRoot(undefined, { type: '@@init' });
console.log('  initial state:', JSON.stringify(s1));
const s1b = handWrittenRoot(s1, { type: 'nothing/happened' });
console.log('  after an unknown action: same root object?', s1b === s1, '| same todos?', s1b.todos === s1.todos);

console.log('\n— 2. Our combineReducers —');
const ourRoot = ourCombineReducers({ todos: todosReducer, filters: filtersReducer });
const s2 = ourRoot(undefined, { type: '@@init' });
console.log('  initial state:', JSON.stringify(s2));
console.log('  after an unknown action: same root object?', ourRoot(s2, { type: 'nothing/happened' }) === s2);

console.log('\n— 3. The real rootReducer, action by action —');
let state = rootReducer(undefined, { type: '@@init' });
const actions = [
  { type: 'todos/todoAdded', payload: 'Learn Redux' },
  { type: 'filters/statusFilterChanged', payload: 'active' },
  { type: 'filters/colorFilterChanged', payload: { color: 'red', changeType: 'added' } },
  { type: 'filters/colorFilterChanged', payload: { color: 'red', changeType: 'added' } },
  { type: 'nothing/happened' },
];
for (const action of actions) {
  const before = state;
  state = rootReducer(before, action);
  const changed = Object.keys(state).filter((key) => state[key] !== before[key]);
  console.log(`  🧮 ${action.type.padEnd(28)} changed: ${changed.join(', ') || 'nothing'} | new root: ${state !== before}`);
}
console.log('  final state:', JSON.stringify(state));

console.log('\n— 4. Redux checks every slice reducer —');
const brokenRoot = combineReducers({
  todos: todosReducer,
  forgotDefault: (state, action) => {
    if (action.type === 'something') return 1; // no initial state, no default case
  },
});
try {
  brokenRoot(undefined, { type: '@@init' });
} catch (error) {
  console.log('  ❌', error.message);
}
```

Part 3 prints, for each action, which slices changed (the same `!==` check `combineReducers` makes). Part 4 makes a
slice reducer that forgets its initial state and its `default` case, to see Redux's check.

## Run it

```bash
npm run lesson 04
```

Real output:

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
  threw a message that tells you exactly what to fix.

## The whole picture

```text
                         rootReducer = combineReducers({ todos, filters })
action ──────────────►  ┌───────────────────────────────────────────────┐
                        │  todosReducer(state.todos, action)   ──► todos │
state = {               │  filtersReducer(state.filters, action) ► filters│ ──► same root if no slice changed,
  todos,   ───────────► │                                               │     else { todos, filters } (new)
  filters               └───────────────────────────────────────────────┘
}
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

**Next lecture:** [05-the-store](05-the-store.md): the object that keeps the state, runs the root reducer on every
action, and tells the rest of the app when the state changed.
