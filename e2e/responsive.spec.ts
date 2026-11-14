import { expect, test, type Page } from '@playwright/test'
import { addBottle, createAccount, quickQuiz, signUp } from './helpers'

// Mobile width (the Pixel 7 profile is about 412px; we force 390px) at the default text size and at
// 200% text. Nothing may scroll sideways, and every tap target must be at least 44px.
test.use({ viewport: { width: 390, height: 844 } })

async function check(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `${label}: horizontal scroll`).toBeLessThanOrEqual(0)

  const small = await page.evaluate(() => {
    const out: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('button, a[href], input:not(.sr-only), label:has(input), select, summary')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (el.classList.contains('sr-only') || getComputedStyle(el).position === 'absolute' && r.width <= 1) continue
      if (r.height < 43.5 && el.closest('a[href^="#"]') === null && !el.closest('.sr-only')) out.push(`${el.tagName} "${(el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
    }
    return out
  })
  expect(small, `${label}: tap targets under 44px`).toEqual([])
}

async function twoHundredPercent(page: Page) {
  // The app's base is 112.5% (18px). Doubling it is what a reader gets by choosing 200% text.
  await page.evaluate(() => (document.documentElement.style.fontSize = '225%'))
}

for (const zoomed of [false, true]) {
  test(`screens fit at 390px${zoomed ? ' with 200% text' : ''}`, async ({ page }) => {
    await page.goto('/sign-in')
    if (zoomed) await twoHundredPercent(page)
    await check(page, 'create account')

    await page.goto('/')
    await createAccount(page)
    if (zoomed) await twoHundredPercent(page)
    await check(page, '21+ gate')
    await page.getByRole('button', { name: /yes, i’m 21 or older/i }).click()
    if (zoomed) await twoHundredPercent(page)

    for (let i = 1; i <= 6; i++) {
      await expect(page.getByText(`Question ${i} of 6`)).toBeVisible()
      await check(page, `quiz question ${i}`)
      await page.locator('label:has(input)').first().click()
      if (i < 6) await page.getByRole('button', { name: 'Next' }).click()
    }
    await page.getByRole('button', { name: 'See my taste profile' }).click()
    await expect(page.getByText(/^You /).first()).toBeVisible()
    if (zoomed) await twoHundredPercent(page)
    await check(page, 'taste profile')
  })
}

test('a fresh account lands somewhere sensible at 390px', async ({ page }) => {
  await signUp(page)
  await check(page, 'quiz question 1')
})

for (const zoomed of [false, true]) {
  test(`shelf, add bottles and wine card fit at 390px${zoomed ? ' with 200% text' : ''}`, async ({ page }) => {
    await signUp(page)
    await quickQuiz(page)
    const zoom = async () => zoomed && (await twoHundredPercent(page))

    await page.goto('/shelf')
    await zoom()
    await check(page, 'empty shelf')

    await page.getByRole('link', { name: 'Add bottles' }).click()
    await zoom()
    await check(page, 'add bottles')
    await addBottle(page, 'red', 'Sample Red 3', 'gift')
    await check(page, 'add bottles with a message')

    await page.getByRole('link', { name: '← My shelf' }).click()
    await expect(page.getByText('1 bottle at home')).toBeVisible()
    await zoom()
    await check(page, 'shelf with a bottle')

    await page.getByRole('link', { name: 'Sample Red 3', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Sample Red 3' })).toBeVisible()
    await zoom()
    await check(page, 'wine card')
    await page.getByRole('list', { name: 'Wine words' }).getByRole('button').first().click()
    for (const d of await page.locator('details > summary').all()) await d.click()
    await check(page, 'wine card with explanations open')

    await page.goto('/bottle/sample-white-2') // before reload the app is in memory; goto reloads and keeps the demo data
    await zoom()
    await check(page, 'another wine card')
  })
}

for (const zoomed of [false, true]) {
  test(`home tiles and ranked results fit at 390px${zoomed ? ' with 200% text' : ''}`, async ({ page }) => {
    await signUp(page)
    await quickQuiz(page)
    await page.goto('/shelf/add')
    await addBottle(page, 'steak', 'Sample Red 3')
    await addBottle(page, 'spicy takeout', 'Sample White 2')
    await addBottle(page, 'light red', 'Sample Red 1')
    const zoom = async () => zoomed && (await twoHundredPercent(page))

    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'What are you eating?' })).toBeVisible()
    await zoom()
    await check(page, 'home')

    await page.goto('/eat/spicy-takeout')
    await expect(page.getByText('Best pick')).toBeVisible()
    await zoom()
    await check(page, 'ranked results')

    await page.goto('/eat/bbq')
    await zoom()
    await check(page, 'ranked results for another meal')
  })
}

for (const zoomed of [false, true]) {
  test(`rating screens fit at 390px${zoomed ? ' with 200% text' : ''}`, async ({ page }) => {
    await signUp(page)
    await quickQuiz(page)
    const zoom = async () => zoomed && (await twoHundredPercent(page))

    await page.goto('/bottle/sample-red-3')
    await zoom()
    await check(page, 'wine card with a rate button')

    await page.getByRole('link', { name: 'Rate this bottle' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'How was Sample Red 3?' })).toBeVisible()
    await zoom()
    await check(page, 'rate: pick one')

    await page.getByText('Not for me', { exact: true }).click()
    await expect(page.getByText('What didn’t you like?')).toBeVisible()
    await zoom()
    await check(page, 'rate: reasons showing')
    await page.getByText('Mouth-drying or bitter', { exact: true }).click()
    await page.getByRole('button', { name: 'Save my rating' }).click()
    await expect(page.getByRole('heading', { name: /^Thanks for rating/ })).toBeVisible()
    await zoom()
    await check(page, 'rate: thank you')
  })
}

for (const zoomed of [false, true]) {
  test(`scan and concept previews fit at 390px${zoomed ? ' with 200% text' : ''}`, async ({ page }) => {
    await signUp(page)
    const zoom = async () => zoomed && (await twoHundredPercent(page))

    await page.goto('/scan')
    await expect(page.getByRole('heading', { level: 1, name: 'Scan a bottle' })).toBeVisible()
    await zoom()
    await check(page, 'scan')
    await page.getByLabel('Bottle name or description').fill('red')
    await page.getByRole('button', { name: 'Find it' }).click()
    await expect(page.getByText(/\d bottles?/).first()).toBeVisible()
    await zoom()
    await check(page, 'scan with results')

    await page.goto('/ideas')
    await zoom()
    await check(page, 'ideas list')
    for (const id of ['non-alcoholic', 'gift-mode', 'budget', 'store-finder', 'host-card', 'more-from-producer']) {
      await page.goto(`/ideas/${id}`)
      await expect(page.getByText('Concept preview', { exact: true })).toBeVisible()
      await zoom()
      await check(page, `concept: ${id}`)
    }
  })
}

for (const zoomed of [false, true]) {
  test(`You screen and its delete confirmation fit at 390px${zoomed ? ' with 200% text' : ''}`, async ({ page }) => {
    await signUp(page)
    const zoom = async () => zoomed && (await twoHundredPercent(page))

    await page.goto('/you')
    await expect(page.getByRole('heading', { level: 1, name: 'You' })).toBeVisible()
    await zoom()
    await check(page, 'you')
    await page.getByRole('button', { name: 'Delete my data' }).click()
    await expect(page.getByRole('heading', { name: 'Delete everything?' })).toBeVisible()
    await zoom()
    await check(page, 'you: delete confirmation')
    await page.goto('/nowhere-at-all')
    await zoom()
    await check(page, 'page not found')
  })
}
