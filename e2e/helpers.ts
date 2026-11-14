import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'correct-horse-9'

/** Creates a (device-only demo) account through the real UI and lands on the 21+ question. */
export async function createAccount(page: Page, email = 'gia@example.com', password = PASSWORD) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Before we start' })).toBeVisible()
}

/** Account + 21+ confirmed: lands on the first quiz question. */
export async function signUp(page: Page, email = 'gia@example.com', password = PASSWORD) {
  await createAccount(page, email, password)
  await page.getByRole('button', { name: /yes, i’m 21 or older/i }).click()
  await expect(page.getByRole('heading', { name: 'What do you usually reach for?' })).toBeVisible()
}

/** Answers the first two quiz questions, then uses "Show me wines now". Lands on the taste profile. */
export async function quickQuiz(page: Page) {
  await page.getByText('Red wine', { exact: true }).click() // click the label, like a finger would
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByText('Skim', { exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Show me wines now' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/./)
  await expect(page.getByText(/^You mostly reach for red/)).toBeVisible()
}

/** Adds a bottle to the shelf from the catalog search. Starts and ends on the "Add bottles" screen. */
export async function addBottle(page: Page, search: string, bottleName: string, how: 'bought' | 'gift' = 'bought') {
  await page.getByLabel('Search the catalog').fill(search)
  const row = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: bottleName, exact: true }) })
  await row.getByRole('button', { name: how === 'bought' ? /I bought it/ : /It was a gift/ }).click()
  await expect(page.getByText(`Added ${bottleName} to your shelf.`)).toBeVisible()
}

/** Signs up, confirms 21+, does the quick quiz, and opens "Add bottles". */
export async function startAddingBottles(page: Page) {
  await page.getByRole('link', { name: 'Add bottles' }).or(page.getByRole('link', { name: 'My shelf' })).first().click()
}

/** On a wine card, rates the bottle through the real screens. Ends on the thank-you view. */
export async function rateBottle(page: Page, verdict: 'Loved it' | 'It was fine' | 'Not for me', reasons: string[] = []) {
  await page.getByRole('link', { name: /Rate this bottle|Rate it again/ }).click()
  await page.getByText(verdict, { exact: true }).click()
  for (const r of reasons) await page.getByText(r, { exact: true }).click()
  await page.getByRole('button', { name: 'Save my rating' }).click()
  await expect(page.getByRole('heading', { name: /^Thanks for rating/ })).toBeVisible()
}
