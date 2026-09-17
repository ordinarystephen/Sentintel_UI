/**
 * Phase 4 verification (build-spec §5.3 rail acceptance): selection drives all
 * four tabs; clear/undo round-trips on screen; mutations survive a reload;
 * keyboard reach; screenshots of the rail in all four themes.
 */
import { expect, test, type Page } from '@playwright/test'

const VEYLAND = '/crr/review/rev-veyland-2026-08'
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
// Each test starts from pristine mock state — reset once per tab, so reloads
// inside a test keep the state the test built up.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('sentinel.e2e.reset')) {
      localStorage.removeItem('sentinel.mock.state')
      sessionStorage.setItem('sentinel.e2e.reset', '1')
    }
  })
})

test('selection drives the rail; default is the first flagged item', async ({ page }) => {
  await page.goto(VEYLAND)
  const rail = page.getByRole('complementary', { name: 'Context' })
  await expect(rail).toContainText('§2Expected Case WACC')
  await expect(
    page.getByRole('button', { name: 'Select this item: Expected Case WACC' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Select this item: Liquidity' }).click()
  await expect(rail).toContainText('§2Liquidity')
  await expect(rail).toContainText('Tier 1 match')
  await rail.getByRole('tab', { name: /Debate/ }).click()
  await expect(rail).toContainText('Advocate')
  await rail.getByRole('tab', { name: 'Prior' }).click()
  await expect(rail).toContainText('Since the Feb 2026 review')
  await expect(rail.locator('dd', { hasText: '5.6x → 5.9x' })).toBeVisible()
})

test('clear → struck in place with rationale → undo; the state survives a reload', async ({
  page,
}) => {
  await page.goto(VEYLAND)
  const rail = page.getByRole('complementary', { name: 'Context' })
  await page.getByRole('button', { name: 'Select this item: Liquidity' }).click()
  await rail.getByRole('tab', { name: 'Respond' }).click()
  await rail.getByRole('button', { name: 'Incorrect' }).click()
  await rail
    .getByRole('textbox', { name: 'Clear rationale' })
    .fill('Figure superseded by the Q3 update')
  await rail.getByRole('button', { name: 'Clear — Incorrect' }).click()
  const item = page.getByRole('button', { name: 'Select this item: Liquidity' })
  await expect(item).toContainText(
    'cleared — incorrect · struck on screen, omitted from the exported review',
  )
  await expect(item).toContainText('“Figure superseded by the Q3 update”')
  await page.screenshot({ path: 'e2e/screenshots/phase-4/cleared-item-stone-light-1440.png' })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Select this item: Liquidity' })).toContainText(
    'cleared — incorrect',
  )
  await page
    .getByRole('button', { name: 'Select this item: Liquidity' })
    .getByRole('button', { name: 'undo' })
    .click()
  await expect(page.getByRole('button', { name: 'Select this item: Liquidity' })).not.toContainText(
    'cleared —',
  )
})

test('respond → re-running → adjusted value; attention dispositions persist', async ({ page }) => {
  test.setTimeout(30_000)
  await page.goto(VEYLAND)
  const rail = page.getByRole('complementary', { name: 'Context' })
  await rail.getByRole('tab', { name: 'Respond' }).click()
  await rail
    .getByRole('textbox', { name: 'Respond to Sentinel' })
    .fill('Use 9.6% from the prior review')
  await rail.getByRole('button', { name: 'Send & re-run' }).click()
  const wacc = page.getByRole('button', { name: 'Select this item: Expected Case WACC' })
  await expect(wacc).toContainText('re-running…')
  await expect(wacc).toContainText('9.6%', { timeout: 6000 })
  await expect(wacc).not.toContainText('⚠ review required')
  await expect(page.getByText('3 open')).toBeVisible()

  await page.getByRole('button', { name: 'Dismiss flag: Covenant headroom tightening' }).click()
  await expect(page.getByText('2 open')).toBeVisible()
  await page.getByRole('button', { name: 'Mark reviewed: Customer concentration' }).click()
  await page.getByRole('textbox', { name: 'Review note' }).fill('Concentration unchanged from FY24')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('1 open')).toBeVisible()
  await page.reload()
  await expect(page.getByText('1 open')).toBeVisible()
  await expect(page.getByText('Reviewed — "Concentration unchanged from FY24"')).toBeVisible()
})

test('keyboard: Tab to an item, Enter selects; arrows move rail tabs', async ({ page }) => {
  await page.goto(VEYLAND)
  const liq = page.getByRole('button', { name: 'Select this item: Liquidity' })
  await liq.focus()
  await page.keyboard.press('Enter')
  await expect(liq).toHaveAttribute('aria-pressed', 'true')
  const rail = page.getByRole('complementary', { name: 'Context' })
  await rail.getByRole('tab', { name: 'Why' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(rail.getByRole('tab', { name: 'Respond' })).toBeFocused()
  await expect(rail.getByRole('tab', { name: 'Respond' })).toHaveAttribute('aria-selected', 'true')
})

test.describe('screenshots', () => {
  for (const theme of THEMES) {
    test(`rail · ${theme.name}`, async ({ page }) => {
      await setTheme(page, theme.family, theme.dark)
      await page.setViewportSize({ width: 1440, height: 1100 })
      await page.goto(`${VEYLAND}#sec-2`)
      const rail = page.getByRole('complementary', { name: 'Context' })
      await expect(rail).toContainText('How this got here')
      await page.waitForTimeout(900)
      await page.screenshot({ path: `e2e/screenshots/phase-4/rail-why-${theme.name}.png` })
      await rail.getByRole('tab', { name: 'Respond' }).click()
      await page.screenshot({
        path: `e2e/screenshots/phase-4/rail-respond-${theme.name}.png`,
        clip: { x: 1128, y: 48, width: 312, height: 700 },
      })
      await rail.getByRole('tab', { name: /Debate/ }).click()
      await expect(rail).toContainText('Advocate')
      await page.screenshot({
        path: `e2e/screenshots/phase-4/rail-debate-${theme.name}.png`,
        clip: { x: 1128, y: 48, width: 312, height: 700 },
      })
      await rail.getByRole('tab', { name: 'Prior' }).click()
      await expect(rail).toContainText('Since the')
      await page.screenshot({
        path: `e2e/screenshots/phase-4/rail-prior-${theme.name}.png`,
        clip: { x: 1128, y: 48, width: 312, height: 700 },
      })
    })
  }
  test('read-only review · stone-light', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/crr/review/rev-farrowdale-2026-08')
    await page
      .getByRole('complementary', { name: 'Context' })
      .getByRole('tab', { name: 'Respond' })
      .click()
    await page.screenshot({ path: 'e2e/screenshots/phase-4/read-only-stone-light-1440.png' })
  })
})
