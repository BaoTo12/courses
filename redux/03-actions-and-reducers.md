# Lecture 03. Actions and reducers: describing events, computing the next state

> **By the end you can:** describe and type every event of the todo app as an action; write a typed reducer that
> handles them without mutating anything; explain the reducer rules and why each one exists; explain how TypeScript
> knows each action's payload inside a `switch`.
> **New terms in this lesson:** action, action type, payload, discriminated union, narrowing, reducer, pure
> function, side effect, initial state
> **You should already know:** state, event, one-way data flow ([01](01-why-redux.md)); reference, mutation,
> immutable update, `deepFreeze`, type assertion ([02](02-immutability.md))
> **Project files you fill in:** `src/features/todos/todosSlice.ts` (🧩 03.1–03.3),
> `demos/03-actions-and-reducers.ts` (🧩 03.4)

Lecture 01 ended with three Redux rules. This lecture turns rule 2 ("every event is a plain object") and rule 3
("the new state is computed by a pure function") into the first real code of the todo app.

## 1. Action: an event, written as a plain object

In lecture 01 we wrote events as `{ type: 'todoAdded', text: 'Walk the dog' }`. Redux calls such an object an
**action**: a plain JavaScript object that describes **something that happened** in the app.

```ts
{ type: 'todos/todoAdded', payload: 'Learn Redux' }
```

An action is only a description, like a note saying "a todo was added". It doesn't *do* anything. Something else
(section 5) reads the note and changes the state.

"Plain object" means made with `{ … }`: not a class instance, not a function, not a Promise. Plain objects can be
logged, saved, sent over the network and compared, which is what makes Redux's tooling possible.

## 2. Action type: the name of the event

Every action must have a field `type`, a string: the **action type**. It's the name of the event, and the only
thing Redux itself looks at.

Redux's naming convention is `'domain/eventName'`:
- **domain**: the part of the app it belongs to (`todos`, `filters`);
- **eventName**: what happened, in the past tense (`todoAdded`, `todoToggled`), because an action describes
  something that **already happened**, not a command ("addTodo").

## 3. Payload: the details of the event

Most events carry details: *which* todo was toggled, *what* text was typed. By convention, the details go in a field
called **`payload`**. It can be any value: a string, a number, an object.

Here are all the actions of our todo list:

| Action type | Payload | Meaning |
|---|---|---|
| `'todos/todoAdded'` | the text, e.g. `'Learn Redux'` | the user added a todo |
| `'todos/todoToggled'` | the todo id, e.g. `1` | the user ticked/unticked a todo |
| `'todos/colorSelected'` | `{ todoId: 2, color: 'blue' }` | the user picked a color for a todo |
| `'todos/todoDeleted'` | the todo id | the user deleted a todo |
| `'todos/completedCleared'` | (none) | the user clicked "Clear completed" |

And a todo looks like this: `{ id: 1, text: 'Learn Redux', completed: false, color: '' }`.

## 4. Typing actions: a discriminated union

In TypeScript, we write the list of possible actions as one type: a union with one member per action.

```ts
export type TodosAction =
  | { type: 'todos/todoAdded'; payload: string }
  | { type: 'todos/todoToggled'; payload: number };
```

Each member has a `type` field whose type is one **exact string** (a string literal type), different in every
member. A union whose members share such a field with a different literal in each is called a **discriminated
union**; the shared field (`type`) is the discriminant.

Why it matters: when code checks the discriminant, TypeScript **narrows** the union to the matching member. After
`if (action.type === 'todos/todoToggled')`, TypeScript knows `action.payload` is a `number`. Narrowing is
TypeScript reducing a type to a more precise one after a check. It also means:

- `{ type: 'todos/todoAdded', payload: 42 }` is a compile error (the payload must be a string);
- `{ type: 'todos/todoAded', … }` (misspelled) is a compile error: that type isn't in the union.

That's exactly how lecture 01's `AppEvent` worked.

## 5. Reducer: (old state, action) → new state

A **reducer** is a function that receives the current state and an action, and returns the **next** state:

```ts
(state: TodosState, action: TodosAction) => TodosState
```

It's the `handle(event)` function of lecture 01, with one difference: it doesn't change anything outside itself.
It *returns* the result.

### Where the name comes from

Arrays have a method `reduce`. It walks over a list and keeps one running value, the "accumulator". For each item,
it calls your function with (the value so far, the item) and keeps what you return:

```ts
[1, 2, 3].reduce((sum, n) => sum + n, 0);   // 0+1=1, 1+2=3, 3+3=6 → 6
```

Replace "numbers" with "actions" and "sum" with "state": a Redux reducer has exactly the shape of the function you
give to `reduce`. If you had the list of every action that ever happened, you could compute today's state with
`actions.reduce(reducer, startState)`. Our demo does exactly that (part 4).

## 6. The reducer rules

A reducer must follow three rules:

1. **It computes the new state only from its arguments** (`state` and `action`).
2. **It never modifies the existing state.** It makes immutable updates: copies with the change (lecture 02).
3. **It has no side effects.** A **side effect** is anything a function does *besides* returning a value that can
   be noticed from outside: writing to a variable outside the function, calling a server, writing to disk or to the
   console, starting a timer. It also must not use random values (`Math.random()`, `Date.now()`): those give a
   different result each time.

A function that follows rules 1 and 3 (same input → always the same output, and nothing else happens) is called a
**pure function**. A reducer is a pure function that also doesn't mutate its input (rule 2).

Why so strict?
- **Predictable.** Given the same state and action, you always get the same new state. Bugs can be reproduced.
- **Change detection.** Because the reducer returns a new object when something changes, `old !== new` tells the
  rest of the app "redraw" (lecture 02). A mutation would hide the change.
- **Replay and testing.** You can call a reducer with any state and any action and check the result: no server,
  no screen, no setup. The demo calls ours by hand.

So where do server calls go? Not in reducers. Lecture 09 gives them their own place.

## 7. Initial state: the state before any action

The very first time the reducer is called, there is no state yet: Redux passes `undefined`. The reducer must then
answer with its **initial state**: the value the state has when the app starts. A default parameter handles it:
`function todosReducer(state: TodosState = initialState, action: TodosAction)`. With a default value, TypeScript
lets callers pass `undefined` for `state`, and inside the function `state` is never `undefined`.

## 8. Building the todos reducer

### Build step 03.1: the types and the initial state

Open `src/features/todos/todosSlice.ts`. Replace the placeholder `🧩 03.1` with:

```ts
export interface Todo {
  id: number;
  text: string;
  completed: boolean;
  color: string; // '' means "no color"
}

export type TodosState = Todo[];

const initialState: TodosState = [];
```

What each part does:
- `Todo` describes one todo. Every todo in the app has exactly these four fields.
- `TodosState` is the type of this part of the state: an array of todos. Giving it a name means that when the
  shape changes (lecture 11), one line changes.
- `initialState`: at the start, no todos.

### Build step 03.2: the first two actions and the reducer

In the same file, replace the placeholder `🧩 03.2` (the comment and the stub `todosReducer` function) with:

```ts
export type TodosAction =
  | { type: 'todos/todoAdded'; payload: string }
  | { type: 'todos/todoToggled'; payload: number };

function nextTodoId(todos: TodosState): number {
  const maxId = todos.reduce((max, todo) => Math.max(todo.id, max), 0);
  return maxId + 1;
}

export function todosReducer(state: TodosState = initialState, action: TodosAction): TodosState {
  switch (action.type) {
    case 'todos/todoAdded':
      return [...state, { id: nextTodoId(state), text: action.payload, completed: false, color: '' }];
    case 'todos/todoToggled':
      return state.map((todo) => (todo.id === action.payload ? { ...todo, completed: !todo.completed } : todo));
    default:
      return state;
  }
}
```

What each part does:
- `TodosAction`: the discriminated union of the actions this reducer handles (section 4).
- `nextTodoId(todos)` finds the biggest id in the list and adds 1. It only uses its argument, so it's pure: the
  same list always gives the same id. (A random id would break rule 3.)
- `state: TodosState = initialState`: on the first call, `state` is `undefined`, so it becomes `[]`.
- The return type `: TodosState` makes TypeScript check that **every** branch returns a valid todos array.
- `switch (action.type)`: the reducer looks at the action type to decide what to do. Inside each `case`, TypeScript
  has narrowed `action`: in `'todos/todoAdded'`, `action.payload` is a `string`; in `'todos/todoToggled'`, a
  `number`.
- `'todos/todoAdded'`: returns a **new** array: all the old todos (`...state`) plus a new todo object.
- `'todos/todoToggled'`: returns a new array where the todo whose id is the payload is replaced by a **copy** with
  `completed` flipped. All other todos are returned as they are (structural sharing, lecture 02).
- `default: return state`: an action this reducer doesn't know returns the **same** state object. That is how the
  rest of the app learns "nothing changed here". (Why would an unknown action ever arrive, if the type only allows
  `TodosAction`? Lecture 04: the app's other reducers' actions reach this one too.)

### Build step 03.3: the other three actions

Replace `TodosAction` and `todosReducer` with these complete versions (the first two members and cases are the
same; three are added):

```ts
export type TodosAction =
  | { type: 'todos/todoAdded'; payload: string }
  | { type: 'todos/todoToggled'; payload: number }
  | { type: 'todos/colorSelected'; payload: { todoId: number; color: string } }
  | { type: 'todos/todoDeleted'; payload: number }
  | { type: 'todos/completedCleared' };

export function todosReducer(state: TodosState = initialState, action: TodosAction): TodosState {
  switch (action.type) {
    case 'todos/todoAdded':
      return [...state, { id: nextTodoId(state), text: action.payload, completed: false, color: '' }];
    case 'todos/todoToggled':
      return state.map((todo) => (todo.id === action.payload ? { ...todo, completed: !todo.completed } : todo));
    case 'todos/colorSelected': {
      const { todoId, color } = action.payload;
      return state.map((todo) => (todo.id === todoId ? { ...todo, color } : todo));
    }
    case 'todos/todoDeleted':
      return state.filter((todo) => todo.id !== action.payload);
    case 'todos/completedCleared':
      return state.filter((todo) => !todo.completed);
    default:
      return state;
  }
}
```

What the new parts do:
- `'todos/completedCleared'` has no `payload` field at all: the event needs no details.
- `'todos/colorSelected'`: the payload is an object, so we take its two fields out with destructuring. The `{ … }`
  braces around the case create a block, so the `const` names don't clash with other cases.
- `'todos/todoDeleted'`: `filter` returns a new array without the todo whose id is the payload.
- `'todos/completedCleared'`: `filter` keeps only the todos that aren't completed.

None of the cases uses `push`, `splice` or `=` on the state: every change is a new array or a new object. (If you
misspell a case, `case 'todos/todoDelete':`, TypeScript reports that this string can never equal `action.type`.)

### Build step 03.4: the demo

Open `demos/03-actions-and-reducers.ts`. Replace the placeholder `🧩 03.4` with:

```ts
// Lecture 03 demo: the todos reducer, called by hand.
import { deepFreeze } from '../src/utils/deepFreeze';
import { todosReducer, type TodosAction, type TodosState } from '../src/features/todos/todosSlice';

function show(todos: TodosState): void {
  if (todos.length === 0) console.log('    (no todos)');
  for (const todo of todos) {
    const color = todo.color ? ` (${todo.color})` : '';
    console.log(`    ${todo.completed ? '[x]' : '[ ]'} #${todo.id} ${todo.text}${color}`);
  }
}

console.log('— 1. The first call: there is no state yet —');
let state = todosReducer(undefined, { type: 'todos/completedCleared' });
show(state);

console.log('\n— 2. One action at a time —');
const actions: TodosAction[] = [
  { type: 'todos/todoAdded', payload: 'Learn Redux' },
  { type: 'todos/todoAdded', payload: 'Walk the dog' },
  { type: 'todos/todoToggled', payload: 1 },
  { type: 'todos/colorSelected', payload: { todoId: 2, color: 'blue' } },
];
for (const action of actions) {
  const before = deepFreeze(state); // if the reducer mutated `before`, this would throw
  state = todosReducer(before, action);
  const payload = 'payload' in action ? JSON.stringify(action.payload) : '';
  console.log(`  🧮 ${action.type} ${payload} → new array: ${state !== before}`);
}
show(state);

console.log('\n— 3. An action this reducer does not handle —');
// An action of ANOTHER part of the app. The reducer's type only accepts TodosAction, so we force it with `as`.
const otherAction = { type: 'filters/statusFilterChanged', payload: 'active' } as unknown as TodosAction;
const same = todosReducer(state, otherAction);
console.log('  same array returned:', same === state);

console.log('\n— 4. Replay: the state is the actions, "reduced" one by one —');
const allActions: TodosAction[] = [...actions, { type: 'todos/completedCleared' }];
const replayed = allActions.reduce(todosReducer, [] as TodosState);
show(replayed);

console.log('\n— 5. A reducer that mutates, caught by deepFreeze —');
function mutatingReducer(state: TodosState, action: TodosAction): TodosState {
  if (action.type === 'todos/todoToggled') {
    const todo = state.find((t) => t.id === action.payload);
    if (todo) todo.completed = !todo.completed; // ✗ mutation
    return state;
  }
  return state;
}
try {
  mutatingReducer(deepFreeze(state), { type: 'todos/todoToggled', payload: 2 });
} catch (error) {
  console.log('  ❌', (error as Error).message);
}
```

What it does:
- `import { …, type TodosAction }`: the `type` keyword marks names that are only types; they are removed when the
  code runs.
- `show` prints a todo list.
- **Part 1** calls the reducer with `state` `undefined`, like Redux's first call. Any action works here; we use one
  that the reducer knows, since the type only allows those.
- **Part 2** freezes the state **before** each call: if our reducer mutated it, the demo would crash.
  `'payload' in action` narrows the union to the members that have a payload (`completedCleared` has none).
- **Part 3** passes an action from another part of the app. `as unknown as TodosAction` is a double type assertion:
  TypeScript refuses to treat a `filters/…` object as a `TodosAction` directly (the types don't overlap), so we go
  through `unknown`. It's a way of saying "I know better, on purpose"; lecture 04 shows the real situation where this
  happens without any assertion.
- **Part 4** replays the actions with `reduce`, starting from an empty list.
- **Part 5** is a reducer that breaks rule 2 on purpose, to see the crash happen. TypeScript allows it: types don't
  prevent mutation unless you use `readonly` (lecture 02).

## Run it

```bash
npm run lesson 03
```

Expected output (not run):

```text
— 1. The first call: there is no state yet —
    (no todos)

— 2. One action at a time —
  🧮 todos/todoAdded "Learn Redux" → new array: true
  🧮 todos/todoAdded "Walk the dog" → new array: true
  🧮 todos/todoToggled 1 → new array: true
  🧮 todos/colorSelected {"todoId":2,"color":"blue"} → new array: true
    [x] #1 Learn Redux
    [ ] #2 Walk the dog (blue)

— 3. An action this reducer does not handle —
  same array returned: true

— 4. Replay: the state is the actions, "reduced" one by one —
    [ ] #2 Walk the dog (blue)

— 5. A reducer that mutates, caught by deepFreeze —
  ❌ Cannot assign to read only property 'completed' of object '#<Object>'
```

Walk-through, step by step, with the values:

| Call | `state` before | Action | `state` after |
|---|---|---|---|
| 1 | `undefined` → `[]` (initial state) | `completedCleared` | `[]` (filtering an empty list) |
| 2 | `[]` | `todoAdded 'Learn Redux'` | `[#1 Learn Redux]`: `nextTodoId([])` = 0+1 = 1 |
| 3 | `[#1]` | `todoAdded 'Walk the dog'` | `[#1, #2]`: max id 1, +1 = 2 |
| 4 | `[#1, #2]` | `todoToggled 1` | `[#1 completed, #2]`: a new array, a new #1, the same #2 |
| 5 | … | `colorSelected {2, blue}` | `[#1 completed, #2 blue]` |

- Every `→ new array: true` line proves the reducer returned a new array, and since `before` was frozen, also
  proves it didn't mutate anything (otherwise it would have thrown).
- **Part 3:** the `filters/…` action fell into `default` and got back the **same** array.
- **Part 4:** `reduce` replayed the four actions plus `completedCleared`, which removed the completed #1. The result
  is exactly what calling the reducer five times by hand gives: the state is "all the actions, reduced".
- **Part 5:** the mutating reducer tried to write `todo.completed`, and the frozen object refused.

## The whole picture

```text
                        todosReducer  (pure: no mutation, no side effects)
                      ┌──────────────────────────────────────────────┐
 state (old)  ──────► │ switch (action.type)      ← narrows the union │
 TodosState           │   'todos/todoAdded'   → [...state, newTodo]   │ ──────► state (new): TodosState
                      │   'todos/todoToggled' → state.map(copy one)   │         (or the SAME state
 action       ──────► │   …                                           │          for unknown actions)
 TodosAction          │   default             → state                 │
                      └──────────────────────────────────────────────┘
```

So far nobody calls the reducer except our demo. Lecture 05 builds the object that keeps the state and calls the
reducer for every action.

## Summary

| Term | What it is, in one line |
|---|---|
| **action** | a plain object describing something that happened: `{ type, payload? }` |
| **action type** | the action's name, a string like `'todos/todoAdded'` (domain/eventName, past tense) |
| **payload** | by convention, the field holding the event's details |
| **discriminated union** | a union whose members each have a different literal in a shared field (`type`) |
| **narrowing** | TypeScript reducing a union to the matching member after a check like `action.type === '…'` |
| **reducer** | `(state, action) => newState`; the shape of the function you give to `Array.prototype.reduce` |
| **pure function** | same input → same output, and no side effects |
| **side effect** | anything noticeable a function does besides returning (I/O, outside variables, timers, randomness) |
| **initial state** | what the reducer returns when called with `state === undefined` |

**Next lecture:** [04-combining-reducers](04-combining-reducers.md): the app also has filters; we write a second
reducer and combine both into the reducer of the whole app, and get the type of the whole state for free.
