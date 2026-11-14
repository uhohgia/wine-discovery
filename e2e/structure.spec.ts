import { expect, test, type Page } from '@playwright/test'
import { addBottle, quickQuiz, rateBottle, signUp } from './helpers'

// Every screen should have a clear structure for people who navigate by headings and landmarks.
const ROUTES = [
  '/', '/quiz', '/profile', '/shelf', '/shelf/add', '/bottle/sample-red-1', '/bottle/sample-red-1/rate', '/eat/bbq', '/eat/gift',
  '/scan', '/you', '/ideas', '/ideas/non-alcoholic', '/ideas/gift-mode', '/ideas/budget', '/ideas/store-finder', '/ideas/host-card', '/ideas/more-from-producer',
]

async function structure(page: Page) {
  return page.evaluate(() => {
    const headings = [...document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1]))
    return {
      h1: headings.filter((l) => l === 1).length,
      // A heading level may go down one at a time, but never skip (h1 then h3).
      skipped: headings.some((l, i) => i > 0 && l > headings[i - 1]! + 1),
      mains: document.querySelectorAll('main').length,
      navs: document.querySelectorAll('nav[aria-label="Main"]').length,
      footer: document.body.innerText.includes('Tasting notes by a fellow beginner, not a sommelier.') && document.body.innerText.includes('Please enjoy responsibly.'),
      lang: document.documentElement.lang,
      title: document.title,
      firstHeadingIsH1: headings[0] === 1,
    }
  })
}

test('every screen has one h1, no skipped heading levels, one main, a menu, the footer and its own title', async ({ page }) => {
  await signUp(page)
  await quickQuiz(page)
  await page.goto('/shelf/add')
  await addBottle(page, 'light red', 'Sample Red 1')
  await page.goto('/bottle/sample-red-1')
  await rateBottle(page, 'Loved it')

  const titles = new Map<string, string>()
  for (const route of ROUTES) {
    await page.goto(route)
    await expect(page.getByRole('main')).toBeVisible()
    const s = await structure(page)
    expect(s.h1, `${route}: exactly one h1`).toBe(1)
    expect(s.firstHeadingIsH1, `${route}: the h1 comes first`).toBe(true)
    expect(s.skipped, `${route}: heading levels skip`).toBe(false)
    expect(s.mains, `${route}: one main`).toBe(1)
    expect(s.navs, `${route}: the main menu`).toBe(1)
    expect(s.footer, `${route}: footer text`).toBe(true)
    expect(s.lang, `${route}: page language`).toBe('en')
    expect(s.title, `${route}: has its own title`).toMatch(/ · Wine Discovery$/)
    titles.set(route, s.title)
  }
  // Pages that are different things have different titles, so a screen reader or a tab strip can tell them apart.
  expect(new Set(titles.values()).size).toBe(titles.size)
})

test('sign-in pages have a title, one h1 and the footer', async ({ page }) => {
  await page.goto('/sign-in')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  const s = await structure(page)
  expect(s.footer).toBe(true)
  expect(s.title).toMatch(/Create account · Wine Discovery/)
  expect(s.mains).toBe(1)
})
