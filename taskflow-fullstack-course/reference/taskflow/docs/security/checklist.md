# TaskFlow Security Checklist (S50)

Each line: the rule, where TaskFlow implements it, and the evidence (an automated test, or a recorded manual check).
Re-run before every release: `mvn test` (backend), `npm test` + `npm audit` (frontend), `mvn -P security verify` (dependencies).

## 1. Assets, entry points, trust boundaries

| Asset | Where | Who may touch it |
|---|---|---|
| tasks, comments | MySQL `tasks`, `comments` | the owner; admins |
| accounts (hashes, roles, enabled) | MySQL `users` | the login check (hash); admins (role, enabled) |
| sessions | Tomcat memory (+ `SESSIONS.ser` at shutdown) | the browser holding `JSESSIONID` |
| audit trail | MySQL `audit_events` (INSERT/SELECT only) | admins (read) |

| Entry point | Boundary crossed |
|---|---|
| JSP pages (`/tasks`, `/admin/*`, …), form POSTs | browser → Tomcat (HTML) |
| `/api/*` JSON | browser/SPA (and any HTTP client) → Tomcat |
| `/api/auth/login`, `/login` | anonymous → authenticated |
| `/debug/*` | loopback only |
| MySQL | app → database (`taskflow_app`, data rights only) |

## 2. OWASP Top 10 (2021) → TaskFlow

| Category | Controls | Evidence |
|---|---|---|
| **A01 Broken Access Control** | `AuthenticationFilter` (deny by default), `AuthorizationFilter` (`/admin/*`), ownership in `TaskService.visible/ownerScope`, `UserAdminService.requireAdmin`, 404 for others' data | `S42AuthorizationTest`, `S46JsonApiTest.someoneElsesTaskIsNotFoundForEveryMethod` |
| **A02 Cryptographic Failures** | BCrypt cost 12 (`PasswordHasher`), HTTPS + HSTS + `Secure` cookies in production, no secrets in URLs | `SeedDataTest`; HTTPS run (S50 README) |
| **A03 Injection** | JPA with parameters only; `TaskSort` allow-list for ORDER BY; escaping in every JSP (`<c:out>`, `fn:escapeXml`, `ScriptJson`); React escaping + DOMPurify | `S36SqlInjectionLabTest`, `S31…titlesAreEscapedInTheList`, `S49…initialDataCannotBreakOut…`, `CommentsSection.s50.test.tsx`, `security.test.tsx` |
| **A04 Insecure Design** | PRG, throttling, generic login answers, request DTOs, same rules for both clients (service layer) | `S41AuthenticationTest`, `S46…clientsCannotSetServerControlledFields` |
| **A05 Security Misconfiguration** | CSP with nonces, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP; custom error pages; `ErrorReportValve` quiet; no listings; `/debug/*` loopback | `S40FiltersTest`, `S43ErrorHandlingTest`, `S50HardeningTest` |
| **A06 Vulnerable Components** | `npm audit`; OWASP Dependency-Check profile (`mvn -P security verify`) | `npm audit`: 0 vulnerabilities (S50 run) |
| **A07 Identification & Auth Failures** | session id changed at login, `HttpOnly`/`SameSite=Lax`, 15-min timeout, throttle (5/account, 20/IP), disabled accounts end open sessions | `S41AuthenticationTest`, `S42…disablingAUserEndsTheirOpenSession`, `S47…apiLoginIsThrottled` |
| **A08 Software & Data Integrity** | CSRF: synchroniser token (pages), double submit (API); lockfiles (`package-lock.json`), pinned Maven versions | `S37FormsTest`, `S40FiltersTest`, `S47…unsafeApiCallsNeedTheDoubleSubmitHeader` |
| **A09 Logging & Monitoring Failures** | request id on every log line (browser id adopted), append-only audit (logins, denials, admin changes, 401/403 on the API, slow requests, expiries), no secrets logged | `S41…everyLoginOutcomeIsAudited`, `S45…`, `S47…apiRejectionsAreAuditedWithTheRequestId`, `S48…theBrowsersRequestIdIsTheServersRequestId` |
| **A10 SSRF** | not applicable: the server never fetches a URL chosen by a user (see §6) | — |

The 2025 edition reorganises some of these (supply-chain failures, mishandling of exceptional conditions get their own categories); TaskFlow's answers for those are A06/A08 above and S43's error handling.

## 3. Frontend (TaskFlow Web)

- [x] No `dangerouslySetInnerHTML` except through `SanitizedHtml` (DOMPurify) — `security.test.tsx`, `CommentsSection.s50.test.tsx`
- [x] User URLs through `safeHref` (protocol allow-list) / `SafeLink` — `security.test.tsx`
- [x] No tokens in `localStorage`; the session is an HttpOnly cookie; only `XSRF-TOKEN`, `tf_lang`, `tf_theme` are readable
- [x] No secrets in the bundle: only `VITE_API_BASE_URL` is a build-time variable
- [x] Errors never show server internals (`ApiRequestError` shows `message`; the server never puts details there)
- [x] 401 → session-expired flow, cache cleared (48.04); no duplicate/aborted toasts — `taskListeners.s50.test.ts`
- [x] `npm audit` clean

## 4. Backend

- [x] Output encoding in every JSP (scripting disabled; `<c:out>` / `fn:escapeXml`; `${…}` only for trusted values) — S31/S34/S35/S49 tests
- [x] Only parameterised queries; ORDER BY from `TaskSort` — `S36SqlInjectionLabTest`
- [x] CSRF on every state change: pages (`CsrfFilter`), API (`CsrfDoubleSubmitFilter`) — S40/S47 tests
- [x] Access control per endpoint: `/admin/*` filter + service checks; API reuses services — S42/S46 tests
- [x] Session: `changeSessionId`, `invalidate`, 15 min, `HttpOnly`, `SameSite=Lax`, COOKIE tracking only — S41 tests
- [x] Least-privilege DB user — `S36LeastPrivilegeTest`
- [x] Redirect targets through `Redirects.safeLocalPath` — `S41…theReturnUrlCannotLeaveTheApplication`

## 5. Configuration

- [x] Headers on every response incl. errors and the API — `S50HardeningTest.everyResponseCarriesTheFinalHeaderSet`
- [x] CSP without `unsafe-inline`; per-request nonce for islands and styled-components — `S49HybridTest`
- [x] Custom error pages; `ErrorReportValve showReport=false showServerInfo=false` — `S43ErrorHandlingTest`
- [x] No directory listings — `S50HardeningTest.noDefaultServletDirectoryListings`
- [x] Default Tomcat apps (`docs`, `examples`, `manager`, `host-manager`, `ROOT`) not deployed: the Docker image's `webapps/` holds only `taskflow.war`; on a native install, delete them
- [x] HTTPS: `tomcat/server.xml` 8443 connector; HSTS only over HTTPS; `taskflow.secureCookies` behind TLS-terminating proxies — manual run (S50 README)
- [x] CORS: exact allow-list; empty when SPA and API share an origin (S49 WAR) — `S47…corsAllowsOnlyTheListedOrigin`

## 6. SSRF (why not applicable, and what would change that)

No code path makes the server request a URL that came from a user. A feature like "attach a link preview", "import tasks from a URL" or "webhooks" would create one: then allow-list hosts, resolve and block private/loopback/link-local addresses (including after redirects), disable redirects or re-check each hop, and set short timeouts.

## 7. Red team (50.09)

`provided/labs/50-red-team.patch` plants 8 vulnerabilities. The suite catches 7; the 8th (comment HTML without DOMPurify) was caught only after adding `CommentsSection.s50.test.tsx`. See `lectures/S50-security-review/README.md`.
