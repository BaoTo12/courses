---
name: course-generator
description: Generate a university-style course for a new technology, library, language feature or skill as Markdown lessons plus ONE small skeleton project that the reader fills in, step by step, from the code given in the lessons. Use whenever the user wants to learn something new and asks for lessons, a course, a roadmap, a tutorial or "teach me X" material saved as files. Default mode writes the roadmap and the project skeleton first, then one lesson at a time on request; "full course" mode writes every lesson at once. Every lesson climbs a concept ladder (one new term at a time, each defined before it is used), explains each concept as problem → idea → a tiny version built from scratch, gives the exact code to type into the skeleton's placeholders, and shows the REAL output of running the project at that point, walked through line by line.
---

# Course generator: learn anything from zero, by filling in one small project

## Who the reader is

A developer who knows general programming but is **new to this topic**. They get lost the moment a word appears
that nobody explained. Your job is to make every step obvious: never skip a rung of the ladder.

Write in **English**: plain words, short sentences, the tone of a good university lecturer: precise definitions,
theory before practice, clear learning outcomes, and a summary at the end of every lecture.

## Read the worked examples first

Before writing a roadmap or a lesson, read the reference files. They are the **gold standard**: match their depth,
their tone and their structure.

- [references/example-ladder-lesson.md](references/example-ladder-lesson.md): a whole lesson that climbs from zero
  (state → action → reducer → store → dispatch → … → thunk), one new word at a time, each with tiny code and a
  "run it by hand".
- [references/weather.mjs](references/weather.mjs): a complete, instrumented program (log lines indented by call
  depth) and the kind of output walk-through a lesson gives for it.
- The "Build step" example in Rule 3 below: how a lesson hands the reader code to put into the skeleton project.

The examples on Redux only illustrate the STYLE. Apply the same style to whatever topic is requested.

## Before writing anything

1. **The destination folder is decided on every prompt.** If the request doesn't name a folder, ask for it
   (AskUserQuestion) before writing. Never guess a location, and never write outside the folder you were given.
2. **The topic and its version.** Identify exactly what is being taught (e.g. "Redux Toolkit 2", "Docker Compose
   v2"). For anything version-specific, check the official docs or the installed package's type definitions /
   README, and state the version the course uses at the top of the roadmap. Don't teach from memory when the API may
   have changed. When the user names sources (official tutorials, an existing course), cover everything they teach.
3. **The mode** (see "Two modes"): roadmap + skeleton + lessons on demand by default; the full course only when the
   user asks for it ("full course", "write everything", "generate the courses").

## The course project: a skeleton the reader fills in

Every course has exactly **one** project, small but complete: just big enough that every concept of the course has
a real job in it, and nothing more (no styling, no extra features, no second app). All the course's code lives in
it; the lessons are connected because they build the same project.

- **You ship a skeleton.** `project/` contains every file of the finished project, but the parts the lessons teach
  are **placeholders**. Infrastructure the course does not teach (package.json, a fake server, a test DOM, a demo
  runner) is given complete, with a one-line comment saying what it is.
- **Placeholder convention.** Each placeholder names the lesson and step that fills it:

  ```js
  // 🧩 03.2 — the todos reducer (lesson 03, step 2). Replace this function.
  export function todosReducer(state, action) {
    throw new Error('🧩 Not written yet: lesson 03, step 2');
  }
  ```

  A placeholder must not break anything an EARLIER lesson runs: it only fails when called, and the error says which
  lesson fills it.
- **From-scratch builds live in the project too.** When a lesson builds a tiny version of a library function
  (e.g. `createStore`), the reader writes it in `src/from-scratch/…`; the "real thing" step then switches one import
  to the real library, and the project keeps working.
- **Each lesson ends with a demo** the reader runs (`npm run lesson 03`), whose instrumented output shows what the
  lesson's code does. The demo file is also written by the reader, from the lesson.
- **Don't build or run it yourself.** The user builds the project and debugs it: that is part of how they learn.
  Don't install packages, run demos, compile or test, unless the user asks. Write each lesson's expected output from
  careful reasoning about the code, and label it **"Expected output (not run)"**, never "real output". Keep the code
  simple and deterministic enough that the expected output can be predicted exactly (no random values or timing
  races in printed lines; where a value is random, say so next to it).

## Two modes

### Mode 1 (default): roadmap and skeleton, then lessons on demand

1. Write `00-roadmap.md` (format below) and the `project/` skeleton, then stop. Tell the user the lesson list and
   ask which lesson to write.
2. Each later request ("next", "lesson 3") writes **one** lesson, in ladder order. If they ask for a lesson whose
   earlier rungs aren't written yet, say which terms it depends on and offer to write those first.
3. After each lesson, update the roadmap: mark the lesson written and add its new terms to the glossary.

### Mode 2: full course in one go

Write the roadmap, the skeleton, then every lesson in order, to exactly the same standard as Mode 1. At the end, do the **ladder check** (every term defined before or where it is first
used) and the **placeholder check** (every 🧩 in the skeleton is filled by exactly one lesson step, and every step
names a 🧩 that exists). Fix whatever breaks either rule.

## Folder layout

```text
<destination>/<topic-slug>/
├── 00-roadmap.md
├── 01-<slug>.md
├── 02-<slug>.md
├── …
└── project/
    ├── README.md            what the project is, how to install and run it, the 🧩 convention
    ├── package.json         dependencies + "lesson" script (npm run lesson 03 → runs demos/03-*.)
    └── src/ demos/ …        every file of the finished project, with 🧩 placeholders
```

File and folder names: kebab-case, two-digit numbers, so they sort in reading order.

## The roadmap (`00-roadmap.md`)

1. **What it is**: two or three plain sentences, no jargon.
2. **The problem it solves**: a concrete everyday situation where life is painful without it.
3. **What you need to know first**: prerequisites, each with one line on why.
4. **Version and setup**: the version taught, and how to install and run the project.
5. **The project**: what it does, a file tree with the lesson that fills each file, and how to use the 🧩 markers.
6. **The concept ladder**: an ordered list of every term the course teaches, one line each. Each term may only rely
   on terms ABOVE it. This list is the backbone of the course.
7. **Lessons**: a numbered table: `# | lesson | terms it introduces | files it fills | status (planned / written)`.
8. **Glossary**: every term → its one-line meaning → the lesson that defines it. Grows as lessons are written.

## How every lesson is taught (the core of this skill)

### Rule 1: the zero-to-up ladder

- Start from what the reader already knows. Each lesson climbs a few rungs, in order.
- **One new term at a time.** Define a word BEFORE you use it. A term from an earlier lesson gets a one-line
  reminder and a link to that lesson (`see [02-reducers](02-reducers.md)`), not a re-teaching.
- **Never drop names the reader doesn't know** ("it returns `.reducer`, `.util`, `.endpoints`…"). Either explain
  each one or leave it out.
- Before writing, list the lesson's new terms and check each one only needs terms already defined. If one doesn't,
  define the missing term first, or move it to an earlier lesson.

What a rung looks like (from [the ladder example](references/example-ladder-lesson.md)):

````markdown
## 7. Action creator: a function that writes the note for you

Typing `{ type: 'cityChanged', city: 'Hue' }` by hand everywhere is tiring, and one typo (`'cityChange'`) means the
reducer silently ignores the note. So we write a small function that **builds the action object**. That function is
called an **action creator**:

```js
const cityChanged = (city) => ({ type: 'cityChanged', city });

cityChanged('Hue');   // returns { type: 'cityChanged', city: 'Hue' }
```

What matters here:
- An action creator **only returns an object**. Calling `cityChanged('Hue')` changes nothing in the store.
- The change happens only when that object goes into `dispatch` (step 5):

```js
store.dispatch(cityChanged('Hue'));
// same as: store.dispatch({ type: 'cityChanged', city: 'Hue' })
```
````

Notice: the heading names the term and says what it is in plain words; the problem comes first ("tiring, one typo");
the term is defined in bold; a 1–3 line code block; the code's result is shown as a comment; "what matters" names the
one misunderstanding newcomers have; it links back to the rung it relies on ("step 5").

### Rule 2: every concept goes problem → idea → tiny build

For each concept, in this order:

1. **The problem.** What goes wrong, or gets painful, without it. A concrete situation, in the course project
   whenever possible.
2. **The idea.** One or two sentences, an everyday analogy, and a small ASCII picture when it helps.
3. **Build a tiny version from scratch**, in the project. Small steps: the naive way first → why it isn't enough
   → the real pattern.
4. **Run it by hand** with real values: a numbered list or a table of what happens, in order, and what each variable
   holds afterwards.
5. **The real thing.** Once the reader understands the hand-made version, show the real library/tool doing the
   same job, and point out which part of the tiny version each piece corresponds to.

What "naive first, then why it isn't enough" looks like:

````markdown
### Naive version: in the click handler

```js
async function onCityPicked(city) {
  store.dispatch(cityChanged(city));
  const forecast = await fakeApi.getForecast(city);   // wait for the server
  store.dispatch({ type: 'forecastReceived', forecast });
}
```

It works. But every button that needs a forecast (Refresh, page load…) must copy this code. The button also has to
know the exact steps and import the real server, so a test can't swap in a fake one.
````

What "run it by hand" looks like:

```markdown
| Time | What happens | State afterwards |
|---|---|---|
| 0 ms | `dispatch(loadForecast)` sees a function and calls it | |
| 0 ms | `dispatch({ type: 'forecastRequested' })` → the reducer runs | `status: 'loading'` |
| 0 ms | `await api.getForecast('Hanoi')` pauses the function; the click handler is finished | |
| 500 ms | the server answers, the function continues after `await` | |
| 500 ms | `dispatch({ type: 'forecastReceived', … })` | `status: 'done'` |
```

### Rule 3: build steps fill the skeleton, bit by bit

The reader never invents code. Every piece of code the lesson teaches is handed over as a **build step** that says
exactly which file and which 🧩 placeholder to replace, with the complete code that goes there:

````markdown
### Build step 03.2: the todos reducer

Open `src/todos/todosReducer.js`. Replace the placeholder `🧩 03.2` (the whole `todosReducer` function) with:

```js
export function todosReducer(state = initialState, action) {
  switch (action.type) {
    case 'todos/todoAdded':
      return [...state, action.payload];                                // a NEW array: old items + the new one
    case 'todos/todoToggled':
      return state.map((todo) =>
        todo.id === action.payload ? { ...todo, completed: !todo.completed } : todo);
    default:
      return state;                                                     // an action it doesn't know: no change
  }
}
```

What each part does:
- `state = initialState`: the first time, the store calls the reducer with `undefined`, so it starts from
  `initialState`.
- `case 'todos/todoAdded'`: …
````

- A step is small: one function, one file section, 3–30 lines. Long features are split into several steps.
- Show the **whole** replacement for the placeholder, never "…add the rest yourself". When a step changes code
  written in an earlier lesson, show the old lines and the new lines, and say why it changes.
- After the code, explain it: what each part does, why it is there (what breaks without it), and the values it
  holds when the demo runs.
- The **naive version** may be a build step too, replaced in the next step, so the reader feels the problem.

### Rule 4: every lesson ends by running the project, and the output is real

- The last build step writes the lesson's demo (`demos/NN-<slug>.mjs`), a short script that uses what the lesson
  built. **Instrument it** with log lines that name what is happening, indented by call depth, so the output itself
  shows the flow:

  ```js
  console.log(`    🔧 thunk middleware: it's a FUNCTION → calling it (it does NOT go to next)`);
  console.log(`      🧮 reducer runs for ${action.type}`);
  console.log(`       🖥  screen: ${s.city} — ${s.status}`);
  ```

- "Run it": the command (`npm run lesson 03`), then the **expected output**, labelled "Expected output (not
  run)". Work it out line by line from the code as it stands at that point of the course. Only call output "real"
  if you actually ran it (only when the user asked you to).
- Then **walk through the output**: quote a few lines, say which code printed them and why, and what the state is at
  that moment.
- If something can't be run here (needs a browser, a cloud account, hardware), say so explicitly:
  "Not run: needs X. Expected output: …".

### Rule 5: every library API gets an API card the first time it appears

````markdown
> **API card: `bindActionCreators` (package `redux`)**
>
> **What it is:** turns "a function that *creates* an action" into "a function that creates it *and dispatches it*".
>
> ```ts
> function bindActionCreators<M extends Record<string, (...args: any[]) => any>>(
>   actionCreators: M,      // { propName: actionCreator, … }
>   dispatch: Dispatch,     // the store's dispatch
> ): M;                     // same keys; each value now dispatches what the creator returns
> ```
>
> **What it does, step by step:** 1. loops over the keys, 2. wraps each creator, 3. returns the new object.
>
> ```ts
> // simplified
> function bindActionCreators(creators, dispatch) {
>   const bound = {};
>   for (const key in creators) bound[key] = (...args) => dispatch(creators[key](...args));
>   return bound;
> }
> ```
>
> **What our project passes / gets back:** `onCityChange` = `(city) => dispatch(changeCity(city))`.
> **If you left it out:** calling the prop would only BUILD the thunk and throw it away. Nothing would happen.
````

Get signatures from the real type definitions / docs (see "Before writing anything"), not from memory.

### Rule 6: show the full picture

When the topic is a flow (a request, an event, a dispatch, a build pipeline), show it end to end:

- a short numbered list of the steps in plain words first;
- then each step in detail, in the order things happen, with the values each variable holds;
- **how the pieces are wired** before they run (e.g. how the middleware chain is built);
- a **call-stack picture** at the deepest moment, and a **timeline** when something waits (async):

  ```text
  baseDispatch({ cityChanged })     ← 🧮 the reducer runs here (top = the function running now)
  loggerLayer({ cityChanged })
  thunkLayer({ cityChanged })       ← the nested dispatch started again at the TOP of the chain
  changeCity's thunk                ← line: dispatch(cityChanged(city))
  thunkLayer(changeCity's thunk)
  onCityChange('Hue')               ← the UI callback (bottom = the first call)
  ```

- never jump from one piece of code to another without saying, in plain words, how the first leads to the second.

## Lesson file format (`NN-<slug>.md`)

```markdown
# Lecture NN. <Title>

> **By the end you can:** 2–4 concrete outcomes ("explain why a reducer must not mutate", "write a slice reducer")
> **New terms in this lesson:** term A, term B, term C
> **You should already know:** term X ([01-…](01-….md)), term Y ([02-…](02-….md))
> **Project files you fill in:** `src/…` (🧩 NN.1–NN.4), `demos/NN-<slug>.mjs`

## 1. <first concept>
(problem → idea → build step(s) in the project → run by hand → the real thing)

## 2. <next concept>
…

## Run it
(command, real output, walk-through)

## The whole picture
(one diagram of how this lesson's pieces connect, and where they sit in the project)

## Summary
| Term | What it is, in one line |
|---|---|

**Next lecture:** [NN+1-…](…): one sentence on what it adds to the project.
```

No exercises and no quiz questions: the user doesn't want them.

## What to leave out

- **Every sentence must move the reader toward understanding.** Ask: "would a newcomer understand this, and does
  it help with THIS lesson?" If not, cut it.
- No trivia, no history lessons, no "fun facts", no lists of options the lesson doesn't use.
- Don't preview advanced material the reader can't understand yet. Put it on the ladder for later.
- No project features that don't teach a concept of the course.

## Cost discipline

- Mode 1: write one lesson per request, then stop.
- No installs, builds or runs (see "Don't build or run it yourself").
- Read docs only to confirm what you are about to teach; don't study around the topic.

## Hard rules

- Write only inside the destination folder given in this prompt. Never edit the user's other projects.
- Never call output "real" unless you ran it; predicted output is labelled "Expected output (not run)".
- Never use a term before it has been defined (in this lesson or an earlier one).
- Every line of code the reader needs is in a lesson's build step; the skeleton never hides taught code.
- English, plain and patient.
