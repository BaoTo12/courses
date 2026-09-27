# Part 4: Hybrid Integration, Security Review, Final Project

> Goal: combine both worlds in one page, audit the whole system, and prove you can explain every arrow of the architecture.

---

## S49 · Hybrid: a React Island Inside a JSP Page

**Project feature:** `/react-board`: a JSP page (layout, nav, i18n from the server) that mounts a React Kanban board. Initial data is passed safely from the Servlet; the React build is bundled into the WAR; SPA fallback routing serves TaskFlow Web from Tomcat.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 49.01 | 📖 | Why hybrids exist: incremental migration (the "strangler fig" pattern), widgets inside legacy pages | ★ |
| 49.02 | 📖 | **The execution timeline**: Servlet runs → JSP renders HTML (with a `<div id="board">` + data) → browser parses → JS bundle loads → React mounts. What exists at each moment. | ★ |
| 49.03 | 📖 | Passing initial data: `data-*` attributes vs a `<script type="application/json">` block vs a separate API call. Trade-offs. | ★ |
| 49.04 | 🔓 | Lab: `<script>window.__INITIAL__ = ${taskJson}</script>`: breaking out with `</script>` in a task title | ★ |
| 49.05 | 🛡 | Defend: JSON-in-script with `<`, `>`, `&` escaped as `<`…; read via `textContent` + `JSON.parse`; no inline execution | ★ |
| 49.06 | 📖 | 🛡 CSP with a **nonce** for the island's bootstrap script, generated per request in the `SecurityHeadersFilter` and exposed to the JSP via EL | ★ |
| 49.07 | 🛠 | Build: Vite "library/entry" build for the island; referencing hashed assets from JSP (manifest) | ★ |
| 49.08 | 🛠 | Build: the island reuses the Redux store setup, the Axios instance (same session + CSRF), and i18next reading the same `lang` cookie | ★ |
| 49.09 | 📖 | Styling in a hybrid: the SCSS design system already on the page + styled-components inside the island; avoiding collisions | ★ |
| 49.10 | 🛠 | Build: bundle the full SPA into the WAR under `/app/*` + an `SpaFallbackFilter` (deep links such as `/app/tasks/5` → `index.html`) | ★ |
| 49.11 | 📖 | Deployment topology options: one WAR vs static hosting + API; the cookie/CORS implications of each | ★ |
| 49.12 | 🎯 | Your Turn: a JSP task details page with a React "comments" island that receives the task ID and the current user from the server | ★ |
| 49.13 | 💡 | Solution walkthrough | ★ |
| 49.14 | 🐞 | Debug: the island renders empty: script ordering / mount before DOM ready / wrong asset path under the context path | ★ |

### ✅ Knowledge check
- **Concept:** In `/react-board`, which HTML came from JSP and which from React? How can you prove it in DevTools (View Source vs Elements)?
- **Code reading:** `<button data-user-id="${user.id}">`: when is `${user.id}` evaluated? Can React change it? Can the user?
- **Design:** For a new feature in the Admin Portal: pure JSP, a React island, or a full migration? Give criteria.

**Checkpoint:** `s49-end`

---

## S50 · Security Review and Hardening

**Project feature:** `docs/security/checklist.md` completed with evidence; dependency scans clean; HTTPS on local Tomcat; final hardening fixes.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 50.01 | 📖 | How to run a security review: assets, entry points, trust boundaries (update the S00 threat notes) | ★ |
| 50.02 | 📖 | OWASP Top 10 walkthrough against TaskFlow, and a comparison with the newest edition's categories | ★ |
| 50.03 | 🛠 | Checklist pass 1 (frontend): XSS sinks, URL handling, token storage, secrets in the bundle, `npm audit` | ★ |
| 50.04 | 🛠 | Checklist pass 2 (backend): output encoding in every JSP, prepared statements, CSRF coverage, access control per endpoint, session config | ★ |
| 50.05 | 🛠 | Checklist pass 3 (config): headers, CSP, cookie flags, error pages, `ErrorReportValve`, directory listings, default Tomcat apps removed | ★ |
| 50.06 | 🛠 | OWASP Dependency-Check for Maven; reading and triaging findings | ★ |
| 50.07 | 🛠 | HTTPS on local Tomcat (self-signed keystore); `Secure` cookies; HSTS (and why to be careful with it locally) | ★ |
| 50.08 | 📖 | SSRF: concept only, and why TaskFlow has no attack surface for it (and what feature would create one) | ＋ |
| 50.09 | 🎯 | Your Turn: a "red team" exercise: 8 new vulnerabilities planted across both clients and the API. Find and fix them. | ★ |
| 50.10 | 💡 | Solution walkthrough | ★ |

### ✅ Knowledge check
- For each OWASP category, point to the exact file/filter/line in TaskFlow that addresses it, or explain why it doesn't apply.

**Checkpoint:** `s50-end`

---

## S51 · Final Project and Capstone

### Final project: TaskFlow 1.0

Build the remaining features **alone**, using everything from the course:

| Feature | Must use |
|---|---|
| **Task sharing**: share a task with another user (read-only) | Service-level authorisation, IDOR-proof API, RTK Query tags, JSP + React views |
| **Due-date reminders** page (tasks due in the next 7 days) | Memoised selectors (React), JSTL `fmt` with i18n (JSP) |
| **Admin reports** (tasks per user/status, CSV export) | Application scope cache, async servlet (optional), JSTL tables |
| **Profile page** (display name, language, theme) | PRG, validation, CSRF, mass-assignment-safe binding, the `lang` cookie shared by both clients |
| **Activity feed** on the dashboard | Listener middleware (React), `AuditEvent` + listeners (Java) |

**Definition of done:**
- Both clients working in EN/VI, light/dark.
- Security checklist from S50 still passes (re-run it).
- Tests: reducers/selectors (Vitest); the service layer (provided JUnit setup, optional).
- `docs/` updated: architecture, scopes, filter order, security checklist.

### Capstone: explain every arrow

You'll present (to yourself, a friend, or me in chat) the two architectures below, with no notes. For each numbered arrow, explain *what happens, where it runs, and what could go wrong*.

**Flow A: server-rendered (JSP)**

```text
Browser ─1→ Tomcat Connector ─2→ Filter chain ─3→ Servlet ─4→ Service/DAO/MySQL
   ↑                                              │
   │                                    5 request.setAttribute
   │                                              ↓
   └──────────── 8 HTML ←── 7 EL + JSTL ←── 6 forward → JSP (translated & compiled servlet)
                                     (or 5' redirect → a new request from the browser)
```

**Flow B: SPA (React)**

```text
Click ─1→ dispatch ─2→ middleware / RTK Query ─3→ axiosBaseQuery ─4→ interceptors (CSRF header via js-cookie)
   ─5→ browser adds JSESSIONID ─6→ Tomcat filters (CORS, CSRF, auth) ─7→ API Servlet ─8→ Service/DAO
   ─9→ JSON ─10→ cache update ─11→ memoised selector ─12→ re-render
```

### Capstone questions (sample)
1. Where does `user` in `${user.name}` come from? Which scopes are searched? How is `name` resolved? When was the JSP executed? Did the browser execute JSP?
2. What did Tomcat do with `list.jsp` on the first request vs the hundredth?
3. What happens if the Servlet redirects instead of forwarding? Walk through both requests.
4. Why is JSTL preferable to a scriptlet? Give three concrete reasons from your own codebase.
5. Why does `useSelector(state => state.tasks.filter(...))` cause re-renders, and how exactly does `createSelector` fix it?
6. Write redux-thunk from memory and explain how it plugs into `applyMiddleware`.
7. Which cookies exist in TaskFlow, who sets each, who can read each, and why?
8. Explain how i18next and `<fmt:message>` end up showing the same language.
9. Explain how an attacker would try CSRF, XSS, SQL injection and IDOR against TaskFlow, and precisely what stops each one.
10. SCSS or styled-components for a new component? Walk through your team's decision rules.

**Checkpoint:** `v1.0` 🎉
