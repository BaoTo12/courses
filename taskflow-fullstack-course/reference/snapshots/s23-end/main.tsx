import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Provider } from 'react-redux';
import '@styles/main.scss';
import { App } from './App';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './toast/ToastProvider';
import { AuthProvider } from './auth/AuthProvider';
import { store } from './app/store';

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
              <App />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
