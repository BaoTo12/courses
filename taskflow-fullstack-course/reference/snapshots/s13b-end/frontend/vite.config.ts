import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The shared design system lives outside the frontend folder (taskflow/styles).
      '@styles': fileURLToPath(new URL('../styles', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // The browser calls /api/… on the Vite origin (same origin: no CORS, cookies just work).
      // Vite forwards the request to the mock API (13.02). In Part 3: the Tomcat backend (48.02).
      '/api': 'http://localhost:3001',
    },
  },
  preview: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
