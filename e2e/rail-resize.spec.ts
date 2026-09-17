/**
 * Drag-resize context rail (suite round, 2026-09-17): drag changes width
 * and survives reload; double-click resets to 312; keyboard resize works
 * (±16, Home/End); the wide reading-pane state toggles at 420; collapse →
 * expand retains the persisted width.
 */
import { expect, test, type Page } from '@playwright/test'

const VEYLAND = '/crr/review/rev-veyland-2026-08'
const rail = (page: Page) => page.getByRole('complementary', { name: 'Context' })
const handle = (page: Page) => page.getByRole('separator', { name: 'Resize context rail' })
const railWidth = (page: Page) =>
  rail(page).evaluate((el) => Math.round(el.getBoundingClientRect().width))

async function open(page: Page) {
  // NOTE: no addInitScript for ctxWidth — that would re-clear it on every
  // navigation and defeat the persistence assertions. Clear once, then mount.
  await page.addInitScript(() => localStorage.removeItem('sentinel.mock.state'))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(VEYLAND)
  await page.evaluate(() => localStorage.removeItem('sentinel.ctxWidth'))
  await page.reload()
  await page.getByRole('heading', { level: 1, name: 'Veyland US Holdco LLC' }).waitFor()
}

test('drag widens the rail, persists across reload; double-click resets', async ({ page }) => {
  await open(page)
  expect(await railWidth(page)).toBe(312)

  const box = (await handle(page).boundingBox())!
  const y = box.y + 200
  await page.mouse.move(box.x + 3, y)
  await page.mouse.down()
  await page.mouse.move(box.x + 3 - 120, y, { steps: 8 })
  await page.mouse.up()
  expect(await railWidth(page)).toBe(432)
  await expect(handle(page)).toHaveAttribute('aria-valuenow', '432')

  await page.reload()
  await page.getByRole('heading', { level: 1 }).waitFor()
  expect(await railWidth(page)).toBe(432)

  await handle(page).dblclick()
  expect(await railWidth(page)).toBe(312)
})

test('keyboard: arrows step ±16, Home/End jump to min/max; range is clamped', async ({ page }) => {
  await open(page)
  await handle(page).focus()
  await page.keyboard.press('ArrowLeft')
  expect(await railWidth(page)).toBe(328)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  expect(await railWidth(page)).toBe(296)
  await page.keyboard.press('End')
  expect(await railWidth(page)).toBe(560)
  await page.keyboard.press('ArrowLeft') // clamped at max
  expect(await railWidth(page)).toBe(560)
  await page.keyboard.press('Home')
  expect(await railWidth(page)).toBe(260)
})

test('wide reading-pane state toggles at 420: type steps up, Debate goes side by side', async ({
  page,
}) => {
  await open(page)
  await expect(rail(page)).not.toHaveClass(/ctx-wide/)
  // Debate stacked below the threshold
  await page.getByRole('tab', { name: /Debate/ }).click()
  const cards = page.locator('.ctx-debate > div')
  await expect(cards).toHaveCount(2)
  const stacked = await cards.first().boundingBox()
  const stacked2 = await cards.nth(1).boundingBox()
  expect(stacked2!.y).toBeGreaterThan(stacked!.y + 10) // vertically stacked

  await handle(page).focus()
  await page.keyboard.press('End') // 560 ≥ 420
  await expect(rail(page)).toHaveClass(/ctx-wide/)
  const side1 = await cards.first().boundingBox()
  const side2 = await cards.nth(1).boundingBox()
  expect(Math.abs(side2!.y - side1!.y)).toBeLessThan(4) // side by side
  expect(side2!.x).toBeGreaterThan(side1!.x + 100)

  await page.keyboard.press('Home') // 260 < 420
  await expect(rail(page)).not.toHaveClass(/ctx-wide/)
})

test('collapse and re-expand retains the persisted width', async ({ page }) => {
  await open(page)
  await handle(page).focus()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  expect(await railWidth(page)).toBe(344)
  const toggle = page.getByRole('button', { name: 'Toggle context rail' })
  await toggle.click()
  await expect(rail(page)).toHaveCount(0)
  await toggle.click()
  expect(await railWidth(page)).toBe(344)
})
