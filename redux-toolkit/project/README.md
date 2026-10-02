# The course project: a small social feed, built lecture by lecture

This is the skeleton of the one project of the [Redux Toolkit course](../00-roadmap.md), in **TypeScript** (strict).
Every file already exists. The parts the course teaches are **placeholders** marked 🧩, which you replace with the
code given in the lectures.

## Setup (once)

```bash
npm install
```

You need Node.js 20 or newer. The libraries:

| Package | Why |
|---|---|
| `@reduxjs/toolkit` | what the course teaches (it includes `redux`, `reselect`, `immer`, `redux-thunk` and RTK Query) |
| `react`, `react-dom`, `react-redux` | the UI (lecture 04 on) |
| `typescript`, `@types/*` | type checking: `npm run typecheck` |
| `tsx` | runs TypeScript (and TSX) files directly with Node |
| `jsdom` | a web page inside Node, so the UI runs without a browser |

## Running a lecture's demo

```bash
npm run lesson 05
```

This runs `demos/05-*.ts` (or `.tsx`). Each lecture ends with its demo and the output you should see.
`npm run typecheck` checks the types of the whole project without running anything.

## The 🧩 placeholders

```ts
// 🧩 04.1: the typed hooks (lecture 04, step 1).
// Replace the whole content of this file with the code from the lecture.
export {};
```

`04.1` means "lecture 04, build step 1". (The `export {};` line only makes the empty file a module for TypeScript;
it goes away when you paste the lecture's code.) Many later steps have no placeholder: they **change** code written
earlier, and say exactly which lines to replace.

If a demo fails with `🧩 Not written yet: lecture NN, step N`, that demo's lecture isn't finished. If it fails with
`does not provide an export named …`, a file it imports is still a placeholder.

## What is given (not part of the course)

| File | What it is |
|---|---|
| `src/api/server.ts` | a fake REST API: a real HTTP server on localhost, started when imported; 200 ms per answer; test knobs (`server.failNext`, `server.setNextLatencies`, `server.pushNotification`) and a fake WebSocket (`openNotificationsChannel`) |
| `src/api/client.ts` | a tiny `fetch` wrapper for the server (lectures 05–08) |
| `src/debug/testDom.ts` | a fake browser page (jsdom) + helpers to click, type, choose and print the screen |
| `scripts/run-lesson.ts` | the `npm run lesson` command |
| `tsconfig.json` | TypeScript settings (strict, TSX) |

## The files and the lectures that fill them

```text
demos/NN-*.ts|tsx                         one per lecture (its last build step)
src/
├── app/
│   ├── store.ts                          01 (configureStore), 02, 04, 08, 09, 10   (+ RootState, AppDispatch)
│   ├── logger.ts                         01, 09
│   ├── hooks.ts                          04   (useAppSelector, useAppDispatch)
│   ├── withTypes.ts                      05   (createAppAsyncThunk)
│   └── listenerMiddleware.ts             08
├── features/
│   ├── auth/      authSlice.ts           01 (by hand), 02 (createSlice), 03
│   │              LoginForm.tsx          04
│   ├── posts/     postsSlice.ts          02, 03, 05, 06, 07, 09 (only the types remain), 10
│   │              PostsList.tsx, PostExcerpt.tsx, PostAuthor.tsx, ReactionButtons.tsx, AddPostForm.tsx   04–07, 09
│   ├── users/     usersSlice.ts          04, 05, 07, 10 (an injected endpoint)
│   ├── toasts/    toastsSlice.ts, toastListeners.ts, Toasts.tsx   08, 09
│   ├── api/       apiSlice.ts            09, 10
│   └── notifications/  notificationsApi.ts, NotificationsList.tsx   10
├── components/Navbar.tsx                 04, 06, 07, 09, 10
├── from-scratch/naiveProduce.ts          02
├── App.tsx                               04, 08, 10
└── main.tsx                              04, 05, 10
```

Each demo shows the project **as it is at the end of its lecture**. Later lectures change code (lecture 05 replaces
`postAdded` by a thunk, lecture 09 moves the posts into RTK Query…), so an earlier demo may stop type-checking or
print something different once you've moved on.
