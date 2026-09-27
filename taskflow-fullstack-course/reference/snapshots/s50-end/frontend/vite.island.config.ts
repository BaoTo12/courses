// S49 (49.07): the React ISLANDS build: JS entries (no index.html), written into the WAR's static files.
//   npm run build:island   →   backend/src/main/webapp/static/island/{assets/*-<hash>.js|css, locales/, .vite/manifest.json}
// The JSPs find the hashed file names through the manifest (IslandAssets.java).
import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config.ts';

export default mergeConfig(
  base,
  defineConfig({
    // Every URL the bundle builds (chunks, CSS, i18next's locales/…json) starts here: Tomcat serves it as a static file.
    base: '/taskflow/static/island/',
    build: {
      outDir: '../backend/src/main/webapp/static/island',
      emptyOutDir: true,
      manifest: true,
      rolldownOptions: {
        input: {
          boardIsland: 'src/island/boardIsland.tsx',
          commentsIsland: 'src/island/commentsIsland.tsx',
        },
      },
    },
  }),
);
