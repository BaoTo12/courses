import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';

/**
 * S48 (48.02): where /api/… goes. The browser always calls /api/… on the Vite origin (same origin: no CORS, 47.11).
 *   default            → the real backend: Tomcat on :8080, context /taskflow (DevServer or docker compose)
 *   TASKFLOW_API=mock  → the Part 1 json-server mock on :3001 (13.02), e.g. to work on the UI without Java
 */
const tomcat: ProxyOptions = {
  // TASKFLOW_BACKEND overrides it, e.g. http://localhost:8081 when another server already uses 8080.
  target: process.env.TASKFLOW_BACKEND ?? 'http://localhost:8080',
  // /api/tasks → /taskflow/api/tasks: the web app lives under its context path (28.10).
  rewrite: (path) => `/taskflow${path}`,
  // Tomcat's JSESSIONID says Path=/taskflow, but the browser only ever sees /api/… on this origin: without this,
  // the session cookie would be stored and never sent back, and every call after login would be a 401 (48.05).
  cookiePathRewrite: { '/taskflow': '/' },
};
const apiProxy: Record<string, string | ProxyOptions> = {
  '/api': process.env.TASKFLOW_API === 'mock' ? 'http://localhost:3001' : tomcat,
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The shared design system lives outside the frontend folder (taskflow/styles).
      '@styles': fileURLToPath(new URL('../styles', import.meta.url)),
    },
  },
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
});
