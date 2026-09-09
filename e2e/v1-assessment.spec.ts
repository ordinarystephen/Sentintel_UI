/**
 * v1.0 features: areas of assessment (collapse, live tally, verdict
 * persistence) and the reference-data disclosure.
 */
import { expect, test } from '@playwright/test'

const VEYLAND = '/review/rev-veyland-2026-08'
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('sentinel.e2e.reset')) {
      localStorage.removeItem('sentinel.mock.state')
      sessionStorage.setItem('sentinel.e2e.reset', '1')
    }
  })
})

test('zone folds with badge + tally intact; verdict updates live and survives reload', async ({
  page,
}) => {
  await page.goto(VEYLAND)
  const header = page.getByRole('button', { name: /Areas of assessment/ })
  await expect(header).toContainText('1 pending')
  await expect(header).toContainText('8 areas · 6 satisfactory · 1 n/a')
  await header.click()
  await expect(header).toHaveAttribute('aria-expanded', 'false')
  await expect(header).toContainText('1 pending')
  await header.click()

  await expect(page.getByRole('link', { name: 'Resolve in Section 2 →' })).toBeVisible()
  await page.getByRole('button', { name: 'Satisfactory', exact: true }).click()
  await expect(header).toContainText('8 areas · 7 satisfactory · 1 n/a')
  await expect(header).not.toContainText('pending')
  await page.reload()
  await expect(page.getByRole('button', { name: /Areas of assessment/ })).toContainText(
    '7 satisfactory',
  )
})

test('supporting links deep-link with the neutral flash; reference data expands with origin chips', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 })
  await page.goto(VEYLAND)
  const pd = page.getByRole('button', { name: /Probability of Default Assessment/ })
  await pd.click()
  await page.locator('#aa-pd-body').getByRole('link', { name: 'Supporting: Section 5 →' }).click()
  await expect(page).toHaveURL(/#sec-5$/)
  await expect(page.getByRole('button', { name: /5.*Risk Rating Accuracy/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(page.locator('#sec-5')).toHaveClass(/flash-once/)

  const refToggle = page.getByRole('button', { name: /Reference data/ })
  await expect(refToggle).toContainText('as of 2026-08-15')
  await refToggle.click()
  await expect(page.getByText('Reference number')).toBeVisible()
  await expect(page.getByText('TMT — Software Services')).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({
    path: 'e2e/screenshots/v1-assessment/review-with-zones-stone-light-1440.png',
    fullPage: false,
  })
})

test('a completed review renders its fully-rated zone (structural, not Veyland-only)', async ({
  page,
}) => {
  await page.goto('/review/rev-ambervale-2026-08')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ambervale Foods Group')
  const header = page.getByRole('button', { name: /Areas of assessment/ })
  await expect(header).toContainText('8 areas · 7 satisfactory · 1 n/a')
  await expect(header).not.toContainText('pending')
})

test('a read-only review renders the rated zone — ratings and reasons, no action buttons', async ({
  page,
}) => {
  await page.goto('/review/rev-farrowdale-2026-08')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Farrowdale Logistics')
  const header = page.getByRole('button', { name: /Areas of assessment/ })
  await expect(header).toContainText('8 areas · 7 satisfactory · 1 n/a')
  // §4 shares the name — scope to the areas zone
  await page
    .locator('#areas-body')
    .getByRole('button', { name: /Portfolio Management/ })
    .click()
  await expect(
    page.getByText(/Required monitoring practices are adequate and timely/),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Satisfactory', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Unsatisfactory', exact: true })).toHaveCount(0)
})
