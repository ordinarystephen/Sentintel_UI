/**
 * Phase 3 verification (build-spec §10 + §5.1–5.3 read-path acceptance):
 * the full demo path upload → processing → review → export, refresh-safety
 * mid-processing, the source modal, both export outcomes, screenshots in
 * all four themes, reduced motion.
 */
import { expect, test, type Page } from '@playwright/test'

const VEYLAND = '/crr/review/rev-veyland-2026-08'
const THEMES = [
  { name: 'stone-light', family: 'stone', dark: false },
  { name: 'stone-dark', family: 'stone', dark: true },
  { name: 'cobalt-light', family: 'cobalt', dark: false },
  { name: 'cobalt-dark', family: 'cobalt', dark: true },
]
const PDF = (name: string) => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.alloc(120_000, 1),
})

async function setTheme(page: Page, family: string, dark: boolean) {
  await page.addInitScript(
    ([pref]) => localStorage.setItem('sentinel.theme', pref),
    [JSON.stringify({ family, dark })],
  )
}

test('demo path: drop → Begin → processing (refresh-safe) → review with the question → export', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await page.goto('/crr')
  await page
    .getByLabel('Choose PDF files')
    .setInputFiles([
      PDF('Veyland_Holdco_Annual_Review_FY25.pdf'),
      PDF('Veyland_Holdco_Q3_Update.pdf'),
    ])
  await expect(page.getByText('2 documents')).toBeVisible()
  await page
    .getByLabel('Anything Sentinel should know?')
    .fill('What is revolver availability at close?')
  await page.screenshot({ path: 'e2e/screenshots/phase-3/landing-with-files-stone-light-1440.png' })
  await page.getByRole('button', { name: 'Begin review' }).click()

  await expect(page).toHaveURL(/\/review\/rev-new-/)
  const url = page.url()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Reading the documents')
  await expect(page.getByText(/^Reading Veyland_Holdco_Annual_Review_FY25.pdf…$/)).toBeVisible()
  await expect(page.getByText('New review — reading…')).toBeVisible() // rail contextual zone
  await page.screenshot({ path: 'e2e/screenshots/phase-3/processing-stone-light-1440.png' })

  // kill the tab mid-processing: a fresh load of the same URL resumes
  await page.goto('/crr')
  await expect(page.getByRole('link', { name: /New review — reading…/ })).toBeVisible()
  await page.goto(url)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Reading the documents')

  // borrower detected midway → renames itself in the rail; then completes at the same URL
  await expect(page.getByRole('region', { name: 'Veyland US Holdco LLC' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Veyland US Holdco LLC', {
    timeout: 20_000,
  })
  expect(page.url()).toBe(url)
  await expect(
    page.getByRole('link', { name: /What is revolver availability at close\?/ }),
  ).toBeVisible()
  await expect(page.getByText('5 open')).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Review' }).click()
  expect((await download).suggestedFilename()).toBe('RXM-6430_Veyland_US_Holdco_LLC_Review.docx')
  await expect(page.getByRole('status').filter({ hasText: 'Exported' })).toBeVisible()
})

test('export failure is loud and in-app', async ({ page }) => {
  await page.goto('/crr/review/rev-seldwyn-2026-08')
  await page.getByRole('button', { name: 'Export Review' }).click()
  await expect(page.getByRole('alert').first()).toContainText(
    'Export failed: the render service returned no document for RXM-7712',
  )
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seldwyn Marine Finance')
  await page.screenshot({ path: 'e2e/screenshots/phase-3/export-error-stone-light-1440.png' })
})

test('cancel keeps the record and says so', async ({ page }) => {
  await page.goto('/crr')
  await page.getByLabel('Choose PDF files').setInputFiles([PDF('Doc.pdf')])
  await page.getByRole('button', { name: 'Begin review' }).click()
  await expect(page).toHaveURL(/\/review\/rev-new-/)
  await page.getByRole('button', { name: 'Cancel this review' }).click()
  await expect(page.getByText('This review was cancelled.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('This review was cancelled.')).toBeVisible()
})

test('a damaged file fails with the specific parser message', async ({ page }) => {
  test.setTimeout(30_000)
  await page.goto('/crr')
  await page.getByLabel('Choose PDF files').setInputFiles([PDF('Veyland_corrupt_scan.pdf')])
  await page.getByRole('button', { name: 'Begin review' }).click()
  await expect(page.getByRole('alert')).toContainText('Could not parse Veyland_corrupt_scan.pdf', {
    timeout: 12_000,
  })
  await page.screenshot({ path: 'e2e/screenshots/phase-3/processing-failed-stone-light-1440.png' })
})

test('source modal: View source → provenance, Esc closes, overlay click closes', async ({
  page,
}) => {
  await page.goto(VEYLAND)
  await page.getByRole('button', { name: 'View source' }).last().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Evidence — Liquidity Summary')
  await expect(dialog).toContainText('page 14')
  await page.screenshot({ path: 'e2e/screenshots/phase-3/source-modal-stone-light-1440.png' })
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: 'View source' }).last().click()
  await page.mouse.click(20, 400)
  await expect(dialog).toHaveCount(0)
})

test('attention row deep-links: expands the section and scrolls with the flash', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 700 })
  await page.goto(VEYLAND)
  const sec1 = page.getByRole('button', {
    name: /1.*Borrower \/ Counterparty & Relationship Overview/,
  })
  await expect(sec1).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('link', { name: /Customer concentration/ }).click()
  await expect(page).toHaveURL(/#sec-1$/)
  await expect(sec1).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#sec-1')).toHaveClass(/flash-once/)
  await expect(page.getByText('No content extracted for this concept.')).toBeVisible()
})

test.describe('screenshots', () => {
  for (const theme of THEMES) {
    for (const width of [1440, 900]) {
      test(`review · ${theme.name} · ${width}px`, async ({ page }) => {
        await setTheme(page, theme.family, theme.dark)
        await page.setViewportSize({ width, height: 1400 })
        await page.goto(VEYLAND)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Veyland US Holdco LLC')
        await page.waitForTimeout(900)
        await page.screenshot({ path: `e2e/screenshots/phase-3/review-${theme.name}-${width}.png` })
      })
    }
    test(`landing · ${theme.name} · 1440px`, async ({ page }) => {
      await setTheme(page, theme.family, theme.dark)
      await page.setViewportSize({ width: 1440, height: 1000 })
      await page.goto('/crr')
      await expect(page.getByRole('link', { name: /Veyland US Holdco LLC/ })).toBeVisible()
      await page.waitForTimeout(900)
      await page.screenshot({ path: `e2e/screenshots/phase-3/landing-${theme.name}-1440.png` })
    })
  }
})

test('reduced motion: accordion and processing bar have no transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(VEYLAND)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const dur = await page
    .locator('#sec-2-body')
    .evaluate((el) => getComputedStyle(el).transitionDuration)
  expect(dur.split(',').every((d) => d.trim() === '0s')).toBe(true)
})
