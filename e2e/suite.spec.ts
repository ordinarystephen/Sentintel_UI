/**
 * Suite landing + entitlement routing (suite round, 2026-09-17; four
 * applications 2026-09-24): the landing renders from the registry (four
 * live cards — CRR, CPEA, Vantage, Inquiry — none in design), `/` decides
 * by entitlement + last-used app, entering an app records
 * `sentinel.lastApp`, the masthead brand is the switcher (menu: entitled
 * apps, All applications → /apps), and a user entitled to Inquiry ONLY
 * lands straight in it (mock sign-in switch `sentinel.mock.user`).
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
  // all four applications are live (v1.8), in registry order
  await expect(nav.getByText('In design')).toHaveCount(0)
  await expect(nav.getByRole('link')).toHaveCount(4)
  await expect(nav.getByRole('link').nth(3)).toContainText('Inquiry')
  // hygiene sweep: no audience label beside Inquiry (the others keep their
  // full-name expansions)
  await expect(nav.getByRole('link').nth(3)).not.toContainText('Senior leadership')
  await expect(nav.getByRole('link').nth(0)).toContainText('Credit Risk Review')
  await expect(nav.getByRole('link').nth(3)).toContainText(
    'One-off questions of the portfolio, for senior leadership.',
  )

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

test('the Inquiry card and the switcher both enter Inquiry; it records last-used', async ({
  page,
}) => {
  await fresh(page)
  await page.goto('/apps')
  await page
    .getByRole('navigation', { name: 'Applications' })
    .getByRole('link', { name: /^Inquiry\s*One-off questions of the portfolio.*Open/s })
    .click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ask a question of the portfolio' }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/inquiry$/)
  expect(await page.evaluate(() => localStorage.getItem('sentinel.lastApp'))).toBe('inquiry')
  const brand = page.getByRole('button', { name: 'Switch application' })
  await expect(brand).toContainText('Sentinel · Inquiry')
  // the switcher lists all four entitled apps, none disabled
  await brand.click()
  const menu = page.getByRole('menu')
  // the Inquiry entry is just "Inquiry"; CRR keeps its full-name expansion
  const inquiryItem = menu.getByRole('menuitem', { name: /^Inquiry\b/ })
  await expect(inquiryItem).toBeVisible()
  await expect(inquiryItem).not.toContainText('Senior leadership')
  await expect(menu.getByRole('menuitem', { name: /CRR.*Credit Risk Review/ })).toBeVisible()
  await expect(menu.locator('[role="menuitem"][aria-disabled="true"]')).toHaveCount(0)
  await menu.getByRole('menuitem', { name: /Vantage/ }).click()
  await expect(page).toHaveURL(/\/vantage$/)
  await page.getByRole('button', { name: 'Switch application' }).click()
  await page
    .getByRole('menu')
    .getByRole('menuitem', { name: /Inquiry/ })
    .click()
  await expect(page).toHaveURL(/\/inquiry$/)
})

test('a user entitled to Inquiry ONLY lands straight in it — no landing, no switcher menu', async ({
  page,
}) => {
  await fresh(page)
  await page.addInitScript(() => localStorage.setItem('sentinel.mock.user', 'u-leadership'))
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ask a question of the portfolio' }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/inquiry$/)
  await expect(page.getByRole('navigation', { name: 'Applications' })).toHaveCount(0)
  // one entitlement: the static brand, no menu button
  await expect(page.getByRole('button', { name: 'Switch application' })).toHaveCount(0)
  await expect(page.getByRole('banner')).toContainText('Sentinel · Inquiry')
  // and a stale last-used app it is not entitled to never wins
  await page.evaluate(() => localStorage.setItem('sentinel.lastApp', 'crr'))
  await page.goto('/')
  await expect(page).toHaveURL(/\/inquiry$/)
})

test('the ⌘K palette offers only what the user is entitled to (inquiry-only: Inquiry’s actions)', async ({
  page,
}) => {
  await fresh(page)
  await page.addInitScript(() => localStorage.setItem('sentinel.mock.user', 'u-leadership'))
  await page.goto('/inquiry')
  await page.keyboard.press('ControlOrMeta+k')
  const palette = page.getByRole('dialog', { name: 'Search everything' })
  await expect(palette).toBeVisible()
  await expect(palette.getByText('Ask a question of the portfolio')).toBeVisible()
  await expect(palette.getByText('Runs (Inquiry)')).toBeVisible()
  await expect(palette.getByText('Start a review')).toHaveCount(0)
  await expect(palette.getByText('Runs (CPEA)')).toHaveCount(0)
  await expect(palette.getByText('Veyland US Holdco LLC')).toHaveCount(0)
})
