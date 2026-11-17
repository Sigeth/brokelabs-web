import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import { PROJECT_TITLE } from './src/project';

// The api serves the built UI in production. In development, Vite serves it
// and forwards API calls to an api running on :8080 (make run in ../api).
const api = 'http://localhost:8080';

export default defineConfig({
  plugins: [
    react(),
    {
      // Fills %PROJECT_TITLE% in index.html from the single name constant.
      name: 'project-name',
      transformIndexHtml: {
        order: 'pre',
        handler: (html) => html.replaceAll('%PROJECT_TITLE%', PROJECT_TITLE),
      },
    },
  ],
  server: {
    proxy: {
      '/api': api,
      '/.well-known': api,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
