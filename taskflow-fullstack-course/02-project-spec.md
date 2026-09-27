# TaskFlow: Project Specification

## 1. Product overview

TaskFlow is a task management platform with **two clients** on **one backend**:

| Client | Users | Rendering | Built in |
|---|---|---|---|
| **TaskFlow Web** | End users managing their own tasks | React SPA, client-side rendering, JSON | Part 1 (on a mock API), connected in Part 3 |
| **TaskFlow Admin** | Administrators and legacy pages | JSP, server-side rendering, HTML | Part 2 |

---

## 2. Domain model

Model classes and TypeScript DTOs are **written by you** the first time they matter (they are learning objectives for TS in S06 and for JavaBeans/EL in S34). SQL schema and seed data are **provided**.

```text
User                      Category               Task                         Comment
────────────────          ─────────────          ─────────────────────        ──────────────
id: long                  id: long               id: long                     id: long
username: string          name: string           title: string                taskId: long
email: string             color: string (hex)    description: string          authorId: long
passwordHash: string*                            status: TODO|IN_PROGRESS|DONE body: string
displayName: string                              priority: LOW|MEDIUM|HIGH     createdAt
role: USER|ADMIN                                 dueDate: date | null
locale: string (en|vi)                           categoryId → Category
enabled: boolean                                 ownerId → User
createdAt                                        createdAt, updatedAt

AuditEvent (security log): id, type (LOGIN_OK|LOGIN_FAIL|ACCESS_DENIED|…), username, ip, at, details
```

\* `passwordHash` **never** leaves the server. This is enforced in S46 and is an exercise in "excessive data exposure".

Why these entities? Each one exists to teach something:
- `Task.category.name` → nested properties in EL, normalisation in Redux
- `Comment.body` → user-generated HTML: the **stored XSS** lab (S26 React, S35 JSP)
- `Task.ownerId` → the **IDOR** lab (S42)
- `User.role` → authorisation filter (S42)
- `User.locale` → i18n on both sides (S25, S44)
- `AuditEvent` → listeners and security logging (S43, S45)

---

## 3. Feature list and where each feature is built

| Feature | TaskFlow Web (React) | TaskFlow Admin (JSP) |
|---|---|---|
| Static UI kit (buttons, badges, cards, forms) | S02–S03 (HTML + SCSS) | Reused from S32 |
| Task list | S07, then Redux from S17 | S31 → S35 |
| Task details | S12 | S31, S34 |
| Create / edit / delete task | S11, S17–S20 | S37 |
| Search · filter · sort · pagination | S21, S27 | S44 |
| Categories | S19 (normalised) | S36 |
| Comments | S26 (XSS lab) | S35 (XSS lab) |
| Dashboard / statistics | S21 (memoised selectors) | S38 (application-scope stats) |
| Login / logout | S24 (simulated) → S48 (real) | S41 |
| Roles / admin-only pages | S26 (UI only, "hidden ≠ secure") | S42 (real enforcement) |
| User management (admin) | — | S42 |
| Theme: light/dark | S10 (styled-components ThemeProvider + SCSS tokens) | S39 (CSS class via preference cookie) |
| i18n: English / Vietnamese | S25 | S44 |
| Error pages (404 / 500 / 403) | S12 (router) | S43 |
| Audit log viewer | — | S45 |
| React island inside a JSP page | S49 | S49 |

---

## 4. TaskFlow Admin: server routes (evolve over Part 2)

| Route | Method | Purpose | Introduced |
|---|---|---|---|
| `/hello` | GET | First Servlet | S30 |
| `/tasks` | GET | List (search, filter, page) | S31 |
| `/tasks/view?id=` | GET | Details | S31 |
| `/tasks/new` | GET / POST | Create form / submit | S37 |
| `/tasks/edit?id=` | GET / POST | Edit form / submit | S37 |
| `/tasks/delete` | POST | Delete (never GET, and why) | S37 |
| `/login`, `/logout` | GET / POST | Authentication | S41 |
| `/admin/users` | GET / POST | User management | S42 |
| `/admin/audit` | GET | Audit log | S45 |
| `/react-board` | GET | JSP page hosting a React island | S49 |

All JSPs live in `WEB-INF/views/` so the browser can never request them directly. Why this matters is explained in S36.

---

## 5. JSON API contract (mock in Part 1, real in Part 3)

The React app is written against this contract from day one. In Part 1 it's served by `json-server` (plus a small provided middleware); in Part 3 by your Servlets. **Only the Axios `baseURL` changes.**

| Endpoint | Method | Notes |
|---|---|---|
| `/api/auth/csrf` | GET | Issues the `XSRF-TOKEN` cookie (readable by JS) |
| `/api/auth/login` | POST | `{username, password}` → sets `JSESSIONID` (HttpOnly) |
| `/api/auth/logout` | POST | Invalidates the session |
| `/api/auth/me` | GET | Current user or 401 |
| `/api/tasks` | GET | `?q=&status=&priority=&categoryId=&page=&size=&sort=` → `Page<TaskDto>` |
| `/api/tasks` | POST | `CreateTaskRequest` → 201 + `Location` header |
| `/api/tasks/{id}` | GET / PUT / PATCH / DELETE | Owner or ADMIN only |
| `/api/tasks/{id}/comments` | GET / POST | |
| `/api/categories` | GET | |
| `/api/stats` | GET | Counts by status and priority |

**Business rule:** a task title is unique per owner (case-insensitive, trimmed). Violations return 400 with `fieldErrors.title` (added in 19.09; the Servlet API implements it in S46).

**Standard error body** (every non-2xx response):

```json
{
  "status": 400,
  "error": "VALIDATION_FAILED",
  "message": "Request contains invalid fields",
  "fieldErrors": { "title": "must not be blank" },
  "path": "/api/tasks",
  "timestamp": "2026-10-01T09:30:00Z"
}
```

**Page shape:**

```json
{ "items": [ ... ], "page": 0, "size": 20, "totalItems": 134, "totalPages": 7 }
```

---

## 6. What YOU write vs what is PROVIDED

The rule: **if it's the learning objective, you write it. If it's plumbing, it's provided and explained briefly.**

### You write

| Frontend | Backend |
|---|---|
| All SCSS partials, mixins, functions, maps | All Servlet classes and mappings |
| styled-components, themes, global styles | Request/response handling, forward/redirect |
| All React components and custom hooks | Request/session/application attributes |
| TypeScript types and DTOs | All JSP pages, EL expressions, JSTL tags |
| `createStore`, `combineReducers`, `applyMiddleware`, and thunk, *by hand* | JSP includes, layouts, tag files, a custom tag |
| All reducers, slices, thunks, selectors | Filters (encoding, logging, auth, CSRF, headers, locale, CORS) |
| RTK Query API slices | Listeners |
| The Axios instance and interceptors | Error pages and error configuration |
| The js-cookie wrapper | API Servlets (JSON endpoints) |
| i18next configuration, translation files | Security fixes in every 🛡 lecture |
| Every 🛡 security fix | The vulnerable code in 🔓 labs (so you understand it) |

### Provided (explained, not a lecture topic)

| Frontend | Backend |
|---|---|
| Vite, TS, ESLint and Vitest configs | `pom.xml`, `web.xml` skeleton, `context.xml` |
| CSS reset, icon set, fonts | MySQL schema, seed data, DB user scripts |
| json-server `db.json` + auth/CSRF simulation middleware | `DataSourceProvider` (HikariCP) |
| Static HTML wireframes for the UI kit | DAO implementations (JDBC) |
| Vitest setup | Service-layer implementations (from S36; you wire them) |
| Mock translation JSON (English) | `PasswordHasher` (jBCrypt wrapper) |
| | Jackson `ObjectMapper` configuration |
| | Logback configuration |

> Example of how provided code is introduced: *"Here is `TaskDao`. You don't need to implement it. Read the method signatures, then focus on how the Servlet calls the service, puts the result in a request attribute, and forwards to the JSP."*

---

## 7. Definition of done for the final project (S51)

- Both clients working against the real backend, secured, in two languages.
- Every item on the S50 security checklist passes.
- You can whiteboard both request flows (JSP flow and React → Redux → Axios → API flow) and answer the capstone questions in S51 without notes.
