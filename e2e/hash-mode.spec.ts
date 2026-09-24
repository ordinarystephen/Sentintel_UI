/**
 * Hash-router mode (VITE_ROUTER=hash — the target-environment escape hatch)
 * with the /crr prefix (suite round): routes live in the URL fragment, so
 * deep links look like /#/crr/review/:id#sec-N and no proxy rewrites them.
 * v1.8: Inquiry (arc + deep entry), the inquiry-only user straight in, and
 * the Documents shortcut's router state all hold in the fragment too.
 * Gated: `npm run e2e:hash` starts the dev server in hash mode and runs
 * only this spec (HASH_MODE=1). The normal run skips it.
 */
import { expect, test } from '@playwright/test'

test.skip(!process.env.HASH_MODE, 'run with npm run e2e:hash (HASH_MODE=1, VITE_ROUTER=hash)')

test.beforeEach(async ({ page }) => {
  // mock state can be cleared on every load; lastApp must NOT be (the
  // return-visit assertions depend on it surviving navigation) — clear it
  // once per test after the first real load instead.
  await page.addInitScript(() => localStorage.removeItem('sentinel.mock.state'))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await page.evaluate(() => localStorage.removeItem('sentinel.lastApp'))
})

test('hash deep link into a review section renders and scrolls', async ({ page }) => {
  await page.goto('/#/crr/review/rev-veyland-2026-08#sec-2')
  await expect(page.getByRole('heading', { level: 1, name: 'Veyland US Holdco LLC' })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.getElementById('canvas')!.scrollTop))
    .toBeGreaterThan(100)
})

test('entry decision and landing work in the fragment', async ({ page }) => {
  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Applications' })).toBeVisible()
  await page.getByRole('link', { name: /CRR.*Open/s }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Start a review' })).toBeVisible()
  expect(page.url()).toContain('#/crr')
  // return visit goes straight in
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Start a review' })).toBeVisible()
  // /apps in the fragment always lands on the landing page
  await page.goto('/#/apps')
  await expect(page.getByRole('navigation', { name: 'Applications' })).toBeVisible()
})

test('ERM deep entry works in the fragment (a run URL renders its results)', async ({ page }) => {
  await page.goto('/#/erm/runs/erm-run-2026-09-18-0912')
  await expect(page.getByRole('heading', { name: 'Portfolio monitor' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Portfolio monitor' })).toBeVisible()
})

test('Vantage deep entry works in the fragment', async ({ page }) => {
  await page.goto('/#/vantage/runs/vantage-run-2026-09-18-1432')
  await expect(page.getByText('Not in these documents')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Not in these documents')).toBeVisible()
})

test('in-app navigation stays in the fragment and refresh is safe', async ({ page }) => {
  await page.goto('/#/crr/reviews/all')
  await expect(page.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
  await page.reload()
  await expect(page.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
})

test('Inquiry in the fragment: deep entry, and the full arc to its results', async ({ page }) => {
  await page.goto('/#/inquiry/runs/inquiry-run-2026-09-24-0912')
  await expect(page.getByRole('heading', { level: 1, name: 'Results' })).toBeVisible()
  await expect(page.getByTestId('single-question-table')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Results' })).toBeVisible()

  await page.goto('/#/inquiry')
  await page
    .getByRole('textbox', { name: 'Your question' })
    .fill('Any maturities inside 12 months?')
  await page.getByRole('button', { name: 'Run analysis' }).click()
  await expect(page.getByRole('heading', { name: 'Running the analysis' })).toBeVisible()
  expect(page.url()).toContain('#/inquiry/runs/inquiry-run-')
  await expect(page.getByRole('heading', { level: 1, name: 'Results' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText('"Any maturities inside 12 months?"')).toBeVisible()
})

test('the inquiry-only user lands straight in Inquiry in the fragment', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('sentinel.mock.user', 'u-leadership'))
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ask a question of the portfolio' }),
  ).toBeVisible()
  expect(page.url()).toContain('#/inquiry')
  await page.evaluate(() => localStorage.removeItem('sentinel.mock.user'))
})

test('Documents → "Ask about this borrower" pre-scopes Start through router state in the fragment', async ({
  page,
}) => {
  await page.goto('/#/erm/documents')
  await page
    .locator('div', { has: page.getByRole('heading', { name: 'Torvane Aggregates' }) })
    .last()
    .getByRole('button', { name: 'Ask about this borrower →' })
    .click()
  expect(page.url()).toMatch(/#\/erm$/)
  await expect(page.getByTestId('borrower-chip')).toContainText('Torvane Aggregates')
  await expect(page.getByTestId('scope-line')).toHaveText(
    'Will run against: Torvane Aggregates (RXM-4100) — resolves to 1 borrower · 1 document',
  )
})
