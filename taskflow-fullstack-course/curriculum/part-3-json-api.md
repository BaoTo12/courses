# Part 3: The Same Backend as a JSON API, and Replacing the Mock

> Goal: expose TaskFlow's services as a JSON API **built with plain Servlets**, secure it for an SPA (session cookie + double-submit CSRF + CORS), and switch TaskFlow Web from json-server to the real backend by changing only the Axios `baseURL`.

---

## S46 · A REST API with Servlets

**Project feature:** `/api/tasks`, `/api/tasks/{id}`, `/api/tasks/{id}/comments`, `/api/categories`, `/api/stats`, implementing the API contract in the project spec exactly; JSON error bodies; response DTOs.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 46.01 | 📖 | Same service layer, different view: JSP renders HTML, the API renders JSON. Side-by-side flows. | ★ |
| 46.02 | 📖 | REST basics: resources, methods, status codes (200/201/204/400/401/403/404/409/422), `Location`, idempotency | ★ |
| 46.03 | 🛠 | Provided `Json` helper (Jackson `ObjectMapper`: Java time, no unknown-property leaks). Reading/writing bodies. | ★ |
| 46.04 | 📖 | Routing with Servlets: `@WebServlet("/api/tasks/*")` + `getPathInfo()` parsing; a tiny router helper | ★ |
| 46.05 | 🛠 | Build: `TaskApiServlet`: GET list (query params → service), GET by id, POST (201 + `Location`), PUT, PATCH, DELETE (204) | ★ |
| 46.06 | 📖 | Pagination, filtering and sorting as query parameters; the `Page<T>` envelope | ★ |
| 46.07 | 📖 | Validation → `400` with `fieldErrors`; `Content-Type` checks → `415`; malformed JSON → `400` | ★ |
| 46.08 | 🛠 | Build: `ApiExceptionFilter`: maps exceptions to the standard error JSON (no stack traces) | ★ |
| 46.09 | 📖 | 🛡 **Response DTOs**: never serialise entities; `UserDto` without `passwordHash` (excessive data exposure) | ★ |
| 46.10 | 🔓 | Lab: **mass assignment**: `PUT /api/tasks/5` with `{"ownerId": 2}` or `{"role": "ADMIN"}` on a user endpoint | ★ |
| 46.11 | 🛡 | Defend: request DTOs with only allowed fields; `FAIL_ON_UNKNOWN_PROPERTIES` trade-off | ★ |
| 46.12 | 📖 | 🛡 Authorisation in the API reuses the S42 service-layer checks (IDOR again, now via JSON) | ★ |
| 46.13 | 📖 | Why not Spring? What a framework would give you, and why building it by hand first makes you better at Spring | ＋ |
| 46.14 | 🎯 | Your Turn: `/api/tasks/{id}/comments` GET/POST with validation and ownership rules | ★ |
| 46.15 | 💡 | Solution walkthrough | ★ |
| 46.16 | 🐞 | Debug: the API returns the HTML 404 page instead of JSON (error-page mapping vs API paths) | ★ |
| 46.17 | 🐞 | Debug: dates serialise as `[2026,10,1]` (missing JSR-310 config) | ★ |

> **As built:** `web/api/{Json (📦), Api, ApiServlet (service() router, PATCH), TaskApiServlet, CategoryApiServlet, StatsApiServlet, ApiFallbackServlet, TaskInput (JsonNode, absent vs null), ApiError, ApiException, dto/Dtos}`; `ApiExceptionFilter` on `/api/*` after `locale`; contract = the Part 1 mock (400 for validation, 0-based pages, 404 for others' tasks); `CsrfFilter` skips `/api/*` (normalised path check); 📦 TaskFilter.priority, q searches title+description, TaskSort CREATED/UPDATED, countByPriority, pageAt, CommentDao.insert returns, User.locale; 46.10 conceptual.

### ✅ Knowledge check
- **Concept:** What changes between rendering the task list as JSP and as JSON, and what stays identical?
- **Code reading:** Given `pathInfo` values (`null`, `/`, `/5`, `/5/comments`, `/abc`), what does your router do?
- **Design:** 400 vs 422 vs 409: choose for "title blank", "category in use", "malformed JSON".
- **Implementation:** `GET /api/stats` with counts by status and priority for the current user.

**Checkpoint:** `s46-end`

---

## S47 · API Security for a Single-Page App

**Project feature:** `/api/auth/*` endpoints (csrf, login, logout, me); session-cookie auth shared with the Admin Portal; `CsrfDoubleSubmitFilter` for `/api/*`; `CorsFilter`; login rate limiting; JSON 401/403.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 47.01 | 📖 | Session auth for SPAs: the browser holds `JSESSIONID` (HttpOnly); the SPA calls `/api/auth/me` to learn who it is | ★ |
| 47.02 | 🛠 | Build: `AuthApiServlet`: `POST /login` (JSON, `changeSessionId`), `POST /logout`, `GET /me` | ★ |
| 47.03 | 📖 | 401 vs 403 for APIs; **never redirect to a login page from an API**, return JSON | ★ |
| 47.04 | 🛠 | Build: the `AuthenticationFilter` becomes API-aware (JSON 401 for `/api/*`, redirect for pages) | ★ |
| 47.05 | 📖 | CSRF for SPAs: why a JSP hidden-field token doesn't fit; **double-submit cookie** pattern | ★ |
| 47.06 | 🛠 | Build: `GET /api/auth/csrf` sets `XSRF-TOKEN` (**not** HttpOnly, `SameSite=Lax`); `CsrfDoubleSubmitFilter` compares cookie vs `X-XSRF-TOKEN` header on unsafe methods | ★ |
| 47.07 | 📖 | Why the attacker can't read the cookie to forge the header (same-origin policy); the role of SameSite | ★ |
| 47.08 | 📖 | **CORS explained properly**: the same-origin policy, simple vs preflight requests, `Access-Control-Allow-*`; **CORS protects the *user's* data from *other sites*, not your API from clients** | ★ |
| 47.09 | 🔓 | Lab: a misconfigured CORS that reflects any `Origin` + `Allow-Credentials: true` → an evil page reads the user's tasks | ★ |
| 47.10 | 🛡 | Defend: a `CorsFilter` with an explicit origin allow-list; preflight handling; `Vary: Origin` | ★ |
| 47.11 | 📖 | Dev vs prod topology: Vite proxy (same origin, no CORS needed) vs a separate origin (CORS needed) vs same WAR (S49) | ★ |
| 47.12 | 🛠 | Build: rate limiting on `/api/auth/login` (reuse the S41 throttle), with `429` + `Retry-After` | ★ |
| 47.13 | 🎯 | Your Turn: an `AuditEvent` for every 401/403 on the API, with the request ID from the logging filter | ★ |
| 47.14 | 💡 | Solution walkthrough | ★ |
| 47.15 | 🐞 | Debug: every POST from React gets 403 (the CSRF cookie `Path` or header name mismatch) | ★ |
| 47.16 | 🐞 | Debug: the preflight `OPTIONS` hits the auth filter and gets 401 | ★ |

> **As built:** `AuthApiServlet` (/api/auth/*; same AuthService + session as the portal; changeSessionId only when a session exists), `XsrfCookie` (Path=/, not HttpOnly), `CsrfDoubleSubmitFilter` (`apiCsrf`, before authentication, constant-time), `CorsFilter` (before `api`; exact allow-list `taskflow.cors.allowedOrigins`; preflights answered; refused preflight = bare 403), `AuthenticationFilter` throws `ApiException.unauthenticated()` for /api; 47.13 = audit in `ApiExceptionFilter` (anonymous GET /me excluded); harness `xsrfToken(browser)`; 47.09 conceptual.

### ✅ Knowledge check
- **Concept:** Does CORS stop curl from calling your API? Then what *does* it protect?
- **Concept:** Why must `XSRF-TOKEN` be JS-readable while `JSESSIONID` must not be?
- **Debugging:** Login works in Postman but the browser never stores the session cookie (missing `withCredentials`, or `SameSite=None` without `Secure`).
- **Design:** Filter order for `/api/*`: CORS, logging, CSRF, auth. Justify.

**Checkpoint:** `s47-end`

---

## S48 · Swap the Mock: TaskFlow Web on the Real Backend

**Project feature:** TaskFlow Web runs against Tomcat. Only the Axios config changes, then an integration debugging session fixes the contract drift.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 48.01 | 📖 | The payoff of the `api/` layer and `axiosBaseQuery`: one change point | ★ |
| 48.02 | 🛠 | Vite proxy `/api → http://localhost:8080/taskflow/api`; turn off json-server | ★ |
| 48.03 | 🛠 | The real login flow: `GET /csrf` → js-cookie reads `XSRF-TOKEN` → Axios header → `POST /login` → `JSESSIONID` (invisible to JS) → `GET /me` | ★ |
| 48.04 | 🛠 | 401 interceptor → `auth/sessionExpired` → RTK Query cache reset → login redirect (end to end) | ★ |
| 48.05 | 🐞 | Integration lab: 6 planted contract mismatches (date formats, enum casing, pagination field names, error shape, 204 bodies, ID types). Find them with the Network tab + Redux DevTools. | ★ |
| 48.06 | 📖 | The `lang` cookie in action: switch the language in React → the JSP portal follows | ★ |
| 48.07 | 📖 | Contract testing ideas: shared JSON examples, TypeScript types generated from Java DTOs (concept) | ＋ |
| 48.08 | ✅ | **Full-flow trace**: a click in React → Redux → RTK Query → Axios interceptors → Vite proxy → Tomcat filters → API servlet → service → DAO → MySQL → back | ★ |

> **As built:** Vite proxy to Tomcat with `rewrite` + `cookiePathRewrite` (`TASKFLOW_BACKEND`, `TASKFLOW_API=mock`); 📦 `DevServer` (Testcontainers MySQL + embedded Tomcat, `-Dport`); `RequestLoggingFilter` adopts a UUID `X-Request-Id`; 48.05 uses the 📦 `ContractDriftFilter` switch on `/debug/stats`; verified end to end in a browser (login, list, PATCH, 401 → login).

### ✅ Knowledge check
- Explain every hop of a `PATCH /api/tasks/5` from the React button to MySQL and back, naming each cookie and header involved.
- Which bugs from the lab would TypeScript have caught, and which not? Why?

**Checkpoint:** `s48-end` (**Part 3 complete: one backend, two clients**)
