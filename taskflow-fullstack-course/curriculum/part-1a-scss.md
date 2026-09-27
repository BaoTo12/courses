# Part 1A: SCSS

> Goal: build the **TaskFlow design system** in SCSS. Later it styles the React app (S07+) *and* the JSP Admin Portal (S32+), so you write it once and use it in both.
>
> Companion reading: the official Sass documentation (sass-lang.com/documentation).

---

## S02 · SCSS Fundamentals

**Project feature:** a static **TaskFlow UI kit** (plain HTML + SCSS): buttons, status/priority badges, task cards, form fields, page layout.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 02.01 | 📖 | Why preprocessors exist: the problems of large plain CSS (repetition, no modules, magic numbers) | ★ |
| 02.02 | 📖 | What Sass *is*: a compiler. SCSS → CSS at **build time**; the browser never sees SCSS | ★ |
| 02.03 | 🛠 | Installing `sass`, `sass --watch`, source maps. Reading the compiled output. | ★ |
| 02.04 | 📖 | Variables: `$primary`. Sass variables vs CSS custom properties (compile time vs runtime). | ★ |
| 02.05 | 📖 | Nesting and `&`: parent selectors, modifiers, pseudo-classes, and **the specificity trap of deep nesting** | ★ |
| 02.06 | 🛠 | Build: button component (`.btn`, `.btn--primary`, `.btn:hover`, `.btn:disabled`) | ★ |
| 02.07 | 📖 | Partials and modules: `_file.scss`, **`@use` vs the deprecated `@import`**, namespaces, `as *` | ★ |
| 02.08 | 📖 | Operators and built-in modules: `sass:math`, `sass:color`, units | ★ |
| 02.09 | 🛠 | Build: badges, cards and the page layout split into partials | ★ |
| 02.10 | 🎯 | Your Turn: form fields (input, select, textarea, error state, help text) | ★ |
| 02.11 | 💡 | Solution walkthrough: form fields | ★ |
| 02.12 | 🐞 | Debug: "My variable is undefined". `@use` scoping and namespace mistakes. | ★ |
| 02.13 | 🐞 | Debug: "My hover style doesn't apply". Specificity after nesting. | ＋ |

### Key concepts
- Compile-time vs runtime (a theme that recurs through the whole course: SCSS vs CSS variables, JSP vs React, SCSS vs styled-components)
- `@use` module system: members, namespaces, private members (`-` / `_`)
- Nesting depth rule of thumb (≤ 3), and specificity consequences
- Source maps: how DevTools shows `.scss` lines

### You write
`styles/abstracts/_variables.scss`, `styles/components/_button.scss`, `_badge.scss`, `_card.scss`, `_form.scss`, `styles/layout/_page.scss`, `styles/main.scss`

### Provided
- Static HTML wireframe pages (`ui-kit/*.html`), CSS reset, font setup

### 🐞 Debugging challenges
1. `Undefined variable: $primary` in `_button.scss` even though `_variables.scss` defines it.
2. A nested `.card .card__title a:hover` rule loses to a utility class. Explain why, then fix it without `!important`.

### ✅ Knowledge check
- **Concept:** Can you change a Sass `$variable` from JavaScript at runtime? Why or why not? What would you use instead?
- **Code reading:** Predict the compiled CSS:
  ```scss
  .badge { &--done { color: green; } .icon + & { margin-left: 4px; } }
  ```
- **Debugging:** After switching `@import` to `@use`, three partials break. What changed in how names are shared?
- **Design:** A button colour depends on a user's saved theme preference. SCSS variable or CSS custom property? Justify.
- **Implementation:** Add a `.btn--danger` and a `.btn--sm` size modifier using only variables and nesting.

**Checkpoint:** `s02-end`

---

## S03 · SCSS Intermediate: Reuse, Logic and Architecture

**Project feature:** the UI kit becomes a real design system with **design tokens**, responsive layout, a light/dark theme, and generated status/priority variants.

### Lectures

| # | Type | Lecture | Track |
|---|---|---|---|
| 03.01 | 📖 | Mixins: `@mixin` / `@include`, arguments, defaults, `@content` blocks | ★ |
| 03.02 | 🛠 | Build: `respond-to($breakpoint)` mixin for responsive layout | ★ |
| 03.03 | 📖 | Functions: `@function`, `@return`, and when a function beats a mixin | ★ |
| 03.04 | 🛠 | Build: `rem()` and `spacing($n)` functions | ★ |
| 03.05 | 📖 | Maps and `sass:map`: modelling tokens (`$status-colors: (todo: …, in-progress: …, done: …)`) | ★ |
| 03.06 | 📖 | Control flow: `@each`, `@for`, `@if`/`@else`, interpolation `#{}` | ★ |
| 03.07 | 🛠 | Build: generate `.badge--todo`, `--in-progress`, `--done` and priority variants from maps | ★ |
| 03.08 | 📖 | `%placeholder` + `@extend` vs mixins: output size, selector explosion, why most teams prefer mixins | ＋ |
| 03.09 | 📖 | Naming: BEM (`block__element--modifier`), and why naming conventions matter more in plain CSS | ★ |
| 03.10 | 📖 | Architecture: 7-1 pattern, `@forward`, index files, public API of a style library | ★ |
| 03.11 | 🛠 | Refactor the UI kit into `abstracts/ base/ components/ layout/ themes/` | ★ |
| 03.12 | 📖 | **Design tokens → CSS custom properties**: emitting `--color-primary` from SCSS maps. The bridge to styled-components (S10) and JSP (S32). | ★ |
| 03.13 | 🛠 | Build: light/dark theme via `[data-theme="dark"]` and custom properties | ★ |
| 03.14 | 🎯 | Your Turn: a responsive task grid (1/2/3 columns) plus a priority "stripe" on cards generated from a map | ★ |
| 03.15 | 💡 | Solution walkthrough | ★ |
| 03.16 | 🐞 | Debug: an `@extend` inside a media query fails to compile | ＋ |
| 03.17 | 📖 | Modern CSS vs Sass: native nesting, `color-mix()`, container queries. What Sass still gives you. | ＋ |

### Key concepts
- Mixin vs function vs placeholder: output and trade-offs
- Maps as a single source of truth for tokens
- `@forward` for building a library's public API
- Tokens as CSS custom properties = **runtime-switchable** themes (compile-time values → runtime variables)

### You write
`abstracts/_mixins.scss`, `_functions.scss`, `_tokens.scss`, `themes/_light.scss`, `_dark.scss`, `abstracts/_index.scss` (`@forward`), grid layout

### 🐞 Debugging challenges
1. `@extend` of `%card-base` inside `@include respond-to(md)` → "You may not @extend selectors across media queries." Explain, then fix with a mixin.
2. Dark theme works on cards but not on buttons. Trace which values were compiled as static colours instead of `var(--…)`.

### ✅ Knowledge check
- **Concept:** Why can a CSS custom property switch themes at runtime while a Sass map cannot?
- **Code reading:** Given a `@each $name, $color in $status-colors` loop, list the exact selectors produced.
- **Debugging:** The compiled CSS is 3× larger after introducing `@extend`. Why?
- **Design:** For each of these, choose mixin, function or placeholder, and justify: a `truncate` text helper, a spacing scale, a shared card shadow.
- **Implementation:** Add a `high-contrast` theme using only new token values, with no component edits. If a component needs editing, your tokens aren't abstract enough.

**Checkpoint:** `s03-end`
