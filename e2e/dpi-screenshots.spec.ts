/**
 * Display-portability verification (v1.2): the review screen in all four
 * themes at deviceScaleFactor 1 (standard-DPI office panel) AND 2 (Retina),
 * so the bundled-font rendering, the rem type scale, and the low-DPI token
 * step can be eyeballed side by side. The low-DPI tokens live behind
 * `@media (max-resolution: 1.5dppx)`, so the 1x shots exercise them and the
 * 2x shots do not. Not part of the normal e2e run:
 * `npm run screenshots:dpi` (sets DPI_SHOTS=1) → e2e/screenshots/dpi/.
 */
import { test, type Page } from '@playwright/test'

test.skip(!process.env.DPI_SHOTS, 'run with DPI_SHOTS=1 (npm run screenshots:dpi)')

const OUT = 'e2e/screenshots/dpi'
const VEYLAND = '/crr/review/rev-veyland-2026-08'
const THEMES = [
  { name: 'stone-light', family: 'stone', dark: false },
  { name: 'stone-dark', family: 'stone', dark: true },
  { name: 'cobalt-light', family: 'cobalt', dark: false },
  { name: 'cobalt-dark', family: 'cobalt', dark: true },
]
async function prep(page: Page, family: string, dark: boolean) {
  await page.addInitScript(
    ([pref]) => {
      localStorage.setItem('sentinel.theme', pref)
      localStorage.removeItem('sentinel.mock.state')
    },
    [JSON.stringify({ family, dark })],
  )
  await page.setViewportSize({ width: 1440, height: 1000 })
}
const settle = (page: Page) => page.waitForTimeout(900)

for (const dsf of [1, 2]) {
  test.describe(`deviceScaleFactor ${dsf}`, () => {
    test.use({ deviceScaleFactor: dsf })
    for (const theme of THEMES) {
      test(`${theme.name} @${dsf}x: review page`, async ({ page }) => {
        await prep(page, theme.family, theme.dark)
        await page.goto(VEYLAND)
        await page.getByRole('heading', { level: 1, name: 'Veyland US Holdco LLC' }).waitFor()
        await settle(page)
        await page.screenshot({ path: `${OUT}/review-${theme.name}@${dsf}x.png` })
      })
    }
  })
}
