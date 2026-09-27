# Reference Project and Verification Tests

Everything the lectures claim was checked in this project before it was written down. This folder keeps
that evidence, runnable, so you can re-check it, compare your own code with it, or see what changes after
upgrading a library.

```text
reference/
├── taskflow/                 the reference TaskFlow, at the course's CURRENT point (see "Current state")
│   ├── frontend/             React + TypeScript + Redux Toolkit app, with all its tests
│   │   └── src/verification/ lecture-claim tests (below)
│   ├── mock-api/             the mock API (same as provided/mock-api)
│   ├── styles/               the SCSS design system (S01–S03)
│   └── playground/           small standalone demos (e.g. the S14 redux-counter)
├── snapshots/                frozen source code at earlier checkpoints
│   ├── s19-end/              app/ and features/ at the end of S19 (hand-written Redux)
│   ├── s20-06-step1/         the tasks slice after 20.06 step 1 (createSlice, S19 event names)
│   ├── s20-end/              the whole src/ at the end of S20 (Redux Toolkit)
│   ├── s21-end/              the whole src/ at the end of S21 (selectors, adapter, listeners, dashboard)
│   ├── s22-end/              the whole src/ at the end of S22 (RTK Query api slice, comments)
│   ├── s23-end/              the whole src/ at the end of S23 (id tags, optimistic/pessimistic, paging, clearUserData)
│   ├── s24-end/              the whole src/ at the end of S24 (cookies, CSRF header, session login, sessionExpired)
│   ├── s25-end/              src/ + locales/ at the end of S25 (i18next, detector on tf_lang, en/vi)
│   ├── s26-end/              src/ + locales/ at the end of S26 (SafeLink, DOMPurify, security tests)
│   ├── s27-end/              src/ + locales/: PART 1 COMPLETE (bulk actions, error boundary, full i18n)
│   ├── s28-end/              backend/: pom.xml, db/ scripts, webapp skeleton, SeedDataTest + docker-compose.yml
│   ├── s30-end/              backend/ at the end of S30 (HelloServlet, RequestInfoServlet, TimeServlet, TomcatTest harness)
│   ├── s31-end/              backend/ at the end of S31 (in-memory task CRUD servlets, 17 backend tests)
│   ├── s32-end/              backend/ at the end of S32 (list/view JSPs under WEB-INF/views, Jasper in tests, 20 tests)
│   ├── s33-end/              backend/ at the end of S33 (header/footer .jspf, jsp-config UTF-8, session=false, overdue scriptlets, 23 tests)
│   ├── s34-end/              backend/ at the end of S34 (views in EL, TaskDetails, stats/search, /debug/el, 29 tests)
│   ├── s35-end/              backend/ at the end of S35 (JSTL views without Java, comments + stored-XSS defence, 38 tests)
│   ├── s36-end/              backend/ at the end of S36 (MySQL via a provided JPA data layer + TaskService + listener, Testcontainers, 53 tests)
│   ├── s37-end/              backend/ at the end of S37 (task form create/edit, PRG 303 + flash, CSRF tokens, categories CRUD, 65 tests)
│   ├── s38-end/              backend/ + docs/scopes.md at the end of S38 (category cache, app counters, recently viewed, 69 tests)
│   ├── s39-end/              backend/ + docs/ at the end of S39: PART 2B COMPLETE (nav/flash/form-errors fragments, theme cookie, dashboard, 75 tests)
│   ├── s40-end/              backend/ at the end of S40 (5 filters in web.xml order, CSP + security headers, maintenance mode, 81 tests)
│   ├── s41-end/              backend/ at the end of S41 (login/logout, AuthenticationFilter, BCrypt, throttle, safe returnUrl, audit, 90 tests)
│   ├── s42-end/              backend/ at the end of S42 (AuthorizationFilter, ownership in TaskService, /admin/users, AccountRegistry, 98 tests)
│   ├── s43-end/              backend/ + tomcat/server.xml at the end of S43 (error pages, ErrorHandlingFilter, request-id reference, 106 tests)
│   ├── s44-end/              backend/ at the end of S44 (i18n en/vi + tf_lang, pagination, sort headers, tag files, tf: tags, 115 tests)
│   ├── s45-end/              backend/ at the end of S45: PART 2 COMPLETE (listeners, session registry, /admin/audit, race lab, async CSV, 120 tests)
│   ├── s46-end/              backend/ at the end of S46 (JSON API: tasks, comments, categories, stats; DTOs; error JSON, 128 tests)
│   ├── s47-end/              backend/ at the end of S47 (/api/auth/*, double-submit CSRF, CORS allow-list, JSON 401, 136 tests)
│   ├── s48-end/              backend/ + frontend/vite.config.ts: PART 3 COMPLETE (Vite → Tomcat proxy, DevServer, request-id adoption, contract-drift lab, 138 tests)
│   ├── s49-end/              backend/ + frontend/ at the end of S49 (React islands in JSP, CSP nonce, SPA in the WAR under /app/, 142 tests)
│   └── s50-end/              backend/ + frontend/ + docs/ at the end of S50 (security checklist, headers, HTTPS, dependency scan, red-team lab, 145 tests)
└── authoring/                how the lectures' code blocks were produced
    ├── render.mjs            replaces {{file:path:lang}} in a template with that file's content
    └── templates/            one template per lecture or solution that embeds project files
```

## Run it

```bash
cd reference/taskflow && npm install
```

```bash
cd frontend && npm install
```

```bash
cd ../mock-api && npm install
```

Then, from `reference/taskflow/frontend`:

```bash
npm test
```

```bash
npx tsc -b
```

```bash
npm run lint
```

To use the app, start the mock API (`node server.mjs --reset` in `mock-api`, port 3001) and the dev server (`npx vite` in `frontend`), then open the printed URL and log in as `alice`.

## The two kinds of tests

1. **The project's own tests** (`src/**/*.test.ts` outside `verification/`): the tests the lectures ask you to write. Your version should pass equivalent tests.
2. **Lecture-claim tests** (`src/verification/*.claims.test.ts`): each one pins a fact a lecture states, such as an error message, a recomputation count, or a type error, to the installed library versions. Each `describe` names its lecture. If a library upgrade changes a behaviour, the failing test tells you which lecture to re-read with care.

   Some claims are about **types**, not runtime. They use `// @ts-expect-error` and are checked by `npx tsc -b`: if the error ever disappears, `tsc` fails with *"Unused '@ts-expect-error' directive"*.

| File | Lectures |
|---|---|
| `s20-store-and-immer.claims.test.ts` | 20.02 configureStore defaults and dev-check messages · 20.04 createSlice · 20.05 Immer rules · 20.07 prepare, nanoid, builder order (runtime and compile time) · 20.17 mutate *and* return |
| `s20-async-and-cross-slice.claims.test.ts` | 20.09 createAsyncThunk actions, `unwrap`, abort, `condition`, optional argument typing · 20.11 root-reducer reset · 20.12 matchers · 20.16 serializability messages · 20.18 `"Rejected"` · 20.99 Q13 |
| `s20-api-cards.claims.test.ts` | the S20 API cards: store members, createSlice options and slice object, createAction/prepare, createReducer, `addAsyncThunk`, createAsyncThunk options (`idGenerator`, `dispatchConditionRejection`, external `signal`, `thunkAPI.abort`), `unwrapResult`, `isAllOf`, `isAsyncThunkAction` |
| `s21-entity-adapter.claims.test.ts` | 21.12: every CRUD method's behaviour, `sortComparer`, `selectId`, selectors, methods as case reducers |
| `s21-listener-middleware.claims.test.ts` | 21.14: effect timing, `getOriginalState`, predicates, `condition`, `take`, `fork`, cancellation, `onError`, `addListener` |
| `s21-selectors-and-listeners.claims.test.ts` | 21.04 createSelector · 21.07/21.08/21.20 cache size per memoizer · 21.09 object arguments · 21.19 dev-mode warnings · 21.14 the inline-matcher typing trap |
| `s22-rtk-query.claims.test.ts` | 22.02 cache keys, `state.api` shape, pending entries have no `data`, lazy `subscriptions` mirror · 22.03 base query paths, `abort()` reaches Axios · 22.05/22.14 hook vs cache-entry `isLoading` · 22.06 dedupe, removal timer, unsubscribe doesn't abort, structural sharing · 22.07 `unwrap`, `clearCompleted` → one refetch · 22.08 the four tag-matching rules |
| `s20-step/` | 20.06: the step-1 slice, run against the S19 reducer tests (one marked edit) |

Project tests added in S21 that double as evidence: `domain/memoize.test.ts` (21.01), `features/tasks/taskListSelectors.test.ts` (21.05–21.08), `features/search/quickFind.test.ts` (21.15: debounce, abort, save toasts), `features/dashboard/dashboardSelectors.test.ts` (21.17).

Checks that can't be automated (browser behaviour, render counts measured with a temporary counter, network sequences) are described in each lecture's header ("Verified: …") with what was observed.

## Current state

`taskflow/` evolves with the course. It currently matches the **end of S27, Part 1 complete**; before that, the **end of S26** (S26: `src/security/security.test.tsx`); before that, the **end of S25** (`snapshots/s25-end` holds `src/` and `public/locales/`). S25 is covered by `src/i18n/i18n.test.ts` (jsdom). **From S24 on, start the mock API with `node server.mjs --secure`** and log in as `alice` / `alice123`. S24's behaviour is covered by `src/api/cookies.test.ts` (jsdom) and `src/features/auth/auth.test.ts`. S23's behaviour is covered by the project test `src/features/api/taskCache.test.ts` (seeding, id tags, optimistic patch/delete + rollback, pessimistic update, logout clean-up). To see the code as it was at the end of a finished section, use `snapshots/` (or your own git tags `sNN-end`).

## Re-rendering a lecture's code blocks

```bash
cd reference/authoring
```

```bash
node render.mjs templates/20.10.tpl.md ../snapshots/s20-end out.md
```

Render a finished section from its snapshot, not from `taskflow/frontend/src`: the live project has moved on. The S20 templates rendered from `snapshots/s20-end` reproduce the published S20 lectures byte for byte. The templates of S13–S19 were rendered from states that weren't snapshotted (only `s19-end`'s `app/` and `features/` were), so for those sections the published lectures are the record.

Paths in a template are relative to the `srcRoot` you pass, except `{{file:@reference/…}}`, which is relative to this `reference/` folder.

## Backend (Part 2+)

`taskflow/backend/` is a Maven WAR project (Tomcat 9, `javax.*`, Java 17 target).

```bash
cd reference/taskflow && npm run styles:jsp        # shared SCSS → backend/src/main/webapp/static/css/app.css
cd backend && mvn package                           # builds target/taskflow.war, runs the JUnit tests; from S36 on, Docker must be running (Testcontainers MySQL)
cd .. && docker compose up -d                       # MySQL 8 (schema + seed) on :3306, Tomcat 9 on :8080 → /taskflow/
```
