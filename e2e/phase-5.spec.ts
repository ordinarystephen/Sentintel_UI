/**
 * Phase 5 verification (build-spec §5.4/§5.5): both list screens through the
 * seam, filters in the URL (refresh-safe), document hits deep-linking into a
 * review, screenshots in all four themes, keyboard reach of the toolbars.
 */
import { expect, test, type Page } from '@playwright/test'

const THEMES = [
  { name: 'stone-light', family: 'stone', dark: false },
  { name: 'stone-dark', family: 'stone', dark: true },
  { name: 'cobalt-light', family: 'cobalt', dark: false },
  { name: 'cobalt-dark', family: 'cobalt', dark: true },
]
async function setTheme(page: Page, family: string, dark: boolean) {
  await page.addInitScript(
    ([pref]) => localStorage.setItem('sentinel.theme', pref),
    [JSON.stringify({ family, dark })],
  )
}
const reviewLinks = (page: Page) => page.locator('a[href^="/review/"]')

test('All reviews: filters hit the seam, live in the URL, survive reload', async ({ page }) => {
  await page.goto('/reviews/all')
  await expect(page.getByText(/^\d+ reviews · showing most recent$/)).toBeVisible()
  await page.getByLabel('Line of business').selectOption('Wealth Management')
  await expect(page).toHaveURL(/lob=Wealth\+Management/)
  await expect(reviewLinks(page).first()).toContainText('WM')
  const n = await reviewLinks(page).count()
  for (let i = 0; i < n; i++) await expect(reviewLinks(page).nth(i)).toContainText('WM')
  await page.getByLabel('Search reviews').fill('verdant')
  await expect(page).toHaveURL(/q=verdant/)
  await expect(page.getByText('1 review · showing most recent')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Line of business')).toHaveValue('Wealth Management')
  await expect(page.getByLabel('Search reviews')).toHaveValue('verdant')
  await expect(page.getByText('1 review · showing most recent')).toBeVisible()
  await expect(
    page
      .getByRole('navigation', { name: 'App navigation' })
      .getByRole('link', { name: 'All reviews' }),
  ).toHaveAttribute('aria-current', 'page')
})

test('All reviews rows: owner, read-only, repeat chip, LOB, absolute timestamp; opening another owner’s review is read-only', async ({
  page,
}) => {
  await page.goto('/reviews/all')
  const meridian = page.getByRole('link', { name: /Meridian US Holdco LLC/ }).first()
  await expect(meridian).toContainText('you')
  await expect(meridian).toContainText('2nd in 12 mo')
  await expect(meridian).toContainText('2026-08-28')
  const crestline = page.getByRole('link', { name: /Crestline Logistics/ }).first()
  await expect(crestline).toContainText('R. Chen')
  await expect(crestline).toContainText('read-only')
  await crestline.click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Crestline Logistics')
  await expect(page.getByText(/Read-only — this review belongs to R. Chen/)).toBeVisible()
  await expect(page.getByRole('button', { name: /^Mark reviewed:/ })).toHaveCount(0)
})

test('Documents: search marks terms, filters in the URL, hit deep-links into the review expanded + flashed', async ({
  page,
}) => {
  await page.goto('/documents')
  await page.getByLabel('Search documents').fill('revolver availability')
  await expect(page).toHaveURL(/q=revolver\+availability/)
  await expect(page.getByText(/passages in \d+ documents · sorted by relevance/)).toBeVisible()
  const first = page.getByRole('listitem').first()
  await expect(first).toContainText('Meridian_Holdco_Q3_Update.pdf')
  await expect(first.locator('mark').first()).toBeVisible()
  await page.getByLabel('Document type').selectOption('facility agreement')
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByRole('listitem').first()).toContainText(
    'Halcyon_Marine_Facility_Agreement.pdf',
  )
  await page.reload()
  await expect(page.getByLabel('Document type')).toHaveValue('facility agreement')
  await page.getByLabel('Document type').selectOption('all')
  await expect(page.getByRole('listitem')).not.toHaveCount(1)
  const liq = page.getByRole('listitem').filter({ hasText: 'Meridian_Holdco_Q3_Update.pdf' })

  await liq.getByRole('button', { name: 'View source' }).click()
  await expect(page.getByRole('dialog')).toContainText('Evidence — Liquidity Summary')
  await page.keyboard.press('Escape')

  await page.setViewportSize({ width: 1440, height: 700 })
  await liq.getByRole('link', { name: 'Used in Meridian review →' }).click()
  await expect(page).toHaveURL(/\/review\/rev-meridian-2026-08#sec-2$/)
  await expect(page.getByRole('button', { name: /2.*Financials/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(page.locator('#sec-2')).toHaveClass(/flash-once/)
})

test('toolbars are keyboard-reachable', async ({ page }) => {
  await page.goto('/reviews/all')
  await expect(page.getByText(/reviews · showing most recent/)).toBeVisible()
  await page.getByLabel('Search reviews').focus()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Line of business')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Owner')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Period')).toBeFocused()
  await page.keyboard.press('Tab')
  const active = await page.evaluate(
    () => document.activeElement?.getAttribute('href') ?? document.activeElement?.tagName ?? 'none',
  )
  expect(active).toMatch(/^\/review\//)
})
// PHASE5_E2E_PATCHED

test.describe('screenshots', () => {
  for (const theme of THEMES) {
    test(`lists · ${theme.name}`, async ({ page }) => {
      await setTheme(page, theme.family, theme.dark)
      await page.setViewportSize({ width: 1440, height: 1000 })
      await page.goto('/reviews/all')
      await expect(page.getByText(/reviews · showing most recent/)).toBeVisible()
      await page.waitForTimeout(300)
      await page.screenshot({ path: `e2e/screenshots/phase-5/reviews-all-${theme.name}-1440.png` })
      await page.goto('/documents?q=revolver+availability')
      await expect(page.getByText(/sorted by relevance/)).toBeVisible()
      await page.waitForTimeout(300)
      await page.screenshot({ path: `e2e/screenshots/phase-5/documents-${theme.name}-1440.png` })
    })
  }
  test('narrow · stone-light · 900px', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/reviews/all')
    await expect(page.getByText(/reviews · showing most recent/)).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/phase-5/reviews-all-stone-light-900.png' })
    await page.goto('/reviews')
    await expect(page.getByRole('link', { name: /Meridian/ })).toBeVisible()
    await page.screenshot({ path: 'e2e/screenshots/phase-5/reviews-my-stone-light-900.png' })
  })
})
