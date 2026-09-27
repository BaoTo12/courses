# S50 · Security Review and Hardening · Code Only

> By request, Part 4 ships as **code, without lectures**. Code: `reference/taskflow/{backend,frontend,docs/security}`, frozen in `reference/snapshots/s50-end`.
> Verified: `S50HardeningTest` (3) + S39/S44/S47 re-run; frontend `taskListeners.s50.test.ts` (3), `CommentsSection.s50.test.tsx` (1), `tsc -b`; `npm audit` → 0 vulnerabilities; the Dependency-Check plugin resolves (the NVD scan itself wasn't run: it needs an NVD API key and a long first download); HTTPS on DevServer (curl below); the red-team patch applied and measured, then reverted.

## Files

| Curriculum | Files | What |
|---|---|---|
| 50.01–50.05 | `reference/taskflow/docs/security/checklist.md` | assets, entry points, OWASP Top 10 mapping with evidence, frontend/backend/config checklists |
| 50.03 | `frontend/src/features/tasks/taskListeners.ts` + `taskListeners.s50.test.ts` | no error toast for aborted writes or 401s (the "Aborted" toast found in 48.04) |
| 50.05 | `backend/.../web/filters/SecurityHeadersFilter.java` | + `Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS on HTTPS only |
| 50.06 | `backend/pom.xml` (profile `security`), `backend/dependency-check-suppressions.xml` | `mvn -P security verify -DnvdApiKey=…`; fails on CVSS ≥ 7 |
| 50.07 | `backend/scripts/make-dev-keystore.{ps1,sh}`, `DevServer.java` (`-Dhttps.keystore`), `tomcat/server.xml` (8443 connector, commented), `XsrfCookie`, `ThemeServlet`, `LanguageServlet` (`Secure` when `request.isSecure()`), `AppContextListener` (`taskflow.secureCookies`) | self-signed HTTPS for development |
| 50.08 | checklist §6 | SSRF: not applicable, and what would change that |
| 50.09 | `provided/labs/50-red-team.patch` | 8 planted vulnerabilities |
| 50.10 | `frontend/src/features/comments/CommentsSection.s50.test.tsx` | the test that was missing |
| tests | `backend/.../S50HardeningTest.java` | header set on pages, API, errors, SPA; no HSTS/`Secure` over HTTP; no directory listings |

## HTTPS check (recorded)

```bash
cd reference/taskflow/backend
```

```bash
powershell -File scripts/make-dev-keystore.ps1
```

Then `java -Dport=8081 -Dhttps.keystore=target/dev-keystore.p12 -cp "…" com.taskflow.DevServer`:

```text
https://localhost:8443/taskflow/api/auth/csrf
  Strict-Transport-Security: max-age=31536000
  Set-Cookie: XSRF-TOKEN=…; Path=/; Secure; SameSite=Lax
https://localhost:8443/taskflow/login
  Set-Cookie: JSESSIONID=…; Path=/taskflow; Secure; HttpOnly; SameSite=Lax
http://localhost:8081/taskflow/api/auth/csrf
  Set-Cookie: XSRF-TOKEN=…; Path=/; SameSite=Lax          (no HSTS, no Secure)
```

`keytool` isn't always on PATH on Windows: the script finds it through `java.home`.

## 50.09 · Red team

```bash
cd reference/taskflow
```

```bash
git -c core.autocrlf=false apply -p1 ../../provided/labs/50-red-team.patch
```

Find the 8 vulnerabilities (the running app, DevTools, the tests), fix them, then check: `git -c core.autocrlf=false apply -R -p1 …` restores the original code.

<details><summary>50.10 · The eight, and which tests catch them (measured)</summary>

| # | Where | Vulnerability | Caught by |
|---|---|---|---|
| 1 | `WEB-INF/views/tasks/task-row.jspf` | `${task.title}` without `<c:out>`: stored XSS in the list | `S31TaskServletsTest.titlesAreEscapedInTheList`, `S35JstlTest.theConfirmTitleIsEscapedForItsAttributeContext` |
| 2 | `web/api/TaskApiServlet.java` | `GET /api/tasks/{id}` uses `taskForDiagnostics`: IDOR | `S46JsonApiTest.someoneElsesTaskIsNotFoundForEveryMethod` |
| 3 | `web/filters/CsrfDoubleSubmitFilter.java` | the check runs only when a header is sent: a request without it passes | `S47ApiSecurityTest.unsafeApiCallsNeedTheDoubleSubmitHeader`, `.apiRejectionsAreAuditedWithTheRequestId` |
| 4 | `web/filters/CorsFilter.java` | every `Origin` reflected with credentials | `S47ApiSecurityTest.corsAllowsOnlyTheListedOrigin` |
| 5 | `web/Redirects.java` | any path on the host; `//evil` and `/\evil` accepted: open redirect | `S41AuthenticationTest.theReturnUrlCannotLeaveTheApplication` |
| 6 | `web/auth/LoginServlet.java` | no `changeSessionId()`: session fixation | `S41AuthenticationTest.aSuccessfulLoginChangesTheSessionIdAndGoesBack` |
| 7 | `frontend/src/security/safeUrl.ts` | a `javascript:` block-list instead of the protocol allow-list (`data:`, `vbscript:`, ` javascript:` pass) | `security.test.tsx` (5 cases) |
| 8 | `frontend/src/features/comments/CommentsSection.tsx` | `dangerouslySetInnerHTML` without DOMPurify | **nothing**, until `CommentsSection.s50.test.tsx` was added (it fails on the plant: `<script>` in the DOM) |

</details>
