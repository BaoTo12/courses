# Part 1E: Cookies, i18n, Frontend Security, Feature Sprint

> Goal: finish TaskFlow Web on the mock API: authentication flow (simulated), cookies with js-cookie, two languages, a frontend security pass, and remaining features.

---

## S24 · Browser Cookies and js-cookie

**Project feature:** a typed `cookies.ts` wrapper over js-cookie; theme/language/last-filter **preference cookies**; a login/logout flow against the mock (session + `XSRF-TOKEN` simulated); CSRF header injected by an Axios interceptor; `authSlice`.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 24.01 | 📖 | What a cookie *is*: `Set-Cookie` response header → browser storage → `Cookie` request header. The browser attaches cookies automatically. | ★ |
| 24.02 | 📖 | Cookie attributes: `Expires`/`Max-Age`, `Path`, `Domain`, `Secure`, **`HttpOnly`**, **`SameSite` (Strict/Lax/None)** | ★ |
| 24.03 | 📖 | `document.cookie`: the awkward native API, and why js-cookie exists | ★ |
| 24.04 | 📖 | js-cookie API: `get`, `set` (attributes), `remove` (**must match path/domain**), `withAttributes`, `withConverter` | ★ |
| 24.05 | 🛠 | Build: typed `cookies.ts` wrapper with known cookie names + safe defaults (`sameSite: 'lax'`, `secure` in prod) | ★ |
| 24.06 | 🛠 | Build: persist theme + last filter with js-cookie; restore on load (listener middleware from S21) | ★ |
| 24.07 | 📖 | **What JavaScript can NOT see**: `HttpOnly` cookies. Why the session ID must be one of them. | ★ |
| 24.08 | 📖 | 🛡 Token storage debate: localStorage vs JS-readable cookie vs HttpOnly cookie. XSS impact on each. | ★ |
| 24.09 | 📖 | Session-cookie auth for SPAs: the browser sends `JSESSIONID`; the SPA only knows "am I logged in?" via `/api/auth/me` | ★ |
| 24.10 | 📖 | **CSRF in one picture**, and the **double-submit cookie** defence: server sets a readable `XSRF-TOKEN`; JS reads it with js-cookie; sends it back as `X-XSRF-TOKEN` | ★ |
| 24.11 | 🛠 | Build: Axios request interceptor adds `X-XSRF-TOKEN` on unsafe methods (POST/PUT/PATCH/DELETE) | ★ |
| 24.12 | 🛠 | Build: `authSlice` (or RTK Query `me`/`login`/`logout` endpoints), `LoginPage`, `RequireAuth` using real state | ★ |
| 24.13 | 🛠 | Build: 401 response interceptor → dispatch `auth/sessionExpired` → redirect to login with `returnTo` | ★ |
| 24.14 | 📖 | 🛡 Open redirect via `returnTo`: allow-listing internal paths only | ★ |
| 24.15 | 📖 | Axios's built-in `xsrfCookieName`/`xsrfHeaderName` vs doing it explicitly (and why we do it by hand first) | ＋ |
| 24.16 | 🎯 | Your Turn: a "remember my language" cookie (1 year) and "remember last visited task" (session cookie); correct attributes for each | ★ |
| 24.17 | 💡 | Solution walkthrough | ★ |
| 24.18 | 🐞 | Debug: `Cookies.remove('theme')` doesn't remove it (set with `path: '/app'`) | ★ |
| 24.19 | 🐞 | Debug: `Cookies.get('JSESSIONID')` returns `undefined` even though DevTools shows it. Not a bug; explain. | ★ |

### ✅ Knowledge check
- **Concept:** Who attaches the session cookie to an Axios request: Axios, js-cookie, or the browser? Under what conditions?
- **Concept:** Why does double-submit CSRF protection work if an attacker's site can make the browser send cookies?
- **Code reading:** Given 3 `Set-Cookie` headers, which cookies can `Cookies.get()` read, and which are sent to `/api/tasks`?
- **Debugging:** The CSRF header is missing on DELETE only. Inspect the interceptor's method check.
- **Design:** Which of these may be JS-readable: session ID, CSRF token, theme, language, user role? Justify each.
- **Implementation:** `returnTo` validation that rejects `//evil.com`, `https://…`, and `/\evil.com`.

**Checkpoint:** `s24-end`

---

## S25 · Internationalisation with i18next

**Project feature:** English + Vietnamese; `i18next-browser-languagedetector` configured to read/write the **`tf_lang` cookie** (the same cookie the JSP `LocaleFilter` will read in S44); lazy-loaded namespaces; localised dates, numbers, plurals.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 25.01 | 📖 | i18n vs l10n; what must be translated (text, dates, numbers, plurals, direction) | ★ |
| 25.02 | 📖 | i18next architecture: instance, resources, namespaces, keys, fallback language; plugins via `.use()` | ★ |
| 25.03 | 🛠 | Setup: `i18n.ts`, `react-i18next` (`initReactI18next`), `useTranslation`, `<Trans>` | ★ |
| 25.04 | 📖 | **`i18next-browser-languagedetector` in depth**: the `order` array (`querystring`, `cookie`, `localStorage`, `navigator`, `htmlTag`…), `lookupCookie`, `lookupQuerystring`, `caches`, `cookieMinutes`, `cookieOptions` | ★ |
| 25.05 | 🛠 | Build: detector with `order: ['querystring', 'cookie', 'navigator']`, `lookupCookie: 'tf_lang'`, `caches: ['cookie']` | ★ |
| 25.06 | 📖 | Language code normalisation: `vi-VN` → `vi`, `supportedLngs`, `nonExplicitSupportedLngs`, `load: 'languageOnly'` | ★ |
| 25.07 | 🛠 | Build: language switcher: `i18n.changeLanguage()`, cookie updated, `<html lang>` updated | ★ |
| 25.08 | 📖 | Interpolation `{{name}}`, **`escapeValue: false` with React and why it's safe there** (React escapes) — and where it isn't | ★ |
| 25.09 | 📖 | Plurals (`_one`/`_other`), context, nesting, default values | ★ |
| 25.10 | 📖 | Formatting dates/numbers/relative time with `Intl` and i18next formatters | ★ |
| 25.11 | 📖 | Namespaces + lazy loading with `i18next-http-backend`; Suspense; avoiding a flash of untranslated keys | ★ |
| 25.12 | 📖 | TS: typed translation keys (declaration merging for `CustomTypeOptions`) | ＋ |
| 25.13 | 📖 | Translating enum values from the API (`TaskStatus`) and server error codes (`VALIDATION_FAILED`) | ★ |
| 25.14 | 🎯 | Your Turn: translate the dashboard, including "You have 1 overdue task / 5 overdue tasks" and localised due dates | ★ |
| 25.15 | 💡 | Solution walkthrough | ★ |
| 25.16 | 🐞 | Debug: the app ignores the `tf_lang` cookie and always uses the browser language (detector `order` / `caches` misconfigured) | ★ |
| 25.17 | 🐞 | Debug: Vietnamese shows as `vi-VN` and no translations load | ★ |

### ✅ Knowledge check
- **Concept:** Walk through how the detector chooses a language on first visit vs second visit.
- **Code reading:** Given a detector config and a request with `?lng=vi`, cookie `tf_lang=en`, browser `fr`, which language wins? Which gets cached?
- **Debugging:** A translated string shows `&lt;b&gt;`. Which escaping layer double-escaped?
- **Design:** Why share the `tf_lang` cookie with the Java backend instead of storing it in localStorage?
- **Implementation:** A `formatDue(task)` helper that reads the current language.

**Checkpoint:** `s25-end`

---

## S26 · Frontend Security (middle level)

**Project feature:** comments render safely (including a "rich text" mode sanitised with DOMPurify), link fields are validated, `npm audit` clean, a documented **frontend security checklist**.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 26.01 | 📖 | What XSS is: running attacker JavaScript in *your* origin. What it can do (read JS cookies, call your API as the user). | ★ |
| 26.02 | 📖 | Why React is safe by default: text is escaped. **Where it isn't**. | ★ |
| 26.03 | 🔓 | Lab: stored XSS through `dangerouslySetInnerHTML` in task comments | ★ |
| 26.04 | 🛡 | Defend: render as text; if HTML is truly needed, DOMPurify with a strict allow-list | ★ |
| 26.05 | 🔓 | Lab: `javascript:` URLs in a user-supplied "link" field (`<a href={task.link}>`) | ★ |
| 26.06 | 🛡 | Defend: URL protocol allow-list | ★ |
| 26.07 | 📖 | DOM XSS: `innerHTML`, `location.hash`, third-party widgets | ★ |
| 26.08 | 📖 | 🛡 **Hidden ≠ secure**: disabled buttons, hidden admin menus, role checks in React are UX only. Proving it with DevTools + curl. | ★ |
| 26.09 | 📖 | Sensitive data on the client: Redux state, DevTools, logs, error trackers; what not to store | ★ |
| 26.10 | 📖 | Supply chain: `npm audit`, lockfiles, typosquatting, pinning; Subresource Integrity for CDN scripts | ★ |
| 26.11 | 📖 | Clickjacking and CSP: preview of the server-side fixes (S40) | ★ |
| 26.12 | 🎯 | Your Turn: audit TaskFlow Web against the provided checklist; fix 3 planted issues | ★ |
| 26.13 | 💡 | Solution walkthrough | ★ |
| 26.14 | 🐞 | Debug: DOMPurify output still triggers an alert (sanitised, then modified after sanitising) | ＋ |

### ✅ Knowledge check
- **Concept:** If XSS happens, why is an HttpOnly session cookie still valuable but not a complete defence?
- **Code reading:** Which of 5 JSX snippets are vulnerable? (Mix of `{}`, `href`, `dangerouslySetInnerHTML`, `style`, `src`.)
- **Design:** Where must the check "only the owner can delete a task" live? Where can it *also* live, and why?
- **Implementation:** A `SafeLink` component.

**Checkpoint:** `s26-end`

---

## S27 · Frontend Feature Sprint and Checkpoint

**Project feature:** a complete TaskFlow Web on the mock API: search, filters, sort and pagination synced to the URL; optimistic updates; dashboard; i18n; theming; auth flow.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 27.01 | 🛠 | URL ↔ RTK Query args: filters, sort, page in the query string (shareable links) | ★ |
| 27.02 | 🛠 | Empty states, skeletons, error boundaries | ★ |
| 27.03 | 📖 | Error boundaries: what they catch and what they don't (event handlers, async) | ★ |
| 27.04 | 🎯 | Your Turn: bulk actions (select many → complete/delete) using optimistic updates | ＋ |
| 27.05 | 💡 | Solution walkthrough | ＋ |
| 27.06 | 📖 | Architecture review: the final frontend folder structure and data flow diagram | ★ |
| 27.07 | ✅ | **Part 1 capstone quiz**: trace a click from `onClick` → dispatch → middleware → RTK Query → Axios interceptors → network → cache → selector → re-render | ★ |

### ✅ Knowledge check (Part 1 capstone)
- Explain, step by step, what happens when a user toggles a task done: every function, every state change, every network message, every re-render.
- Explain where each of these is defined and why: design tokens, theme, language, auth state, task data, filters.

**Checkpoint:** `s27-end` (**Part 1 complete: the frontend on the mock API**)
