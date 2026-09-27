# Part 2A: HTTP, Servlets, and the Move to JSP

> Goal: build a strong mental model of **how a Servlet container works**, then move HTML generation from Servlets into JSP and understand exactly what Tomcat does with a JSP file.
>
> Stack: **Tomcat 9 · Servlet 4.0 · JSP 2.3 · `javax.*`** · Java 17 · Maven WAR.
> Companion reading: Servlet 4.0 specification (JSR 369), JSP 2.3 specification (JSR 245), Tomcat 9 documentation.

The evolution you'll live through in Part 2:

```text
Servlet with HTML (println)  →  JSP  →  JSP + scriptlets  →  JSP + EL  →  JSP + JSTL  →  clean MVC views
        S30–S31                 S32        S33                  S34          S35             S36+
```

---

## S28 · Backend Environment

**Project feature:** `backend/` Maven WAR project deployed to Tomcat 9; MySQL 8 running with the TaskFlow schema; shared SCSS compiled to `webapp/static/css/app.css`.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 28.01 | 🛠 | Installing JDK 17, Tomcat 9, Maven, MySQL 8 (installer **or** Docker) | ★ |
| 28.02 | 📖 | **`javax` vs `jakarta`**: the namespace history, and why Tomcat 9 = `javax` | ★ |
| 28.03 | 📖 | Tomcat's folder structure: `bin/`, `conf/` (`server.xml`, `web.xml`, `context.xml`), `webapps/`, `work/`, `logs/` | ★ |
| 28.04 | 📖 | The WAR structure: `WEB-INF/`, `WEB-INF/classes`, `WEB-INF/lib`, `WEB-INF/web.xml`; what is and isn't publicly reachable | ★ |
| 28.05 | 🛠 | Provided `pom.xml` walkthrough: `provided` vs `compile` scope, and **why JSTL must be bundled for Tomcat 9** | ★ |
| 28.06 | 🛠 | Run/debug Tomcat from the IDE; hot redeploy vs restart | ★ |
| 28.07 | 🛠 | MySQL: create the database and a **least-privilege app user** (provided scripts); load schema + seed | ★ |
| 28.08 | 🛠 | Compile the shared SCSS for JSP (`npm run styles:jsp`) | ★ |
| 28.09 | 🐞 | Debug: `ClassNotFoundException: jakarta.servlet.http.HttpServlet` on Tomcat 9 | ★ |
| 28.10 | 🐞 | Debug: 404 on every URL: wrong context path / deployment name | ★ |

### ✅ Knowledge check
- **Concept:** Why is `servlet-api` marked `provided`? What breaks if you bundle it?
- **Concept:** Why can the browser request `/static/css/app.css` but never `/WEB-INF/web.xml`?
- **Debugging:** The app deploys as `/backend-1.0-SNAPSHOT`. Where does the context path come from, and how do you change it?

**Checkpoint:** `s28-end`

---

## S29 · HTTP from the Server's Point of View

**Project feature:** none in code. You capture and annotate raw HTTP exchanges (curl `-v`, DevTools, a raw socket) for pages, forms and JSON.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 29.01 | 📖 | HTTP is text over TCP: request line, headers, blank line, body. Response: status line, headers, body. | ★ |
| 29.02 | 🛠 | Talking HTTP by hand: `curl -v`, and a raw request via `telnet`/`ncat` | ★ |
| 29.03 | 📖 | Methods and semantics: safe, idempotent; **GET must not change state** | ★ |
| 29.04 | 📖 | Status codes: 2xx/3xx/4xx/5xx; 200 vs 201 vs 204, 301 vs 302 vs 303, 400 vs 401 vs 403 vs 404 | ★ |
| 29.05 | 📖 | Headers that matter: `Content-Type`, `Content-Length`, `Location`, `Set-Cookie`, `Cookie`, `Cache-Control`, `Accept`, `User-Agent` | ★ |
| 29.06 | 📖 | Query strings and form bodies (`application/x-www-form-urlencoded`), URL encoding, `multipart/form-data`, JSON bodies | ★ |
| 29.07 | 📖 | **Statelessness**: why sessions and cookies had to be invented | ★ |
| 29.08 | 📖 | **Server-side rendering**: what "the server sends HTML" really means; the browser only ever receives bytes | ★ |
| 29.09 | 📖 | 🛡 Everything in a request is attacker-controlled: method, URL, headers, cookies, body, even "hidden" fields | ★ |
| 29.10 | 📖 | 🛡 HTTP vs HTTPS: what TLS protects (and what it doesn't) | ★ |
| 29.11 | 🎯 | Your Turn: capture and annotate 5 exchanges (page load, form POST, redirect, 404, JSON call from TaskFlow Web) | ★ |
| 29.12 | 💡 | Solution walkthrough | ★ |

### ✅ Knowledge check
- **Concept:** Why can a browser "follow" a 302 but a `fetch` from JavaScript might handle it differently?
- **Code reading:** Given a raw HTTP request, identify method, path, query, headers, cookies, body.
- **Design:** Deleting a task via `GET /tasks/delete?id=5`: list three problems.

**Checkpoint:** `s29-end`

---

## S30 · Your First Servlet: the Container Mental Model

**Project feature:** `GET /hello` → `HelloServlet` generating an HTML page; a `?name=` parameter; a request-info page showing method, URI, headers and remote address.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 30.01 | 📖 | What a Servlet **is**: a Java object that the container calls to handle requests. You never write `main()`. | ★ |
| 30.02 | 📖 | What a **Servlet container** does: listens on a port, parses HTTP, creates request/response objects, maps URL → Servlet, manages threads, lifecycle, sessions | ★ |
| 30.03 | 📖 | Inside Tomcat: Connector → Engine → Host → Context → Wrapper; the thread pool | ★ |
| 30.04 | 🛠 | Build: `HelloServlet extends HttpServlet` with `@WebServlet("/hello")`, `doGet` writing HTML via `PrintWriter` | ★ |
| 30.05 | 📖 | **Lifecycle**: load → `init()` → `service()` many times → `destroy()`. When each runs, and how many instances exist (usually **one**). | ★ |
| 30.06 | 🛠 | Build: log every lifecycle method; observe with multiple browser tabs; `loadOnStartup` | ★ |
| 30.07 | 📖 | `service()` → `doGet()` / `doPost()` dispatch: reading `HttpServlet`'s source; what happens for an unimplemented method (405) | ★ |
| 30.08 | 📖 | `HttpServletRequest`: `getMethod`, `getRequestURI`, `getContextPath`, `getServletPath`, `getPathInfo`, `getQueryString`, `getHeader`, `getRemoteAddr` | ★ |
| 30.09 | 📖 | `HttpServletResponse`: `setStatus`, `setContentType`, `setCharacterEncoding`, `setHeader`, `getWriter` vs `getOutputStream`; **committed responses** | ★ |
| 30.10 | 🛠 | Build: `/debug/request-info` page (useful for the rest of the course) | ★ |
| 30.11 | 📖 | Mapping: `@WebServlet` vs `web.xml` `<servlet>` + `<servlet-mapping>`; URL pattern types (exact, path `/x/*`, extension `*.do`, default `/`) and precedence | ★ |
| 30.12 | 📖 | `ServletConfig` and **init parameters** (`@WebInitParam` / `<init-param>`) | ★ |
| 30.13 | 📖 | `ServletContext`: one per web app; context params; a first look at application scope | ★ |
| 30.14 | 🔓 | Lab: `/hello?name=<script>alert(1)</script>`. **Reflected XSS** from a `println`. | ★ |
| 30.15 | 🎯 | Your Turn: `/time` Servlet with a `format` init parameter and a `greeting` context parameter; response in correct UTF-8 (test with Vietnamese text) | ★ |
| 30.16 | 💡 | Solution walkthrough | ★ |
| 30.17 | 🐞 | Debug: Vietnamese characters show as `?`. Order of `setCharacterEncoding` vs `getWriter`. | ★ |
| 30.18 | 🐞 | Debug: `IllegalStateException: Cannot call sendRedirect() after the response has been committed` | ★ |

### ✅ Knowledge check
- **Concept:** 100 users request `/hello` at the same time. How many `HelloServlet` objects exist? How many threads?
- **Concept:** Who calls `doGet`? Trace from the TCP connection to your method.
- **Code reading:** For `/taskflow/tasks/view/5?x=1` mapped to `/tasks/*`, give `getContextPath`, `getServletPath`, `getPathInfo`, `getQueryString`.
- **Debugging:** Two Servlets map to `/tasks`. What happens at deployment?
- **Design:** Where do you put a value configured per Servlet vs per application?

**Checkpoint:** `s30-end`

---

## S31 · Multiple Servlets: Routing, Parameters, GET/POST, Redirect vs Forward

**Project feature:** in-memory task CRUD with Servlets only (HTML via `println`): `/tasks` list, `/tasks/view?id=`, a create form + POST, and a delete POST. It's painful on purpose.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 31.01 | 🛠 | Build: `TaskListServlet` rendering an HTML table from an in-memory list (provided `InMemoryTaskStore`) | ★ |
| 31.02 | 📖 | Request **parameters**: `getParameter`, `getParameterValues`, `getParameterMap`; everything is a `String` or `null` | ★ |
| 31.03 | 🛠 | Build: `TaskViewServlet` with `?id=`; handle missing/invalid id → 400 / 404 via `sendError` | ★ |
| 31.04 | 📖 | GET vs POST in practice: where parameters live, bookmarking, caching, browser resubmission | ★ |
| 31.05 | 🛠 | Build: `TaskCreateServlet`: `doGet` shows the form, `doPost` handles it | ★ |
| 31.06 | 📖 | **Redirect** (`sendRedirect`): status 302 + `Location` → a *new* request from the browser; the URL changes | ★ |
| 31.07 | 📖 | **Forward** (`RequestDispatcher.forward`): server-internal; same request, same response; the URL doesn't change | ★ |
| 31.08 | 📖 | Forward vs redirect side by side: request count, URL bar, attributes survive or not, when to use each | ★ |
| 31.09 | 📖 | Request **attributes** vs parameters: `setAttribute`/`getAttribute`; who sets them, lifetime = one request | ★ |
| 31.10 | 📖 | `include()` vs `forward()`: first look | ★ |
| 31.11 | 📖 | Relative vs absolute URLs in redirects; `getContextPath()`; `encodeRedirectURL` | ★ |
| 31.12 | 🔓 | Lab: parameter tampering: change `id`, add unexpected params, send a POST with curl, bypassing the form | ★ |
| 31.13 | 🎯 | Your Turn: delete via POST + redirect back to the list; "toggle done" via POST | ★ |
| 31.14 | 💡 | Solution walkthrough | ★ |
| 31.15 | 🐞 | Debug: an attribute set before `sendRedirect` is `null` on the next page. Explain the two requests. | ★ |
| 31.16 | 🐞 | Debug: `NumberFormatException` crashes the page on `?id=abc` | ★ |

### ✅ Knowledge check
- **Concept:** After a forward, what does the browser's URL bar show? After a redirect?
- **Code reading:** `request.setAttribute("msg","Saved"); response.sendRedirect("tasks");`: will `/tasks` see `msg`?
- **Debugging:** The list page shows a stale message after refresh. Forward or redirect was used?
- **Design:** Parameter or attribute for: the task ID from the URL, a list the Servlet loaded, an error message the Servlet computed?
- **Implementation:** A `/tasks?status=DONE` filter using parameters only.

**Checkpoint:** `s31-end`

---

## S32 · From Servlet-generated HTML to JSP

**Project feature:** the task list and details pages move to JSP. The Servlet prepares data → `request.setAttribute` → `forward` → JSP renders HTML. The shared SCSS design system styles the Admin Portal.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 32.01 | 📖 | The pain: HTML inside Java strings (escaping quotes, designers can't edit, no separation) | ★ |
| 32.02 | 📖 | Architecture before/after: `Servlet {logic + HTML}` → `Servlet {prepares data} → JSP {renders}` | ★ |
| 32.03 | 🛠 | Build: first JSP (`tasks.jsp`) rendering static HTML | ★ |
| 32.04 | 📖 | **The complete flow**: Browser → Servlet → `setAttribute` → `forward` → JSP → HTML → Browser. Where each line runs and when. | ★ |
| 32.05 | 📖 | Deep dive: `request.setAttribute("tasks", tasks)`. What is `request`? What is an attribute? Where is it stored (a map on the request object, in Tomcat's heap)? Who can access it? How long does it live? | ★ |
| 32.06 | 🛠 | Build: `TaskListServlet` forwards to `/WEB-INF/views/tasks/list.jsp`; the JSP reads the attribute (a scriptlet for now, replaced in S34) | ★ |
| 32.07 | 📖 | Why JSPs live in `WEB-INF/views`: they can't be requested directly, only through a controller | ★ |
| 32.08 | 📖 | **What the browser receives**: View Source. No JSP, no Java, no attributes, only HTML text. | ★ |
| 32.09 | 📖 | **Server-side vs client-side boundary**: JSP → generates HTML/JS text; JavaScript → runs later in the browser; the Servlet → runs on the server. A `<script>` containing `${…}` explained. | ★ |
| 32.10 | 🛠 | Link the shared SCSS-compiled CSS; static resources and the `default` servlet | ★ |
| 32.11 | 🔓 | Lab: the S30 reflected XSS reappears in JSP output | ★ |
| 32.12 | 🎯 | Your Turn: move task details to JSP (`view.jsp`) with a 404 path handled by the Servlet | ★ |
| 32.13 | 💡 | Solution walkthrough | ★ |
| 32.14 | 🐞 | Debug: the JSP shows nothing: the Servlet used `sendRedirect` to the JSP instead of `forward` | ★ |
| 32.15 | 🐞 | Debug: CSS doesn't load on `/tasks/view` (relative path + path depth) | ★ |

### ✅ Knowledge check
- **Concept:** Did the browser execute the JSP? When did the JSP execute relative to the Servlet?
- **Concept:** What would happen if the Servlet redirected instead of forwarding?
- **Code reading:** `<script>const n = "<%= request.getAttribute("name") %>";</script>`. Where does each part run? What does the browser receive?
- **Design:** Why should the Servlet never write HTML again once JSP exists?

**Checkpoint:** `s32-end`

---

## S33 · JSP Fundamentals: Translation, Lifecycle, Implicit Objects, Directives, Actions, Scriptlets

**Project feature:** the task pages written *entirely with scriptlets* (deliberately), then critiqued. A generated servlet (`list_jsp.java`) is read line by line.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 33.01 | 📖 | What JSP **is**: a text template that Tomcat turns into a Servlet. Why JSP exists (page authors, HTML-first). | ★ |
| 33.02 | 📖 | **JSP lifecycle**: translation (`.jsp` → `_jsp.java`) → compilation (`.class`) → load → `jspInit()` → `_jspService()` per request → `jspDestroy()` | ★ |
| 33.03 | 🛠 | Lab: find `list_jsp.java` in Tomcat's `work/` folder and **read it**: where your HTML became `out.write(...)` | ★ |
| 33.04 | 📖 | When translation happens (first request, or after changes); Jasper; `development` mode; precompilation | ★ |
| 33.05 | 📖 | JSP vs Servlet: the same thing at runtime, a different authoring model | ★ |
| 33.06 | 📖 | **Implicit objects**: `request`, `response`, `session`, `application`, `out`, `page`, `pageContext`, `config`, `exception`. Where each comes from in the generated code. | ★ |
| 33.07 | 📖 | Scripting elements: **scriptlets** `<% %>`, **expressions** `<%= %>`, **declarations** `<%! %>`; where each lands in the generated class | ★ |
| 33.08 | 🛠 | Build: the list page with scriptlets: `for` loop, `if`, `<%= task.getTitle() %>` | ★ |
| 33.09 | 🔓 | Lab: a `<%! int counter; %>` declaration shared across users/threads. A race condition + data leak. | ★ |
| 33.10 | 📖 | **Directives**: `page` (`contentType`, `pageEncoding`, `import`, `session`, `errorPage`, `isErrorPage`, `trimDirectiveWhitespaces`), `include`, `taglib` | ★ |
| 33.11 | 📖 | **Standard actions**: `<jsp:include>`, `<jsp:forward>`, `<jsp:param>`; `<jsp:useBean>`/`setProperty`/`getProperty` (historical) | ★ |
| 33.12 | 📖 | `pageContext` and the **four scopes** (page, request, session, application): the foundation for EL | ★ |
| 33.13 | 📖 | **Why modern JSP avoids Java code**: mixing concerns, untestable, null-pointer-prone, no escaping, designers can't edit, logic creep. Evidence from the page you just wrote. | ★ |
| 33.14 | 📖 | Disabling scripting: `<scripting-invalid>` in `web.xml`, enforcing clean views | ＋ |
| 33.15 | 🎯 | Your Turn: add "overdue" highlighting and a count with scriptlets, then list 5 concrete problems in your own code | ★ |
| 33.16 | 💡 | Solution walkthrough | ★ |
| 33.17 | 🐞 | Debug: a JSP compile error points at `list_jsp.java:142`. Map it back to the `.jsp` line. | ★ |
| 33.18 | 🐞 | Debug: a stray `<% } %>` breaks the page. Unbalanced braces across scriptlets. | ★ |

### ✅ Knowledge check
- **Concept:** What is the difference between `<%! int x = 0; %>` and `<% int x = 0; %>` in the generated servlet? Which is thread-safe?
- **Concept:** Is a JSP a Servlet? Justify with the generated class's superclass.
- **Code reading:** Given a JSP, predict the generated `_jspService` body.
- **Debugging:** After editing a JSP, the change doesn't appear. List the possible causes.
- **Design:** Name three things a JSP should never do.

**Checkpoint:** `s33-end`
