/**
 * Doc-browser revision (v0.5): browse vs search states, row selection with
 * the inline action bar, the extracted-text preview modal, and the original
 * download — plus screenshots in two themes.
 */
import { expect, test, type Page } from '@playwright/test'

async function setTheme(page: Page, family: string, dark: boolean) {
  await page.addInitScript(
    ([pref]) => localStorage.setItem('sentinel.theme', pref),
    [JSON.stringify({ family, dark })],
  )
}
const q3Row = (page: Page) =>
  page.getByRole('button', { name: 'Select document: Veyland_Holdco_Q3_Update.pdf' })

test('browse → select → action bar → preview modal → download; search switches to hit cards', async ({
  page,
}) => {
  await page.goto('/crr/documents')
  await expect(page.getByText('9 documents · newest first')).toBeVisible()
  await expect(page.locator('mark')).toHaveCount(0)

  await q3Row(page).click()
  await expect(q3Row(page)).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(900) // let the settle stagger finish before the screenshot
  await page.screenshot({
    path: 'e2e/screenshots/doc-browser/browse-selected-stone-light-1440.png',
  })

  await page.getByRole('button', { name: 'Preview extracted text' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Veyland_Holdco_Q3_Update.pdf — extracted text')
  await expect(dialog).toContainText('15 pages')
  await expect(dialog).toContainText('5 sections')
  await expect(dialog.getByRole('button', { name: /Highlights/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(dialog.getByRole('button', { name: /Liquidity Summary/ })).toContainText('pp. 14–15')
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'e2e/screenshots/doc-browser/preview-modal-stone-light-1440.png' })
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download original' }).click()
  expect((await download).suggestedFilename()).toBe('Veyland_Holdco_Q3_Update.pdf')
  await expect(page.getByRole('status').filter({ hasText: 'Downloaded' })).toBeVisible()

  await page.getByLabel('Search documents').fill('revolver availability')
  await expect(page.getByText(/sorted by relevance/)).toBeVisible()
  await expect(page.locator('mark').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^Select document:/ })).toHaveCount(0)
})

test('not-yet-extracted document: preview disabled, download still works', async ({ page }) => {
  await page.goto('/crr/documents')
  await page
    .getByRole('button', { name: 'Select document: Farrowdale_Logistics_Q2_Update.pdf' })
    .click()
  await expect(page.getByRole('button', { name: 'Preview extracted text' })).toBeDisabled()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download original' }).click()
  expect((await download).suggestedFilename()).toBe('Farrowdale_Logistics_Q2_Update.pdf')
})

test('keyboard: rows are focusable, Enter selects, actions reachable', async ({ page }) => {
  await page.goto('/crr/documents')
  await q3Row(page).focus()
  await page.keyboard.press('Enter')
  await expect(q3Row(page)).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Preview extracted text' })).toBeFocused()
})

test('cobalt-dark screenshots', async ({ page }) => {
  await setTheme(page, 'cobalt', true)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/crr/documents')
  await expect(page.getByText('9 documents · newest first')).toBeVisible()
  await q3Row(page).click()
  await page.getByRole('button', { name: 'Preview extracted text' }).click()
  await expect(page.getByRole('dialog')).toContainText('extracted text')
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'e2e/screenshots/doc-browser/preview-modal-cobalt-dark-1440.png' })
})
