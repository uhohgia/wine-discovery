import { defineConfig, devices } from '@playwright/test'

// Optional: runs the app against the REAL Supabase project from .env.local.
//   npm run test:e2e:cloud                      read-only checks, creates nothing
//   LIVE_SIGNUP=1 npm run test:e2e:cloud        also creates a real test account (see e2e-cloud/signup.spec.ts)
export default defineConfig({
  testDir: './e2e-cloud',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5176', channel: 'chrome', ...devices['Pixel 7'] },
  webServer: {
    command: 'npm run dev -- --port 5176 --strictPort',
    url: 'http://localhost:5176',
    reuseExistingServer: true,
    timeout: 60_000,
    // Photo scanning is off unless asked for (LIVE_SCAN=1).
    env: { VITE_PHOTO_SCAN: process.env.LIVE_SCAN ? '1' : '' },
  },
})
