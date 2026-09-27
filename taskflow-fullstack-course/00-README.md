# TaskFlow: Full-Stack Web Engineering
## React · Redux · TypeScript · SCSS · styled-components → Java Servlet · JSP · EL · JSTL, with Application Security built in

> One evolving, real-world project. Two front ends (a React SPA and a server-rendered JSP portal), one Java backend, and security woven through every layer.

---

## 1. Course description

You will build **TaskFlow**, a task management platform, from an empty folder to a secured, internationalised, two-client production-style application.

The story mirrors what happens in real companies:

> *"Our company has a **JSP web application** (the Admin Portal). We're also building a **modern React front end** (TaskFlow Web) for end users. Both talk to the **same Java Servlet backend**, and both must be secure."*

The project is only the vehicle. The goal is **deep understanding**. For every important concept, the lectures answer the same nine questions:

1. What problem does it solve?
2. Why does it exist?
3. How does it work?
4. What happens internally?
5. How does it interact with the other technologies?
6. What are the alternatives?
7. What are the trade-offs?
8. When should I use it?
9. When should I avoid it?

### The final architecture you will be able to explain arrow by arrow

```text
                         ┌──────────────────────── Browser ─────────────────────────┐
                         │                                                          │
        TaskFlow Admin (JSP)                                   TaskFlow Web (React SPA)
        HTML rendered ON THE SERVER                            HTML rendered IN THE BROWSER
        SCSS (compiled CSS)                                    SCSS + styled-components
                         │                                     Redux / RTK / RTK Query
                         │                                     reselect · i18next · js-cookie
                         │ HTTP: HTML documents                          │ HTTP: JSON via Axios
                         ↓                                               ↓
          ┌─────────────────────────────── Tomcat 9 ────────────────────────────────┐
          │  Filters: Encoding → Logging → SecurityHeaders → Locale → CORS          │
          │           → Authentication → CSRF → Authorization                       │
          │      ├── Page Servlets ──forward──→ JSP + EL + JSTL ──→ HTML            │
          │      └── API Servlets  ─────────────────────────────→ JSON              │
          │                         ↓                                               │
          │              Service layer → DAO (JDBC) → MySQL 8                       │
          └─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites

| Required | Nice to have (taught just-in-time if missing) |
|---|---|
| Basic programming in any language | TypeScript |
| Basic Java (classes, interfaces, collections, exceptions) | React |
| Basic HTML and CSS | Git branching |
| Comfortable with a terminal | SQL |
| | Maven |

The course assumes **nothing** about Servlets, JSP, Redux, or how the browser and server really communicate. Those are taught from first principles.

---

## 3. Learning outcomes

By the end, you will be able to:

**Styling**
- Build a scalable SCSS design system (tokens, mixins, functions, maps, 7-1 architecture) and compile it for both React and JSP.
- Build dynamic, themeable React components with styled-components, and decide when SCSS or styled-components is the right tool.

**JavaScript / TypeScript / React**
- Explain closures, immutability, promises and the event loop well enough to debug React and Redux behaviour.
- Model a real domain with TypeScript: unions, generics, utility types, discriminated unions, type guards.
- Explain React's render/commit model, how hooks work, and why components re-render.

**Redux (the full official curriculum)**
- Implement `createStore`, `combineReducers`, `applyMiddleware` and thunk middleware yourself.
- Use classic Redux, then migrate to Redux Toolkit (`createSlice`, `createAsyncThunk`, `createEntityAdapter`, listener middleware).
- Write memoised selectors with reselect and explain exactly when and why a component re-renders.
- Use RTK Query for server state with caching, tag invalidation and optimistic updates.

**Frontend infrastructure**
- Design an Axios layer (instance, interceptors, error normalisation, CSRF header injection, 401 handling).
- Use js-cookie correctly, and explain what JavaScript can and cannot see.
- Internationalise an SPA with i18next and `i18next-browser-languagedetector`, sharing the language cookie with the Java backend.

**Java Servlet / JSP / EL / JSTL**
- Explain how Tomcat receives a request, picks a Servlet, runs the filter chain, and produces a response.
- Explain JSP translation → compilation → execution, and read the generated servlet source.
- Explain exactly how `${user.name}` is resolved: which scopes are searched, in what order, and how the getter is called.
- Replace scriptlets with EL + JSTL, and justify why.
- Build MVC with Servlet controllers, a service layer, DAOs, request attributes and JSP views.
- Use forward vs redirect, PRG, the four scopes, filters, listeners, sessions, cookies and error pages confidently.
- Reason about thread safety in Servlets.

**Application security (middle level)**
- Attack and then fix your own app for XSS, SQL injection, CSRF, IDOR, session fixation, open redirect, mass assignment, CORS misconfiguration and information leaks.
- Configure secure cookies, security headers and a CSP, and explain each choice.

**Integration**
- Build a JSON API with Servlets and connect the React app to it.
- Mount a React "island" inside a JSP page, passing server data safely.

---

## 4. Technology stack

| Layer | Technology |
|---|---|
| Styling | Sass (dart-sass) SCSS · styled-components 6 |
| Language (FE) | TypeScript (strict): TS 7 in the playground, TS 6.0 as pinned by the Vite React template |
| UI | React 19.2 · React Router 7 · Vite 8 · oxlint |
| State | Redux 5 · redux-thunk 3 · Redux Toolkit 2 · React-Redux 9 · reselect 5 · RTK Query |
| HTTP (FE) | Axios 1.x |
| Cookies / i18n | js-cookie 3 · i18next · react-i18next · i18next-browser-languagedetector · i18next-http-backend |
| FE tooling | Node 24 LTS · Vite · Vitest · ESLint · json-server 0.17 (mock API) |
| Container | Apache Tomcat 9 (Servlet 4.0 · JSP 2.3 · EL 3.0) |
| Views | JSP · EL · JSTL 1.2 (`javax.*` namespace) |
| Language (BE) | Java 17 |
| Build (BE) | Maven 3.9 (WAR packaging) |
| Database | MySQL 8 · JDBC · HikariCP |
| Supporting libs | Jackson (JSON) · jBCrypt (password hashing) · SLF4J + Logback |

Full setup: [01-setup.md](01-setup.md).

---

## 5. Course map (52 sections)

| Part | Sections | Theme | Curriculum file |
|---|---|---|---|
| **0** | S00–S01 | Orientation and frontend setup | [part-0-orientation.md](curriculum/part-0-orientation.md) |
| **1A** | S02–S03 | SCSS | [part-1a-scss.md](curriculum/part-1a-scss.md) |
| **1B** | S04–S06 | Modern JavaScript and TypeScript | [part-1b-js-typescript.md](curriculum/part-1b-js-typescript.md) |
| **1C** | S07–S13 | React, styled-components, forms, routing, Axios | [part-1c-react.md](curriculum/part-1c-react.md) |
| **1D** | S14–S23 | **The Redux track** (Fundamentals + Essentials) | [part-1d-redux.md](curriculum/part-1d-redux.md) |
| **1E** | S24–S27 | Cookies, i18n, frontend security, feature sprint | [part-1e-frontend-features.md](curriculum/part-1e-frontend-features.md) |
| **2A** | S28–S33 | HTTP, Servlet, Servlet → JSP, JSP fundamentals | [part-2a-servlet-jsp.md](curriculum/part-2a-servlet-jsp.md) |
| **2B** | S34–S39 | EL, JSTL, MVC, forms, scopes, reusable JSP | [part-2b-el-jstl-mvc.md](curriculum/part-2b-el-jstl-mvc.md) |
| **2C** | S40–S45 | Filters, sessions, auth, errors, advanced JSP and Servlet | [part-2c-filters-auth-advanced.md](curriculum/part-2c-filters-auth-advanced.md) |
| **3** | S46–S48 | Servlet JSON API; replacing the mock | [part-3-json-api.md](curriculum/part-3-json-api.md) |
| **4** | S49–S51 | Hybrid JSP + React, security review, final project | [part-4-integration-final.md](curriculum/part-4-integration-final.md) |

Supporting documents:
- [02-project-spec.md](02-project-spec.md): TaskFlow features, data model, routes, API contract, what you write vs what is provided
- [03-security-scope.md](03-security-scope.md): security topics, the OWASP mapping, attack-lab rules
- [04-study-plan.md](04-study-plan.md): suggested learning order, the **15-day intensive plan**, and the full-pace plan

---

## 6. How each section works (Udemy-style)

Every section is a sequence of short lectures (10–25 minutes each):

| Tag | Lecture type | What you do |
|---|---|---|
| 📖 | **Theory** | Concept, mental model, internals, diagrams |
| 🛠 | **Build** | We add the feature to TaskFlow together, step by step |
| 🎯 | **Your Turn** | You implement a feature alone. Requires reasoning, not copying. |
| 💡 | **Solution walkthrough** | Reference solution with reasoning, alternatives and wrong approaches explained. Lives in `solutions/`; open it only after you've tried. |
| 🐞 | **Debug** | Broken code + an investigation checklist. Find the cause before reading the answer. |
| 🧩 | **Just-in-time** | Something the project needs that isn't a core topic, taught only as deep as needed |
| 🔓 | **Attack lab** | Exploit a vulnerability in *your own local* TaskFlow |
| 🛡 | **Defend** | Fix it properly, and explain why the fix works |
| ✅ | **Knowledge check** | End of section: concept questions, code reading, debugging, design questions, implementation task |

**Track markers:**
- ★ **Core**: part of the 15-day intensive track
- ＋ **Extended**: deeper material for the full-pace track (still valuable; do it later if time is short)

**Checkpoints:** every section ends with a git tag (`s07-end`, `s21-end`, …) so you can always compare your code to a known-good state.

---

## 7. Repository layout (what you'll build)

```text
taskflow/
├── styles/            ← shared SCSS design system (used by React AND JSP)
├── frontend/          ← TaskFlow Web: Vite + React + TS + Redux
├── mock-api/          ← json-server mock backend (provided; retired in Part 3)
├── backend/           ← Maven WAR: Servlets, Filters, JSP Admin Portal, JSON API
│   └── src/main/webapp/WEB-INF/views/   ← JSPs (not directly reachable)
├── db/                ← MySQL schema + seed data (provided)
└── docs/              ← your notes, diagrams, security review
```

---

## 8. Course folder layout (this folder)

```text
taskflow-fullstack-course/
├── 00-README.md            ← you are here
├── 01-setup.md
├── 02-project-spec.md
├── 03-security-scope.md
├── 04-study-plan.md
├── curriculum/             ← section-by-section syllabus (review these)
├── lectures/               ← full lecture content, written one lecture at a time
├── solutions/              ← explained solutions, released after each attempt
├── provided/               ← code you're given (the mock API)
└── reference/              ← the verified reference project, lecture-claim tests, snapshots (see its README)
```

Everything the lectures claim was checked in `reference/taskflow` first. Its `src/verification/` tests pin those claims (messages, counts, type errors) to the installed library versions: see [reference/README.md](reference/README.md).
