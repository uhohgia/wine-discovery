import { expect, test } from '@playwright/test'
import { createAccount, PASSWORD } from './helpers'

// Demo-mode accounts (device only). Real Supabase accounts are covered by e2e-cloud.

test('create an account, sign out, and sign back in', async ({ page }) => {
  await createAccount(page, 'new.user@example.com')
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()

  await page.getByLabel('Email').fill('new.user@example.com')
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  // Signing back in lands on the 21+ question again, because it hasn't been answered yet.
  await expect(page.getByRole('heading', { name: 'Before we start' })).toBeVisible()
})

test('helpful errors: short password, existing email, unknown email', async ({ page }) => {
  await createAccount(page, 'dupe@example.com')
  await page.getByRole('button', { name: 'Sign out' }).click()

  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Email').fill('fresh@example.com')
  await page.getByLabel('Password', { exact: true }).fill('short')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('at least 8 characters')

  await page.getByLabel('Email').fill('dupe@example.com')
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('already exists')

  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByLabel('Email').fill('nobody@example.com')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('don’t match')
})

test('the password can be shown and hidden', async ({ page }) => {
  await page.goto('/sign-in') // opens on "Create your account" for new visitors
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  const field = page.getByLabel('Password', { exact: true })
  await field.fill('secret-pass-1')
  await expect(field).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(field).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Hide password' }).click()
  await expect(field).toHaveAttribute('type', 'password')
})
