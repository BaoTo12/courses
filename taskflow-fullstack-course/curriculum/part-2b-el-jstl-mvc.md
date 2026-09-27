# Part 2B: EL, JSTL, MVC, Forms, Scopes, Reusable Views

> Goal: master Expression Language and JSTL as major topics, then build a clean MVC Admin Portal with real CRUD, correct scope choices, and reusable view components. Security: XSS, SQL injection and CSRF labs.

---

## S34 · Expression Language (EL) in Depth

**Project feature:** every scriptlet from S33 replaced with EL; the task details page shows nested data (`${task.category.name}`, `${task.owner.displayName}`); a debug panel shows `param`, `header` and `cookie` values.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 34.01 | 📖 | Why EL exists: `<%= ((Task) request.getAttribute("task")).getTitle() %>` → `${task.title}`. Casting, null checks and imports disappear. | ★ |
| 34.02 | 📖 | `${…}` syntax; where EL is evaluated (template text, tag attributes); `${}` vs `#{}` (deferred, JSF); `isELIgnored` | ★ |
| 34.03 | 📖 | **Variable resolution**: `${user}` → `pageContext.findAttribute("user")`. Search order **page → request → session → application**. Not found → `null` → prints *empty string*. | ★ |
| 34.04 | 📖 | The ELResolver chain (implicit objects → scoped attributes → map → list → array → bean). What Tomcat's Jasper generates for `${…}`. | ★ |
| 34.05 | 📖 | **Explicit scopes**: `${requestScope.user}`, `${sessionScope.user}`, … Difference from `${user}`, name shadowing, and why explicit is sometimes clearer | ★ |
| 34.06 | 🔓/🐞 | Lab: shadowing. A request attribute `user` hides the logged-in `sessionScope.user` on one page. | ★ |
| 34.07 | 📖 | **JavaBean property resolution**: `${task.title}` → `getTitle()`; `boolean isDone()`; naming rules; public class + public getter required | ★ |
| 34.08 | 📖 | Nested properties: `${user.address.city}`; null-safety along the chain (no NPE, just empty) | ★ |
| 34.09 | 🛠 | Build: `TaskView` model with nested `Category` and `User`; details page with EL only | ★ |
| 34.10 | 📖 | `.` vs `[]`: maps (`${stats['IN_PROGRESS']}`), lists and arrays (`${tasks[0]}`), dynamic keys (`${map[key]}`), keys with dashes | ★ |
| 34.11 | 📖 | Operators: arithmetic, comparison (`==`/`eq`, `<`/`lt`…), logical (`&&`/`and`, `!`/`not`), **`empty`**, conditional `a ? b : c` | ★ |
| 34.12 | 📖 | `empty` in depth: null, `""`, empty collection, empty map, empty array | ★ |
| 34.13 | 📖 | Type coercion: `${param.page + 1}`, string vs number comparison, enums vs strings (`${task.status == 'DONE'}`) | ★ |
| 34.14 | 📖 | **EL implicit objects**: `pageScope`, `requestScope`, `sessionScope`, `applicationScope`, `param`, `paramValues`, `header`, `headerValues`, `cookie`, `initParam`, `pageContext` | ★ |
| 34.15 | 📖 | Deep examples: `${param.keyword}` · `${header["User-Agent"]}` · `${cookie.lang.value}` · `${pageContext.request.contextPath}` | ★ |
| 34.16 | 🛠 | Build: debug panel (dev only) showing params, headers, cookies, scopes | ★ |
| 34.17 | 📖 | EL 3.0 extras on Tomcat 9: string concatenation `+=`, lambdas, collection operations, static field access. When they're clever vs harmful. | ＋ |
| 34.18 | 🔓 | Lab: **EL does NOT escape output.** `${param.q}` echoed in a search box → XSS | ★ |
| 34.19 | 📖 | 🛡 Output contexts: HTML body, HTML attribute, JavaScript string, URL. Each needs different encoding (fixed with JSTL in S35) | ★ |
| 34.20 | 🎯 | Your Turn: a stats box from a `Map<String, Integer>` attribute; show "No tasks" via `empty`; highlight overdue with a ternary class | ★ |
| 34.21 | 💡 | Solution walkthrough | ★ |
| 34.22 | 🐞 | Debug: `${requestScope.tasks}` prints nothing. Investigation checklist: was the attribute set? Name? Scope? Forward or redirect? Same request? Is the JSP actually rendered? | ★ |
| 34.23 | 🐞 | Debug: `${task.done}` → `PropertyNotFoundException` (getter named `getIsDone()`) | ★ |
| 34.24 | 🐞 | Debug: `${user.name}` shows the wrong user (scope shadowing) | ★ |
| 34.25 | 🐞 | Debug (real, found while building): `${sessionScope.user}` throws `IllegalStateException` in a `session="false"` page | ★ |

> **As built:** EL has no statements, so S34's `list.jsp` keeps **one** loop scriptlet (with `pageContext.setAttribute`) and uses the HTML `hidden` attribute for "don't show"; S35's `<c:forEach>`/`<c:if>` remove both. Views escape with `${Html.escape(…)}` (EL 3.0 static call) until S35's `<c:out>`.

### ✅ Knowledge check
- **Concept:** Explain exactly how `${user.address.city}` is evaluated, step by step, including every scope searched and every method called.
- **Concept:** `${user}` vs `${requestScope.user}`: when do they give different results?
- **Code reading:** Predict the output of `${empty list}`, `${list.size() > 0}`, `${param.page + 1}` (no param), `${'5' == 5}`.
- **Debugging:** The Servlet did `request.getSession().setAttribute("tasks", …)` and the JSP uses `${requestScope.tasks}`. Output?
- **Design:** When would you insist on explicit scopes in your team's JSP style guide?
- **Implementation:** Show `Welcome, ${…}` from the session user, falling back to "Guest".

**Checkpoint:** `s34-end`

---

## S35 · JSTL in Depth (with EL)

**Project feature:** all views logic-free: `<c:forEach>` lists with row numbers, `<c:choose>` status labels, `<c:url>` links, safe output everywhere; the comment section with the **stored XSS lab**.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 35.01 | 📖 | What JSTL is: a standard tag library. **Tags are Java classes** invoked by the generated servlet. Why it exists. | ★ |
| 35.02 | 📖 | Tag libraries: `<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>`, TLDs, how Tomcat finds them in `WEB-INF/lib` | ★ |
| 35.03 | 📖 | **Division of labour**: EL *reads values*; JSTL *controls flow and output*. Together they replace scriptlets. | ★ |
| 35.04 | 📖 | `<c:out>`: **escapes XML by default**; `escapeXml`, `default` | ★ |
| 35.05 | 🛡 | Defend: fix the S32/S34 XSS with `<c:out>` / `fn:escapeXml` | ★ |
| 35.06 | 📖 | `<c:if>` (and why there's no `else`); `<c:choose>` / `<c:when>` / `<c:otherwise>` | ★ |
| 35.07 | 📖 | `<c:forEach>`: `items`, `var`, `varStatus` (`index`, `count`, `first`, `last`), `begin`/`end`/`step`; iterating maps (`entry.key`/`entry.value`) | ★ |
| 35.08 | 🛠 | Refactor: the scriptlet loop → `<c:forEach>`; status badges via `<c:choose>`; empty-state message | ★ |
| 35.09 | 📖 | Why this is better than scriptlets: readability, null-safety, escaping, testability, tooling | ★ |
| 35.10 | 📖 | `<c:set>` (var, scope, target/property) and `<c:remove>`: when setting variables in a view is fine vs a smell | ★ |
| 35.11 | 📖 | `<c:url>` + `<c:param>`: context path + **URL encoding** + session ID rewriting | ★ |
| 35.12 | 📖 | `<c:redirect>`, `<c:import>`, `<c:catch>`, `<c:forTokens>`: what they do and why most are rarely appropriate in MVC views | ＋ |
| 35.13 | 📖 | The `fn:` functions library: `fn:length`, `fn:escapeXml`, `fn:contains`, `fn:substring`, `fn:join` | ★ |
| 35.14 | 🔓 | Lab: **stored XSS** in task comments: a comment saved once, executed for every admin who views it | ★ |
| 35.15 | 🛡 | Defend: output encoding at render time; why "sanitise on input" alone fails | ★ |
| 35.16 | 🔓 | Lab: XSS in **attribute** and **JavaScript** contexts: `value="${…}"`, `<script>var q = '${…}'</script>`, `data-user-id="${…}"` | ★ |
| 35.17 | 🛡 | Defend: attribute encoding, JSON-in-script pattern, avoiding inline JS data | ★ |
| 35.18 | 🎯 | Your Turn: the exercise from the course brief. Empty list → message; non-empty → table; completed tasks get a different label; use `varStatus` for zebra rows. | ★ |
| 35.19 | 💡 | Solution walkthrough | ★ |
| 35.20 | 🐞 | Debug: `<c:forEach>` prints `${task.title}` literally (missing taglib / EL ignored / wrong URI for Tomcat 9) | ★ |
| 35.21 | 🐞 | Debug: `The absolute uri: http://java.sun.com/jsp/jstl/core cannot be resolved` (JSTL jar missing) | ★ |
| 35.22 | 🐞 | Debug (real, found while building): a space after `<c:if>` disappears (`trimDirectiveWhitespaces`) | ★ |

> **As built:** 35.18's Your Turn applies the brief's exercise to the **comments section** of the details page (empty state, table, admin label, zebra rows); the task list itself is refactored in the 35.08 build. Comments (model, in-memory store, `TaskCommentServlet`) are provided in 35.14.

### ✅ Knowledge check
- **Concept:** What does JSTL do that EL cannot, and vice versa?
- **Code reading:** Output of a `<c:forEach>` with `varStatus` + `begin="1" end="3"` over 5 items.
- **Debugging:** `<c:if test="${task.status == DONE}">` never matches. Why?
- **Design:** `<c:out value="${x}"/>` or just `${x}`: write your team rule and justify it.
- **Implementation:** A paginated table with "Showing 21–40 of 134" computed in EL.

**Checkpoint:** `s35-end`

---

## S36 · MVC with a Real Database (+ SQL Injection Lab)

**Project feature:** Controller → Service → DAO → MySQL. The in-memory store is replaced by provided DAOs; controllers become thin; categories come from the DB; search hits SQL.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 36.01 | 📖 | MVC formally: Model (domain + services), View (JSP), Controller (Servlet). Responsibilities and boundaries. | ★ |
| 36.02 | 📖 | Layers: Controller → Service → Repository/DAO → Database; why the Servlet never touches JDBC | ★ |
| 36.03 | 🛠 | 📦 Provided data layer (MySQL + JPA/Hibernate, **not explained**: provided code only); what to copy; `TaskService`'s methods | ★ |
| 36.04 | 📖 | Where objects live: creating services once (in a listener or `init()`), sharing them via `ServletContext` | ★ |
| 36.05 | 🛠 | Build: `TaskController` servlets calling `TaskService`; request attributes → JSP | ★ |
| 36.06 | 📖 | The view-model question: pass entities or view DTOs to JSP? | ★ |
| 36.07 | 📖 | Front controller (one servlet + action routing) vs a servlet per use case; how frameworks (Spring MVC) evolved from this | ★ |
| 36.08 | 🔓 | Lab: **SQL injection**. Write a vulnerable `searchByTitle` with string concatenation; exploit it (`' OR '1'='1`, `UNION` to read `users`). | ★ |
| 36.09 | 🛡 | Defend: placeholders + bound values; `LIKE` wildcards; dynamic sort via an allow-list | ★ |
| 36.10 | 📖 | 🛡 Defence in depth: the least-privilege DB user, what it limits after an injection | ★ |
| 36.11 | 🎯 | Your Turn: category filter + sort column (allow-listed) through the MVC stack | ★ |
| 36.12 | 💡 | Solution walkthrough | ★ |
| 36.14 | 🐞 | Debug (real, found while building): a test passes alone and fails in the suite (shared database) | ★ |

> **As built:** no JDBC is taught (the learner's choice): the data layer is JPA/Hibernate 5.6, **provided without explanation**; 36.09 teaches parameters and allow-lists generically; 36.13 (pool leak) was removed. Tests use Testcontainers (MySQL 8.4 + `db/01–04`), so `mvn package` needs Docker. 36.08 is a conceptual lecture on the flaw; its claims are pinned by `S36SqlInjectionLabTest`.

### ✅ Knowledge check
- **Concept:** Why can't a `PreparedStatement` parameter change the SQL's structure, but a concatenated string can?
- **Code reading:** Is `"ORDER BY " + sortParam` injectable? Fix it.
- **Design:** Which layer should validate "due date not in the past"? Which layer checks "user owns this task"?
- **Implementation:** A task count per category on the list page via the service.

**Checkpoint:** `s36-end`

---

## S37 · Forms: Create, Edit, Delete, Validation, PRG (+ CSRF Lab)

**Project feature:** full CRUD in the Admin Portal with server-side validation, redisplay of errors and old values, PRG with flash messages, delete via POST, and CSRF protection.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 37.01 | 📖 | The `<form>` element: `action`, `method`, `name` attributes → parameters; what the browser sends | ★ |
| 37.02 | 📖 | GET vs POST forms: search (GET) vs create/update/delete (POST), and why | ★ |
| 37.03 | 🛠 | Build: `/tasks/new` form (GET) and submit (POST) | ★ |
| 37.04 | 📖 | Server-side validation: parsing, required fields, lengths, enum/allow-list checks, dates. **Never trust the client.** | ★ |
| 37.05 | 📖 | Validation errors as request attributes (`errors` map + `form` bean) → forward back to the form | ★ |
| 37.06 | 🛠 | Build: redisplay errors next to fields, keep the user's old values (`${form.title}`), safely encoded | ★ |
| 37.07 | 📖 | The double-submit problem: refresh after POST → duplicate task | ★ |
| 37.08 | 📖 | **PRG (Post/Redirect/Get)**: why redirect after a successful POST; 302 vs 303 | ★ |
| 37.09 | 📖 | Flash messages: surviving a redirect via the session, removed after one read | ★ |
| 37.10 | 🛠 | Build: edit (`/tasks/edit?id=`) and delete (POST with confirm) | ★ |
| 37.11 | 📖 | 🛡 Mass assignment in form binding: only copy the fields you expect (no `ownerId` from the form) | ★ |
| 37.12 | 🔓 | Lab: **CSRF**. A malicious page on another port auto-submits a delete form to TaskFlow Admin. | ★ |
| 37.13 | 🛡 | Defend: synchroniser token pattern (a token in the session + a hidden field), checked on every POST | ★ |
| 37.14 | 📖 | SameSite cookies as a second layer; why they're not the only layer | ★ |
| 37.15 | 🎯 | Your Turn: category management (create/rename/delete with "category in use" validation) using PRG + CSRF token | ★ |
| 37.16 | 💡 | Solution walkthrough | ★ |
| 37.17 | 🐞 | Debug: validation errors disappear after submit (redirected instead of forwarded on error) | ★ |
| 37.18 | 🐞 | Debug: the flash message appears twice / never (removed at the wrong time) | ★ |

> **As built:** PRG uses 303 (`Http.seeOther`); flash via `Flash.put/consume` (session → request attribute, views stay `session="false"`); CSRF via `Csrf.prepare/isValid` in each POST servlet (S40 moves it into a filter). 37.12 is conceptual. New category DAO methods are provided (no data-layer lectures).

### ✅ Knowledge check
- **Concept:** On validation failure, forward or redirect? On success? Why the difference?
- **Code reading:** Trace all requests (method, URL, status) for: open form → submit invalid → fix → submit valid → refresh.
- **Debugging:** A hidden `ownerId` field lets users create tasks for others. Where's the flaw?
- **Design:** Why must delete never be a GET link, even with a confirm dialog?
- **Implementation:** An "Undo delete" flash with a link (think about what state is needed).

**Checkpoint:** `s37-end`

---

## S38 · Scope and State: Choosing the Right Scope

**Project feature:** page-scoped view helpers, request-scoped data, session-scoped user/flash/preferences, application-scoped categories cache and live stats. Every choice is justified in `docs/scopes.md`.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 38.01 | 📖 | The four scopes as **objects**: `PageContext`, `HttpServletRequest`, `HttpSession`, `ServletContext`. Lifetime, visibility, threads. | ★ |
| 38.02 | 📖 | Request scope: data for one request (the default choice) | ★ |
| 38.03 | 📖 | Session scope: per user (browser), across requests; memory cost; serialisation; clustering note | ★ |
| 38.04 | 📖 | Application scope: shared by **all** users and threads. Thread safety required. | ★ |
| 38.05 | 📖 | Page scope: inside one JSP only (`<c:set>` default) | ★ |
| 38.06 | 🛠 | Build: categories cached in application scope at startup; invalidated on change | ★ |
| 38.07 | 🛠 | Build: an "online admins" counter + request counter in application scope (thread-safe with `AtomicInteger`/`ConcurrentHashMap`) | ★ |
| 38.08 | 🔓 | Lab: wrong-scope bugs: the search results stored in application scope (user A sees B's results); the task list in session (stale data + memory); the form errors in session (show up on another page) | ★ |
| 38.09 | 📖 | 🛡 Sensitive data and scope: never application scope; minimise session contents | ★ |
| 38.10 | 🎯 | Your Turn: a decision exercise: 12 pieces of data, choose a scope, justify, then implement 4 of them | ★ |
| 38.11 | 💡 | Solution walkthrough | ★ |
| 38.12 | 🐞 | Debug: the counter in application scope shows wrong numbers under load (non-atomic `++`) | ★ |

> **As built:** 38.07 counts active **sessions** (login arrives in S41) + requests + most viewed tasks on `/debug/stats`; 38.10 implements two items (session "recently viewed", application "most viewed"); `docs/scopes.md` lives in `reference/taskflow/docs/`.

### ✅ Knowledge check
- **Design:** Request or session scope for: a validation error list, a logged-in user, the current page's tasks, a shopping-cart-like "selected tasks" set, the language preference?
- **Concept:** Why does a request attribute disappear after a redirect but a session attribute doesn't?
- **Debugging:** Two users see each other's search results. Which scope was misused?

**Checkpoint:** `s38-end`

---

## S39 · Reusable JSP: Includes, Layouts, Fragments

**Project feature:** shared `header.jspf`, `nav.jspf`, `footer.jspf`, `flash.jspf`, `form-errors.jspf`, a `task-row` fragment, and theme switching via a preference cookie (the same design tokens as the React app).

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 39.01 | 📖 | The problem: copy-pasted headers and navs across 10 pages | ★ |
| 39.02 | 📖 | **Include directive** `<%@ include file="…" %>`: **translation-time** text inclusion; shares variables; `.jspf` files | ★ |
| 39.03 | 📖 | **`<jsp:include page="…">`**: **request-time** inclusion; a separate servlet; `<jsp:param>`; own page scope | ★ |
| 39.04 | 📖 | Side-by-side: generated code for each; when changes are picked up; performance; variable sharing | ★ |
| 39.05 | 🛠 | Build: header/nav/footer via the include directive; flash + errors via `<jsp:include>` with params | ★ |
| 39.06 | 📖 | Passing data to fragments: request attributes vs `<jsp:param>` (`${param.x}`) | ★ |
| 39.07 | 📖 | Layout strategies: include-based layouts vs `web.xml` `<jsp-property-group>` preludes/codas vs tag-file layouts (S44) | ＋ |
| 39.08 | 🛠 | Build: active nav item highlighting based on the current path (`${pageContext.request.servletPath}`) | ★ |
| 39.09 | 🛠 | Build: theme class from a `theme` cookie (`${cookie.theme.value}`) with an allow-list fallback | ★ |
| 39.10 | 🎯 | Your Turn: a reusable `task-row` fragment used on the list page *and* the dashboard | ★ |
| 39.11 | 💡 | Solution walkthrough | ★ |
| 39.12 | 🐞 | Debug: "Duplicate local variable" after including the same fragment twice (the include directive) | ★ |
| 39.13 | 🐞 | Debug: an included fragment can't see a `<c:set>` variable (page scope of `<jsp:include>`) | ★ |
| 39.14 | 🐞 | Debug (found while building): the active nav link never highlights: after a forward, `servletPath` is the JSP's; use `javax.servlet.forward.servlet_path` | ★ |

> **As built:** 39.08 uses `requestScope['javax.servlet.forward.servlet_path']` (not `pageContext.request.servletPath`, pinned by a test); the theme cookie is the React app's `tf_theme` with the shared `[data-theme]` tokens; the dashboard is new (`/dashboard`).

### ✅ Knowledge check
- **Concept:** You edit `header.jspf`. Why might pages not update until they're recompiled?
- **Design:** Include directive or `<jsp:include>` for: the site header, a widget that needs its own data, a dynamic sidebar?
- **Implementation:** A reusable empty-state fragment with a message param.

**Checkpoint:** `s39-end`
