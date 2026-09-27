# Part 2C: Filters, Sessions, Authentication, Authorization, Errors, Advanced JSP and Servlet

> Goal: control the whole request pipeline. Intercept requests with filters, authenticate with sessions, authorise every request, handle errors cleanly, and understand the container's advanced behaviour (threads, listeners, dispatcher types, async).

---

## S40 · Servlet Filters

**Project feature:** `CharacterEncodingFilter`, `RequestLoggingFilter` (with timing + request ID), `SecurityHeadersFilter`, a placeholder `AuthenticationFilter` (completed in S41), and the `CsrfFilter` extracted from S37. Ordering is documented.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 40.01 | 📖 | The problem: cross-cutting concerns (encoding, logging, auth, headers) copied into every servlet | ★ |
| 40.02 | 📖 | What a filter **is**: an interceptor *around* servlet execution. The chain as nested calls (compare Redux middleware, S16). | ★ |
| 40.03 | 📖 | Filter lifecycle: `init(FilterConfig)` → `doFilter()` per request → `destroy()` | ★ |
| 40.04 | 📖 | `doFilter(req, res, chain)`: code before `chain.doFilter` = request interception; after = response interception; not calling it = blocking | ★ |
| 40.05 | 🛠 | Build: `CharacterEncodingFilter` (UTF-8 for request and response) | ★ |
| 40.06 | 🛠 | Build: `RequestLoggingFilter`: method, URI, status, duration, request ID (MDC) | ★ |
| 40.07 | 📖 | Mapping: `@WebFilter` vs `web.xml`; URL patterns vs servlet names; **ordering** (`web.xml` order; annotation order is *unspecified*) | ★ |
| 40.08 | 📖 | Dispatcher types on filters: `REQUEST`, `FORWARD`, `INCLUDE`, `ERROR`, `ASYNC`. Why your filter didn't run on a forward. | ★ |
| 40.09 | 📖 | Wrapping: `HttpServletRequestWrapper` / `HttpServletResponseWrapper` (e.g. capture status code, modify headers) | ★ |
| 40.10 | 🛠 | Build: `SecurityHeadersFilter`: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `frame-ancestors`/`X-Frame-Options`, `Referrer-Policy` | ★ |
| 40.11 | 🔓 | Lab: clickjacking: frame TaskFlow Admin from another page. Then show that `frame-ancestors` blocks it. | ★ |
| 40.12 | 📖 | 🛡 CSP basics: `default-src 'self'`, why inline scripts break, nonces (used in S49) | ★ |
| 40.13 | 🛠 | Build: move the S37 CSRF check into a `CsrfFilter` for all POSTs | ★ |
| 40.14 | 📖 | Filters in the full request lifecycle: Tomcat → filter chain → servlet → JSP (forward) → back through filters | ★ |
| 40.15 | 🎯 | Your Turn: a `MaintenanceModeFilter` driven by a context param, which lets admins through | ★ |
| 40.16 | 💡 | Solution walkthrough | ★ |
| 40.17 | 🐞 | Debug: the logging filter always logs status 200 even for 404s | ★ |
| 40.18 | 🐞 | Debug: CSS and images fail to load after adding an auth filter on `/*` | ★ |
| 40.19 | 🐞 | Debug: encoding is still wrong for POST data (filter ordering: a param was read before the encoding filter ran) | ★ |

> **As built:** all filters in `web.xml` (no `@WebFilter`); the AuthenticationFilter slot is added in S41 (no placeholder class); maintenance exempts `/static/*` and `/debug/*` (admins in S41), switch = `POST /debug/maintenance`; inline `style=` moved to `static/css/admin.css` for the CSP; 40.11 is conceptual.

### ✅ Knowledge check
- **Concept:** Draw the call stack for a request through 3 filters, a servlet and a forwarded JSP.
- **Code reading:** What happens if a filter calls `chain.doFilter` twice? Never?
- **Debugging:** The security headers are missing on error pages. Which dispatcher type is missing?
- **Design:** List the TaskFlow filter order and justify each position.
- **Implementation:** A filter that adds `Cache-Control: no-store` to every authenticated page.

**Checkpoint:** `s40-end`

---

## S41 · Cookies, Sessions and Authentication

**Project feature:** login/logout for the Admin Portal against the `users` table with BCrypt; `AuthenticationFilter`; session hardening; login throttling; an audit of login events; safe `returnUrl`.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 41.01 | 📖 | Cookies from the server: `new Cookie(...)`, `addCookie`, `getCookies`; attributes; deleting cookies | ★ |
| 41.02 | 📖 | **How `HttpSession` works**: `JSESSIONID` cookie → the session map in Tomcat's memory; `getSession()` vs `getSession(false)`; URL rewriting fallback | ★ |
| 41.03 | 🛠 | Lab: watch `JSESSIONID` being created in DevTools; see what happens with cookies disabled | ★ |
| 41.04 | 📖 | Session lifecycle: creation, timeout (`<session-config>`), `invalidate()`, persistence across restarts | ★ |
| 41.05 | 📖 | Authentication concepts: identification, credential check, establishing a session, logout | ★ |
| 41.06 | 📖 | 🛡 Password storage: why hashing, why **slow** hashing (BCrypt), salts. Provided `PasswordHasher` explained. | ★ |
| 41.07 | 🛠 | Build: `LoginServlet` (GET form, POST check), store a minimal `AuthUser` in the session | ★ |
| 41.08 | 🛠 | Build: `LogoutServlet` (POST): `session.invalidate()` + redirect | ★ |
| 41.09 | 🛠 | Build: `AuthenticationFilter`: public paths allow-list; otherwise require a session user or redirect to `/login?returnUrl=` | ★ |
| 41.10 | 🔓 | Lab: **session fixation**: set the victim's session ID before login | ★ |
| 41.11 | 🛡 | Defend: `request.changeSessionId()` on login (Servlet 3.1+); invalidate on logout | ★ |
| 41.12 | 📖 | 🛡 Cookie flags on Tomcat 9: `HttpOnly` (default), `Secure`, **`SameSite`** via `context.xml` `CookieProcessor`; `<cookie-config>` in `web.xml` | ★ |
| 41.13 | 🔓 | Lab: **user enumeration**: different messages/timing for "no such user" vs "wrong password" | ★ |
| 41.14 | 🛡 | Defend: generic messages, consistent timing | ★ |
| 41.15 | 📖 | 🛡 Brute force: simple per-account + per-IP throttling (in-memory, thread-safe) | ★ |
| 41.16 | 🔓 | Lab: **open redirect** via `returnUrl=https://evil.example` | ★ |
| 41.17 | 🛡 | Defend: only relative, same-app paths | ★ |
| 41.18 | 📖 | "Remember me" designs and why they're risky (concept only) | ＋ |
| 41.19 | 🎯 | Your Turn: show "Logged in as … · Logout" in the header, a session-expired message, and an idle timeout of 15 minutes | ★ |
| 41.20 | 💡 | Solution walkthrough | ★ |
| 41.21 | 🐞 | Debug: after login, the user is immediately redirected back to login (the filter blocks `/login` itself, or session lookup uses `getSession(false)` wrongly) | ★ |
| 41.22 | 🐞 | Debug: logout "works" but the back button shows protected pages (caching headers) | ★ |

> **As built:** `AuthService` (throttle 5/account, 20/IP, 15 min; audit LOGIN_OK/FAIL/THROTTLED/LOGOUT) + provided `UserDao.findCredentials`/`AuditDao`/`PasswordHasher`; `SameSite=Lax` via `context.xml`; the filter prepares CSRF and sets `no-store` for all logged-in pages; `Redirects.safeLocalPath` shared with the theme switch; the test harness logs in as alice; 41.10/41.13/41.16 are conceptual.

### ✅ Knowledge check
- **Concept:** Where is session data stored: browser or server? What does the browser hold?
- **Concept:** Why change the session ID at login?
- **Code reading:** `request.getSession()` in a filter for every static resource. What's the cost?
- **Debugging:** Sessions are lost on every request in production behind HTTPS (the `Secure` cookie on HTTP, or a path mismatch).
- **Design:** What should (and shouldn't) be stored in the session for an authenticated user?

**Checkpoint:** `s41-end`

---

## S42 · Authorization and Access Control

**Project feature:** roles (USER/ADMIN), `AuthorizationFilter` for `/admin/*`, **ownership checks in the service layer**, user management pages for admins, access-denied audit events.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 42.01 | 📖 | Authentication vs authorization; 401 vs 403 | ★ |
| 42.02 | 📖 | Role-based access control (RBAC) with Servlet APIs: our own `AuthUser.role` vs `request.isUserInRole` / container security (`<security-constraint>`), briefly | ★ |
| 42.03 | 🛠 | Build: `AuthorizationFilter` for `/admin/*` → 403 page for non-admins | ★ |
| 42.04 | 🔓 | Lab: **IDOR**: user A edits/deletes user B's task by changing `?id=` | ★ |
| 42.05 | 🛡 | Defend: ownership check in `TaskService` (`findForUser`, `updateForUser`); why the filter can't do it | ★ |
| 42.06 | 📖 | Defence in depth: UI hides actions (JSTL `<c:if>` on role) **and** the server enforces them | ★ |
| 42.07 | 🛠 | Build: `/admin/users` list, enable/disable user, change role (with CSRF + an audit event) | ★ |
| 42.08 | 📖 | 🛡 Privilege escalation via form fields (`role=ADMIN` in a profile update) → mass assignment again | ★ |
| 42.09 | 🎯 | Your Turn: admins can view all tasks; users only their own; the list and details enforce it in one place | ★ |
| 42.10 | 💡 | Solution walkthrough | ★ |
| 42.11 | 🐞 | Debug: the admin page is protected, but `/admin/users/disable` (POST) isn't (pattern mismatch) | ★ |

> **As built:** `AuthorizationFilter` on `/*` (`/admin` prefix → 403 via a forward to `errors/403.jsp`; `AccessDeniedException` from services → 404, audited); `TaskService` takes `AuthUser caller` everywhere, policy = `visible()` + `ownerScope()`; `AccountRegistry` snapshot re-checked in `AuthenticationFilter` (disabled → session ends; role change → new id); `UserAdminService` + `/admin/users` (enable/disable/role, no self-changes); 42.04 is conceptual.

### ✅ Knowledge check
- **Concept:** Why is `<c:if test="${sessionScope.user.role == 'ADMIN'}">` around a button not access control?
- **Debugging:** A disabled user can still use their existing session. What should happen, and where?
- **Design:** Filter-level checks vs service-level checks: which access rules belong where?

**Checkpoint:** `s42-end`

---

## S43 · Error Handling

**Project feature:** custom 404, 403, 500 JSP error pages with EL/JSTL; an exception-to-status mapping; an error ID shown to users and logged with details; no stack traces leaked.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 43.01 | 📖 | Two kinds of errors: `response.sendError(status)` vs an exception thrown from a servlet/JSP | ★ |
| 43.02 | 📖 | `<error-page>` in `web.xml`: by `error-code` and by `exception-type`; matching rules; a default error page (Servlet 3.0+) | ★ |
| 43.03 | 📖 | **The error dispatch flow**: the container catches → sets `javax.servlet.error.*` attributes → dispatches (type `ERROR`) to the error page | ★ |
| 43.04 | 📖 | Error attributes: `status_code`, `exception`, `message`, `request_uri`, `servlet_name`; in EL: `${requestScope['javax.servlet.error.status_code']}`, `${pageContext.errorData}` | ★ |
| 43.05 | 📖 | JSP `errorPage` / `isErrorPage` and the `exception` implicit object vs `web.xml`-based handling; why `web.xml` wins in MVC | ★ |
| 43.06 | 🛠 | Build: `404.jsp`, `403.jsp`, `500.jsp` sharing the layout from S39 | ★ |
| 43.07 | 📖 | Exceptions after the response is committed: why the error page can't be shown | ★ |
| 43.08 | 🛠 | Build: a custom `NotFoundException` / `ForbiddenException` mapped to status codes; a central handling pattern | ★ |
| 43.09 | 🔓 | Lab: **information leakage**: Tomcat's default error page shows stack traces, versions and SQL | ★ |
| 43.10 | 🛡 | Defend: custom pages everywhere, `ErrorReportValve` (`showReport=false`, `showServerInfo=false`), an error ID shown to users, details only in logs | ★ |
| 43.11 | 📖 | 🛡 Security logging: what to log (auth failures, access denied, validation anomalies), what never to log (passwords, session IDs) | ★ |
| 43.12 | 🎯 | Your Turn: a 400 page for bad input (invalid IDs), and a friendly message + request ID on 500 | ★ |
| 43.13 | 💡 | Solution walkthrough | ★ |
| 43.14 | 🐞 | Debug: the custom 404 page itself throws (a filter excluded `ERROR` dispatch → no user in scope → NPE) | ★ |

> **As built:** `ErrorHandlingFilter` right after logging maps `NotFoundException`→404, `BadRequestException`→400 (fixed message), `AccessDeniedException`→404+audit (moved from AuthorizationFilter), others → log + 500; error pages 400/403/404/500 + `Throwable` + a default `error.jsp`; the 500 reference = the request id (request attribute set by the logging filter); `/debug/fail[?after=commit]`; `backend/tomcat/server.xml` (ErrorReportValve) mounted by docker-compose, mirrored in the test harness; 43.09 is conceptual.

### ✅ Knowledge check
- **Concept:** Trace a `NullPointerException` in a servlet to the rendered 500 page: every component involved.
- **Code reading:** `sendError(404)` vs `setStatus(404)`: what the user sees in each case.
- **Design:** What information should a user see on a 500 page? What should the log contain?

**Checkpoint:** `s43-end`

---

## S44 · Advanced JSP, EL and JSTL

**Project feature:** i18n for the Admin Portal driven by the **same `lang` cookie** as React (`LocaleFilter`); localised dates/numbers; search + filter + pagination with correct URL building; a tag-file layout; one custom tag.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 44.01 | 📖 | Nested objects, collections and maps: advanced EL patterns and their limits | ★ |
| 44.02 | 📖 | Null handling end-to-end: `empty`, `default` on `<c:out>`, EL ternaries, keeping nulls out of views | ★ |
| 44.03 | 📖 | Dynamic URLs: `<c:url>` + `<c:param>` for search/filter/pagination links; **URL encoding** of user input | ★ |
| 44.04 | 🛠 | Build: pagination component preserving filters (`?q=&status=&page=`) | ★ |
| 44.05 | 📖 | **JSTL fmt**: `<fmt:formatDate>`, `<fmt:formatNumber>`, `<fmt:parseDate>`, time zones | ★ |
| 44.06 | 📖 | **i18n with fmt**: resource bundles (`messages_en.properties`, `messages_vi.properties`), `<fmt:setLocale>`, `<fmt:setBundle>`, `<fmt:message>` + `<fmt:param>`, `fmt:requestEncoding` | ★ |
| 44.07 | 🛠 | Build: `LocaleFilter` reading the `lang` cookie (allow-listed), falling back to `Accept-Language`; setting `javax.servlet.jsp.jstl.fmt.locale` | ★ |
| 44.08 | 🛠 | Build: language switcher that writes the same cookie React uses; switch in the Admin Portal → the React app follows (and vice versa) | ★ |
| 44.09 | 📖 | UTF-8 end to end: `.properties` encoding, page encoding, response encoding, DB charset (`utf8mb4`) | ★ |
| 44.10 | 📖 | **Tag files** (`WEB-INF/tags/*.tag`): attributes, `<jsp:doBody>`, fragments; a layout tag | ★ |
| 44.11 | 🛠 | Build: `<t:layout title="…">` and `<t:statusBadge status="…"/>` tag files | ★ |
| 44.12 | 📖 | **Custom tag handlers** (`SimpleTagSupport` + TLD): when a tag file isn't enough | ＋ |
| 44.13 | 🛠 | Build: `<tf:relativeTime value="${task.dueDate}"/>` custom tag | ＋ |
| 44.14 | 📖 | EL functions: declaring static Java methods as EL functions in a TLD | ＋ |
| 44.15 | 📖 | When these features add unnecessary complexity: a decision guide | ★ |
| 44.16 | 🎯 | Your Turn: a search page with sort links that toggle asc/desc and keep all other params | ★ |
| 44.17 | 💡 | Solution walkthrough | ★ |
| 44.18 | 🐞 | Debug: `???task.title???` shown instead of text (bundle basename or locale) | ★ |
| 44.19 | 🐞 | Debug: `&` in the search query breaks the pagination links (manual URL concatenation) | ★ |

> **As built:** `LocaleFilter` after `errors` (`tf_lang` en/vi → `Accept-Language` if sent → en; `Config.FMT_LOCALE`), `LanguageServlet` (POST `/preferences/language`), bundles `i18n/messages[_vi].properties`; translated: layout/nav, list, rows, pagination, dashboard (forms, details, categories, admin, errors left for Part 4); `Page<T>` + `TaskService.page` (10/page); tag files `layout`, `statusBadge`, `pageLink`, `pagination`, `sortHeader`; `taskflow.tld` (`tf:date`, `tf:relativeTime`, `tf:truncate`); `TaskSort` asc/desc fragments + `?dir=desc`.

### ✅ Knowledge check
- **Concept:** How do `<fmt:message>` and i18next differ in *where* and *when* translation happens?
- **Design:** Tag file vs `<jsp:include>` vs custom tag handler: pick for a layout, a badge, a date formatter.
- **Implementation:** A localised "Due in 3 days" / "Còn 3 ngày" label.

**Checkpoint:** `s44-end`

---

## S45 · Advanced Servlet Topics

**Project feature:** app bootstrap in a `ServletContextListener`; session tracking + audit via listeners; the audit log viewer; a race-condition lab fixed; a long-running export using async servlets.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 45.01 | 📖 | The container's responsibilities revisited: networking, parsing, thread pool, lifecycle, sessions, security, dispatching | ★ |
| 45.02 | 📖 | **Thread model**: one servlet instance, many threads. What's shared (fields, `ServletContext`, session under concurrent tabs) vs what isn't (local variables, the request). | ★ |
| 45.03 | 🔓 | Lab: a race condition: an instance field in a servlet (`private Task current;`) mixes up users' data under load (provided load script) | ★ |
| 45.04 | 🛡 | Fix: no mutable instance state; thread-safe collections; immutability; why `synchronized` on `doGet` is wrong | ★ |
| 45.05 | 📖 | `ServletContext` in depth: attributes, init params, resources (`getResourceAsStream`), `getRealPath` caveats, dynamic registration | ★ |
| 45.06 | 📖 | `ServletConfig` in depth vs `ServletContext`: per-servlet vs per-app | ★ |
| 45.07 | 📖 | **Listeners**: `ServletContextListener`, `HttpSessionListener`, `HttpSessionAttributeListener`, `ServletRequestListener`, `HttpSessionBindingListener`; when each fires | ★ |
| 45.08 | 🛠 | Build: `AppBootstrapListener` creates the DataSource + services, stores them in the context, and closes the pool on shutdown | ★ |
| 45.09 | 🛠 | Build: `SessionAuditListener`: active sessions, login/logout/expiry events into `AuditEvent` | ★ |
| 45.10 | 🛠 | Build: `/admin/audit` page (filters + pagination: reuse S44) | ★ |
| 45.11 | 📖 | **Request dispatching in depth**: `forward` vs `include`, dispatcher types (`REQUEST`, `FORWARD`, `INCLUDE`, `ERROR`, `ASYNC`), `javax.servlet.forward.*` / `include.*` attributes | ★ |
| 45.12 | 📖 | Error dispatching revisited, now with filters and dispatcher types | ★ |
| 45.13 | 📖 | **Async servlets** (`asyncSupported`, `startAsync`, `AsyncContext`): why (freeing container threads), when, pitfalls | ＋ |
| 45.14 | 🛠 | Build: async CSV export of tasks | ＋ |
| 45.15 | 📖 | `@MultipartConfig` file upload: concept + 🛡 upload risks (type, size, path traversal) | ＋ |
| 45.16 | 🎯 | Your Turn: a `ServletRequestListener` measuring slow requests (> 500 ms) into the audit log, thread-safely | ★ |
| 45.17 | 💡 | Solution walkthrough | ★ |
| 45.18 | 🐞 | Debug: `DataSource` leaks on redeploy (no `contextDestroyed` cleanup) | ★ |

> **As built:** 45.08 completes the existing `AppContextListener` (no separate AppBootstrapListener); `SessionRegistry` (session/attribute/id listener, registered with `addListener`; `SESSION_EXPIRED` on timeout, logout/revoke remove the user first); `/admin/audit` (📦 `AuditDao.find/count`, 25/page, S44 pagination tag); 📦 `/debug/race` + `/debug/slow`; `SlowRequestListener` (Your Turn); `/tasks/export.csv` async on a 2-thread pool with CSV-injection protection, every filter `async-supported`.

### ✅ Knowledge check
- **Concept:** Which of these are thread-safe *by construction*: local variables, servlet fields, request attributes, session attributes, context attributes?
- **Code reading:** Spot the concurrency bug in a given servlet.
- **Design:** Where do you create singletons (services, pools) in a plain Servlet app, and why not in a servlet's `init()`?
- **Implementation:** Show the "currently active sessions" count on the admin dashboard.

**Checkpoint:** `s45-end` (**Part 2 complete: the Admin Portal**)
