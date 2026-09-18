/**
 * Vantage (v1.7): the full arc ask → processing → answer, the typed
 * block surface, both citation viewers, cancel-to-Runs, deep entry,
 * frozen revisits, the follow-up-as-new-run, and the upload gate.
 */
import fs from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const DEMO = '/vantage/runs/vantage-run-2026-09-18-1432'

async function fresh(page: Page, path: string) {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(path)
  await page.evaluate(() => localStorage.removeItem('sentinel.mock.state'))
  await page.reload()
}

test('landing card and masthead switcher both enter Vantage', async ({ page }) => {
  await fresh(page, '/apps')
  await page
    .getByRole('navigation', { name: 'Applications' })
    .getByRole('link', { name: /Vantage.*Open/s })
    .click()
  await expect(page.getByRole('heading', { name: 'Ask your documents.' })).toBeVisible()
  await expect(page).toHaveURL(/\/vantage$/)
  expect(await page.evaluate(() => localStorage.getItem('sentinel.lastApp'))).toBe('vantage')
  await expect(page.getByRole('button', { name: 'Switch application' })).toContainText(
    'Sentinel · Vantage',
  )
  // the two-noun rail — nothing else
  const rail = page.getByRole('navigation', { name: 'Vantage navigation' })
  await expect(rail.getByRole('link')).toHaveCount(2)
})

test('full arc: ask → staged processing at the run URL → answer; refresh stays on the run', async ({
  page,
}) => {
  await fresh(page, '/vantage')
  await page
    .getByLabel('Upload documents')
    .last()
    .setInputFiles([
      { name: 'My_Register.csv', mimeType: 'text/csv', buffer: Buffer.from('a,b\n1,2\n') },
      { name: 'My_Policy.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(400_000, 1) },
    ])
  await expect(page.getByText('2 documents attached')).toBeVisible()
  await page.getByLabel('Your question').fill('Which exposures were above the limit?')
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(page).toHaveURL(/\/vantage\/runs\/vantage-run-/)
  await expect(page.getByRole('heading', { name: 'Reading the documents' })).toBeVisible()
  await expect(page.getByText(/You can leave — the answer lands in Runs/)).toBeVisible()
  await page.reload()
  await expect(
    page
      .getByRole('heading', { name: 'Reading the documents' })
      .or(page.getByRole('heading', { name: 'Which exposures were above the limit?' })),
  ).toBeVisible()
  // the timer-driven machine completes on its own
  await expect(
    page.getByRole('heading', { name: 'Which exposures were above the limit?' }),
  ).toBeVisible({ timeout: 15_000 })
})

test('cancel: the run is kept in Runs as cancelled and revisits honestly', async ({ page }) => {
  await fresh(page, '/vantage')
  await page
    .getByLabel('Upload documents')
    .last()
    .setInputFiles([
      { name: 'Big_Agreement.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(900_000, 1) },
      { name: 'More.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(900_000, 1) },
      { name: 'Even_More.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(900_000, 1) },
    ])
  await page.getByLabel('Your question').fill('List the covenant definitions.')
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Reading the documents' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page).toHaveURL(/\/vantage\/runs$/)
  const row = page.getByRole('button', { name: /List the covenant definitions\./ })
  await expect(row).toContainText('cancelled')
  await row.click()
  await expect(page.getByText(/cancelled before an answer was produced/)).toBeVisible()
})

test('the demo answer: every block type renders per the contract', async ({ page }) => {
  await fresh(page, DEMO)
  // prose
  await expect(
    page.getByText(/Three exposures exceeded the 25\.0m single-name limit/),
  ).toBeVisible()
  // figures with derivations
  await expect(page.getByText('3 of 42')).toBeVisible()
  await expect(page.getByText('21.6m')).toBeVisible()
  await expect(page.getByText('computed: Σ(exposure − 25.0m) across the 3 names')).toBeVisible()
  // table with canonical identities and amber needs-you cells
  await expect(page.getByRole('cell', { name: 'RXM-4100' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'No approval found' })).toHaveCount(2)
  // quote
  await expect(
    page.getByText(/shall not exceed 25\.0m without a documented exception/),
  ).toBeVisible()
  // absence block, amber
  await expect(page.getByText('Not in these documents')).toBeVisible()
  await expect(page.getByText(/absence in the papers, not a finding of non-approval/)).toBeVisible()
  // docset chips
  await expect(page.getByText('Exposure_Register_FY25.csv').first()).toBeVisible()
})

test('citations: document opens the source viewer; tabular opens rows-used with rows 7/18/31 verbatim; Escape closes top-most', async ({
  page,
}) => {
  await fresh(page, DEMO)
  await page.getByRole('button', { name: 'View source' }).first().click()
  const source = page.getByRole('dialog', { name: /§3\.1/ })
  await expect(source).toBeVisible()
  await expect(source.getByText('section image')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(source).toHaveCount(0)

  await page.getByRole('button', { name: 'View rows used' }).first().click()
  const rows = page.getByRole('dialog', { name: /Rows used — Exposure_Register_FY25\.csv/ })
  await expect(rows).toBeVisible()
  await expect(rows.getByText('rows 7, 18, 31 of 42')).toBeVisible()
  await expect(rows.getByText('verbatim rows')).toBeVisible()
  await expect(rows.getByRole('cell', { name: 'Torvane Aggregates' })).toBeVisible()
  await expect(rows.getByRole('cell', { name: 'Northgale Health Partners' })).toBeVisible()
  await expect(rows.getByRole('cell', { name: '26.7' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(rows).toHaveCount(0)
})

test('the follow-up starts a NEW run against the same docset', async ({ page }) => {
  await fresh(page, DEMO)
  await expect(page.getByText(/Runs as a new question against the same 3 documents/)).toBeVisible()
  await page.getByLabel('Ask another question').fill('And what changed since FY24?')
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  // the new run renders processing — only then is the navigation settled
  await expect(page.getByRole('heading', { name: 'Reading the documents' })).toBeVisible()
  await expect(page).toHaveURL(/\/vantage\/runs\/vantage-run-/)
  expect(page.url()).not.toContain('vantage-run-2026-09-18-1432')
  // same docset carried into the new run
  await expect(page.getByText(/Exposure_Register_FY25\.csv/).first()).toBeVisible()
})

test('runs list: newest first, honest states, frozen revisit', async ({ page }) => {
  await fresh(page, '/vantage/runs')
  const rows = page
    .locator('button', { hasText: /\?|\./ })
    .filter({ has: page.locator('.font-display') })
  await expect(page.getByText('answered').first()).toBeVisible()
  await expect(page.getByText('cancelled')).toBeVisible()
  await page.getByRole('button', { name: /five largest exposures/ }).click()
  await expect(page.getByRole('heading', { name: /five largest exposures/ })).toBeVisible()
  await expect(page.getByText(/Veyland US Holdco \(48\.6m\)/)).toBeVisible()
  void rows
})

test('over-limit upload rejected amber; unsupported type named', async ({ page }, testInfo) => {
  await fresh(page, '/vantage')
  const big = testInfo.outputPath('Huge_Scan.pdf')
  await fs.writeFile(big, Buffer.alloc(61 * 1024 * 1024, 1))
  await page.getByLabel('Upload documents').last().setInputFiles(big)
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('61 MB — over the 50 MB limit')
  await expect(page.getByText('0 documents attached')).toBeVisible()
})
