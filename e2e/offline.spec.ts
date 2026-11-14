import { expect, test } from '@playwright/test'
import { signUp } from './helpers'

// Runs against the production build (project "offline"), because only it has the service worker.
test('installable app shell: it opens and works with no connection after the first visit', async ({ page, context }) => {
  await page.goto('/sign-in')
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  // The manifest is what makes it installable.
  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json())
  expect(manifest).toMatchObject({ name: 'Wine Discovery', short_name: 'Wine', display: 'standalone', start_url: '/' })
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))

  await signUp(page, 'offline@example.com')

  await context.setOffline(true)
  await expect(page.getByText('You’re offline')).toBeVisible()
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My shelf' }).click() // screens load on demand: they must be cached
  await expect(page.getByRole('heading', { name: 'Your shelf is empty' })).toBeVisible()
  await page.reload() // and a reload with no network still opens the app, still signed in
  await expect(page.getByRole('heading', { name: 'Your shelf is empty' })).toBeVisible()
  await expect(page.getByText('You’re offline')).toBeVisible()
  await context.setOffline(false)
  await expect(page.getByText('You’re offline')).toHaveCount(0)
})
