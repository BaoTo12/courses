// S49 (49.10): TaskFlow Web built INTO the WAR, served by Tomcat under /taskflow/app/ (SpaFallbackFilter).
//   npm run build:war   →   backend/src/main/webapp/app/{index.html, assets/, locales/, favicon.svg}
// One origin for the SPA and the API in production: no proxy, no CORS, the session cookie's Path=/taskflow fits (49.11).
import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config.ts';

export default mergeConfig(
  base,
  defineConfig({
    base: '/taskflow/app/',                    // BrowserRouter basename and i18next's loadPath follow it (main.tsx, i18n.ts)
    html: {
      // A placeholder on every <script>/<link> Vite writes into index.html, plus <meta property="csp-nonce">
      // (styled-components reads it). SpaFallbackFilter replaces it with the response's real nonce (49.06).
      cspNonce: '__CSP_NONCE__',
    },
    build: {
      outDir: '../backend/src/main/webapp/app',
      emptyOutDir: true,
    },
  }),
);
