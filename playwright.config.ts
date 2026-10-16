import { defineConfig, devices } from '@playwright/test';

// Kanban 866cb61a (teszt-strategia, 3. kategoria: E2E). A webServer MINDIG a
// .env.e2e.local-ban megadott LOKALIS Supabase CLI stacket celozza (soha a
// production projektet) -- lasd .env.e2e.local kommentjet es az
// e2e/fixtures/seed-local.sql-t, amivel a fixture-adatok bekerulnek.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx vite --port=3000 --host=127.0.0.1 --mode e2e',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
