import { defineConfig, devices } from '@playwright/test'

// Uses the Chrome already installed on the machine (no browser download). In CI, install
// Chromium with `npx playwright install chromium` and remove `channel`.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
    channel: 'chrome',
    ...devices['Pixel 7'],
    // devices['Pixel 7'] already sets a mobile viewport, touch, and user agent.
  },
  projects: [
    { name: 'app', testIgnore: [/offline\.spec/, /real-catalog\.spec/] },
    { name: 'real', testMatch: /real-catalog\.spec/, use: { baseURL: 'http://localhost:5175' } },
    // The offline test needs the real production build (it has the service worker), not the dev server.
    { name: 'offline', testMatch: /offline\.spec/, use: { baseURL: 'http://localhost:4174' } },
  ],
  webServer: [
    {
      command: 'npm run dev -- --port 5174 --strictPort',
      url: 'http://localhost:5174',
      reuseExistingServer: true,
      timeout: 60_000,
      // Tests always run in device-only demo mode, even when .env.local points at Supabase.
      env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '', VITE_CATALOG: 'sample' },
    },
    {
      // Same app, but with the real bottle catalog: for the specs that check the real photos and names.
      command: 'npm run dev -- --port 5175 --strictPort',
      url: 'http://localhost:5175',
      reuseExistingServer: true,
      timeout: 60_000,
      env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '', VITE_CATALOG: 'real', VITE_FAKE_SCAN: '1' },
    },
    {
      command: 'npm run build && npm run preview -- --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: true,
      timeout: 120_000,
      env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
    },
  ],
})
