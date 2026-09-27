// S49: what every React ISLAND (a React component mounted inside a server-rendered JSP page) shares.
import { StrictMode, Suspense, useMemo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { Router, type Navigator } from 'react-router';
import { makeStore, type AppStore } from '../app/store';
import { initI18n } from '../i18n/i18n';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ToastProvider } from '../toast/ToastProvider';
import { AuthProvider } from '../auth/AuthProvider';

/**
 * Reads the initial data the SERVER put in <script type="application/json" id="…">: textContent + JSON.parse,
 * never eval, never an inline script (49.03–49.05). The server escaped <, > and & for the HTML parser; JSON.parse
 * turns < back into "<".
 */
export function readInitialData<T>(elementId: string): T {
  const element = document.getElementById(elementId);
  if (element === null || element.textContent === null) throw new Error(`#${elementId} (initial data) is missing`);
  return JSON.parse(element.textContent) as T;
}

/**
 * The island isn't the SPA: its page (/taskflow/react-board) isn't a route of the SPA. Components inside it still use
 * <Link to="/tasks/5"> (TaskCard). This router makes every link a normal link INTO the SPA (/taskflow/app/tasks/5):
 * a full page load, no client-side routing between two different apps.
 */
function IslandRouter({ appBase, children }: { appBase: string; children: ReactNode }) {
  const navigator = useMemo<Navigator>(() => {
    const href = (to: Parameters<Navigator['createHref']>[0]) =>
      appBase.replace(/\/$/, '') + (typeof to === 'string' ? to : `${to.pathname ?? ''}${to.search ?? ''}${to.hash ?? ''}`);
    return {
      createHref: href,
      push: (to) => window.location.assign(href(to)),
      replace: (to) => window.location.replace(href(to)),
      go: (delta) => window.history.go(delta),
    };
  }, [appBase]);
  return (
    <Router navigator={navigator} location={{ pathname: '/', search: '', hash: '', state: null, key: 'island' }}>
      {children}
    </Router>
  );
}

/**
 * Mounts `app` into #rootId with the SAME providers as the SPA (main.tsx): one Redux store (makeStore, 49.08), the same
 * Axios instance (built with VITE_API_BASE_URL=/taskflow/api: the same session cookie, the same CSRF header),
 * i18next reading the same tf_lang cookie, the theme from the same tf_theme cookie.
 * `seed` fills the store BEFORE the first render (the server's initial data: no loading state, no extra requests).
 */
export function mountIsland(rootId: string, app: ReactNode, seed?: (store: AppStore) => void): void {
  const root = document.getElementById(rootId);
  if (root === null) throw new Error(`#${rootId} is missing`);
  const store = makeStore();
  seed?.(store);
  void initI18n();
  const appBase = root.dataset.appBase ?? `${import.meta.env.BASE_URL.replace(/static\/island\/$/, '')}app/`;
  createRoot(root).render(
    <StrictMode>
      <Provider store={store}>
        <IslandRouter appBase={appBase}>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>
                <Suspense fallback={<p className="text-muted">…</p>}>{app}</Suspense>
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </IslandRouter>
      </Provider>
    </StrictMode>,
  );
}
