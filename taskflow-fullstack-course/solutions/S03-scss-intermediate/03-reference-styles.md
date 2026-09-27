# S03 Reference Styles: the Complete TaskFlow Design System (end of S03)

> Every file below was compiled with Dart Sass (1.105) without errors or warnings.
> This is the state **after** the 03.14 exercise (3-column grid, map-driven stripes, theme guard).
> Use it to compare with your own files, not to copy before trying.

```text
styles/
  abstracts/_functions.scss
  abstracts/_index.scss
  abstracts/_mixins.scss
  abstracts/_tokens.scss
  abstracts/_variables.scss
  base/_reset.scss
  base/_root.scss
  base/_typography.scss
  components/_badge.scss
  components/_button.scss
  components/_card.scss
  components/_form.scss
  layout/_kit.scss
  layout/_page.scss
  main.scss
  utilities/_text.scss
```

---

## `styles/main.scss`

```scss
// TaskFlow design system: entry point.
// Order = cascade order (generic → specific). Utilities last.
@use 'base/reset';
@use 'base/root';
@use 'base/typography';

@use 'layout/page';
@use 'layout/kit';

@use 'components/button';
@use 'components/badge';
@use 'components/card';
@use 'components/form';

@use 'utilities/text';
```

---

## `styles/abstracts/_index.scss`

```scss
// Public API of the design system's tools. Emits NO CSS.
@forward 'variables';
@forward 'tokens';
@forward 'functions';
@forward 'mixins';
```

---

## `styles/abstracts/_variables.scss`

```scss
// ─── Raw palette (compile-time; referenced by the theme maps in _tokens.scss) ───
$palette: (
  'indigo-400': #818cf8,
  'indigo-600': #4f46e5,
  'red-400': #f87171,
  'red-600': #dc2626,
  'slate-50': #f8fafc,
  'slate-100': #f1f5f9,
  'slate-200': #e2e8f0,
  'slate-400': #94a3b8,
  'slate-500': #64748b,
  'slate-700': #334155,
  'slate-800': #1e293b,
  'slate-900': #0f172a,
  'white': #ffffff,
);

// ─── Scales ───
$base-font-size: 16px !default;
$space-unit: 4px !default;

$radius-sm: 4px;
$radius-md: 6px;
$radius-lg: 8px;
$radius-full: 999px;

$shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
$shadow-md: 0 1px 3px rgba(15, 23, 42, 0.1), 0 1px 2px rgba(15, 23, 42, 0.06);

$font-family-base: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
$font-weight-medium: 500;
$font-weight-semibold: 600;

$transition-fast: 150ms ease;
```

---

## `styles/abstracts/_tokens.scss`

```scss
@use 'sass:map';
@use 'sass:list';
@use 'variables' as *;

$breakpoints: (
  'sm': 480px,
  'md': 768px,
  'lg': 1024px,
  'xl': 1280px,
);

// Keys mirror the backend enums (TaskStatus / Priority), kebab-cased.
$status-colors: (
  'todo':        ('bg': #e0e7ff, 'fg': #3730a3),
  'in-progress': ('bg': #fef3c7, 'fg': #92400e),
  'done':        ('bg': #dcfce7, 'fg': #166534),
);

$priority-colors: (
  'low': #14b8a6,
  'medium': #f59e0b,
  'high': #ef4444,
);

// Semantic colour tokens per theme → emitted as --color-<name> in base/_root.scss
$themes: (
  'light': (
    'primary':       map.get($palette, 'indigo-600'),
    'primary-hover': #4338ca,
    'on-primary':    map.get($palette, 'white'),
    'danger':        map.get($palette, 'red-600'),
    'danger-hover':  #b91c1c,
    'text':          map.get($palette, 'slate-900'),
    'text-muted':    map.get($palette, 'slate-500'),
    'border':        map.get($palette, 'slate-200'),
    'surface':       map.get($palette, 'white'),
    'surface-muted': map.get($palette, 'slate-100'),
    'background':    map.get($palette, 'slate-50'),
    'focus-ring':    rgba(79, 70, 229, 0.25),
  ),
  'dark': (
    'primary':       map.get($palette, 'indigo-400'),
    'primary-hover': #a5b4fc,
    'on-primary':    map.get($palette, 'slate-900'),
    'danger':        map.get($palette, 'red-400'),
    'danger-hover':  #fca5a5,
    'text':          map.get($palette, 'slate-100'),
    'text-muted':    map.get($palette, 'slate-400'),
    'border':        map.get($palette, 'slate-700'),
    'surface':       map.get($palette, 'slate-800'),
    'surface-muted': #273449,
    'background':    map.get($palette, 'slate-900'),
    'focus-ring':    rgba(129, 140, 248, 0.35),
  ),
);

// ─── Guard: every theme must define exactly the same tokens as 'light' ───
$-reference-keys: map.keys(map.get($themes, 'light'));

@each $theme-name, $theme in $themes {
  $missing: ();
  @each $key in $-reference-keys {
    @if not map.has-key($theme, $key) {
      $missing: list.append($missing, $key, $separator: comma);
    }
  }
  @if list.length($missing) > 0 {
    @error 'Theme "#{$theme-name}" is missing token(s): #{$missing}';
  }
  @each $key in map.keys($theme) {
    @if not list.index($-reference-keys, $key) {
      @error 'Theme "#{$theme-name}" defines "#{$key}", which the light theme does not have.';
    }
  }
}
```

---

## `styles/abstracts/_functions.scss`

```scss
@use 'sass:math';
@use 'sass:map';
@use 'variables' as *;
@use 'tokens' as *;

/// Convert a px value to rem, relative to $base-font-size.
/// to-rem(18px) → 1.125rem
@function to-rem($px, $base: $base-font-size) {
  @if math.unit($px) != 'px' {
    @error 'to-rem() expects a px value, got #{$px}.';
  }
  @return math.div($px, $base) * 1rem;
}

/// Spacing scale: multiples of $space-unit.  space(4) → 16px
@function space($n) {
  @return $n * $space-unit;
}

/// Reference a themed colour. Validated at COMPILE time, resolved at RUNTIME.
/// theme('text') → var(--color-text)
@function theme($name) {
  @if not map.has-key(map.get($themes, 'light'), $name) {
    @error 'Unknown theme token "#{$name}". Known: #{map.keys(map.get($themes, "light"))}';
  }
  @return var(--color-#{$name});
}
```

---

## `styles/abstracts/_mixins.scss`

```scss
@use 'sass:map';
@use 'tokens' as *;

/// Mobile-first media query for a named breakpoint.
@mixin respond-to($breakpoint) {
  @if not map.has-key($breakpoints, $breakpoint) {
    @error 'Unknown breakpoint "#{$breakpoint}". Use one of: #{map.keys($breakpoints)}';
  }

  @media (min-width: map.get($breakpoints, $breakpoint)) {
    @content;
  }
}

/// Visible keyboard focus indicator.
@mixin focus-ring($color: var(--color-primary), $offset: 2px) {
  outline: 2px solid $color;
  outline-offset: $offset;
}

/// Single-line ellipsis, or multi-line clamp when $lines > 1.
@mixin truncate($lines: 1) {
  @if $lines == 1 {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
```

---

## `styles/base/_reset.scss`

```scss
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  min-height: 100vh;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, p, ul, ol, figure {
  margin: 0;
}

ul[role='list'],
ol[role='list'] {
  list-style: none;
  padding: 0;
}

img, svg {
  display: block;
  max-width: 100%;
}

input, button, textarea, select {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
}
```

---

## `styles/base/_root.scss`

```scss
@use 'sass:map';
@use '../abstracts' as *;

/// Emit one custom property per semantic token: --color-<name>: <value>;
@mixin emit-theme($theme) {
  @each $name, $value in $theme {
    --color-#{$name}: #{$value};
  }
}

// 1. Default (light) theme, and explicit light
:root,
[data-theme='light'] {
  @include emit-theme(map.get($themes, 'light'));
  color-scheme: light;
}

// 2. Explicit dark theme (user chose dark in the app)
[data-theme='dark'] {
  @include emit-theme(map.get($themes, 'dark'));
  color-scheme: dark;
}

// 3. No explicit choice: follow the operating system preference
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    @include emit-theme(map.get($themes, 'dark'));
    color-scheme: dark;
  }
}
```

---

## `styles/base/_typography.scss`

```scss
@use '../abstracts' as *;

body {
  font-family: $font-family-base;
  font-size: to-rem(16px);
  color: theme('text');
  background: theme('background');
}

a {
  color: theme('primary');
}
```

---

## `styles/layout/_page.scss`

```scss
@use '../abstracts' as *;

.page {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;

  &__header {
    display: flex;
    align-items: center;
    gap: space(6);
    padding: space(3) space(6);
    background: theme('surface');
    border-bottom: 1px solid theme('border');
  }

  &__brand {
    font-weight: $font-weight-semibold;
    font-size: to-rem(18px);
    color: theme('primary');
  }

  &__nav {
    display: flex;
    gap: space(4);
  }

  &__nav-link {
    color: theme('text-muted');
    text-decoration: none;
    font-size: to-rem(14px);
    font-weight: $font-weight-medium;
    padding: space(1) 0;
    border-bottom: 2px solid transparent;

    &:hover {
      color: theme('text');
    }

    &--active {
      color: theme('text');
      border-bottom-color: theme('primary');
    }
  }

  &__main {
    width: 100%;
    max-width: 1100px;
    margin: 0 auto;
    padding: space(8) space(6);
  }

  &__title {
    font-size: to-rem(24px);
    margin-bottom: space(6);
  }

  &__footer {
    padding: space(4) space(6);
    color: theme('text-muted');
    font-size: to-rem(14px);
    text-align: center;
  }
}

.task-grid {
  display: grid;
  gap: space(4);
  grid-template-columns: 1fr;

  @include respond-to('md') {
    grid-template-columns: repeat(2, 1fr);
  }

  @include respond-to('lg') {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

---

## `styles/layout/_kit.scss`

```scss
@use '../abstracts' as *;

.kit-section {
  margin-bottom: space(8);

  &__title {
    font-size: to-rem(14px);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: theme('text-muted');
    margin-bottom: space(3);
  }
}
```

---

## `styles/components/_button.scss`

```scss
@use '../abstracts' as *;

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: space(2);
  padding: space(2) space(4);
  border: 1px solid transparent;
  border-radius: $radius-md;
  font-size: to-rem(14px);
  font-weight: $font-weight-medium;
  line-height: 1.25;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color $transition-fast,
    border-color $transition-fast,
    color $transition-fast;

  &:focus-visible {
    @include focus-ring;
  }

  &:disabled,
  &[aria-disabled='true'] {
    opacity: 0.5;
    cursor: not-allowed;
  }

  & + & {
    margin-left: space(2);
  }

  &--primary {
    background: theme('primary');
    color: theme('on-primary');

    &:hover:not(:disabled) {
      background: theme('primary-hover');
    }
  }

  &--secondary {
    background: theme('surface');
    color: theme('text');
    border-color: theme('border');

    &:hover:not(:disabled) {
      background: theme('surface-muted');
    }
  }

  &--danger {
    background: theme('danger');
    color: theme('on-primary');

    &:hover:not(:disabled) {
      background: theme('danger-hover');
    }
  }

  &--sm {
    padding: space(1) space(3);
    font-size: to-rem(12px);
  }
}
```

---

## `styles/components/_badge.scss`

```scss
@use 'sass:map';
@use '../abstracts' as *;

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px space(2);
  border-radius: $radius-full;
  font-size: to-rem(12px);
  font-weight: $font-weight-semibold;
  line-height: 1.5;
  white-space: nowrap;

  // .badge--todo, .badge--in-progress, .badge--done
  @each $status, $colors in $status-colors {
    &--#{$status} {
      background: map.get($colors, 'bg');
      color: map.get($colors, 'fg');
    }
  }

  // .badge--priority-low, -medium, -high
  @each $priority, $color in $priority-colors {
    &--priority-#{$priority} {
      color: $color;
      box-shadow: inset 0 0 0 1px $color;
    }
  }
}
```

---

## `styles/components/_card.scss`

```scss
@use '../abstracts' as *;

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: space(2);
  padding: space(4);
  padding-left: space(5);
  background: theme('surface');
  border: 1px solid theme('border');
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  overflow: hidden;
  transition: box-shadow $transition-fast;

  &:hover {
    box-shadow: $shadow-md;
  }

  // Priority stripe on the left edge
  &::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: space(1);
    background: theme('border');
  }

  // .card--priority-low::before, -medium, -high (generated from the token map)
  @each $priority, $color in $priority-colors {
    &--priority-#{$priority}::before {
      background: $color;
    }
  }

  &__title {
    font-size: to-rem(18px);
    font-weight: $font-weight-semibold;
    line-height: 1.3;
    @include truncate(2);

    a {
      color: inherit;
      text-decoration: none;

      &:hover {
        color: theme('primary');
        text-decoration: underline;
      }
    }
  }

  &__body {
    color: theme('text-muted');
    font-size: to-rem(14px);
  }

  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    padding-top: space(2);
  }

  &__due {
    font-size: to-rem(12px);
    color: theme('text-muted');

    &--overdue {
      color: theme('danger');
      font-weight: $font-weight-semibold;
    }
  }
}
```

---

## `styles/components/_form.scss`

```scss
@use '../abstracts' as *;

.form {
  display: flex;
  flex-direction: column;
  gap: space(4);
  max-width: 560px;

  &__actions {
    display: flex;
    gap: space(2);
    margin-top: space(2);

    .btn + .btn {
      margin-left: 0;
    }
  }
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: space(1);

  &__label {
    font-size: to-rem(14px);
    font-weight: $font-weight-medium;
  }

  &__input {
    width: 100%;
    padding: space(2) space(3);
    font-size: to-rem(14px);
    line-height: 1.5;
    color: theme('text');
    background: theme('surface');
    border: 1px solid theme('border');
    border-radius: $radius-md;
    transition:
      border-color $transition-fast,
      box-shadow $transition-fast;

    &::placeholder {
      color: theme('text-muted');
    }

    &:focus {
      outline: none;
      border-color: theme('primary');
      box-shadow: 0 0 0 3px theme('focus-ring');
    }

    &:disabled {
      background: theme('surface-muted');
      cursor: not-allowed;
    }

    &[aria-invalid='true'] {
      border-color: theme('danger');
    }
  }

  @at-root textarea#{&}__input {
    resize: vertical;
    min-height: 5rem;
  }

  &__help {
    font-size: to-rem(12px);
    color: theme('text-muted');
  }

  &__error {
    font-size: to-rem(12px);
    font-weight: $font-weight-medium;
    color: theme('danger');
  }

  &--error &__input {
    border-color: theme('danger');
  }
}
```

---

## `styles/utilities/_text.scss`

```scss
@use '../abstracts' as *;

.text-muted {
  color: theme('text-muted');
}

.text-danger {
  color: theme('danger');
}

// Hide visually but keep available to screen readers
.visually-hidden {
  position: absolute !important;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

**Back to:** [03.13 · Build: light and dark themes](../../lectures/S03-scss-intermediate/03.13-build-themes.md) · [03.15 · Solution walkthrough](03.15-solution-grid-stripe.md)
