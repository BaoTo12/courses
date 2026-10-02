// ───────────── 1. ACTION TYPES + ACTION CREATORS ─────────────
const CITY_CHANGED = 'weather/cityChanged';
const FORECAST_REQUESTED = 'weather/forecastRequested';
const FORECAST_RECEIVED = 'weather/forecastReceived';
const FORECAST_FAILED = 'weather/forecastFailed';

const cityChanged = (city) => ({ type: CITY_CHANGED, city });
const forecastRequested = (requestId) => ({ type: FORECAST_REQUESTED, requestId });
const forecastReceived = (requestId, forecast) => ({ type: FORECAST_RECEIVED, requestId, forecast });
const forecastFailed = (requestId, error) => ({ type: FORECAST_FAILED, requestId, error });

// ───────────── 2. REDUCER ─────────────
const initialState = { city: 'Hanoi', status: 'idle', forecast: null, error: null, requestId: null };

function reducer(state = initialState, action) {
  switch (action.type) {
    case CITY_CHANGED:
      return { ...state, city: action.city };
    case FORECAST_REQUESTED:
      return { ...state, status: 'loading', error: null, requestId: action.requestId };
    case FORECAST_RECEIVED:
      if (action.requestId !== state.requestId) return state; // an old answer: ignore
      return { ...state, status: 'done', forecast: action.forecast };
    case FORECAST_FAILED:
      if (action.requestId !== state.requestId) return state;
      return { ...state, status: 'failed', error: action.error };
    default:
      return state;
  }
}

// ───────────── 3. THE STORE, WITH A REAL MIDDLEWARE CHAIN ─────────────
function createStore(reducer, middlewares) {
  let state = reducer(undefined, { type: '@@init' });
  const listeners = [];

  // The end of the chain: the ONLY place where the reducer runs.
  const baseDispatch = (action) => {
    console.log(`      🧮 reducer runs for ${action.type}`);
    state = reducer(state, action);
    listeners.forEach((listener) => listener());
    return action;
  };

  // What every middleware receives. Its `dispatch` is the WHOLE chain (filled in below), not baseDispatch.
  const storeApi = {
    getState: () => state,
    dispatch: (action) => dispatch(action),
  };

  // Wrap from the last middleware to the first: dispatch = mw1(mw2(baseDispatch)).
  let dispatch = baseDispatch;
  for (const middleware of [...middlewares].reverse()) {
    dispatch = middleware(storeApi)(dispatch);
  }

  return {
    getState: storeApi.getState,
    dispatch: storeApi.dispatch,
    subscribe: (listener) => listeners.push(listener),
  };
}

// ───────────── 4. TWO MIDDLEWARES ─────────────
// The thunk middleware: a function? call it. An object? pass it on with next().
const createThunkMiddleware = (extra) => (storeApi) => (next) => (action) => {
  if (typeof action === 'function') {
    console.log(`    🔧 thunk middleware: it's a FUNCTION → calling it (it does NOT go to next)`);
    return action(storeApi.dispatch, storeApi.getState, extra);
  }
  console.log(`    🔧 thunk middleware: it's an OBJECT (${action.type}) → next()`);
  return next(action);
};

// A logger: only objects reach it (the thunk middleware stops functions before).
const logger = (storeApi) => (next) => (action) => {
  console.log(`     📝 logger: before ${action.type}`);
  const result = next(action);
  console.log(`     📝 logger: after  → state.status = ${storeApi.getState().status}, city = ${storeApi.getState().city}`);
  return result;
};

// ───────────── 5. A FAKE SERVER (the "extra" API) ─────────────
const fakeApi = {
  getForecast(city) {
    console.log(`  🌐 server: GET /forecast?city=${city} (answers in 500 ms)`);
    return new Promise((resolve) => setTimeout(() => resolve(`${city}: 31°C`), 500));
  },
};

// ───────────── 6. THUNK CREATORS ─────────────
let sequence = 0;

const loadForecast = () => async (dispatch, getState, { api }) => {
  console.log('  ▶ loadForecast thunk starts');
  const requestId = ++sequence;
  dispatch(forecastRequested(requestId));
  const { city } = getState();
  console.log(`  ▶ loadForecast reads getState().city = ${city}`);
  try {
    const forecast = await api.getForecast(city);
    console.log('  ▶ loadForecast continues after await');
    dispatch(forecastReceived(requestId, forecast));
  } catch (error) {
    dispatch(forecastFailed(requestId, error.message));
  }
};

const changeCity = (city) => (dispatch) => {
  console.log(`  ▶ changeCity thunk starts (remembers city = ${city})`);
  dispatch(cityChanged(city));
  return dispatch(loadForecast());
};

// ───────────── 7. BUILD THE STORE ─────────────
const store = createStore(reducer, [createThunkMiddleware({ api: fakeApi }), logger]);

// ───────────── 8. THE "UI": bound callbacks + a render on every state change ─────────────
const bindActionCreators = (creators, dispatch) =>
  Object.fromEntries(Object.entries(creators).map(([name, creator]) => [name, (...args) => dispatch(creator(...args))]));

const ui = bindActionCreators({ onCityChange: changeCity, onRefresh: loadForecast }, store.dispatch);

store.subscribe(() => {
  const s = store.getState();
  console.log(`       🖥  screen: ${s.city} — ${s.status === 'done' ? s.forecast : s.status}`);
});

// ───────────── 9. THE USER PICKS "Hue" ─────────────
console.log('👆 click: user picks Hue');
const promise = ui.onCityChange('Hue');
console.log('👆 click handler is finished. It got back:', promise);
await promise;
console.log('✅ final state:', store.getState());
