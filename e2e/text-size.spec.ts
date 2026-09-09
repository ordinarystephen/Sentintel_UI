/**
 * Masthead text-size control (v1.2.1): the S/M/L choice changes the computed
 * root font-size, persists across reload (no flash — pre-paint script), and
 * the review page with every section expanded shows no horizontal overflow
 * at L on a 1440px viewport — at deviceScaleFactor 1 AND 2, because the
 * user scale compounds with the low-DPI media step rather than fighting it.
 */
import { expect, test, type Page } from '@playwright/test'

const VEYLAND = '/review/rev-veyland-2026-08'

const rootPx = (page: Page) =>
  page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))

async function fresh(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem('sentinel.mock.state')
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
}

for (const dsf of [1, 2]) {
  test.describe(`deviceScaleFactor ${dsf}`, () => {
    test.use({ deviceScaleFactor: dsf })

    test(`setting applies and persists across reload @${dsf}x`, async ({ page }) => {
      await fresh(page)
      await page.goto('/')
      const medium = await rootPx(page)

      await page.getByRole('button', { name: 'Large text' }).click()
      const large = await rootPx(page)
      expect(large).toBeGreaterThan(medium)
      expect(large / medium).toBeCloseTo(1.1, 2)

      await page.getByRole('button', { name: 'Small text' }).click()
      const small = await rootPx(page)
      expect(small).toBeLessThan(medium)
      expect(small / medium).toBeCloseTo(0.92, 2)

      // Persists: reload keeps S (pre-paint script, before first paint)
      await page.reload()
      expect(await rootPx(page)).toBeCloseTo(small, 1)
      await expect(page.getByRole('button', { name: 'Small text' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    test(`review page at L, all sections expanded: no horizontal overflow @${dsf}x`, async ({
      page,
    }) => {
      await fresh(page)
      await page.addInitScript(() => {
        localStorage.setItem('sentinel.textSize', 'l')
      })
      await page.goto(VEYLAND)
      await page.getByRole('heading', { level: 1, name: 'Veyland US Holdco LLC' }).waitFor()
      // Expand the pending sections too (populated ones open by default)
      for (const n of [3, 4, 5, 6]) {
        const header = page.locator(`#sec-${n}`).getByRole('button').first()
        if ((await header.getAttribute('aria-expanded')) === 'false') await header.click()
      }
      await page.waitForTimeout(400)
      const overflow = await page.evaluate(() => {
        const el = document.documentElement
        return { scroll: el.scrollWidth, client: el.clientWidth }
      })
      expect(overflow.scroll).toBeLessThanOrEqual(overflow.client)
    })
  })
}
