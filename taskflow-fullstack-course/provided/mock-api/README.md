# 📦 TaskFlow mock API (provided, Part 1)

A small server that implements TaskFlow's **API contract** (`02-project-spec.md` §5) so the React app can be
built before the Java backend exists. Introduced in lecture 13.02; retired in Part 3 (48.02).

## Setup (once)

Copy this folder into your repository as `taskflow/mock-api/`, then:

```bash
cd mock-api
npm install
```

## Run

| Command | What it does |
|---|---|
| `npm start` | Port 3001. Anonymous requests act as **alice** (no login needed). Used in S13–S23. |
| `npm run start:secure` | Requires a session (login) and the CSRF header on POST/PUT/PATCH/DELETE. Used from S24. |
| `npm run reset` | Copies `db.seed.json` over `db.json` (your working data), then starts. |

## Users (mock only: plain-text passwords, never do this for real)

| Username | Password | Role | Notes |
|---|---|---|---|
| `alice` | `alice123` | USER | Owns tasks 1–22 |
| `bob` | `bob123` | USER | Owns tasks 23–25 (used for access-control labs) |
| `admin` | `admin123` | ADMIN | Sees every task |

## Endpoints

`/api/auth/csrf`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`,
`/api/tasks` (GET with `q,status,priority,categoryId,page,size,sort`; POST),
`/api/tasks/{id}` (GET, PUT, PATCH, DELETE), `/api/tasks/{id}/comments` (GET, POST),
`/api/categories`, `/api/stats`.

## Business rules

- Task titles are unique per owner (case-insensitive, trimmed): 400 `VALIDATION_FAILED` with `fieldErrors.title` (since 19.09).

## Learning helpers

- `?_mockDelay=3000` on any request: that response takes 3 s (default latency: 300 ms, env `MOCK_DELAY`).
- `?_mockStatus=500` on any request: answers with that status and a standard error body.
