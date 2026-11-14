import { expect, test } from '@playwright/test'

// Creates a REAL account in the connected Supabase project, so it only runs when asked:
//   LIVE_SIGNUP=1 [LIVE_SCAN=1] [LIVE_EMAIL=you+test@example.com] npm run test:e2e:cloud -- signup
// LIVE_SCAN=1 also scans a real photo (spends a little on the Claude API; needs the scan-label function deployed).
// It leaves the account behind so you can look at it (Supabase dashboard: Authentication -> Users,
// and Table Editor -> wd_taste_profiles / wd_events). Delete it afterwards.
test.skip(!process.env.LIVE_SIGNUP, 'set LIVE_SIGNUP=1 to create a real test account')

const email = process.env.LIVE_EMAIL ?? `wd.signup.${Date.now()}@example.com`
const password = process.env.LIVE_PASSWORD ?? `Tmp-${crypto.randomUUID()}`

test('create a real account, confirm 21+, take part of the quiz, fill the shelf, pick a meal, rate a bottle, scan, and come back', async ({ page }) => {
  console.log(`TEST ACCOUNT: ${email}`)

  await page.goto('/')
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()

  const gate = page.getByRole('heading', { name: 'Before we start' })
  const confirm = page.getByRole('heading', { name: 'Check your email' })
  const problem = page.getByRole('alert')
  await expect(gate.or(confirm).or(problem)).toBeVisible({ timeout: 20_000 })
  if (await problem.isVisible()) throw new Error('Sign-up showed an error: ' + (await problem.innerText()))
  if (await confirm.isVisible()) {
    console.log('RESULT: account created, but Supabase wants the email confirmed first')
    return
  }
  console.log('RESULT: account created and signed in immediately')

  await page.getByRole('button', { name: /yes, i’m 21 or older/i }).click()
  await expect(page.getByRole('heading', { name: 'What do you usually reach for?' })).toBeVisible()

  await page.getByText('Red wine', { exact: true }).click()
  await page.getByText('Bubbly', { exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByText('Skim', { exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Show me wines now' }).click()
  await expect(page.getByText('You mostly reach for red and bubbly. You like lighter wines.')).toBeVisible({ timeout: 20_000 })

  // The data came from the database, not this tab's memory: reload, sign out, sign back in.
  await page.reload()
  await expect(page.getByText('You mostly reach for red and bubbly. You like lighter wines.')).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: /^Hi wd\.signup/ })).toBeVisible({ timeout: 20_000 }) // no 21+ question again
  await page.getByRole('link', { name: 'See my taste profile' }).click()
  await expect(page.getByText('You mostly reach for red and bubbly. You like lighter wines.')).toBeVisible()
  console.log('RESULT: 21+ remembered, quiz saved, profile survived sign-out and sign-in')

  // The catalog and the shelf come from the database too.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My shelf' }).click()
  await expect(page.getByRole('heading', { name: 'Your shelf is empty' })).toBeVisible()
  await page.getByRole('link', { name: 'Add bottles' }).click()
  await expect(page.getByText('10 bottles')).toBeVisible() // the 10 placeholders, read from wd_bottles
  const add = async (search: string, name: string, how: RegExp) => {
    await page.getByLabel('Search the catalog').fill(search)
    const row = page.getByRole('listitem').filter({ has: page.getByRole('link', { name, exact: true }) })
    await row.getByRole('button', { name: how }).click()
    await expect(page.getByText(`Added ${name} to your shelf.`)).toBeVisible({ timeout: 20_000 })
  }
  await add('pinot', 'Anderson Valley Pinot Noir', /I bought it/)
  await add('brut', 'Impérial Brut', /It was a gift/)
  await page.getByRole('link', { name: '← My shelf' }).click()
  await expect(page.getByText('2 bottles at home')).toBeVisible()
  await page.getByRole('link', { name: 'Anderson Valley Pinot Noir', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Anderson Valley Pinot Noir' })).toBeVisible()
  await expect(page.getByText(/A good bet|Worth a try|A stretch/).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'On your shelf' })).toBeVisible()

  // Pick a meal: ranked bottles from the shelf, with labels and reasons.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Home' }).click()
  await page.getByRole('list', { name: 'Meals' }).getByRole('link', { name: /Spicy takeout/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: /Best bets for spicy takeout/ })).toBeVisible()
  await expect(page.getByText('Best pick')).toBeVisible()
  const ranked = page.getByRole('list').getByRole('listitem')
  await expect(ranked).toHaveCount(2)
  await expect(ranked.first().locator('p').last()).toContainText(/\.$/)
  console.log('RESULT: meal picked, 2 shelf bottles ranked with a reason each')

  // Rate a bottle "not for me: too sharp": a warm confirmation, and the profile learns from it.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My shelf' }).click()
  await page.getByRole('link', { name: 'Anderson Valley Pinot Noir', exact: true }).click()
  await page.getByRole('link', { name: 'Rate this bottle' }).click()
  await page.getByText('Not for me', { exact: true }).click()
  await page.getByText('Too sharp or sour', { exact: true }).click()
  await page.getByRole('button', { name: 'Save my rating' }).click()
  await expect(page.getByText('Good to know. We’ll steer away from sharp wines.')).toBeVisible({ timeout: 20_000 })
  await page.getByRole('link', { name: 'See my taste profile' }).click()
  await expect(page.getByText('Based on 1 rating, so more bottles will sharpen this.')).toBeVisible()
  console.log('RESULT: bottle rated "not for me: too sharp", profile updated and counts 1 rating')

  // Scan (simulated), the typed fallback, and a concept preview.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Scan' }).click()
  if (process.env.LIVE_SCAN) {
    // Photo scanning is switched on only with LIVE_SCAN=1 (and needs the scan-label function with its Anthropic key).
    await page.getByTestId('scan-library').setInputFiles('bottle-photos/4-goldenEye-front.jpeg')
    await expect(page.getByText('Found by scan')).toBeVisible({ timeout: 60_000 })
    await expect(page.getByRole('heading', { level: 1, name: 'Anderson Valley Pinot Noir' })).toBeVisible()
  } else {
    // Scan is simulated for now: one button picks a bottle and opens its wine card.
    await expect(page.getByText('Simulated scan')).toBeVisible()
    await page.getByRole('button', { name: 'Scan a bottle' }).click()
    await expect(page.getByText('Found by scan')).toBeVisible({ timeout: 20_000 })
  }
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Scan' }).click()
  await page.getByLabel('Bottle name or description').fill('crisp white')
  await page.getByRole('button', { name: 'Find it' }).click()
  await expect(page.getByText(/\d bottles?/).first()).toBeVisible()
  await page.goto('/ideas/budget')
  await expect(page.getByText('Concept preview', { exact: true })).toBeVisible()
  await page.waitForTimeout(500) // let the fire-and-forget event reach the database before moving on
  console.log('RESULT: scanned, searched by description, opened a concept preview')

  // Sign out and back in: the shelf is still there, because it lives in the database.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My shelf' }).click()
  await expect(page.getByText('2 bottles at home')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Anderson Valley Pinot Noir', exact: true }) })).toContainText('Not for me')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My taste' }).click()
  await expect(page.getByText('Based on 1 rating, so more bottles will sharpen this.')).toBeVisible() // saved in the database
  console.log('RESULT: catalog loaded, 2 bottles added, wine card opened, shelf survived sign-out and sign-in')

  // Delete my data: everything goes, the sign-in stays, and the person starts over at the 21+ question.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'You' }).click()
  await page.getByRole('button', { name: 'Delete my data' }).click()
  await expect(page.getByRole('heading', { name: 'Delete everything?' })).toBeVisible()
  await page.getByRole('button', { name: 'Yes, delete my data' }).click()
  await expect(page.getByRole('heading', { name: 'Before we start' })).toBeVisible({ timeout: 20_000 })
  console.log('RESULT: "Delete my data" used from the You screen; check wd_* tables show no rows for this account')
})
