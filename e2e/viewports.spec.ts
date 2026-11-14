import { expect, test } from '@playwright/test'
import { addBottle, quickQuiz, signUp } from './helpers'

// "Design at 390px, usable up to desktop": nothing may scroll sideways from a very small phone to a wide desktop.
const WIDTHS = [
  { name: 'small phone', width: 320, height: 640, mobile: true },
  { name: 'phone', width: 390, height: 844, mobile: true },
  { name: 'tablet', width: 768, height: 1024, mobile: false },
  { name: 'desktop', width: 1280, height: 800, mobile: false },
]
const ROUTES = ['/', '/quiz', '/profile', '/shelf', '/shelf/add', '/bottle/sample-red-1', '/bottle/sample-red-1/rate', '/eat/bbq', '/scan', '/you', '/ideas', '/ideas/host-card', '/ideas/budget']

for (const w of WIDTHS) {
  test.describe(w.name, () => {
    test.use({ viewport: { width: w.width, height: w.height }, isMobile: w.mobile, hasTouch: w.mobile })

    test(`no horizontal scroll at ${w.width}px, and content stays a readable width`, async ({ page }) => {
      await signUp(page)
      await quickQuiz(page)
      await page.goto('/shelf/add')
      await addBottle(page, 'light red', 'Sample Red 1')

      for (const route of ROUTES) {
        await page.goto(route)
        await expect(page.getByRole('main')).toBeVisible()
        const m = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          mainWidth: document.querySelector('main')!.getBoundingClientRect().width,
        }))
        expect(m.overflow, `${route}: sideways scroll`).toBeLessThanOrEqual(0)
        // Wide screens don't stretch the text across the whole window: the app keeps a comfortable column.
        expect(m.mainWidth, `${route}: column width`).toBeLessThanOrEqual(660) // 36rem at this app's 18px text size is 648px
      }
    })
  })
}
