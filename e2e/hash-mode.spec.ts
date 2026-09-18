/**
 * Hash-router mode (VITE_ROUTER=hash — the target-environment escape hatch)
 * with the /crr prefix (suite round): routes live in the URL fragment, so
 * deep links look like /#/crr/review/:id#sec-N and no proxy rewrites them.
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

test('in-app navigation stays in the fragment and refresh is safe', async ({ page }) => {
  await page.goto('/#/crr/reviews/all')
  await expect(page.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
  await page.reload()
  await expect(page.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
})
