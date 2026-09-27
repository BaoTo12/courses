import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Provider } from 'react-redux';
import '@styles/main.scss';
import { App } from './App';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './toast/ToastProvider';
import { AuthProvider } from './auth/AuthProvider';
import { store } from './app/store';
import { initI18n } from './i18n/i18n';

// S25: start loading the language (detector) and the 'common' namespace (HTTP) before the first render.
void initI18n();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('#root element missing from index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    {/* The Redux store, above everything else: any component can reach it (17.03) */}
    <Provider store={store}>
      {/* BASE_URL comes from Vite's `base` option: '/' in dev, '/<context>/app/' when deployed in S49 (12.12) */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              {/* useTranslation suspends until a namespace is loaded (25.11): no flash of raw keys. */}
              <Suspense fallback={<p className="text-muted">…</p>}>
                <App />
              </Suspense>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
