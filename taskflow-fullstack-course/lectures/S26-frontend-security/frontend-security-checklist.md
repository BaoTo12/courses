# TaskFlow Web · Frontend Security Checklist

> Use it in code review and before each release. Every item names the lecture that explains it.
> ✅ = TaskFlow at `s26-end` complies.

## Rendering and XSS

- [x] User content is rendered as **text** (`{value}`), never as HTML. (26.02)
- [x] The **only** `dangerouslySetInnerHTML` is `SanitizedHtml`, fed directly by `sanitizeHtml` (DOMPurify, allow-list). (26.04)
- [x] No `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` on user data. (26.07)
- [x] No `eval`, `new Function`, or `setTimeout(string)`. (26.07)
- [x] User URLs go through `SafeLink` / `safeHref` (http, https, mailto only). (26.06)
- [x] `window.open` and `location.*` never receive unvalidated URLs; redirects use `safeReturnTo`. (24.14, 26.06)
- [x] External links have `rel="noopener noreferrer"`. (26.06)
- [x] Translations never render as HTML; interpolation relies on React's escaping (`escapeValue: false`). (25.08)
- [x] No user-controlled `style` objects or CSS. (26.02)
- [x] `postMessage` listeners check `event.origin` and validate `event.data` (none exist yet). (26.07)

## Authentication, session, CSRF

- [x] The session id is an **HttpOnly** cookie; the SPA never reads or stores it. (24.07)
- [x] "Who am I?" comes from `/api/auth/me`, never from a cookie or storage. (24.09)
- [x] Every unsafe request carries `X-XSRF-TOKEN`. (24.11)
- [x] A 401 logs the user out cleanly; logout clears slices, the RTK Query cache and user cookies. (23.11, 24.13)
- [x] Failed-login passwords are cleared from the form. (24.12)

## Authorisation

- [x] Hidden or disabled UI is treated as UX only; the server enforces every permission. (26.08)
- [x] No decisions are based on a client-side `role`, except showing or hiding UI. (24.08, 26.08)

## Data on the client

- [x] No secrets in the bundle, `VITE_*` variables, `localStorage` or JS-readable cookies. (26.09)
- [x] Logs and the Redux DevTools are development-only. (26.09)
- [ ] The error tracker scrubs headers, bodies and state (**to do** when a tracker is added, S27).
- [x] Cookies and URL parameters are **validated** when read (cookies: 24.06; URL: 12.03, 23.07).

## Dependencies

- [x] `package-lock.json` is committed; CI and build use `npm ci`. (26.10)
- [x] `npm audit`: 0 vulnerabilities (re-check before every release). (26.10)
- [x] New dependencies are vetted: name, maintainers, activity, size. (26.10)
- [x] No CDN scripts; if added: pinned version + SRI. (26.10)

## Headers (server side: S40)

- [ ] `Content-Security-Policy` (strict `script-src`, `connect-src 'self'`, `frame-ancestors 'none'`). (26.11 → S40)
- [ ] `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`. (S40)
- [ ] `Cache-Control: no-store` on API responses. (23.10 → S41)
