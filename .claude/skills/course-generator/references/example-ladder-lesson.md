# Worked example: a ladder lesson (gold standard)

This is a complete lesson written the way the course-generator skill must write every lesson. The topic (Redux
thunks) is only the illustration. What to copy is the **method**:

- one new word per section, defined in bold BEFORE it is used, with a heading that says what it is in plain words;
- the problem first, then the idea, then 3–15 lines of code, then "run it by hand" with real values;
- every section relies only on the sections above it, and says which one ("rule from step 3");
- the "what matters here" bullets name the one misunderstanding a newcomer is likely to have;
- it ends with a whole-picture diagram and a one-line-per-term summary table.

---

# 01. From zero to thunks: how a Redux app changes its data

> **New terms in this lesson:** state, action, reducer, store, dispatch, subscribe, action creator, middleware,
> thunk middleware, thunk, thunk creator, closure
> **You should already know:** JavaScript objects, functions, arrow functions, `async`/`await`
> **Examples:** [examples/01-zero-to-thunks/](examples/01-zero-to-thunks/), run with `node weather.mjs`

We'll build a small weather app. It only has to remember which city is chosen and show that city's forecast.

## 1. State: the app's data, in one object

The **state** is everything the app needs to remember right now, kept in one plain JavaScript object:

```js
const state = { city: 'Hanoi', forecast: null };
```

That's all it is: a normal object.

## 2. Action: a note that says "this happened"

When something happens (the user picks a city), we don't change the state directly. We first write a **note**
describing what happened. That note is called an **action**.

An action is a plain object with a `type` field, the name of the event, plus any details:

```js
const action = { type: 'cityChanged', city: 'Hue' };
```

It doesn't *do* anything. It just describes an event, like a sticky note saying "the city changed to Hue".

## 3. Reducer: the function that applies a note to the state

A **reducer** is a function that takes the current state and an action, and returns the **new** state:

```js
function reducer(state, action) {
  if (action.type === 'cityChanged') {
    return { ...state, city: action.city };   // a NEW object: a copy, with city replaced
  }
  return state;                               // a note it doesn't know: nothing changes
}
```

Run it by hand:

```js
const before = { city: 'Hanoi', forecast: null };
const after = reducer(before, { type: 'cityChanged', city: 'Hue' });
// after  = { city: 'Hue', forecast: null }
// before = { city: 'Hanoi', forecast: null }   ← untouched: the reducer made a copy
```

Two rules for reducers:
- They **never modify** the old state; they return a new object.
- They are **instant**: no waiting, no server calls. Same input always gives the same output.

## 4. Store: the box that holds the state

A **store** is a box that keeps the current state and the reducer together. You can look inside with `getState()`:

```js
function createStore(reducer, initialState) {
  let state = initialState;
  return {
    getState: () => state,
  };
}

const store = createStore(reducer, { city: 'Hanoi', forecast: null });
store.getState();   // { city: 'Hanoi', forecast: null }
```

So far, nothing can change the state. That's the next step.

## 5. Dispatch: sending a note into the store

**`dispatch`** is the store's "send" button. You hand it an action, and the store:
1. runs the reducer with the current state and that action;
2. keeps the result as the new state.

```js
function createStore(reducer, initialState) {
  let state = initialState;
  return {
    getState: () => state,
    dispatch(action) {
      state = reducer(state, action);   // 1. apply the note   2. keep the result
      return action;
    },
  };
}

const store = createStore(reducer, { city: 'Hanoi', forecast: null });
store.dispatch({ type: 'cityChanged', city: 'Hue' });
store.getState();   // { city: 'Hue', forecast: null }
```

This is the one rule of Redux: **the state changes only through `dispatch(action)`**. Nobody writes
`state.city = 'Hue'` directly.

## 6. Subscribe: the screen hears about every change

The screen has to redraw when the state changes. **`subscribe(fn)`** registers a function that the store calls
after every dispatch:

```js
function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = [];
  return {
    getState: () => state,
    subscribe: (fn) => listeners.push(fn),
    dispatch(action) {
      state = reducer(state, action);
      listeners.forEach((fn) => fn());   // tell everyone who's listening
      return action;
    },
  };
}

store.subscribe(() => console.log('screen shows:', store.getState().city));
store.dispatch({ type: 'cityChanged', city: 'Hue' });   // prints: screen shows: Hue
```

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

JavaScript runs the inner call first: `cityChanged('Hue')` builds the object, then `dispatch` receives it.

## 8. The problem: waiting for a server

Now we want the forecast. That needs the server, and the server takes time to answer. Here's a fake server that
answers after half a second:

```js
const fakeApi = {
  getForecast: (city) => new Promise((resolve) => setTimeout(() => resolve(`${city}: 31°C`), 500)),
};
```

Where can the "ask the server, wait, then save the answer" code go?

- **Not in the reducer.** It must be instant (rule from step 3).
- **Not inside an action.** An action is just a note, an object; it can't run code.

So the only place left is the click handler:

```js
async function onCityPicked(city) {
  store.dispatch(cityChanged(city));
  const forecast = await fakeApi.getForecast(city);   // wait for the server
  store.dispatch({ type: 'forecastReceived', forecast });
}
```

It works. But every button that needs a forecast (Refresh, page load…) must copy this code. The button also has to
know the exact steps and import the real server, so a test can't swap in a fake one.

We'd like to put this "recipe" in one reusable place and send it *through dispatch*. But `dispatch` only accepts
actions (objects). To make that possible, we need one more piece.

## 9. Middleware: a checkpoint inside dispatch

A **middleware** is a checkpoint that every dispatched thing passes through **before** it reaches the reducer. It
can look at it, log it, or decide what to do with it.

The simplest example is a logger. We wrap the store's original `dispatch` in a new function:

```js
const originalDispatch = store.dispatch;

store.dispatch = (action) => {
  console.log('checkpoint saw:', action.type);   // runs BEFORE the reducer
  return originalDispatch(action);               // then lets it continue to the reducer
};

store.dispatch(cityChanged('Hue'));
// prints: checkpoint saw: cityChanged
// then the reducer runs as usual
```

That's the whole idea: **code that runs between `dispatch(...)` and the reducer.**

## 10. Thunk middleware: a checkpoint that runs functions

Now the key trick. A checkpoint that says:

> "If what I received is a **function**, don't send it to the reducer. **Call it**, and give it `dispatch` and
> `getState` so it can do its work."

```js
const originalDispatch = store.dispatch;

store.dispatch = (actionOrFunction) => {
  if (typeof actionOrFunction === 'function') {
    return actionOrFunction(store.dispatch, store.getState);   // run the function
  }
  return originalDispatch(actionOrFunction);                   // a normal action: reducer as usual
};
```

This checkpoint is the **thunk middleware**. Its whole job is the `if`.

## 11. Thunk: the function you dispatch

A **thunk** is the function you hand to `dispatch`. It receives `dispatch` and `getState`, so it can wait for the
server and send real actions whenever it's ready:

```js
const loadForecast = async (dispatch, getState) => {
  const city = getState().city;                          // read the state right now
  const forecast = await fakeApi.getForecast(city);      // wait 500 ms
  dispatch({ type: 'forecastReceived', forecast });      // send a normal action
};

store.dispatch(loadForecast);   // pass the function itself: no () after loadForecast
```

Run it by hand, with `city` currently `'Hue'`:

1. `dispatch(loadForecast)`: the checkpoint sees a function and calls `loadForecast(dispatch, getState)`.
2. `getState().city` gives `'Hue'`.
3. `await` waits 500 ms; meanwhile the rest of the app keeps running.
4. The server answers `'Hue: 31°C'`.
5. `dispatch({ type: 'forecastReceived', forecast: 'Hue: 31°C' })`: an object this time, so it goes through to the
   reducer, and the state now has the forecast.

The click handler shrinks to one line, `store.dispatch(loadForecast)`. The recipe lives in one place.

## 12. Thunk creator: when the thunk needs an argument

The thunk middleware always calls a thunk with `(dispatch, getState)`; there's no slot for your own arguments, like
a city. The fix is the same pattern as an action creator: a function that **builds** the thunk.

```js
// action creator: returns an OBJECT
const cityChanged = (city) => ({ type: 'cityChanged', city });

// thunk creator: returns a FUNCTION (the thunk)
const changeCity = (city) => async (dispatch, getState) => {
  dispatch(cityChanged(city));              // 1. save the city (object → reducer)
  const forecast = await fakeApi.getForecast(city);
  dispatch({ type: 'forecastReceived', forecast });
};

store.dispatch(changeCity('Hue'));
```

- `changeCity('Hue')` doesn't run the recipe. It returns the inner function, which **remembers** `city = 'Hue'`.
  A function remembering a variable from the function that created it is called a **closure**.
- `dispatch(...)` receives that inner function, so the checkpoint calls it, and the recipe runs.

## The whole picture

```text
            YOU WRITE                         WHAT dispatch DOES WITH IT
──────────────────────────────────────────────────────────────────────────────
action creator  cityChanged('Hue')
   └─ returns an OBJECT ──► dispatch ──► thunk middleware: "object" ──► reducer ──► new state ──► screen redraws

thunk creator   changeCity('Hue')
   └─ returns a FUNCTION ─► dispatch ──► thunk middleware: "function" ──► CALLS it
                                              │
                                              ├─ dispatch(cityChanged('Hue'))     → reducer → screen
                                              ├─ await server (500 ms)
                                              └─ dispatch({forecastReceived…})    → reducer → screen
```

## Summary

| Term | What it is, in one line |
|---|---|
| **state** | the app's data, one object |
| **action** | a plain object (a note) describing what happened, with a `type` |
| **reducer** | `(state, action) => newState`, instant and never modifies the old state |
| **store** | the box holding the state, with `getState`, `dispatch`, `subscribe` |
| **dispatch** | sends something into the store: the only way the state changes |
| **subscribe** | "call me after every change" (the screen uses it) |
| **action creator** | a function that **returns an action object** |
| **middleware** | a checkpoint between `dispatch` and the reducer |
| **thunk middleware** | the checkpoint that **calls functions** instead of sending them to the reducer |
| **thunk** | the function you dispatch; it gets `dispatch` and `getState`, and can wait |
| **thunk creator** | a function that **returns a thunk** (so the thunk can take arguments) |
| **closure** | a function remembering a variable from the function that created it |

**Next lesson:** [02-the-full-picture](02-the-full-picture.md): the same app as one complete program, with a real
middleware chain, run for real, and its output walked through line by line.
