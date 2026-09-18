/**
 * Suite landing + entitlement routing (suite round, 2026-09-17):
 * the landing renders from the registry (CRR live card, two in-design
 * cards that are not links), `/` decides by entitlement + last-used app,
 * entering CRR records `sentinel.lastApp`, and the masthead brand is the
 * switcher (menu: entitled apps, disabled in-design entries, All
 * applications → /apps).
 */
import { expect, test, type Page } from '@playwright/test'

async function fresh(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem('sentinel.mock.state')
    localStorage.removeItem('sentinel.lastApp')
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
}

test('first visit: / shows the landing; Open enters CRR and records last-used', async ({
  page,
}) => {
  await fresh(page)
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Applications' })
  await expect(nav).toBeVisible()
  // no app chrome on the suite landing
  await expect(page.getByRole('navigation', { name: 'App navigation' })).toHaveCount(0)
  // all three applications are live (v1.7)
  await expect(nav.getByText('In design')).toHaveCount(0)
  await expect(nav.getByRole('link')).toHaveCount(3)

  await nav.getByRole('link', { name: /CRR.*Open/s }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Start a review' })).toBeVisible()
  await expect(page).toHaveURL(/\/crr$/)
  expect(await page.evaluate(() => localStorage.getItem('sentinel.lastApp'))).toBe('crr')
})

test('return visit: / goes straight back into the last-used app', async ({ page }) => {
  await fresh(page)
  await page.addInitScript(() => localStorage.setItem('sentinel.lastApp', 'crr'))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Start a review' })).toBeVisible()
  await expect(page).toHaveURL(/\/crr$/)
})

test('/apps always shows the landing; unknown top-level paths re-enter the decision', async ({
  page,
}) => {
  await fresh(page)
  await page.addInitScript(() => localStorage.setItem('sentinel.lastApp', 'crr'))
  await page.goto('/apps')
  await expect(page.getByRole('navigation', { name: 'Applications' })).toBeVisible()
  // every app is live now; an unknown top-level path goes back through
  // the entry decision → last-used app
  await page.goto('/nonesuch')
  await expect(page.getByRole('heading', { level: 1, name: 'Start a review' })).toBeVisible()
})

test('masthead switcher: menu lists entitled apps, disables in-design, All applications → /apps', async ({
  page,
}) => {
  await fresh(page)
  await page.goto('/crr')
  const brand = page.getByRole('button', { name: 'Switch application' })
  await expect(brand).toContainText('Sentinel · CRR')
  await brand.click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await expect(menu.locator('[role="menuitem"][aria-disabled="true"]')).toHaveCount(0)
  // the live CPEA entry navigates
  await menu.getByRole('menuitem', { name: /CPEA/ }).click()
  await expect(page.getByRole('heading', { name: 'Start a portfolio analysis' })).toBeVisible()
  await expect(page).toHaveURL(/\/erm$/)
  // and the switcher works from inside ERM too
  await page.getByRole('button', { name: 'Switch application' }).click()
  await page.getByRole('menu').getByRole('menuitem', { name: 'All applications' }).click()
  await expect(page).toHaveURL(/\/apps$/)
  await expect(page.getByRole('navigation', { name: 'Applications' })).toBeVisible()
})

test('deep links under the prefix survive refresh (history mode)', async ({ page }) => {
  await fresh(page)
  await page.goto('/crr/review/rev-veyland-2026-08#sec-2')
  await expect(page.getByRole('heading', { level: 1, name: 'Veyland US Holdco LLC' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Veyland US Holdco LLC' })).toBeVisible()
})
