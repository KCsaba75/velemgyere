import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    // e2e/ a Playwright sajat test-runnerenek valo (sajat "test" globallal,
    // ami utkozik a vitest-evel) -- lasd playwright.config.ts, kulon futtatando
    // (npm run test:e2e), nem a vitest default glob-jaba.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
});
