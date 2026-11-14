import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// Read-only checks against the real project. Needs VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
)
const base = env.VITE_SUPABASE_URL!
const headers = { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY! }

test('signed-out visitors can read nothing from the Wine Discovery tables', async ({ request }) => {
  for (const table of ['wd_bottles', 'wd_shelf_items', 'wd_taste_profiles', 'wd_ratings', 'wd_events']) {
    const res = await request.get(`${base}/rest/v1/${table}?select=*&limit=5`, { headers })
    const body = await res.json()
    const leaked = res.ok() && Array.isArray(body) && body.length > 0
    expect(leaked, `${table} must not be readable without signing in`).toBe(false)
  }
})

test('signed-out visitors cannot write', async ({ request }) => {
  const res = await request.post(`${base}/rest/v1/wd_events`, {
    headers: { ...headers, 'content-type': 'application/json' },
    data: { user_id: '00000000-0000-0000-0000-000000000000', name: 'quiz_started' },
  })
  expect(res.ok()).toBe(false)
})

test('the app is in account mode: real sign-in, no demo banner', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await expect(page.getByText('Demo mode')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Forgot your password?' })).toBeVisible()
})
