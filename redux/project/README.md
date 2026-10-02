# The course project: a todo app, built lecture by lecture

This is the skeleton of the one project of the [Redux course](../00-roadmap.md). It is written in **TypeScript**
(strict mode). Every file already exists. The parts the course teaches are **placeholders** marked 🧩, which you
replace with the code given in the lectures.

## Setup (once)

```bash
npm install
```

You need Node.js 20 or newer. The libraries:

| Package | Why |
|---|---|
| `redux`, `react-redux`, `redux-thunk`, `reselect` | what the course teaches |
| `react`, `react-dom` | the UI (lecture 08 on) |
| `typescript`, `@types/*` | type checking: `npm run typecheck` |
| `tsx` | runs TypeScript (and TSX) files directly with Node |
| `jsdom` | a web page inside Node, so the UI runs without a browser (lecture 07) |

## Running a lecture's demo

```bash
npm run lesson 03
```

This runs `demos/03-*.ts` (or `.tsx`). Each lecture ends with its demo and the output you should see.

```bash
npm run typecheck
```

This checks the types of the whole project without running anything.

## The 🧩 placeholders

A placeholder looks like this:

```ts
// 🧩 03.2: the action types and the reducer (lecture 03, step 2). Replace this stub.
export function todosReducer(state: unknown, action: unknown): unknown {
  throw new Error('🧩 Not written yet: lecture 03, step 2');
}
```

`03.2` means "lecture 03, build step 2". The lecture says exactly what to replace and gives the complete code. Some
later steps don't have a placeholder: they **change** code you wrote earlier, and show the old and new lines.

If a demo fails with `🧩 Not written yet: lecture NN, step N`, a step it depends on hasn't been done yet. If it
fails with `does not provide an export named …`, or `npm run typecheck` reports a missing export, a file it
imports is still a placeholder.

## What is given (not part of the course)

| File | What it is |
|---|---|
| `src/api/client.ts` | a fake server: keeps todos in memory, answers after 300 ms (lecture 09) |
| `src/debug/testDom.ts` | a fake browser page (jsdom) + helpers to click, type and print the screen (lecture 07) |
| `scripts/run-lesson.ts` | the `npm run lesson` command |
| `tsconfig.json` | TypeScript settings (strict, TSX) |

## The files and the lectures that fill them

```text
demos/NN-*.ts|tsx                     one per lecture (its last build step)
src/
├── utils/deepFreeze.ts               02
├── features/
│   ├── todos/todosSlice.ts           03, 07, 09, 10, 11   types, state, reducer, action creators, thunks, selectors
│   └── filters/filtersSlice.ts       04, 10
├── from-scratch/                     your own versions of the library functions
│   ├── combineReducers.ts            04
│   ├── createStore.ts                05, 06
│   ├── compose.ts, applyMiddleware.ts 06
│   ├── reactRedux.tsx                08
│   ├── thunkMiddleware.ts            09
│   └── createSelector.ts             10
├── app/
│   ├── rootReducer.ts                04   (+ RootState, RootAction)
│   ├── store.ts                      05, 06, 09   (+ AppDispatch, AppThunk)
│   ├── middleware/logger.ts          06
│   └── redux-bindings.ts             08, 10   (Provider + typed hooks)
├── ui/
│   ├── vanilla.ts                    07   (a plain web page, no React)
│   ├── App.tsx, Header.tsx, TodoList.tsx, TodoListItem.tsx, Footer.tsx   08, 09, 10, 11
└── main.tsx                          08, 09
```

Each demo shows the project **as it is at the end of its lecture**. Later lectures change some code (for example,
lecture 09 changes what `todoAdded` carries), so an earlier demo may stop type-checking or print something
different once you've moved on.
