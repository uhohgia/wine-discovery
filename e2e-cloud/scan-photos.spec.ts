import { expect, test } from '@playwright/test'

// Reads your REAL photos with the REAL label reader (Claude, through the scan-label Edge Function) and checks that
// each bottle opens its own wine card. It creates a throwaway account and spends a few cents on the Claude API, so
// it only runs when asked:
//   LIVE_SCAN=1 npm run test:e2e:cloud -- scan-photos   (LIVE_SCAN=1 also turns photo scanning on for that run)
// Needs: the scan-label function deployed, ANTHROPIC_API_KEY set as its secret, and the real bottles in wd_bottles.
// Delete the account afterwards (see DECISIONS.md -> clean-up).
test.skip(!process.env.LIVE_SCAN, 'set LIVE_SCAN=1 to read real photos with Claude')
test.setTimeout(10 * 60_000)

const BOTTLES: [string, string][] = [
  ['1-moet', 'Impérial Brut'],
  ['2-decoyBrut', 'Brut Cuvée'],
  ['3-canvas', 'Red Mountain Cabernet Sauvignon'],
  ['4-goldenEye', 'Anderson Valley Pinot Noir'],
  ['5-story', 'Bailey Vineyard Syrah'],
  ['6-cloduval', 'Estate Grown Cabernet Franc'],
  ['7-beachaven', 'Founders Rosé'],
  ['8-migration', 'Keefer Ranch Chardonnay'],
  ['9-duckhorn', 'North Coast Sauvignon Blanc'],
  ['10-drloosen', 'Blue Slate Riesling Kabinett'],
]

test('every bottle is recognized from its front and from its back', async ({ page }) => {
  const email = `wd.signup.${Date.now()}@example.com`
  console.log(`TEST ACCOUNT: ${email}`)
  await page.goto('/')
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(`Tmp-${crypto.randomUUID()}`)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await page.getByRole('button', { name: /yes, i’m 21 or older/i }).click()
  await page.goto('/scan')
  await expect(page.getByRole('button', { name: 'Take a photo' })).toBeVisible()

  const results: string[] = []
  const misses: string[] = []
  for (const [stem, name] of BOTTLES) {
    for (const side of ['front', 'back']) {
      await page.goto('/scan')
      await page.getByTestId('scan-library').setInputFiles(`bottle-photos/${stem}-${side}.jpeg`)
      const card = page.getByRole('heading', { level: 1, name })
      const miss = page.getByText(/We don’t have that one yet|We’re not sure which one it is|doesn’t look like a wine label|couldn’t read/)
      await expect(card.or(miss).first()).toBeVisible({ timeout: 60_000 })
      const ok = await card.isVisible()
      results.push(`${ok ? 'OK  ' : 'MISS'} ${stem} ${side}`)
      if (!ok) misses.push(`${stem} ${side}`)
    }
  }
  console.log('\n' + results.join('\n'))
  expect(misses, 'photos that did not open the right bottle').toEqual([])
})

test('a photo that is not a wine label is explained', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Email').fill(`wd.signup.${Date.now()}@example.com`)
  await page.getByLabel('Password', { exact: true }).fill(`Tmp-${crypto.randomUUID()}`)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await page.getByRole('button', { name: /yes, i’m 21 or older/i }).click()
  await page.goto('/scan')
  await page.getByTestId('scan-library').setInputFiles('public/icons/icon-512.png') // the app icon: a glass, not a label
  await expect(page.getByText(/doesn’t look like a wine label|We don’t have that one yet/)).toBeVisible({ timeout: 60_000 })
})
