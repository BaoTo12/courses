import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@styles/main.scss';
import { App } from './App';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './toast/ToastProvider';
import { AuthProvider } from './auth/AuthProvider';
import { TasksProvider } from './tasks/TasksProvider';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('#root element missing from index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    {/* BASE_URL comes from Vite's `base` option: '/' in dev, '/<context>/app/' when deployed in S49 (12.12) */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <TasksProvider>
              <App />
            </TasksProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
