# Part 1B: Modern JavaScript and TypeScript

> Goal: the language foundations that React and Redux rest on. **Redux is mostly plain functions + immutability**, and React re-rendering is mostly about references. This part is where those ideas are built.

---

## S04 · Modern JavaScript for React and Redux (deep)

**Project feature:** `task-utils.js`, a module of **pure functions** (`addTask`, `toggleTask`, `filterTasks`, `sortTasks`, `groupByStatus`) plus a tiny vanilla-JS interactive version of the UI kit. These functions become Redux reducers and selectors later.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 04.01 | 📖 | ES modules: `import`/`export`, named vs default, why bundlers exist | ★ |
| 04.02 | 📖 | `let`/`const`, block scope; **`const` does not mean immutable** | ★ |
| 04.03 | 📖 | Values vs references: primitives, objects, arrays, `===` on objects. **The single most important idea for React/Redux.** | ★ |
| 04.04 | 📖 | Destructuring, spread and rest; shallow copies and their limits | ★ |
| 04.05 | 📖 | Immutable updates: nested objects, arrays (add/remove/update by id), `structuredClone` vs spread | ★ |
| 04.06 | 🛠 | Build: `task-utils.js` pure functions (no mutation) | ★ |
| 04.07 | 📖 | Array methods deep: `map`, `filter`, `reduce`, `find`, `some`, `every`, `toSorted`, `flatMap` | ★ |
| 04.08 | 📖 | Functions as values: arrow functions, closures, higher-order functions, currying (`store => next => action`, a preview of middleware) | ★ |
| 04.09 | 📖 | Tagged template literals: how `` styled.div`…` `` actually works (preview of S09) | ★ |
| 04.10 | 📖 | `this`: the one lecture you need, and why arrow functions and hooks mostly make it disappear | ＋ |
| 04.11 | 📖 | Asynchronous JS: callbacks → promises → `async`/`await`; error handling with `try/catch` | ★ |
| 04.12 | 📖 | The event loop: call stack, task queue, microtasks. Why `setState` "is async" (preview). | ★ |
| 04.13 | 🛠 | Build: `fetch` the mock `db.json` and render the task list with vanilla DOM APIs (the "before React" pain) | ★ |
| 04.14 | 🎯 | Your Turn: `updateTaskField(tasks, id, field, value)` and `groupByStatus(tasks)`, with no mutation, verified by provided tests | ★ |
| 04.15 | 💡 | Solution walkthrough (including three mutation bugs people commonly write) | ★ |
| 04.16 | 🐞 | Debug: "I updated the task but the old list changed too". Shared references after a shallow copy. | ★ |
| 04.17 | 🐞 | Debug: `forEach` with `async` callbacks finishes "too early" | ＋ |

### Key concepts
Reference equality · shallow vs deep copy · pure functions (same input → same output, no side effects) · closures · higher-order functions · currying · promise states · microtask queue

### Provided
Test file `task-utils.test.js` (Vitest, runnable with one command), mock `db.json`

### ✅ Knowledge check
- **Concept:** Why does `const tasks = []; tasks.push(t)` work? Why is that a problem for Redux?
- **Code reading:**
  ```js
  const a = { user: { name: 'An' } };
  const b = { ...a };
  b.user.name = 'Binh';
  console.log(a.user.name, a === b, a.user === b.user);
  ```
- **Debugging:** `console.log` order puzzle: `setTimeout(…,0)`, `Promise.resolve().then(…)`, a sync log. Predict and explain.
- **Design:** Which of these functions are pure: `sortTasks(tasks)` using `tasks.sort()`, `now()`, `formatTitle(t)`?
- **Implementation:** Write `removeTask(tasks, id)` and `moveTask(tasks, id, newStatus)` immutably.

**Checkpoint:** `s04-end`

---

## S05 · TypeScript Fundamentals

**Project feature:** convert `task-utils` to TypeScript; define the TaskFlow **domain types** (`Task`, `User`, `Category`, `Comment`, `TaskStatus`, `Priority`).

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 05.01 | 📖 | Why TypeScript: static types, types disappear at runtime (**type erasure**), what TS can and cannot protect you from | ★ |
| 05.02 | 🛠 | Setup: `tsc`, `tsconfig.json`, **`strict: true`**, running TS in Vite | ★ |
| 05.03 | 📖 | Primitive types, arrays, tuples, `any` vs `unknown` vs `never` | ★ |
| 05.04 | 📖 | Type inference: when to annotate and when to let TS infer | ★ |
| 05.05 | 📖 | Object types: `type` vs `interface`; optional `?`, `readonly`, index signatures | ★ |
| 05.06 | 📖 | Union and literal types: `type TaskStatus = 'TODO' \| 'IN_PROGRESS' \| 'DONE'`; unions vs `enum` | ★ |
| 05.07 | 📖 | Narrowing: `typeof`, `in`, equality, truthiness, control-flow analysis | ★ |
| 05.08 | 📖 | Function types: parameters, return types, optional/default params, overload signatures (briefly) | ★ |
| 05.09 | 🛠 | Build: `src/types/domain.ts` + typed `task-utils.ts` | ★ |
| 05.10 | 📖 | `null`/`undefined` under `strictNullChecks`; `?.` and `??` | ★ |
| 05.11 | 🎯 | Your Turn: type the `db.json` shapes; make `filterTasks` accept a typed `TaskFilter` object | ★ |
| 05.12 | 💡 | Solution walkthrough | ★ |
| 05.13 | 🐞 | Debug: "TS says it's fine but it crashes at runtime". Data from `fetch` is typed as a lie (`as Task[]`). | ★ |

### Key concepts
Type erasure · structural typing · inference · literal unions · narrowing · strict null checks. 🛡 **Types are not validation**: a server response typed `Task` can still be anything.

### ✅ Knowledge check
- **Concept:** If TypeScript types are erased at runtime, what guarantees do you have about JSON returned by an API?
- **Code reading:** Why does `const s = 'TODO'` have type `'TODO'`, but `let s = 'TODO'` has type `string`?
- **Debugging:** `task.dueDate.toISOString()` compiles but crashes. Find the type that lied.
- **Design:** `enum TaskStatus` or a union of string literals? Argue for one in a codebase that also has Java enums.
- **Implementation:** Write `isOverdue(task: Task, now: Date): boolean` with correct null handling.

**Checkpoint:** `s05-end`

---

## S06 · TypeScript Intermediate: Modelling a Real App

**Project feature:** **API DTO layer** (`TaskDto`, `CreateTaskRequest`, `Page<T>`, `ApiError`), a `RequestStatus` discriminated union, and runtime type guards. These are reused by Axios (S13), Redux (S14+) and RTK Query (S22).

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 06.01 | 📖 | Generics: functions, types and constraints (`<T extends { id: number }>`) | ★ |
| 06.02 | 🛠 | Build: `Page<T>`, `ApiResult<T>`, `findById<T extends HasId>()` | ★ |
| 06.03 | 📖 | Utility types: `Partial`, `Required`, `Pick`, `Omit`, `Record`, `Readonly`, `ReturnType`, `Parameters`, `Awaited` | ★ |
| 06.04 | 🛠 | Build: `CreateTaskRequest = Omit<Task, 'id' \| 'createdAt' \| …>`, `UpdateTaskRequest = Partial<…>` | ★ |
| 06.05 | 📖 | `keyof`, `typeof`, indexed access types (`Task['status']`), `as const` | ★ |
| 06.06 | 📖 | **Discriminated unions** + exhaustive `switch` with `never`. The foundation of typed Redux actions (S15). | ★ |
| 06.07 | 🛠 | Build: `type RequestState<T> = { status: 'idle' } \| { status: 'loading' } \| { status: 'succeeded'; data: T } \| { status: 'failed'; error: string }` | ★ |
| 06.08 | 📖 | Type guards and assertion functions: `isApiError(e): e is ApiError` | ★ |
| 06.09 | 📖 | `unknown` at the boundaries: typing `catch (e)`, JSON parsing, Axios errors | ★ |
| 06.10 | 📖 | Module augmentation and declaration merging (needed for the styled-components theme in S10 and i18next in S25) | ★ |
| 06.11 | 📖 | Mapped and conditional types: reading library type definitions without panic | ＋ |
| 06.12 | 🎯 | Your Turn: a typed `groupBy<T, K extends keyof T>()` and an exhaustive `statusLabel(status)` | ★ |
| 06.13 | 💡 | Solution walkthrough | ★ |
| 06.14 | 🐞 | Debug: adding a new status `'BLOCKED'` compiles, but the UI shows `undefined`. Make the compiler catch it. | ★ |

### Key concepts
Generics and constraints · utility types · discriminated unions · exhaustiveness checking · type guards · `unknown` at trust boundaries · declaration merging

### ✅ Knowledge check
- **Concept:** Why is a discriminated union better than `{ loading: boolean; error?: string; data?: T }`? List impossible states each one allows.
- **Code reading:** What is `ReturnType<typeof makeStore>['getState']`? Where will you see this pattern again?
- **Debugging:** `catch (e) { setError(e.message) }` fails to compile under strict mode. Why, and what's the correct handling?
- **Design:** Should the frontend DTO types mirror the Java classes exactly? Discuss `passwordHash`, dates and enums.
- **Implementation:** Write `assertNever(x: never): never` and use it to make `priorityColor()` exhaustive.

**Checkpoint:** `s06-end`
