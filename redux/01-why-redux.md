# Lecture 01. Why Redux: one state, one-way data flow

> **By the end you can:** explain what "state" and "view" are; show, with running code, how copies of the same data
> get out of sync; describe the one-way data flow loop; say when Redux is worth using and when it isn't.
> **New terms in this lesson:** state, view, event, one-way data flow, global state, single source of truth
> **You should already know:** JavaScript (objects, arrays, functions, arrow functions, modules), and how to run a
> script with Node.
> **Project files you fill in:** `demos/01-why-redux.mjs` (🧩 01.1)

## 0. The course project

All the code of this course lives in ONE small project: [project/](project/). It is a **todo app**: a list of
things to do, where you can add a todo, tick it as done, give it a color, delete it, and filter the list.

The project is a **skeleton**. Every file already exists, but the parts this course teaches are **placeholders**
marked with 🧩 and a number:

```js
// 🧩 03.2: the todos reducer (lecture 03, step 2). Replace this function.
export function todosReducer(state, action) {
  throw new Error('🧩 Not written yet: lecture 03, step 2');
}
```

Each lecture gives you the exact code for its placeholders, in **build steps** ("Build step 03.2: …"). You
replace the placeholder with that code. At the end of each lecture you run the lecture's demo:

```bash
cd project
npm install
npm run lesson 01
```

`npm install` is needed only once. It installs the libraries the course uses: `redux`, `react`, `react-dom`,
`react-redux`, `redux-thunk` and `reselect`, plus `jsdom` and `tsx`, two tools that let the React part of the app
run inside Node (no browser needed). Lecture 07 explains them when we first need them.

## 1. State: what the app remembers right now

Think of any app on your phone. At every moment it remembers some data: which todos exist, which one is done,
which filter is selected. That data is the app's **state**: everything the app needs to remember *right now*.

```js
const state = { todos: [{ text: 'Learn Redux', completed: false }] };
```

That's all it is: normal JavaScript values. The word "right now" matters: the state **changes over time**. When
the user adds a todo, the state is different afterwards.

## 2. View: what the user sees, drawn from the state

The **view** is what the user sees on the screen. In a well-built app, the view is **computed from the state**:
give it the same state and it draws the same picture.

```js
function render() {
  console.log(state.todos.map((todo) => todo.text).join(', ')); // our "screen" is the console
}
```

In this lecture the "screen" is just `console.log`. From lecture 07 on, it will be a real HTML page.

## 3. The problem: copies of the same data get out of sync

A real screen has many parts: a list, a footer that says "2 items left", a header with a counter… Each part needs
some of the same data. The easy way is to let each part keep **its own copy**:

### Build step 01.1: the lecture's demo, part A

Open `demos/01-why-redux.mjs`. Replace the placeholder `🧩 01.1` with the code below. This step has two parts (A
and B); paste both, one after the other. Here is part A:

```js
// Lecture 01 demo: the problem Redux solves, and the idea behind it.

// ── Part A: every part of the screen keeps its OWN copy of the data ──
console.log('— Part A: every view keeps its own copy —');

const listView = {
  todos: ['Learn Redux'],
  render() {
    console.log(`  🖥  list:   ${this.todos.join(', ')}`);
  },
};
const footerView = {
  remaining: 1,
  render() {
    console.log(`  🖥  footer: ${this.remaining} item(s) left`);
  },
};

function onAddClicked(text) {
  console.log(`⚡ user adds "${text}"`);
  listView.todos.push(text); // the list's copy is updated…
  listView.render();
  footerView.render(); // …but nobody updated the footer's copy
}

onAddClicked('Walk the dog');
```

What each part does:
- `listView` and `footerView` are two parts of the screen. Each one stores the data it shows: the list stores the
  todo texts, the footer stores a number.
- `onAddClicked` is what happens when the user adds a todo. It updates the list's copy, then redraws both parts.
- The bug: the footer's number is a **second copy** of information that is already in the list ("how many todos
  aren't done"). Nobody remembered to update it.

When you run it (the full output is in "Run it" below), part A prints:

```text
⚡ user adds "Walk the dog"
  🖥  list:   Learn Redux, Walk the dog
  🖥  footer: 1 item(s) left
```

Two todos on the list, "1 item left" in the footer. In a small demo the fix is obvious. In a real app with 50
screens, 10 developers and data coming from a server, "who must update which copy" becomes the main source of bugs.

## 4. Event: something happened

Before the fix, one more word. An **event** is "something happened": the user clicked a button, typed a letter, the
server answered. Events are the only reason the state ever changes. If nothing happens, the state stays the same.

We will describe each event as a small plain object that says what happened:

```js
{ type: 'todoAdded', text: 'Walk the dog' }
```

`type` is the name of the event. The other fields are the details.

## 5. One-way data flow: state → view → event → new state

The fix has three rules:

1. Keep the data in **one** place (one `state` object), not in copies.
2. The view never stores data: it is **drawn from the state** every time.
3. When an event happens, **one function** decides how the state changes, then the view is drawn again.

The data always travels in the same direction, around a loop. This is called **one-way data flow**:

```text
          ┌──────────────┐
          │    state     │  the one place where data lives
          └──────┬───────┘
                 │ is drawn by
                 ▼
          ┌──────────────┐
          │     view     │  what the user sees
          └──────┬───────┘
                 │ the user acts → an event
                 ▼
          ┌──────────────┐
          │    handle    │  ONE function computes the new state
          └──────┬───────┘
                 │
                 └──────────► back to state
```

### Build step 01.1 (continued): part B

Paste this under part A, in the same file:

```js
// ── Part B: ONE state, every view reads from it, ONE place changes it ──
console.log('\n— Part B: one state, one-way data flow —');

let state = { todos: [{ text: 'Learn Redux', completed: false }] };

function render() {
  const remaining = state.todos.filter((todo) => !todo.completed).length;
  console.log(`  🖥  list:   ${state.todos.map((todo) => todo.text).join(', ')}`);
  console.log(`  🖥  footer: ${remaining} item(s) left`);
}

function handle(event) {
  console.log(`⚡ event: ${JSON.stringify(event)}`);
  if (event.type === 'todoAdded') {
    state.todos.push({ text: event.text, completed: false });
  }
  if (event.type === 'todoCompleted') {
    state.todos[event.index].completed = true;
  }
  render(); // the view is drawn again FROM the state
}

render();
handle({ type: 'todoAdded', text: 'Walk the dog' });
handle({ type: 'todoCompleted', index: 0 });
```

What each part does:
- `state` is the **one** place where the todos live. The footer no longer stores a number: `render` **computes**
  "items left" from the state each time, so it can't be out of date.
- `handle(event)` is the only code that changes the state. It reads `event.type` to know what happened.
- After every change, `render()` draws the whole view again from the state.

Notice that `handle` changes the state **in place** (`push`, `… = true`). That works here, but it is exactly what
Redux forbids. Lecture 02 shows why, and how to change data without changing it in place.

## 6. Global state and the single source of truth

Some data is needed by **many** parts of the app: the list of todos is used by the list, the footer, maybe a header
counter and a statistics page. Data that many parts of the app need is called **global state**.

Other data is needed by only one small part: the text being typed in an input box, whether a dropdown is open.
That can stay inside that part.

Keeping all global state in **one** place, so that every part reads the same data, is called having a **single
source of truth**. Part B above has a single source of truth (`state`); part A doesn't (each view has its own copy).

## 7. What Redux is

**Redux** is a pattern and a small library for keeping the global state of an app in one place, and changing it in
a predictable way. It takes part B and makes its rules strict:

1. All global state lives in **one** JavaScript object.
2. Every event is described by a **plain object** with a `type` (like our `{ type: 'todoAdded', … }`).
3. The new state is computed by **a pure function** from the old state and the event. The old state is never
   modified: the function returns a **new** state.

Each rule gets its own lecture: rule 3 needs the idea of "not modifying", which is lecture 02. Rules 2 and 3 become
lecture 03, and lecture 05 builds the object that holds the state and runs the loop.

Why such strict rules? Because they buy you things:

- **Predictable.** The state can only change in one way, so "why is this value wrong?" always has the same answer:
  look at the events and the function that handled them.
- **One place to look.** Every part of the app reads the same data.
- **Tooling.** Because every change is a plain object passing through one function, a tool can record every event,
  show the state before and after, and even replay them. (The Redux DevTools browser extension does this.)

And they cost something:

- **More code and more indirection.** Instead of `todo.completed = true`, you describe an event and write the
  function that handles it. For small apps this is overkill.

### When to use Redux

Redux is worth it when:
- a lot of state is needed in many places of the app;
- the state changes often;
- the logic that updates it is complex;
- the codebase is medium or large, with several people working on it.

It is **not** worth it when the data is only used by one component (keep it in that component), or when the data
is just "a copy of what's on the server". For that, Redux Toolkit has a dedicated tool: the next course covers it.

### The Redux family of libraries

This course uses these libraries; each gets its own lecture:

| Library | What it does for you | Lecture |
|---|---|---|
| `redux` | the core: the store that holds the state, and a few helpers | 03–06 |
| `react-redux` | connects Redux to React components | 08 |
| `redux-thunk` | lets you write logic that waits (e.g. for a server) | 09 |
| `reselect` | makes "compute something from the state" fast | 10 |

The officially recommended way to write Redux today is **Redux Toolkit**, a library built on top of all of these.
This course teaches what's underneath, by hand, so that the Redux Toolkit course can show what it automates.

## Run it

```bash
npm run lesson 01
```

Real output:

```text
— Part A: every view keeps its own copy —
⚡ user adds "Walk the dog"
  🖥  list:   Learn Redux, Walk the dog
  🖥  footer: 1 item(s) left

— Part B: one state, one-way data flow —
  🖥  list:   Learn Redux
  🖥  footer: 1 item(s) left
⚡ event: {"type":"todoAdded","text":"Walk the dog"}
  🖥  list:   Learn Redux, Walk the dog
  🖥  footer: 2 item(s) left
⚡ event: {"type":"todoCompleted","index":0}
  🖥  list:   Learn Redux, Walk the dog
  🖥  footer: 1 item(s) left
```

Walk-through:
- **Part A, the wrong footer.** `onAddClicked` pushed into `listView.todos` but nobody updated
  `footerView.remaining`. The two copies disagree: 2 todos, "1 item left".
- **Part B, line 1–2.** The first `render()` draws the starting state: one todo, not completed → "1 item left".
- **`⚡ event: todoAdded`.** `handle` pushes the new todo into the one `state`, then `render()` recomputes
  everything: 2 todos, both not completed → "2 item(s) left". The footer is right, and nobody had to remember to
  update it.
- **`⚡ event: todoCompleted`.** `handle` marks todo 0 as completed; `render()` recomputes → "1 item(s) left".

## The whole picture

```text
Part A (copies)                          Part B (one-way data flow)
───────────────                          ──────────────────────────
listView.todos ──┐                       state ──► render() ──► screen
footerView.rem ──┼─ must be kept in        ▲                      │
                 │  sync BY HAND            │                      │ user acts
onAddClicked ────┘  (forgot one → bug)      └──── handle(event) ◄──┘
```

## Summary

| Term | What it is, in one line |
|---|---|
| **state** | everything the app needs to remember right now, as plain JavaScript values |
| **view** | what the user sees, computed from the state |
| **event** | "something happened" (a click, typing, a server answer); described as `{ type, …details }` |
| **one-way data flow** | state → view → event → one function computes the new state → view again |
| **global state** | data that many parts of the app need |
| **single source of truth** | all global state kept in one place, so every part reads the same data |

**Next lecture:** [02-immutability](02-immutability.md): why Redux never changes data in place, and how to update
objects and arrays by making copies.
