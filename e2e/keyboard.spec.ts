import { expect, test, type Page } from '@playwright/test'
import { addBottle, createAccount, quickQuiz, signUp } from './helpers'

/** Tab through a page, and on every stop check that the person can SEE where focus is. */
async function everyStopHasVisibleFocus(page: Page, label: string, maxStops = 80) {
  const problems: string[] = []
  await page.keyboard.press('Tab') // a fresh page starts with focus at the top of the document
  const seen = new Set<string>()
  for (let i = 0; i < maxStops; i++) {
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      // The real checkboxes and radios are visually hidden; their label draws the focus ring.
      const target = el.matches('input') && el.closest('label') ? (el.closest('label') as HTMLElement) : el
      const cs = getComputedStyle(target)
      const rect = target.getBoundingClientRect()
      return {
        name: `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}"`,
        outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2,
        visible: rect.width > 0 && rect.height > 0,
      }
    })
    if (!info) break
    if (seen.has(info.name + i)) break
    seen.add(info.name + i)
    if (info.visible && !info.outline) problems.push(info.name)
    await page.keyboard.press('Tab')
  }
  expect(problems, `${label}: focus not visible on`).toEqual([])
}

test('skip link: the first Tab shows it, and Enter lands on the main content', async ({ page }) => {
  await signUp(page)
  await quickQuiz(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /^Hi / })).toBeVisible() // wait for the app, or Tab goes to the browser
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
})

test('moving to a new page puts focus on it, and starts at the top', async ({ page }) => {
  await signUp(page)
  await quickQuiz(page)
  await page.goto('/shelf/add')
  await addBottle(page, 'light red', 'Sample Red 1')
  await page.getByRole('link', { name: '← My shelf' }).click()
  await expect(page.locator('#main')).toBeFocused()
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})

test('rating works with the keyboard alone', async ({ page }) => {
  await signUp(page)
  await quickQuiz(page)
  await page.goto('/bottle/sample-red-1/rate')
  await page.getByRole('radio', { name: 'Loved it' }).focus()
  await page.keyboard.press('ArrowDown') // radios move with the arrow keys
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('radio', { name: 'Not for me' })).toBeChecked()
  await page.getByRole('checkbox', { name: 'Too heavy' }).focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('checkbox', { name: 'Too heavy' })).toBeChecked()
  await page.getByRole('button', { name: 'Save my rating' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Good to know. We’ll look for lighter wines.')).toBeVisible()
})

test('delete my data works with the keyboard, and focus moves to the question', async ({ page }) => {
  await signUp(page)
  await quickQuiz(page)
  await page.goto('/you')
  await page.getByRole('button', { name: 'Delete my data' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Delete everything?' })).toBeFocused()
  await page.getByRole('button', { name: 'Keep my data' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Delete my data' })).toBeVisible()
})

test('focus is visible on every stop, on the main screens', async ({ page }) => {
  await signUp(page)
  await quickQuiz(page)
  await page.goto('/shelf/add')
  await addBottle(page, 'light red', 'Sample Red 1')
  for (const route of ['/', '/quiz', '/profile', '/shelf', '/shelf/add', '/bottle/sample-red-1', '/bottle/sample-red-1/rate', '/eat/bbq', '/scan', '/you', '/ideas']) {
    await page.goto(route)
    await expect(page.getByRole('main')).toBeVisible()
    await everyStopHasVisibleFocus(page, route)
  }
})

test('the sign-in screens are fully keyboard-usable, with visible focus', async ({ page }) => {
  await page.goto('/sign-in')
  await everyStopHasVisibleFocus(page, 'create account')
  await createAccount(page, 'kb@example.com')
  await everyStopHasVisibleFocus(page, '21+ gate')
})
