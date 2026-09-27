# Part 1C: React, styled-components, Forms, Routing, Axios

> Goal: build **TaskFlow Web** with React + TypeScript on top of the SCSS design system, add styled-components for dynamic, themeable components, and connect it to the mock API with a well-designed Axios layer.
>
> Companion reading: react.dev (Learn section), styled-components.com/docs, reactrouter.com, axios-http.com.

---

## S07 · React Fundamentals (deep)

**Project feature:** Vite + React + TS app; the UI kit becomes components (`Button`, `Badge`, `TaskCard`, `TaskList`, `PageLayout`) styled with **SCSS modules**; the task list renders from local data.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 07.01 | 📖 | Why React exists: the S04 vanilla DOM pain → declarative UI = `f(state)` | ★ |
| 07.02 | 🛠 | Scaffolding with Vite (React + TS template); what the dev server and bundler do | ★ |
| 07.03 | 📖 | JSX is not HTML: it compiles to `React.createElement` / `jsx()` calls. Reading the compiled output. | ★ |
| 07.04 | 📖 | Elements vs components vs instances; the virtual DOM; **render vs commit phases** | ★ |
| 07.05 | 📖 | Props: typing with TS, `children`, default values, props are read-only | ★ |
| 07.06 | 🛠 | Build: `Button`, `Badge`, `TaskCard` using `*.module.scss` + the S03 tokens | ★ |
| 07.07 | 📖 | CSS Modules: how class names get hashed, `composes`, global vs local styles | ★ |
| 07.08 | 📖 | State with `useState`: what triggers a re-render, and why you must not mutate state | ★ |
| 07.09 | 📖 | Events: synthetic events, typing handlers (`React.ChangeEvent<HTMLInputElement>`) | ★ |
| 07.10 | 📖 | Conditional rendering and the `&&` + `0` gotcha | ★ |
| 07.11 | 📖 | Lists and **keys**: what reconciliation does with keys, and why index keys break | ★ |
| 07.12 | 🛠 | Build: `TaskList` with filter buttons (local state) | ★ |
| 07.13 | 📖 | Composition vs inheritance; lifting state up; "thinking in React" | ★ |
| 07.14 | 📖 | One-way data flow and prop drilling. **The problem Redux will solve.** | ★ |
| 07.15 | 🎯 | Your Turn: a status column board (TODO / IN_PROGRESS / DONE) with a toggle-done action | ★ |
| 07.16 | 💡 | Solution walkthrough | ★ |
| 07.17 | 🐞 | Debug: "I clicked, state changed, but the UI didn't update". Mutation + same reference. | ★ |
| 07.18 | 🐞 | Debug: input focus jumps between rows after deleting a task. Index keys. | ★ |

### Key concepts
Declarative UI · JSX compilation · reconciliation · render/commit · props vs state · keys · lifting state · prop drilling · CSS Modules scoping. 🛡 React escapes `{}` output by default (full lab in S26).

### ✅ Knowledge check
- **Concept:** When a parent re-renders, do its children re-render? Does the DOM change?
- **Code reading:** What does `{tasks.length && <TaskList/>}` render when the list is empty?
- **Debugging:** `setTasks(tasks.push(newTask))`. List every problem in this line.
- **Design:** Where should the "current filter" state live if both the header and the list need it?
- **Implementation:** Add a task counter per column that updates on toggle.

**Checkpoint:** `s07-end`

---

## S08 · React Hooks in Depth

**Project feature:** `useTasks` custom hook (fetching `db.json`), a `useReducer`-based task board (**your first reducer**), a theme context, a `useDebounce` hook for search.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 08.01 | 📖 | What a hook really is: state stored per component on a list, and why **rules of hooks** exist | ★ |
| 08.02 | 📖 | `useState` deep: batching, functional updates (`setX(prev => …)`), lazy initial state, stale closures | ★ |
| 08.03 | 📖 | `useEffect` deep: synchronising with external systems, dependency arrays, cleanup, **StrictMode double-invoke** | ★ |
| 08.04 | 🛠 | Build: `useTasks()`: fetch with loading/error state + `AbortController` cleanup | ★ |
| 08.05 | 📖 | "You might not need an effect": derived state, event handlers vs effects | ★ |
| 08.06 | 📖 | `useRef`: mutable boxes, DOM refs, refs vs state | ★ |
| 08.07 | 📖 | **`useReducer`**: `(state, action) => newState`. The direct bridge to Redux. | ★ |
| 08.08 | 🛠 | Build: refactor the board to `useReducer` with typed discriminated-union actions | ★ |
| 08.09 | 📖 | `useContext`: context as dependency injection, and its re-render cost | ★ |
| 08.10 | 🛠 | Build: `ThemeContext` (light/dark) toggling `data-theme` from S03 | ★ |
| 08.11 | 📖 | Custom hooks: extracting logic, naming, composition | ★ |
| 08.12 | 🛠 | Build: `useDebounce`, `useLocalStorage` (with try/catch) | ★ |
| 08.13 | 📖 | `useMemo`, `useCallback`, `React.memo`: first look (deep dive in S21) | ★ |
| 08.14 | 📖 | `useLayoutEffect`, `useId`, `useTransition`/`useDeferredValue` overview | ＋ |
| 08.15 | 🎯 | Your Turn: add "edit title inline" to the reducer board; the action types must stay exhaustive | ★ |
| 08.16 | 💡 | Solution walkthrough | ★ |
| 08.17 | 🐞 | Debug: infinite fetch loop (object in the dependency array) | ★ |
| 08.18 | 🐞 | Debug: search shows results for an *older* query (race condition). Fix with cleanup/abort. | ★ |

### Key concepts
Hook call order · closures capturing state · effect lifecycle · cleanup · derived state · reducers as pure functions · context propagation · referential stability

### ✅ Knowledge check
- **Concept:** Why does `useEffect(() => {…}, [filter])` re-run when `filter` is `{ status: 'TODO' }` recreated every render?
- **Code reading:** `setCount(count + 1); setCount(count + 1);`: final value? And with the functional form?
- **Debugging:** An effect logs twice in development only. Bug or feature? Explain.
- **Design:** Context vs `useReducer` vs "wait for Redux". Where should app-wide task data live, and what breaks at scale?
- **Implementation:** Write `usePrevious<T>(value)`.

**Checkpoint:** `s08-end`

---

## S09 · styled-components Fundamentals

**Project feature:** dynamic components that SCSS handles poorly: `PriorityBar` (width/colour from props), `Avatar` (size variants), `Stack`/`Box` layout primitives, `Button` rewritten as a styled component with variants.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 09.01 | 📖 | CSS-in-JS: the problem it solves (co-location, dynamic styles, dead-code elimination) and the costs (runtime, bundle size) | ★ |
| 09.02 | 📖 | **How styled-components works internally**: tagged templates → generated class names → `<style>` injection at runtime. Inspecting it in DevTools. | ★ |
| 09.03 | 🛠 | Install, VS Code syntax plugin, first `styled.div` | ★ |
| 09.04 | 📖 | Props-based styling and **transient props** (`$variant`) in v6; why unknown props must not reach the DOM | ★ |
| 09.05 | 🛠 | Build: `Button` with `$variant` and `$size`, typed with TS generics (`styled.button<{ $variant: … }>`) | ★ |
| 09.06 | 📖 | Extending styles: `styled(Button)`, styling your own components (`className` forwarding) | ★ |
| 09.07 | 📖 | The `css` helper, shared style fragments, `keyframes` animations | ★ |
| 09.08 | 📖 | `.attrs()`, the polymorphic `as` prop, `shouldForwardProp` | ★ |
| 09.09 | 🛠 | Build: `PriorityBar`, `Avatar`, `Stack` primitives | ★ |
| 09.10 | 📖 | Pseudo-classes, nesting, `&` and referring to other components (`${TaskCard}:hover &`) | ★ |
| 09.11 | 📖 | Performance rules: **never define a styled component inside render**; dynamic interpolations vs `style` prop for high-frequency values | ★ |
| 09.12 | 🎯 | Your Turn: `ProgressRing` showing % of tasks done, colour driven by thresholds | ★ |
| 09.13 | 💡 | Solution walkthrough | ★ |
| 09.14 | 🐞 | Debug: console warning "React does not recognize the `variant` prop on a DOM element" | ★ |
| 09.15 | 🐞 | Debug: an input loses focus on every keystroke (styled component declared inside the component) | ★ |

### Key concepts
Runtime CSS generation · class name hashing · transient props · component identity · interpolation functions `${p => …}` · style co-location

### ✅ Knowledge check
- **Concept:** When does styled-components generate CSS: at build time or runtime? Compare with SCSS modules.
- **Code reading:** How many CSS classes are generated for a `Button` rendered with 3 different `$variant` values?
- **Debugging:** `styled.div` defined inside `TaskCard()` causes remounts. Explain via component identity and reconciliation (S07).
- **Design:** A drag-position `top` value changes 60 times per second. Interpolation or inline `style`? Why?
- **Implementation:** A `Tag` component with `$color` from the category, auto-contrast text colour via a helper.

**Checkpoint:** `s09-end`

---

## S10 · styled-components Advanced: Theming, Global Styles, and Living with SCSS

**Project feature:** a typed `ThemeProvider` theme built **from the same design tokens** as SCSS; light/dark mode; `createGlobalStyle`; documented team rules for "when SCSS, when styled-components".

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 10.01 | 📖 | `ThemeProvider`: how theme reaches components (React context underneath) | ★ |
| 10.02 | 📖 | Typing the theme: `declare module 'styled-components' { interface DefaultTheme … }` (declaration merging from S06) | ★ |
| 10.03 | 🛠 | Build: `lightTheme` / `darkTheme` objects, a theme toggle wired to the S08 `ThemeContext` | ★ |
| 10.04 | 📖 | **One source of truth for tokens**: option A: theme values reference CSS custom properties (`var(--color-primary)`) emitted by SCSS; option B: tokens in TS consumed by both. Trade-offs. | ★ |
| 10.05 | 🛠 | Build: switch the theme to CSS-variable references so SCSS components and styled components change together | ★ |
| 10.06 | 📖 | `createGlobalStyle` vs the SCSS base layer: avoiding two competing resets | ★ |
| 10.07 | 📖 | **SCSS vs styled-components decision guide**: global/base/layout/utility → SCSS; dynamic, prop-driven, component-local → styled-components; specificity and load order when both exist | ★ |
| 10.08 | 📖 | Why styled-components can **never** style the JSP Admin Portal (runtime JS library vs server-rendered HTML): the compile-time/runtime theme again | ★ |
| 10.09 | 📖 | Variants patterns at scale: variant maps, `css` fragments, avoiding prop explosion | ★ |
| 10.10 | 📖 | 🛡 CSS injection: interpolating user-controlled values (e.g. a category colour from the API) into styles, and validating them | ★ |
| 10.11 | 📖 | Testing styled components (`toHaveStyleRule`), SSR/streaming note, the RSC limitation | ＋ |
| 10.12 | 🎯 | Your Turn: a `Toast` system (success/error/info) themed for light/dark, animated with `keyframes` | ★ |
| 10.13 | 💡 | Solution walkthrough | ★ |
| 10.14 | 🐞 | Debug: dark mode updates styled buttons but not SCSS cards (two sources of truth) | ★ |
| 10.15 | 🐞 | Debug: an SCSS rule unexpectedly overrides a styled component. Insertion order + specificity. | ＋ |

### ✅ Knowledge check
- **Concept:** Trace how `props.theme.colors.primary` gets its value inside a deeply nested component.
- **Code reading:** Given one SCSS class and one styled component on the same element, which wins and why?
- **Debugging:** `theme.colours` typo compiles fine. How do you make TypeScript catch it?
- **Design:** Your team uses both tools. Write 5 rules for a `STYLING.md` that a new teammate could follow.
- **Implementation:** Add a category-colour chip where the colour comes from API data, safely validated.

**Checkpoint:** `s10-end`

---

## S11 · Forms in React

**Project feature:** `TaskForm` (create/edit) with typed form state, client-side validation, error display and accessible markup.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 11.01 | 📖 | Controlled vs uncontrolled inputs; the single source of truth for form values | ★ |
| 11.02 | 🛠 | Build: `TaskForm` with a typed `FormState` and a generic change handler | ★ |
| 11.03 | 📖 | Selects, checkboxes, dates: value types and conversions (`''` vs `null` for `dueDate`) | ★ |
| 11.04 | 📖 | Validation: on change, on blur, on submit; error-state modelling (`Partial<Record<keyof FormState, string>>`) | ★ |
| 11.05 | 🛠 | Build: validation + error messages using the S02 form styles | ★ |
| 11.06 | 📖 | Submitting: `preventDefault`, disabling double submits, what HTML form submission does *without* JavaScript (preview of S37) | ★ |
| 11.07 | 📖 | Accessibility basics: labels, `aria-invalid`, `aria-describedby`, focus management | ★ |
| 11.08 | 📖 | 🛡 **Client-side validation is UX, not security**: bypassing it with DevTools in 30 seconds | ★ |
| 11.09 | 📖 | Form libraries (React Hook Form, Formik): what they optimise, and why we build by hand first | ＋ |
| 11.10 | 🎯 | Your Turn: edit mode (prefilled), a "dirty" indicator, reset | ★ |
| 11.11 | 💡 | Solution walkthrough | ★ |
| 11.12 | 🐞 | Debug: "A component is changing an uncontrolled input to be controlled" | ★ |

### ✅ Knowledge check
- **Concept:** Why must the server re-validate everything the React form already validated?
- **Code reading:** What value does `<input type="number">` give you in `e.target.value`?
- **Debugging:** The form submits twice on a fast double-click. Two fixes?
- **Design:** Should form drafts go into Redux later? (Hint: the Redux style guide says…)
- **Implementation:** A title-length counter and a due-date-not-in-past rule.

**Checkpoint:** `s11-end`

---

## S12 · 🧩 React Router (just-in-time)

**Project feature:** routes `/`, `/tasks`, `/tasks/:id`, `/tasks/new`, `/tasks/:id/edit`, `/login`, `/dashboard`, `*` (404); shared layout; query-string-driven filters; a protected-route shell.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 12.01 | 📖 | Client-side routing: History API; **no request to the server** on navigation (contrast with JSP later) | ★ |
| 12.02 | 🛠 | Routes, layouts, `<Outlet>`, `<Link>` vs `<a>` | ★ |
| 12.03 | 📖 | Params (`useParams`) and search params (`useSearchParams`): URL as state | ★ |
| 12.04 | 🛠 | Build: task details page, filters synced to `?status=&q=` | ★ |
| 12.05 | 📖 | Programmatic navigation, `replace`, redirects after submit | ★ |
| 12.06 | 🛠 | Build: 404 page, `RequireAuth` wrapper (fake auth flag for now) | ★ |
| 12.07 | 📖 | 🛡 A protected route is a UX feature: the data must be protected by the API | ★ |
| 12.08 | 📖 | Why deep links 404 on a real server without "SPA fallback" (fixed in S49 on Tomcat) | ★ |
| 12.09 | 📖 | Lazy routes and code splitting | ＋ |
| 12.10 | 🎯 | Your Turn: breadcrumb + "back to list keeps my filters" | ★ |
| 12.11 | 💡 | Solution walkthrough | ★ |
| 12.12 | 🐞 | Debug: refreshing `/tasks/5` on a static server gives 404 | ★ |

### ✅ Knowledge check
- **Concept:** Clicking a `<Link>` vs typing the URL and pressing Enter: what reaches the server in each case?
- **Design:** Filter state: URL, component state or Redux? Consider sharing links and the back button.
- **Implementation:** `?page=` pagination with prev/next links.

**Checkpoint:** `s12-end`

---

## S13 · Axios and the Mock API

**Project feature:** `json-server` mock API (provided) matching the **API contract** in the project spec; the `api/` layer: Axios instance, typed endpoint functions, interceptors, error normalisation.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 13.01 | 📖 | HTTP from the browser: methods, status codes, headers, JSON bodies. Watching it in the Network tab. | ★ |
| 13.02 | 🛠 | Running the mock API (provided `db.json` + middleware); Vite dev proxy `/api → :3001` | ★ |
| 13.03 | 📖 | Why Axios over `fetch`: instances, interceptors, automatic JSON, errors on non-2xx, timeouts, cancellation | ★ |
| 13.04 | 🛠 | Build: `api/client.ts` (`axios.create` with `baseURL`, `timeout`, `withCredentials`) | ★ |
| 13.05 | 🛠 | Build: `api/tasks.ts` (`getTasks(params)`, `getTask(id)`, `createTask`, `updateTask`, `deleteTask`), typed with S06 DTOs | ★ |
| 13.06 | 📖 | **Interceptors internals**: request and response chains, order of execution, returning/rejecting | ★ |
| 13.07 | 🛠 | Build: request-ID + timing interceptor; response interceptor → normalised `ApiError` | ★ |
| 13.08 | 📖 | Error anatomy: network error vs timeout vs 4xx vs 5xx; `axios.isAxiosError`; typing `AxiosError<ApiError>` | ★ |
| 13.09 | 📖 | Cancellation with `AbortController` (signal); why it matters for search and route changes | ★ |
| 13.10 | 📖 | `withCredentials`, cookies and CORS: first look (full explanation in S47) | ★ |
| 13.11 | 📖 | 🛡 Environment variables in Vite: `import.meta.env.VITE_*` is **public**; never ship secrets in a bundle | ★ |
| 13.12 | 🎯 | Your Turn: wire `useTasks` and `TaskForm` to the API; loading/error UI with the S10 Toast | ★ |
| 13.13 | 💡 | Solution walkthrough | ★ |
| 13.14 | 🐞 | Debug: the interceptor swallows errors; the component thinks the save succeeded | ★ |
| 13.15 | 🐞 | Debug: a CORS error when calling `:3001` directly instead of through the proxy | ★ |

### Provided
`mock-api/db.json`, `mock-api/middleware.js` (simulates `/api/auth/*`, a fake session cookie, CSRF token cookie, pagination envelope, error bodies), run scripts.

### ✅ Knowledge check
- **Concept:** In what order do two request interceptors and two response interceptors run?
- **Code reading:** What does `await api.get('/tasks/999')` do when the server returns 404: resolve or reject?
- **Debugging:** `error.response` is `undefined`. What kinds of failure cause this?
- **Design:** Why should components never call `axios` directly? What does the `api/` layer buy you in Part 3?
- **Implementation:** A retry-once interceptor for idempotent GETs on network errors only (explain why not for POST).

**Checkpoint:** `s13-end`
