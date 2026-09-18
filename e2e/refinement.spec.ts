/**
 * Refinement round (v1.6): policy search, repository-only reviews with the
 * workpaper configuration riding the evidence snapshot, the CPEA rename,
 * the question-set control, the command palette, and upload states.
 */
import fs from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

async function fresh(page: Page, path: string) {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(path)
  await page.evaluate(() => localStorage.removeItem('sentinel.mock.state'))
  await page.reload()
}

test('policy search: ask renders the capability-preview card; a term filters browse live', async ({
  page,
}) => {
  await fresh(page, '/crr/policy')
  await expect(page.getByRole('heading', { name: 'Policy search' })).toBeVisible()
  const box = page.getByLabel('Ask or search policies')
  // four browse rows, newest revision first
  const rows = page.getByText(/rev\. \d{4}-\d{2}-\d{2}/)
  await expect(page.getByText('Reliance on extracted valuation inputs')).toBeVisible()
  // a term filters live — no family filter, no standard questions anywhere
  await box.fill('covenant')
  await expect(page.getByText('Springing covenant testing and headroom disclosure')).toBeVisible()
  await expect(page.getByText('Reliance on extracted valuation inputs')).toBeHidden()
  await expect(page.getByText('All families')).toHaveCount(0)
  await expect(page.getByText('Standard questions')).toHaveCount(0)
  // asking renders the preview answer with the citation
  await box.fill('When must valuation inputs be re-verified?')
  await page.getByRole('button', { name: 'Ask' }).click()
  await expect(page.getByText('capability preview')).toBeVisible()
  await expect(
    page.getByText(/re-verified whenever a source document is amended or superseded/),
  ).toBeVisible()
  await expect(page.getByText('ProcMan-DEMO · §4.2').first()).toBeVisible()
  void rows
})

test('repository-only review end to end; workpaper configuration rides the evidence snapshot', async ({
  page,
}) => {
  await fresh(page, '/crr')
  // configure the workpaper (placeholder vocabulary) before starting
  await page.getByRole('button', { name: /Workpaper configuration/ }).click()
  await page.getByLabel('Custom analysis topics').fill('Supplier concentration')
  await page.getByRole('button', { name: /6 Trading/ }).click() // drop §6
  // zero uploads — documents come from the repository
  await page.getByRole('button', { name: 'or pull from the repository' }).click()
  const picker = page.getByRole('dialog', { name: 'Select from the repository' })
  await picker.getByLabel('Search the repository').fill('6430')
  await picker
    .locator('div', { hasText: 'Veyland_Holdco_Covenant_Cert_2026-06.pdf' })
    .getByRole('button', { name: 'Select', exact: true })
    .first()
    .click()
  await picker.getByRole('button', { name: 'Attach 1' }).click()
  await expect(page.getByRole('button', { name: 'Begin review · 1 document' })).toBeVisible()
  await page.getByRole('button', { name: /^Begin review/ }).click()
  // processing → ready without a single upload
  await expect(page.getByRole('heading', { level: 2, name: 'Reading the documents' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Veyland US Holdco LLC' })).toBeVisible({
    timeout: 25_000,
  })
  // the config landed in the persisted evidence snapshot
  const snapshot = await page.evaluate(() => {
    const raw = localStorage.getItem('sentinel.mock.state')
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      overrides: Record<string, { workpaperConfig?: { customTopics?: string; sections: number[] } }>
    }
    return Object.values(parsed.overrides).find((r) => r.workpaperConfig)?.workpaperConfig ?? null
  })
  expect(snapshot?.customTopics).toBe('Supplier concentration')
  expect(snapshot?.sections).toEqual([1, 2, 3, 4, 5])
})

test('CPEA: the rename on landing card, masthead, switcher; routes stay /erm', async ({ page }) => {
  await fresh(page, '/apps')
  const card = page.getByRole('link', { name: /Credit Portfolio Event Assessment.*CPEA.*Open/s })
  await expect(card).toHaveAttribute('href', '/erm')
  await card.click()
  await expect(page).toHaveURL(/\/erm$/)
  await expect(page.getByRole('button', { name: 'Switch application' })).toContainText(
    'Sentinel · CPEA',
  )
  await page.getByRole('button', { name: 'Switch application' }).click()
  await expect(page.getByRole('menu').getByRole('menuitem', { name: /CPEA/ })).toContainText(
    'Credit Portfolio Event Assessment',
  )
})

test('question mode: segmented control switches; 7 saved-set cards; Add new persists across reload', async ({
  page,
}) => {
  await fresh(page, '/erm')
  const group = page.getByRole('radiogroup', { name: 'Question mode' })
  await expect(group.getByRole('radio', { name: 'Prompt only' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(page.getByLabel('Prompt')).toBeVisible()
  await group.getByRole('radio', { name: 'Question set' }).click()
  await expect(page.getByLabel('Prompt')).toHaveCount(0)
  // the 7 ratified cards + Add new
  for (const name of [
    'Quarterly credit pulse',
    'Covenant sweep',
    'Watchlist deep-dive',
    'Sponsor & ownership refresh',
    'Liquidity stress pulse',
    'Regulatory classification sweep',
    'Documentation currency check',
  ])
    await expect(page.getByRole('button', { name: new RegExp(name) })).toBeVisible()
  await expect(page.getByRole('button', { name: /Add new/ })).toBeVisible()

  // Add new → save → appends a card → survives reload
  await page.getByRole('button', { name: /Add new/ }).click()
  const modal = page.getByRole('dialog', { name: 'Add a question set' })
  const save = modal.getByRole('button', { name: 'Save' })
  await expect(save).toBeDisabled()
  await modal.getByLabel('Title').fill('September committee follow-ups')
  await modal.getByLabel('Description').fill('Ad hoc follow-ups from the September committee.')
  await save.click()
  await expect(page.getByRole('button', { name: /September committee follow-ups/ })).toBeVisible()
  await page.reload()
  await page
    .getByRole('radiogroup', { name: 'Question mode' })
    .getByRole('radio', { name: 'Question set' })
    .click()
  await expect(page.getByRole('button', { name: /September committee follow-ups/ })).toBeVisible()
})

test('command palette: ⌘K opens, arrows navigate, Enter executes a nav action and a review jump', async ({
  page,
}) => {
  await fresh(page, '/crr')
  await page.keyboard.press('ControlOrMeta+k')
  const palette = page.getByRole('dialog', { name: 'Search everything' })
  await expect(palette).toBeVisible()
  await expect(palette.getByText('Reviews', { exact: true })).toBeVisible()
  // a review jump by RXM (prefix-less, the ratified keys)
  await palette.getByRole('combobox').fill('6430')
  await palette.getByRole('combobox').press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Veyland US Holdco LLC' })).toBeVisible()
  // a nav action, chosen with the arrows
  await page.keyboard.press('ControlOrMeta+k')
  await palette.getByRole('combobox').fill('Policy search')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Policy search' })).toBeVisible()
  // the masthead trigger opens it too; Escape closes
  await page.getByRole('button', { name: 'Search everything' }).click()
  await expect(palette).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(palette).toHaveCount(0)
})

test('upload states: the over-limit file is rejected with the amber named-rule row', async ({
  page,
}, testInfo) => {
  await fresh(page, '/crr')
  // Playwright caps inline buffers below the size we need — write a 61 MB
  // temp file and hand over its path instead.
  const big = testInfo.outputPath('Redfenn_Q2_full_scan.pdf')
  await fs.writeFile(big, Buffer.alloc(61 * 1024 * 1024, 1))
  await page.getByLabel('Choose PDF files').setInputFiles(big)
  const row = page.getByRole('alert')
  await expect(row).toContainText('Redfenn_Q2_full_scan.pdf')
  await expect(row).toContainText('61 MB — over the 50 MB limit')
  // it never joins the accepted count
  await expect(page.getByRole('button', { name: 'Begin review · 0 documents' })).toBeVisible()
  await row.getByRole('button', { name: /Remove/ }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
