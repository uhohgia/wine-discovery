import { expect, test } from '@playwright/test'
import { addBottle, createAccount, quickQuiz, rateBottle, signUp } from './helpers'

test('21+ gate: asked once, and a "no" shows a kind message', async ({ page }) => {
  await createAccount(page)
  await page.getByRole('button', { name: 'No', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Thanks for checking in' })).toBeVisible()
  await page.getByRole('button', { name: 'I tapped the wrong one' }).click()
  await page.getByRole('button', { name: /yes, i’m 21 or older/i }).click()
  await expect(page.getByRole('heading', { name: 'What do you usually reach for?' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'What do you usually reach for?' })).toBeVisible() // not asked again
})

test('stop after two questions and still get a taste profile; it survives a reload', async ({ page }) => {
  await signUp(page)
  await quickQuiz(page)
  await expect(page.getByText('You mostly reach for red. You like lighter wines.')).toBeVisible()
  await expect(page.getByRole('group', { name: /body/i })).toContainText(/closest to Skim milk/)
  await page.reload()
  await expect(page.getByText('You mostly reach for red. You like lighter wines.')).toBeVisible()
  await page.getByRole('link', { name: 'Back to home' }).click()
  await expect(page.getByRole('heading', { name: 'See my taste profile' }).or(page.getByRole('link', { name: 'See my taste profile' }))).toBeVisible()
})

test('the whole quiz can be done with the keyboard alone', async ({ page }) => {
  await signUp(page)
  // Space toggles a checkbox; Tab moves on. Question 1.
  await page.getByRole('checkbox', { name: 'Rosé' }).focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('checkbox', { name: 'Rosé' })).toBeChecked()
  await page.getByRole('button', { name: 'Next' }).focus()
  await page.keyboard.press('Enter')
  // Focus moves to the new heading so screen-reader users land in the right place.
  await expect(page.getByRole('heading', { name: 'Which milk goes in your coffee?' })).toBeFocused()
  // Radios use the arrow keys.
  await page.getByRole('radio', { name: 'Skim' }).focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('radio', { name: '2%' })).toBeChecked()
})

test('quiz progress and the early exit button show up at the right moments', async ({ page }) => {
  await signUp(page)
  await expect(page.getByRole('progressbar', { name: 'Quiz progress' })).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByRole('button', { name: 'Show me wines now' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('button', { name: 'Show me wines now' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('button', { name: 'Show me wines now' })).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('progressbar', { name: 'Quiz progress' })).toHaveAttribute('aria-valuenow', '2')
})

test('shelf: add bottles from the catalog, open the wine card, tap a word, remove it', async ({ page }) => {
  await signUp(page)
  await quickQuiz(page) // likes red, light wines

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My shelf' }).click()
  await expect(page.getByRole('heading', { name: 'Your shelf is empty' })).toBeVisible()
  await page.getByRole('link', { name: 'Add bottles' }).click()

  await expect(page.getByText('10 bottles')).toBeVisible()
  await addBottle(page, 'steak', 'Sample Red 3', 'gift')
  await addBottle(page, 'light red', 'Sample Red 1', 'bought')

  await page.getByRole('link', { name: '← My shelf' }).click()
  await expect(page.getByText('2 bottles at home')).toBeVisible()
  const items = page.getByRole('listitem')
  await expect(items.nth(0)).toContainText('Sample Red 1')
  await expect(items.nth(0)).toContainText('Bought')
  await expect(items.nth(1)).toContainText('Sample Red 3')
  await expect(items.nth(1)).toContainText('Gift')

  // The wine card: the four scales, a verdict with a reason, pairings, tip and talking point.
  await page.getByRole('link', { name: 'Sample Red 1', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Sample Red 1' })).toBeVisible()
  for (const scale of ['Body', 'Sweetness', 'Zing', 'Dry, grippy feel']) await expect(page.getByRole('group', { name: new RegExp(scale) })).toBeVisible()
  await expect(page.getByText('A good bet')).toBeVisible()
  await expect(page.getByText(/just the way you like it/)).toBeVisible()
  await expect(page.getByRole('region', { name: 'Good with' }).getByRole('listitem')).toHaveCount(3)
  await expect(page.getByRole('heading', { name: 'Serving tip' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'One thing to say' })).toBeVisible()

  // Tap a word, read it, close it. The explanation is announced (live region) and the button reports its state.
  const chip = page.getByRole('list', { name: 'Flavors' }).getByRole('button', { name: 'Strawberry & cranberry' })
  await chip.click()
  await expect(chip).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText(/Bright red fruit flavors/)).toBeVisible()
  await chip.click()
  await expect(page.getByText(/Bright red fruit flavors/)).toHaveCount(0)

  // "What's this?" opens a plain explanation, with the technical word one tap away.
  await page.getByRole('group', { name: /Dry, grippy feel/ }).getByText("What’s this?").click()
  await expect(page.getByText(/Also called “tannin”/).first()).toBeVisible()

  // Survives a reload, then remove.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'On your shelf' })).toBeVisible()
  await page.getByRole('button', { name: 'Remove from my shelf' }).click()
  await expect(page.getByRole('heading', { name: 'Have it at home?' })).toBeVisible()
})

test('a bottle that clashes with your taste is honestly "A stretch"', async ({ page }) => {
  await signUp(page)
  await quickQuiz(page)
  await page.goto('/bottle/sample-white-1') // a white, and the quiz said red
  await expect(page.getByText('A stretch')).toBeVisible()
  await expect(page.getByText(/you usually reach for red/)).toBeVisible()
})

test('pick a meal and see ranked bottles from your shelf, each with a label and a reason', async ({ page }) => {
  await signUp(page)
  await quickQuiz(page) // likes red and lighter wines

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My shelf' }).click()
  await page.getByRole('link', { name: 'Add bottles' }).click()
  await addBottle(page, 'steak', 'Sample Red 3')
  await addBottle(page, 'spicy takeout', 'Sample White 2')
  await addBottle(page, 'light red', 'Sample Red 1')

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Home' }).click()
  await expect(page.getByRole('heading', { name: 'What are you eating?' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Meals' }).getByRole('link')).toHaveCount(7)
  await expect(page.getByRole('list', { name: 'Occasions' }).getByRole('link')).toHaveCount(4)

  await page.getByRole('list', { name: 'Meals' }).getByRole('link', { name: /Spicy takeout/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: /Best bets for spicy takeout/ })).toBeVisible()
  const items = page.getByRole('list').getByRole('listitem')
  await expect(items).toHaveCount(3)
  // A light red the quiz-taker loves beats the textbook spicy-food white and the big red.
  await expect(items.nth(0)).toContainText('Sample Red 1')
  await expect(items.nth(0)).toContainText('Best pick')
  await expect(items.nth(1)).toContainText('Sample White 2')
  await expect(items.nth(1)).toContainText('A touch of sweetness calms the heat.')
  await expect(items.nth(2)).toContainText('Sample Red 3')
  for (let i = 0; i < 3; i++) {
    await expect(items.nth(i)).toContainText(/A good bet|Worth a try|A stretch/)
    await expect(items.nth(i).locator('p').last()).toContainText(/\.$/)
  }

  // The bottle name opens its wine card.
  await items.nth(0).getByRole('link', { name: 'Sample Red 1', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Sample Red 1' })).toBeVisible()
  await page.goBack()

  // An occasion works the same way, and the list follows the occasion.
  await page.getByRole('link', { name: /What are you eating\?/ }).click()
  await page.getByRole('list', { name: 'Occasions' }).getByRole('link', { name: /A gift/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: /Best bets for a gift/ })).toBeVisible()
})

test('a meal with an empty shelf points you to add bottles', async ({ page }) => {
  await signUp(page)
  await quickQuiz(page)
  await page.goto('/eat/bbq')
  await expect(page.getByRole('heading', { name: 'Your shelf is empty' })).toBeVisible()
  await page.getByRole('link', { name: 'Add bottles' }).click()
  await expect(page.getByRole('heading', { name: 'Add bottles' })).toBeVisible()
})

test('rate "not for me" with a reason: a warm confirmation, and the profile and recommendations change', async ({ page }) => {
  await signUp(page)
  await quickQuiz(page) // likes red and light wines
  await page.goto('/shelf/add')
  await addBottle(page, 'light red', 'Sample Red 1')
  await addBottle(page, 'steak', 'Sample Red 3')

  // Before: the light red is described as just what they like.
  await page.goto('/eat/pasta-tomato')
  const redOne = () => page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Sample Red 1', exact: true }) })
  const before = await redOne().innerText()
  expect(before).toMatch(/light/)
  await page.goto('/profile')
  await expect(page.getByRole('group', { name: /^Body/ })).toContainText('closest to Skim milk')
  await expect(page.getByText('Based on your quiz answers so far.')).toBeVisible()

  // Rate it "not for me: too light or watery".
  await page.goto('/bottle/sample-red-1')
  await rateBottle(page, 'Not for me', ['Too light or watery'])
  await expect(page.getByText('Good to know. We’ll look for wines with a bit more body.')).toBeVisible()
  await expect(page.getByText('Not for me', { exact: true })).toBeVisible()

  // After: the profile moved toward more body, counts the rating, and the recommendation reads differently.
  await page.getByRole('link', { name: 'See my taste profile' }).click()
  await expect(page.getByRole('group', { name: /^Body/ })).toContainText('closest to 2% milk')
  await expect(page.getByText('Based on 1 rating, so more bottles will sharpen this.')).toBeVisible()
  await page.goto('/eat/pasta-tomato')
  await expect(page.getByRole('listitem').first()).toBeVisible()
  expect(await redOne().innerText()).not.toBe(before)

  // The shelf remembers it too.
  await page.goto('/shelf')
  await expect(page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Sample Red 1', exact: true }) })).toContainText('Not for me')
})

test('rating: loved it, rate again, and a friendly nudge when nothing is picked', async ({ page }) => {
  await signUp(page)
  await quickQuiz(page)
  await page.goto('/bottle/sample-red-3')
  await page.getByRole('link', { name: 'Rate this bottle' }).click()
  await page.getByRole('button', { name: 'Save my rating' }).click()
  await expect(page.getByRole('alert')).toContainText('Pick how it was first')

  await page.getByText('Loved it', { exact: true }).click()
  await page.getByRole('button', { name: 'Save my rating' }).click()
  await expect(page.getByText('Great! We’ll look for more wines like this one.')).toBeVisible()
  await page.getByRole('link', { name: /Back to Sample Red 3/ }).click()
  await expect(page.getByText(/You said:/)).toContainText('Loved it')

  await rateBottle(page, 'It was fine')
  await page.getByRole('link', { name: 'See my taste profile' }).click()
  await expect(page.getByText('Based on 2 ratings, so more bottles will sharpen this.')).toBeVisible()
  await page.reload() // saved on the device, not just in memory
  await expect(page.getByText('Based on 2 ratings, so more bottles will sharpen this.')).toBeVisible()
})

test('scan: one tap opens a bottle’s wine card, with a typed search underneath', async ({ page }) => {
  await signUp(page)
  await quickQuiz(page)
  await page.goto('/shelf/add')
  await addBottle(page, 'light red', 'Sample Red 1')

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Scan' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Scan a bottle' })).toBeVisible()
  await expect(page.getByText('Simulated scan')).toBeVisible()
  await page.getByRole('button', { name: 'Scan a bottle' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Sample Red 1' })).toBeVisible()
  await expect(page.getByText('Found by scan')).toBeVisible()

  // "Can't find it?": type a name or a description.
  await page.goBack()
  await page.getByLabel('Bottle name or description').fill('crisp white')
  await page.getByRole('button', { name: 'Find it' }).click()
  await expect(page.getByText(/\d bottles?/).first()).toBeVisible()
  await page.getByRole('link', { name: 'Sample White 1', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Sample White 1' })).toBeVisible()
  await expect(page.getByText('Found by scan')).toHaveCount(0)

  await page.goto('/scan')
  await page.getByLabel('Bottle name or description').fill('zzzz')
  await page.getByRole('button', { name: 'Find it' }).click()
  await expect(page.getByText('No bottles match')).toBeVisible()
  await expect(page.getByRole('link', { name: 'browse every bottle' })).toBeVisible()
})

test('scan always works, even with an empty shelf', async ({ page }) => {
  await signUp(page)
  await page.goto('/scan')
  await expect(page.getByText('Your shelf is empty, so we’ll pick one of our sample bottles.')).toBeVisible()
  await page.getByRole('button', { name: 'Scan a bottle' }).click()
  await expect(page.getByText('Found by scan')).toBeVisible()
  await expect(page.getByRole('button', { name: /Add to my shelf: I bought it/ })).toBeVisible()
})

test('concept previews: six clearly labelled sketches, none of which pretend to work', async ({ page }) => {
  await signUp(page)
  await page.goto('/')
  await page.getByRole('link', { name: 'See the concept previews' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Ideas we’re testing' })).toBeVisible()
  const titles = ['An alcohol-free option', 'Gift mode', 'Stay on budget', 'Where to buy it', 'Host card', 'More from this producer']
  for (const title of titles) {
    await page.getByRole('link', { name: title, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: new RegExp(title) })).toBeVisible()
    await expect(page.getByText('Concept preview', { exact: true })).toBeVisible()
    await expect(page.getByText(/This isn’t built yet/)).toBeVisible()
    await expect(page.getByRole('main').getByRole('button')).toHaveCount(0)
    await page.getByRole('link', { name: '← Ideas we’re testing' }).click()
  }
})
