# Lecture 02. Immutability: changing data by making copies

> **By the end you can:** explain the difference between a value and a reference; show why `===` cannot see a
> mutation; update objects, arrays and nested data without mutating them; use `deepFreeze` to catch mutations.
> **New terms in this lesson:** reference, mutation, immutable update, shallow copy, structural sharing, freezing
> **You should already know:** state, view, event, one-way data flow ([01-why-redux](01-why-redux.md))
> **Project files you fill in:** `src/utils/deepFreeze.js` (🧩 02.1), `demos/02-immutability.mjs` (🧩 02.2)

In lecture 01, `handle` changed the state in place: `state.todos.push(…)`. Redux forbids that. To understand why,
we need to look at how JavaScript stores objects.

## 1. Reference: a variable holds an address, not the object

When you create an object, JavaScript puts it somewhere in memory. The variable doesn't contain the object itself;
it contains **where** the object is. That "where" is called a **reference**. Think of it as the address of a house:
copying the address onto another piece of paper doesn't build a second house.

```js
const a = { text: 'Learn Redux' };
const b = a;              // copies the REFERENCE (the address), not the object
b.text = 'Learn Redux today';
a.text;                   // 'Learn Redux today': a and b point at the SAME object
a === b;                  // true
```

```text
  a ──┐
      ├──►  { text: 'Learn Redux today' }     one object, two variables
  b ──┘
```

For objects and arrays, `===` compares **references**: "are these the same object?", not "do they contain the
same things?". Two different objects with identical contents are not `===`.

## 2. Mutation: changing an object in place

A **mutation** is a change made *inside* an existing object or array: assigning a property (`todo.completed =
true`), `push`, `splice`, `sort`, `delete obj.key`… The reference stays the same; the contents change.

```js
const todos = [{ id: 1, text: 'Learn Redux', completed: false }];
const before = todos;
todos.push({ id: 2, text: 'Walk the dog', completed: false });
before === todos;   // true, although the array now has 2 items
```

This is the problem. To know whether the view must be drawn again, a program wants to ask "did the state
change?". With mutation, the only way to answer is to compare **everything inside**, item by item, which is slow.
With references, it would be one `===`. But after a mutation, `===` says "same object" and the change is invisible.

## 3. Immutable update: make a new object with the change

An **immutable update** never touches the old object. It creates a **new** object (or array) that contains the
change, and leaves the old one exactly as it was. Then:

- old !== new → "something changed", detected with one `===`;
- the old value is still available (useful for "undo", and for tools that show before/after).

The JavaScript tools for this are the spread syntax `...` and the array methods that return a new array:

| Goal | Mutating (forbidden in Redux) | Immutable (allowed) |
|---|---|---|
| add an item | `list.push(x)` | `[...list, x]` |
| remove an item | `list.splice(i, 1)` | `list.filter((item) => item.id !== id)` |
| change one item | `list[i].done = true` | `list.map((item) => item.id === id ? { ...item, done: true } : item)` |
| change a field | `obj.status = 'all'` | `{ ...obj, status: 'all' }` |

`{ ...obj, status: 'all' }` means: a new object, with all the fields of `obj` copied in, then `status` set to
`'all'` (a later field overwrites an earlier one).

## 4. Shallow copy, and why nested data needs more copies

`{ ...obj }` and `[...list]` make a **shallow copy**: a new object at the top level, whose fields hold the **same
references** as the original. Nested objects are not copied; they are shared.

```js
const state = { filters: { status: 'all', colors: [] } };
const wrongCopy = { ...state };          // a new outer object…
wrongCopy.filters.colors.push('red');    // …but filters is the SAME object as state.filters
state.filters.colors;                    // ['red']: the original changed too
```

```text
  state ─────►  { filters: ─┐ }
                            ├──►  { status: 'all', colors: ['red'] }   one shared inner object
  wrongCopy ─►  { filters: ─┘ }
```

The rule: **copy every level you change, on the path from the top down to the change.**

```js
const rightCopy = {
  ...state2,                                    // level 1: a new state
  filters: {
    ...state2.filters,                          // level 2: a new filters object
    colors: [...state2.filters.colors, 'red'],  // level 3: a new colors array, with the change
  },
};
```

## 5. Structural sharing: copy the path, share the rest

When you change one todo in a list of 1,000, you don't copy all 1,000. `map` builds a new array, but returns the
**same** object for every todo it doesn't change. Only the changed todo is a new object. Reusing the unchanged
parts like this is called **structural sharing**.

```js
const after = list2.map((todo) => (todo.id === 2 ? { ...todo, completed: true } : todo));
after[0] === list2[0];   // true: todo 1 wasn't changed, so it's the same object
after[1] === list2[1];   // false: todo 2 changed, so it's a new object
```

```text
  list2 ──► [ ●, ● ]          after ──► [ ●, ● ]
              │  └► { id: 2, completed: false }     │  └► { id: 2, completed: true }   (new)
              └──────────────────────┬──────────────┘
                                     ▼
                      { id: 1, … }   shared by both arrays
```

This is what makes immutable updates cheap, and it is also what lets a view skip work: "todo 1 is `===` to what I
drew last time, so I don't need to draw it again." Lectures 07 and 10 use exactly this.

## 6. Freezing: make mutation throw an error

A mutation in a big app is easy to write by accident and hard to find. JavaScript can help: `Object.freeze(obj)`
**freezes** an object, so any later attempt to add, remove or change one of its properties fails. In a JavaScript
module (our files are modules) a failed write throws an error instead of silently doing nothing.

`Object.freeze` only freezes one level. We want the whole tree, so we write `deepFreeze`.

### Build step 02.1: `deepFreeze`

Open `src/utils/deepFreeze.js`. Replace the placeholder `🧩 02.1` (the whole `deepFreeze` function) with:

```js
// Freezes an object AND everything inside it, so any later mutation throws an error.
export function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value); // this level: no adding, removing or changing properties
  for (const key of Object.keys(value)) {
    deepFreeze(value[key]); // then every object nested inside
  }
  return value;
}
```

What each part does:
- The first line stops on values that can't or needn't be frozen: `null`, numbers and strings (they are already
  unchangeable), and objects that are already frozen.
- `Object.freeze(value)` freezes this level.
- The loop calls `deepFreeze` on every property, so arrays inside objects, objects inside arrays, and so on are
  frozen too. Calling itself on smaller and smaller parts is called **recursion**.
- It returns the same value, so you can write `const frozen = deepFreeze([...])`.

We'll use it in lecture 03 to **prove** that our reducer never mutates its input.

## Build step 02.2: the demo

Open `demos/02-immutability.mjs`. Replace the placeholder `🧩 02.2` with:

```js
// Lecture 02 demo: references, mutation, and immutable updates.
import { deepFreeze } from '../src/utils/deepFreeze.js';

console.log('— 1. Two variables, one object —');
const a = { text: 'Learn Redux' };
const b = a; // copies the REFERENCE, not the object
b.text = 'Learn Redux today';
console.log('  a.text =', a.text);
console.log('  a === b →', a === b);

console.log('\n— 2. Mutation: the same array, changed inside —');
const todos = [{ id: 1, text: 'Learn Redux', completed: false }];
const before = todos;
todos.push({ id: 2, text: 'Walk the dog', completed: false });
console.log('  length now =', todos.length);
console.log('  before === todos →', before === todos, '(=== cannot see the change)');

console.log('\n— 3. Immutable update: a NEW array —');
const list1 = [{ id: 1, text: 'Learn Redux', completed: false }];
const list2 = [...list1, { id: 2, text: 'Walk the dog', completed: false }];
console.log('  list1.length =', list1.length, '| list2.length =', list2.length);
console.log('  list1 === list2 →', list1 === list2, '(=== sees the change)');

console.log('\n— 4. Nested update: toggle todo 2 —');
const after = list2.map((todo) => (todo.id === 2 ? { ...todo, completed: true } : todo));
console.log('  list2[1].completed =', list2[1].completed, '| after[1].completed =', after[1].completed);
console.log('  after[0] === list2[0] →', after[0] === list2[0], '(untouched todo: SHARED, not copied)');
console.log('  after[1] === list2[1] →', after[1] === list2[1], '(changed todo: a new object)');

console.log('\n— 5. The shallow-copy trap —');
const state = { filters: { status: 'all', colors: [] } };
const wrongCopy = { ...state }; // copies ONE level only
wrongCopy.filters.colors.push('red');
console.log('  state.filters.colors =', state.filters.colors, '(the original changed too!)');

const state2 = { filters: { status: 'all', colors: [] } };
const rightCopy = { ...state2, filters: { ...state2.filters, colors: [...state2.filters.colors, 'red'] } };
console.log('  state2.filters.colors =', state2.filters.colors, '| rightCopy.filters.colors =', rightCopy.filters.colors);

console.log('\n— 6. deepFreeze: make mutation impossible —');
const frozen = deepFreeze([{ id: 1, text: 'Learn Redux', completed: false }]);
try {
  frozen[0].completed = true;
} catch (error) {
  console.log('  ❌ frozen[0].completed = true →', error.message);
}
try {
  frozen.push({ id: 2 });
} catch (error) {
  console.log('  ❌ frozen.push(…) →', error.message);
}
const copy = frozen.map((todo) => ({ ...todo, completed: true }));
console.log('  ✅ a copy works: copy[0].completed =', copy[0].completed, '| frozen[0].completed =', frozen[0].completed);
```

Each numbered part of the demo is one section of this lecture, run for real.

## Run it

```bash
npm run lesson 02
```

Real output:

```text
— 1. Two variables, one object —
  a.text = Learn Redux today
  a === b → true

— 2. Mutation: the same array, changed inside —
  length now = 2
  before === todos → true (=== cannot see the change)

— 3. Immutable update: a NEW array —
  list1.length = 1 | list2.length = 2
  list1 === list2 → false (=== sees the change)

— 4. Nested update: toggle todo 2 —
  list2[1].completed = false | after[1].completed = true
  after[0] === list2[0] → true (untouched todo: SHARED, not copied)
  after[1] === list2[1] → false (changed todo: a new object)

— 5. The shallow-copy trap —
  state.filters.colors = [ 'red' ] (the original changed too!)
  state2.filters.colors = [] | rightCopy.filters.colors = [ 'red' ]

— 6. deepFreeze: make mutation impossible —
  ❌ frozen[0].completed = true → Cannot assign to read only property 'completed' of object '#<Object>'
  ❌ frozen.push(…) → Cannot add property 1, object is not extensible
  ✅ a copy works: copy[0].completed = true | frozen[0].completed = false
```

Walk-through:
- **Part 1.** `b.text = …` changed `a.text` too: one object, two names.
- **Part 2.** The array grew to 2 items, yet `before === todos` is `true`. A program that checks "did it change?"
  with `===` would conclude "no" and not redraw.
- **Part 3.** `[...list1, …]` built a new array; `list1` still has 1 item, and `===` reports the change.
- **Part 4.** Only the changed todo is new (`false`); the other is shared (`true`): structural sharing.
- **Part 5.** The shallow copy shared `filters`, so pushing into the copy's colors changed the original. Copying
  every level on the path (`rightCopy`) leaves `state2` untouched.
- **Part 6.** On frozen data, both mutations throw, with messages that name the problem. The immutable update
  (`map` + `{ ...todo }`) works, because it never writes into the frozen objects; it builds new ones.

## The whole picture

```text
mutation:          old ──► [ a, b ] ──(push c)──► same array [ a, b, c ]    old === new → "nothing changed" ✗
immutable update:  old ──► [ a, b ]                                           old untouched
                   new ──► [ a, b, c ]   (a and b shared, c new)              old !== new → "changed" ✓
deepFreeze(old):   any mutation of old now THROWS → bugs show up immediately
```

## Summary

| Term | What it is, in one line |
|---|---|
| **reference** | the "address" of an object; `===` on objects compares references |
| **mutation** | changing an existing object/array in place (`=`, `push`, `splice`, `sort`…) |
| **immutable update** | building a new object/array that contains the change, leaving the old one untouched |
| **shallow copy** | a new top-level object whose fields still point at the same nested objects |
| **structural sharing** | the new value reuses every unchanged part of the old value |
| **freezing** | `Object.freeze`: makes later mutations fail (throw, in modules); `deepFreeze` does it to every level |

**Next lecture:** [03-actions-and-reducers](03-actions-and-reducers.md): we describe events as *actions* and write
the function that turns "old state + action" into a new state: the *reducer* of our todo app.
