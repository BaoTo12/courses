# Environment Setup

Setup is split in two, matching the course order. Install the **frontend toolchain** now (S01). Install the **backend toolchain** when you reach S28. Every config file listed as *provided* is given to you in the relevant lecture.

> Exact patch versions are pinned in the lecture where each tool is installed. The major versions below are what the course is written against.

---

## A. Frontend toolchain (installed in S01)

| Tool | Version | Why |
|---|---|---|
| Node.js | **24 LTS** (22 LTS also fine; Node 20 is end-of-life since April 2026) | JavaScript runtime for tooling |
| npm | bundled with Node | Package manager |
| Git | latest | Checkpoints (`s07-end`, …) |
| VS Code | latest | Editor |
| Chrome or Edge | latest | DevTools: Network, Application (cookies), Performance |

**VS Code extensions (recommended):** ESLint · Prettier · vscode-styled-components (syntax highlighting inside template literals) · SCSS IntelliSense · i18n Ally (optional) · GitLens (optional)

**Browser extensions:** Redux DevTools · React Developer Tools

### Frontend packages (added progressively; you never install something before you need it)

| Section | Packages |
|---|---|
| S02 | `sass` |
| S04 | `vitest` + `vite` (Vitest 5 needs Vite installed alongside it), used in the JS/TS playground |
| S07 | `vite`, `react`, `react-dom`, `typescript`, `@vitejs/plugin-react` (scaffolded) |
| S09 | `styled-components` |
| S12 | `react-router` (v8: import everything from `react-router`; the old `react-router-dom` package stopped at v7. v8 requires React ≥ 19.2.7 and Node ≥ 22.22) |
| S13 | `axios`, `json-server@0.17` (mock API) |
| S15 | `vitest` (reducer tests) |
| S14–S19 | `redux`, `react-redux`, `redux-thunk` |
| S20 | `@reduxjs/toolkit` (bundles Immer, reselect, RTK Query) |
| S21 | `reselect` (standalone usage and v5 features) |
| S24 | `js-cookie`, `@types/js-cookie` |
| S25 | `i18next`, `react-i18next`, `i18next-browser-languagedetector`, `i18next-http-backend` |
| S26 | `dompurify` |

---

## B. Backend toolchain (installed in S28)

| Tool | Version | Notes |
|---|---|---|
| JDK | **17** (Eclipse Temurin) | Tomcat 9 runs fine on 17 |
| Apache Tomcat | **9.0.x** | Servlet 4.0 · JSP 2.3 · EL 3.0 · **`javax.*` namespace** |
| Maven | 3.9.x | WAR packaging |
| MySQL | **8.0 or 8.4 LTS** | Native installer **or** Docker (both options provided) |
| MySQL client | MySQL Workbench or DBeaver | Inspect tables during labs |
| IDE | IntelliJ IDEA (Ultimate has Tomcat integration; Community + **Smart Tomcat** plugin) or Eclipse IDE for Enterprise Java | Run/debug inside Tomcat |
| Postman or curl | latest | Testing the JSON API and attack labs |

### ⚠️ `javax` vs `jakarta`: read this once, save hours

| | Tomcat 9 (**this course**) | Tomcat 10+ |
|---|---|---|
| Servlet package | `javax.servlet.*` | `jakarta.servlet.*` |
| JSTL taglib URI | `http://java.sun.com/jsp/jstl/core` | `jakarta.tags.core` |
| JSTL jar | `javax.servlet:jstl:1.2` | `jakarta.servlet.jsp.jstl` 3.x |

Most tutorials online mix the two. **A `jakarta.*` import will not work on Tomcat 9**, and vice versa. S28 has a debugging lecture on exactly this failure.

### Backend dependencies (provided `pom.xml`)

| Artifact | Scope | Purpose |
|---|---|---|
| `javax.servlet:javax.servlet-api:4.0.1` | provided | Servlet API (Tomcat supplies it at runtime) |
| `javax.servlet.jsp:javax.servlet.jsp-api:2.3.3` | provided | JSP API |
| `javax.servlet:jstl:1.2` | compile | **Tomcat 9 does NOT ship JSTL.** It must be in `WEB-INF/lib`. |
| `com.mysql:mysql-connector-j` 8.x | compile | JDBC driver |
| `com.zaxxer:HikariCP` 5.x | compile | Connection pool |
| `org.mindrot:jbcrypt:0.4` | compile | Password hashing |
| `com.fasterxml.jackson.core:jackson-databind` 2.x + `jackson-datatype-jsr310` | compile | JSON (Part 3) |
| `org.slf4j:slf4j-api` + `ch.qos.logback:logback-classic` | compile | Logging |

---

## C. Shared SCSS build for JSP (S28)

The SCSS design system in `taskflow/styles/` is compiled twice:
- **React**: Vite imports it directly.
- **JSP**: `npm run styles:jsp` runs the Sass CLI and writes `backend/src/main/webapp/static/css/app.css`.

Why this matters: **styled-components cannot style JSP pages**. They are a JavaScript runtime library, and JSP pages ship plain HTML. This is one of the first "where does code run?" lessons in the course.

---

## D. Ports used

| Service | Port |
|---|---|
| Vite dev server (React) | 5173 |
| json-server mock API | 3001 |
| Tomcat | 8080 (HTTPS 8443 in S50) |
| MySQL | 3306 |
