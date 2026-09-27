# S49 · Hybrid: a React Island Inside a JSP Page · Code Only

> By request, Part 4 ships as **code, without lectures**. Code: `reference/taskflow/{backend,frontend}`, frozen in `reference/snapshots/s49-end`.
> Verified: `S49HybridTest` (4) + S35/S40/S43 re-run; `npm run build:island` and `npm run build:war` (tsc + Vite); in the browser against DevServer: `/taskflow/react-board` (seeded board, no data requests, a PATCH through the same session + CSRF header, styled-components `<style>` with the nonce, no CSP errors), `/taskflow/app/tasks/2` (deep link → the SPA, logged in by the portal's session), `/taskflow/tasks/view?id=1` (the comments island replaced the server-rendered fallback).

## Build and run

```bash
cd reference/taskflow/frontend
```

```bash
npm run build:island
```

```bash
npm run build:war
```

Then start the backend (`docker compose up -d`, or `DevServer`, 48.A) and open `/taskflow/react-board`, `/taskflow/app/`.

## Files

| Curriculum | Files | What |
|---|---|---|
| 49.02, 49.03 | `backend/.../web/island/ReactBoardServlet.java`, `WEB-INF/views/react-board.jsp` | `GET /react-board`: layout + nav + i18n from the server; `<script type="application/json" id="board-data">` with `{user, tasks (PageDto, size 100 = the SPA's LIST_QUERY), categories}`; empty `#board-root`; the module script |
| 49.04, 49.05 | `web/island/ScriptJson.java` | JSON for a script element: `<` `>` `&` U+2028 U+2029 → `\u…`; read with `textContent` + `JSON.parse` |
| 49.06 | `web/filters/SecurityHeadersFilter.java`, `WEB-INF/views/common/header.jspf` | per-request nonce (18 random bytes, Base64) in `script-src` and `style-src`; kept across the ERROR dispatch; `${cspNonce}`; `<meta property="csp-nonce" nonce="…">` for styled-components |
| 49.07 | `frontend/vite.island.config.ts`, `.env.island`, `package.json` (`build:island`), `web/island/IslandAssets.java` | entries `boardIsland`, `commentsIsland` → `webapp/static/island/` with `.vite/manifest.json`; base `/taskflow/static/island/`; the JSP resolves hashed names through the manifest |
| 49.08 | `frontend/src/island/island.tsx` | `readInitialData`, `mountIsland` (the SPA's providers: `makeStore`, `ThemeProvider`, `ToastProvider`, `AuthProvider`, i18next), `IslandRouter` (every `<Link>` becomes a full-page link into `/taskflow/app/…`) |
| 49.08 | `frontend/src/island/boardIsland.tsx` | seeds `getTasks(LIST_QUERY)`, `getCategories`, `getMe` with `upsertQueryData` before the first render; `<Board>` with `toggleTask` / `patchTask` |
| 49.09 | (no CSS reset in the islands) | the page already has `app.css` (the SCSS design system); islands ship only their CSS modules and styled-components; no `@styles/main.scss` import |
| 49.10 | `frontend/vite.war.config.ts`, `.env.war`, `package.json` (`build:war`), `web/filters/SpaFallbackFilter.java`, `web.xml`, `AuthenticationFilter` (`/app`, `/app/*` public) | the SPA under `/taskflow/app/` (base, `VITE_API_BASE_URL=/taskflow/api`); `html.cspNonce: '__CSP_NONCE__'` replaced per response; deep links → `index.html` (`no-store`); `/app/assets/*` `immutable`; `/app` → `/app/` |
| 49.11 | `vite.config.ts` (dev proxy), `vite.war.config.ts` (one WAR) | dev: Vite + proxy; prod: one origin (no CORS, no cookie-path rewrite) |
| 49.12 (Your Turn) | `frontend/src/island/commentsIsland.tsx`, `WEB-INF/views/tasks/view.jsp`, `web/tasks/TaskViewServlet.java` | `data-task-id` + `{user}` from the server; the server-rendered comments stay inside `#comments-root` as the no-JS fallback |
| nav | `nav.jspf`, `i18n/messages*.properties` | **Board** link; `board.*`, `comments.notBuilt` |
| tests | `S49HybridTest.java`; `S40FiltersTest` (data blocks allowed) | nonce per response; `</script>` in a title can't break out; island script carries the nonce; SPA fallback, caching, redirect |

## 49.14 debug checklist (island renders empty)

| Cause | Check |
|---|---|
| the script ran before `#board-root` existed | module scripts are deferred; a classic `<script>` in `<head>` isn't |
| wrong asset path under the context path | Network: 404 on `/static/island/…` → rebuild (`base`), or the manifest is stale |
| CSP blocked it | Console: "Refused to execute… nonce"; the tag lacks `nonce="${cspNonce}"` |
| styles missing inside the island | Console: "Refused to apply inline style" → the `csp-nonce` meta tag is missing |
| `#board-data` unreadable | `JSON.parse` error in the Console → the JSP wrote `<c:out value="${initialJson}"/>` (HTML-escaped quotes) |
| API calls go to `/api/…` instead of `/taskflow/api/…` | built without `--mode island` (`VITE_API_BASE_URL`) |
