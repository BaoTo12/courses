# Part 0: Orientation

> Goal: understand what you're building, why it's built this way, and get the frontend toolchain running.

---

## S00 · Course Introduction and the Big Picture

**Project feature:** none yet. You produce the architecture sketch and the first threat notes.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 00.01 | 📖 | Welcome: how this course works (lecture types, tracks, checkpoints, solutions) | ★ |
| 00.02 | 📖 | TaskFlow tour: two clients, one backend, and why real companies end up like this | ★ |
| 00.03 | 📖 | The web in one picture: browser, HTTP, server, database. **Where does each piece of code run?** | ★ |
| 00.04 | 📖 | Server-side rendering vs client-side rendering: JSP vs React at 10,000 feet | ★ |
| 00.05 | 📖 | The request journeys you'll master: (a) Browser → Servlet → JSP → HTML; (b) React → Redux → Axios → API → JSON | ★ |
| 00.06 | 📖 | Security mindset: assets, entry points, trust boundaries, "the client is not yours" | ★ |
| 00.07 | 🎯 | Your Turn: draw TaskFlow's architecture and mark every trust boundary | ★ |
| 00.08 | 💡 | Solution walkthrough: the reference diagram, and common mistakes | ★ |

### Key concepts
- Client vs server execution; what "rendering" means
- SSR (JSP) vs CSR (React): what each sends over the network
- Trust boundaries: the browser is attacker-controlled
- Why a JSP portal and a React SPA coexist (legacy + modernisation, admin vs end-user)

### You write
- `docs/architecture.md`: your own diagram (ASCII or a drawing)
- `docs/security/threat-notes.md`: first version (assets, entry points, boundaries)

### ✅ Knowledge check
- **Concept:** Which parts of TaskFlow execute in the browser, and which in Tomcat? Name three things the browser *never* receives.
- **Concept:** A JSP page and a React component both "produce HTML". Where and when does each do it?
- **Design:** Why does TaskFlow Admin not need a JSON API to render its pages?
- **Design:** List three things an attacker fully controls when talking to TaskFlow.

**Checkpoint:** `s00-end`

---

## S01 · Frontend Development Environment

**Project feature:** the `taskflow/` monorepo skeleton with `styles/`, `frontend/`, `mock-api/`, `docs/`.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 01.01 | 🛠 | Installing Node LTS, VS Code, Git, browser extensions | ★ |
| 01.02 | 📖 | What Node and npm actually do for a frontend project (a runtime for *tools*, not for your app) | ★ |
| 01.03 | 🛠 | Creating the monorepo, `.gitignore`, first commit, checkpoint tags | ★ |
| 01.04 | 📖 | `package.json`, `node_modules`, lockfiles, semver (`^`, `~`). 🛡 Why the lockfile is a security control. | ★ |
| 01.05 | 🧩 | Just-in-time Git: branches for labs, tags for checkpoints, `git diff s07-end` | ★ |
| 01.06 | 📖 | DevTools tour: Elements, Console, Network, Application (cookies/storage), Performance | ★ |
| 01.07 | 🐞 | Debug: "npm install works on my machine but not in CI". Lockfile vs `npm install` vs `npm ci`. | ＋ |

### Provided
- Repo skeleton, `.editorconfig`, Prettier config, `.gitignore`

### ✅ Knowledge check
- **Concept:** Why does a React app need Node during development but not in the browser?
- **Code reading:** Given `"axios": "^1.7.2"`, which versions can `npm install` pick? Which does `npm ci` pick?
- **Debugging:** A colleague's build uses a different library version than yours. Which file do you check first, and why?
- **Implementation:** Create the repo skeleton and tag `s01-end`.

**Checkpoint:** `s01-end`
