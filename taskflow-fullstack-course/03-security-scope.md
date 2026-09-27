# Application Security: Scope and Rules

## 1. Level: middle

This course teaches security the way a **mid-level full-stack engineer** needs it: you can recognise the common vulnerability classes in your own code, exploit them in a lab to understand them, fix them properly, and explain *why* the fix works.

| ✅ In scope | ❌ Out of scope (advanced / specialist) |
|---|---|
| XSS: reflected, stored, DOM-based; context-aware output encoding | OAuth 2 / OpenID Connect / SAML flows |
| SQL injection, and why prepared statements fix it | JWT internals and signing algorithms |
| CSRF: synchroniser token, double-submit cookie, SameSite | Cryptography internals |
| Session management: fixation, cookie flags, timeout, invalidation | WAF configuration, IDS/IPS |
| Password storage (BCrypt), user enumeration, brute-force throttling | Professional pentest tooling (Burp Pro, etc.) |
| Broken access control, IDOR, role checks, defence in depth | Kubernetes/cloud security, secrets managers |
| Open redirect | Formal threat-modelling frameworks (only a light version) |
| Mass assignment, excessive data exposure | |
| Security headers: CSP, frame-ancestors, nosniff, Referrer-Policy, HSTS | |
| CORS: what it is, what it is *not*, and misconfigurations | |
| Information leakage via errors and logs | |
| Frontend: `dangerouslySetInnerHTML`, `javascript:` URLs, secrets in bundles, token storage | |
| Dependency hygiene: `npm audit`, OWASP Dependency-Check | |
| HTTPS basics, running Tomcat with TLS locally | |

---

## 2. OWASP Top 10 mapping

The course maps to the widely referenced **OWASP Top 10 (2021)**. In S50 we compare it with the newest edition, and you'll see that the categories are re-ordered and renamed but the underlying skills are the same.

| OWASP (2021) | Where it's taught |
|---|---|
| A01 Broken Access Control | S26 (UI-only checks), **S42 IDOR lab**, S46 |
| A02 Cryptographic Failures | S41 (password hashing), S50 (HTTPS) |
| A03 Injection (SQL, XSS) | **S26, S32, S34, S35 XSS labs**, **S36 SQL injection lab** |
| A04 Insecure Design | S00 (threat thinking), S37 (GET must not change state), S47 |
| A05 Security Misconfiguration | S40 (security headers), S43 (stack traces), **S47 CORS lab** |
| A06 Vulnerable and Outdated Components | S26 (`npm audit`), S50 (Dependency-Check) |
| A07 Identification and Authentication Failures | S24, **S41 session fixation lab**, enumeration, throttling |
| A08 Software and Data Integrity Failures | S26 (lockfiles, CDN integrity), S46 (mass assignment) |
| A09 Security Logging and Monitoring Failures | S43, S45 (audit listener) |
| A10 Server-Side Request Forgery | S50 (concept only; TaskFlow has no URL-fetch feature) |

---

## 3. The security thread through the course

```text
Part 1 (Frontend)  → what the browser can and cannot protect
                     (React escaping, js-cookie limits, hidden ≠ secure, public bundles)
Part 2 (Backend)   → the server is the security boundary
                     (every input is attacker-controlled; encode output; authorise every request)
Part 3 (API)       → two clients, one policy
                     (sessions for SPAs, CSRF double-submit, CORS, DTOs)
Part 4 (Review)    → audit the whole system against a checklist
```

Core mental model, repeated in every part:

> **The client is not yours.** Anything that runs in the browser (JavaScript, hidden fields, disabled buttons, Redux state, cookies without HttpOnly) can be read and changed by the user. Security decisions happen on the server.

---

## 4. Attack-lab rules ⚠️

1. 🔓 labs run **only against your own local TaskFlow** (`localhost`). Never against any system you don't own or aren't explicitly authorised to test, including your employer's systems.
2. Each 🔓 lab first introduces a **deliberately vulnerable** version of a feature, clearly marked `// VULNERABLE — lab only`.
3. Every 🔓 lab is followed by a 🛡 lecture. You fix the vulnerability, re-run the attack, and confirm it fails.
4. The vulnerable code is kept on a separate git branch (`lab/sqli`, `lab/xss-stored`, …) and never merged into `main`.

---

## 5. Security deliverables you'll produce

- `docs/security/threat-notes.md`: a short list of assets, entry points and trust boundaries (started in S00, updated per part)
- `docs/security/checklist.md`: the S50 review checklist with evidence for each item
- A `SecurityHeadersFilter`, `CsrfFilter`, `AuthenticationFilter` and `AuthorizationFilter` you wrote yourself
- An audit log of security events, visible in the Admin Portal
