/**
 * Phase 1 verification (build-spec §10 + §4 acceptance): URLs work and are
 * refresh-safe; the rail matches the mockup in all themes; only the canvas
 * scrolls; deep links land with the neutral flash; collapse states persist;
 * keyboard traversal reaches the rail controls.
 */
import { expect, test, type Page } from '@playwright/test'

const THEMES = [
  { name: 'stone-light', family: 'stone', dark: false },
  { name: 'stone-dark', family: 'stone', dark: true },
  { name: 'cobalt-light', family: 'cobalt', dark: false },
  { name: 'cobalt-dark', family: 'cobalt', dark: true },
]
const ROUTES: ReadonlyArray<[string, string]> = [
  ['/', 'Start a review'],
  ['/reviews', 'Reviews'],
  ['/reviews/all', 'Reviews'],
  ['/documents', 'Documents'],
  ['/policy', 'Policy library'],
  ['/review/rev-meridian-2026-08', 'Meridian US Holdco LLC'],
]

async function setTheme(page: Page, family: string, dark: boolean) {
  await page.addInitScript(
    ([pref]) => localStorage.setItem('sentinel.theme', pref),
    [JSON.stringify({ family, dark })],
  )
}

test('reviews tab state lives in the URL and the selected tab is styled', async ({ page }) => {
  await page.goto('/reviews/all')
  const all = page.getByRole('tab', { name: 'All' })
  const my = page.getByRole('tab', { name: 'My' })
  await expect(all).toHaveAttribute('aria-selected', 'true')
  await expect(my).toHaveAttribute('aria-selected', 'false')
  const [allBg, myBg, canvasBg] = await Promise.all([
    all.evaluate((el) => getComputedStyle(el).backgroundColor),
    my.evaluate((el) => getComputedStyle(el).backgroundColor),
    page.locator('#canvas').evaluate((el) => getComputedStyle(el).backgroundColor),
  ])
  expect(allBg).toBe(canvasBg) // selected tab lifts to --bg
  expect(myBg).not.toBe(canvasBg)
  await my.click()
  await expect(page).toHaveURL(/\/reviews$/)
  await expect(my).toHaveAttribute('aria-selected', 'true')
})

test.describe('routes are direct-loadable and refresh-safe', () => {
  for (const [path, title] of ROUTES) {
    test(`${path}`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
      await page.reload()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
      expect(new URL(page.url()).pathname).toBe(path)
    })
  }
})

test.describe('screenshots', () => {
  for (const theme of THEMES) {
    for (const width of [1440, 900]) {
      test(`review page · ${theme.name} · ${width}px`, async ({ page }) => {
        await setTheme(page, theme.family, theme.dark)
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/review/rev-meridian-2026-08#sec-2')
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meridian US Holdco LLC')
        await page.waitForTimeout(900)
        await page.screenshot({ path: `e2e/screenshots/phase-1/review-${theme.name}-${width}.png` })
      })
    }
  }
  for (const [path] of ROUTES.slice(0, 5)) {
    test(`${path} · stone-light · 1440px`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(path)
      await page.waitForTimeout(900)
      const slug = path === '/' ? 'landing' : path.slice(1).replace(/\//g, '-')
      await page.screenshot({ path: `e2e/screenshots/phase-1/${slug}-stone-light-1440.png` })
    })
  }
  test('collapsed rail · cobalt-light · 1440px', async ({ page }) => {
    await setTheme(page, 'cobalt', false)
    await page.addInitScript(() => localStorage.setItem('sentinel.rail.collapsed', 'true'))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/review/rev-meridian-2026-08')
    await page.waitForTimeout(900)
    await page.screenshot({
      path: 'e2e/screenshots/phase-1/review-collapsed-cobalt-light-1440.png',
    })
  })
})

test('only the canvas scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 })
  await page.goto('/review/rev-meridian-2026-08')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meridian US Holdco LLC')
  const m = await page.evaluate(() => {
    const doc = document.documentElement
    const canvas = document.getElementById('canvas')!
    return {
      docScrollable: doc.scrollHeight > doc.clientHeight,
      canvasScrollable: canvas.scrollHeight > canvas.clientHeight,
    }
  })
  expect(m.docScrollable).toBe(false)
  expect(m.canvasScrollable).toBe(true)
  await page.mouse.move(700, 400)
  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(200)
  const after = await page.evaluate(() => ({
    windowY: window.scrollY,
    canvasTop: document.getElementById('canvas')!.scrollTop,
    railTop: document.querySelector('nav[aria-label="App navigation"]')!.scrollTop,
  }))
  expect(after.windowY).toBe(0)
  expect(after.canvasTop).toBeGreaterThan(0)
  expect(after.railTop).toBe(0)
  // the borrower bar stays pinned at the canvas top
  const bar = page.getByRole('heading', { level: 1 })
  const canvasBox = (await page.locator('#canvas').boundingBox())!
  const barBox = (await bar.boundingBox())!
  expect(barBox.y).toBeGreaterThanOrEqual(canvasBox.y)
  expect(barBox.y).toBeLessThan(canvasBox.y + 60)
})

test('deep links land expanded + scrolled with the neutral flash', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 })
  await page.goto('/review/rev-meridian-2026-08')
  await page.getByRole('link', { name: '5 · Risk Rating Accuracy' }).click()
  await expect(page).toHaveURL(/#sec-5$/)
  await expect
    .poll(() => page.evaluate(() => document.getElementById('canvas')!.scrollTop))
    .toBeGreaterThan(200)
  await expect(page.locator('#sec-5')).toHaveClass(/flash-once/)
  await expect(page.locator('#sec-5')).toBeInViewport()
  await expect(page.getByRole('link', { name: '5 · Risk Rating Accuracy' })).toHaveAttribute(
    'aria-current',
    'true',
  )
  // direct load of a hash URL also lands
  await page.goto('/review/rev-meridian-2026-08#sec-6')
  await expect
    .poll(() => page.evaluate(() => document.getElementById('canvas')!.scrollTop))
    .toBeGreaterThan(200)
})

test('rail and context-rail collapse persist across reload and are keyboard-reachable', async ({
  page,
}) => {
  await page.goto('/review/rev-meridian-2026-08')
  const collapse = page.getByRole('button', { name: 'Collapse sidebar' })
  await collapse.focus()
  await page.keyboard.press('Enter')
  const nav = page.getByRole('navigation', { name: 'App navigation' })
  await expect(nav).toHaveAttribute('data-collapsed', 'true')
  await expect.poll(async () => (await nav.boundingBox())!.width).toBe(58)
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeFocused()

  // Tab order: Home … Policy library, Overview, 1–6, Expand sidebar
  await page.getByRole('link', { name: 'Home' }).focus()
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Policy library' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Overview', exact: true })).toBeFocused()

  const ctxToggle = page.getByRole('button', { name: 'Toggle context rail' })
  await ctxToggle.focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('complementary', { name: 'Context' })).toHaveCount(0)

  await page.reload()
  await expect(nav).toHaveAttribute('data-collapsed', 'true')
  await expect(page.getByRole('complementary', { name: 'Context' })).toHaveCount(0)
  await expect(ctxToggle).toHaveAttribute('aria-pressed', 'false')
})

test('reduced motion: rail width and deep-link flash have no animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/review/rev-meridian-2026-08#sec-3')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meridian US Holdco LLC')
  const durations = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="App navigation"]')!
    const sec = document.getElementById('sec-3')!
    return [getComputedStyle(nav).transitionDuration, getComputedStyle(sec).animationName]
  })
  expect(durations[0].split(',').every((d) => d.trim() === '0s')).toBe(true)
  expect(durations[1]).toBe('none')
})
