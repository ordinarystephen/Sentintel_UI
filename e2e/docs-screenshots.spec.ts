/**
 * The handoff screenshot set (build-spec Phase 6) — written into docs/screenshots/
 * so the dev team can see every screen without running the app. Not part of
 * the normal e2e run: `npm run screenshots:docs` (sets DOCS_SHOTS=1).
 */
import { expect, test, type Page } from '@playwright/test'

test.skip(!process.env.DOCS_SHOTS, 'run with DOCS_SHOTS=1 (npm run screenshots:docs)')

const OUT = 'docs/screenshots'
const VEYLAND = '/review/rev-veyland-2026-08'
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

test('stone-light: every screen', async ({ page }) => {
  test.setTimeout(90_000)
  await prep(page, 'stone', false)
  await page.goto('/')
  await expect(page.getByRole('link', { name: /Veyland US Holdco LLC/ })).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/01-landing.png` })

  await page.getByLabel('Choose PDF files').setInputFiles([
    {
      name: 'Veyland_Holdco_Annual_Review_FY25.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(2_400_000, 1),
    },
    {
      name: 'Veyland_Holdco_Q3_Update.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(1_100_000, 1),
    },
  ])
  await page
    .getByLabel('Anything Sentinel should know?')
    .fill('What is revolver availability at close?')
  await settle(page)
  await page.screenshot({ path: `${OUT}/02-landing-with-files.png` })
  await page.getByRole('button', { name: 'Begin review' }).click()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Reading the documents')
  await settle(page)
  await page.screenshot({ path: `${OUT}/03-processing.png` })

  await page.goto(`${VEYLAND}#sec-2`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Veyland US Holdco LLC')
  await settle(page)
  await page.screenshot({ path: `${OUT}/04-review-top.png` })
  await page.evaluate(() => document.getElementById('canvas')!.scrollTo(0, 0))
  await settle(page)
  await page.screenshot({ path: `${OUT}/05-review-story-attention.png` })
  await page.goto(`${VEYLAND}#sec-2`)
  await settle(page)
  const rail = page.getByRole('complementary', { name: 'Context' })
  await expect(rail).toContainText('How this got here')
  await page.screenshot({ path: `${OUT}/06-review-workpaper-rail-why.png` })
  await rail.getByRole('tab', { name: 'Respond' }).click()
  await settle(page)
  await page.screenshot({
    path: `${OUT}/07-rail-respond.png`,
    clip: { x: 1128, y: 48, width: 312, height: 620 },
  })
  await rail.getByRole('tab', { name: /Debate/ }).click()
  await expect(rail).toContainText('Advocate')
  await settle(page)
  await page.screenshot({
    path: `${OUT}/08-rail-debate.png`,
    clip: { x: 1128, y: 48, width: 312, height: 620 },
  })
  await rail.getByRole('tab', { name: 'Prior' }).click()
  await expect(rail).toContainText('Since the')
  await settle(page)
  await page.screenshot({
    path: `${OUT}/09-rail-prior.png`,
    clip: { x: 1128, y: 48, width: 312, height: 620 },
  })
  await page.getByRole('button', { name: 'View source' }).last().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/10-source-modal.png` })
  await page.keyboard.press('Escape')

  await page.goto('/reviews')
  await expect(page.getByRole('link', { name: /Veyland/ })).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/11-reviews-my.png` })
  await page.goto('/reviews/all')
  await expect(page.getByText(/reviews · showing most recent/)).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/12-reviews-all.png` })
  await page.goto('/documents?q=revolver+availability')
  await expect(page.getByText(/sorted by relevance/)).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/13-documents.png` })
  await page.goto('/review/rev-seldwyn-2026-08')
  await page.getByRole('button', { name: 'Export Review' }).click()
  await expect(page.getByRole('alert').first()).toContainText('Export failed')
  await settle(page)
  await page.screenshot({ path: `${OUT}/14-export-error.png` })
  await page.goto('/review/rev-farrowdale-2026-08')
  await expect(page.getByText(/Read-only/)).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/15-read-only-review.png` })
})

for (const theme of THEMES.slice(1)) {
  test(`${theme.name}: review page + collapsed rail`, async ({ page }) => {
    await prep(page, theme.family, theme.dark)
    await page.goto(`${VEYLAND}#sec-2`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Veyland US Holdco LLC')
    await settle(page)
    await page.screenshot({ path: `${OUT}/16-review-${theme.name}.png` })
  })
}
test('cobalt-light: collapsed rail', async ({ page }) => {
  await prep(page, 'cobalt', false)
  await page.addInitScript(() => localStorage.setItem('sentinel.rail.collapsed', 'true'))
  await page.goto(VEYLAND)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Veyland US Holdco LLC')
  await settle(page)
  await page.screenshot({ path: `${OUT}/17-review-collapsed-rail-cobalt-light.png` })
})
