import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { signUp } from './helpers'

// These run against the REAL bottle catalog (your 10 bottles and their photos), in device-only demo mode, with a
// pretend label reader that "reads" the photo's file name. The real reader (Claude) is checked by e2e-cloud.
test.use({ viewport: { width: 390, height: 844 } })

const IDS = [
  'moet-imperial-brut',
  'decoy-brut-cuvee',
  'canvasback-cabernet',
  'goldeneye-pinot-noir',
  'story-syrah',
  'clos-du-val-cabernet-franc',
  'beachaven-founders-rose',
  'migration-chardonnay',
  'duckhorn-sauvignon-blanc',
  'dr-loosen-blue-slate-riesling',
]
const photoOf = (id: string) => `public/bottles/${id}.jpg`

async function audit(page: Page, label: string) {
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)))
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n   ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n   ')}`)
  expect(summary, `Accessibility violations on ${label}`).toEqual([])
}

async function fits(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `${label}: horizontal scroll`).toBeLessThanOrEqual(0)
}

const zoom = (page: Page) => page.evaluate(() => (document.documentElement.style.fontSize = '225%'))
// Photos further down a list load only when scrolled near (on purpose), so scroll each into view, then wait.
async function allPhotosLoaded(page: Page) {
  await page.evaluate(async () => {
    for (const img of document.images) {
      img.scrollIntoView({ block: 'center' })
      await new Promise((r) => setTimeout(r, 60))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0))
}

test('all 10 real bottles are in the catalog, each with a photo that loads', async ({ page }) => {
  await signUp(page)
  await page.goto('/shelf/add')
  await expect(page.getByText('10 bottles')).toBeVisible()
  await expect(page.locator('main img')).toHaveCount(10)
  await allPhotosLoaded(page)
  for (const id of IDS) expect((await page.request.get(`/bottles/${id}.jpg`)).ok(), id).toBe(true)
  await expect(page.getByText('Sample Red')).toHaveCount(0) // none of the made-up bottles
})

test('a wine card shows the bottle photo with a description for screen readers', async ({ page }) => {
  await signUp(page)
  await page.goto('/bottle/moet-imperial-brut')
  await expect(page.getByRole('heading', { level: 1, name: 'Impérial Brut' })).toBeVisible()
  const photo = page.getByRole('img', { name: /Moët & Chandon Impérial Brut bottle/ })
  await expect(photo).toBeVisible()
  await allPhotosLoaded(page)
  await expect(page.getByText('Sample bottle')).toHaveCount(0) // real bottles don't carry the placeholder banner
})

test('scan by photo: a real bottle opens its card; unknown, not-a-label and failures are explained', async ({ page }) => {
  await signUp(page)
  await page.goto('/scan')
  await expect(page.getByRole('button', { name: 'Take a photo' })).toBeVisible()
  await expect(page.getByText('Simulated scan')).toHaveCount(0)
  await expect(page.getByTestId('scan-camera')).toHaveAttribute('capture', 'environment')

  await page.getByTestId('scan-library').setInputFiles('public/bottles/story-syrah.jpg')
  await expect(page.getByRole('heading', { level: 1, name: 'Bailey Vineyard Syrah' })).toBeVisible()
  await expect(page.getByText(/We read the label in your photo/)).toBeVisible()

  await page.goto('/scan')
  await page.getByTestId('scan-camera').setInputFiles({ name: 'mystery.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') })
  await expect(page.getByText('We don’t have that one yet')).toBeVisible()
  await expect(page.getByLabel('Bottle name or description')).toHaveValue('Opus One Overture')

  await page.getByTestId('scan-library').setInputFiles({ name: 'not-a-label.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') })
  await expect(page.getByText('That doesn’t look like a wine label')).toBeVisible()

  await page.getByTestId('scan-library').setInputFiles({ name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') })
  await expect(page.getByRole('alert')).toContainText('We couldn’t read that right now')
})

test('every real bottle is found by scanning its own photo', async ({ page }) => {
  await signUp(page)
  for (const id of IDS) {
    await page.goto('/scan')
    await page.getByTestId('scan-library').setInputFiles(photoOf(id))
    await expect(page).toHaveURL(new RegExp(`/bottle/${id}$`))
  }
})

for (const zoomed of [false, true]) {
  test(`photos, the scan screen and its results fit at 390px${zoomed ? ' with 200% text' : ''}, with no accessibility problems`, async ({ page }) => {
    await signUp(page)
    const maybeZoom = async () => zoomed && (await zoom(page))

    await page.goto('/shelf/add')
    await expect(page.getByText('10 bottles')).toBeVisible()
    await allPhotosLoaded(page)
    await maybeZoom()
    await fits(page, 'add bottles with photos')
    await audit(page, 'add bottles with photos')

    for (const id of ['clos-du-val-cabernet-franc', 'beachaven-founders-rose', 'dr-loosen-blue-slate-riesling']) {
      await page.goto(`/bottle/${id}`)
      await allPhotosLoaded(page)
      await maybeZoom()
      await fits(page, `wine card ${id}`)
      await audit(page, `wine card ${id}`)
    }

    await page.goto('/scan')
    await expect(page.getByRole('button', { name: 'Take a photo' })).toBeVisible()
    await maybeZoom()
    await fits(page, 'scan (photo mode)')
    await audit(page, 'scan (photo mode)')

    for (const name of ['mystery.jpg', 'not-a-label.jpg', 'broken.jpg']) {
      await page.getByTestId('scan-library').setInputFiles({ name, mimeType: 'image/jpeg', buffer: Buffer.from('x') })
      await expect(page.getByRole('button', { name: 'Take a photo' })).toBeEnabled()
      await expect(page.locator('main [role="note"], main [role="alert"]').first()).toBeVisible()
      await maybeZoom()
      await fits(page, `scan result: ${name}`)
      await audit(page, `scan result: ${name}`)
    }
  })
}
