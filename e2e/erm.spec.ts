/**
 * ERM application (v1.5): the full arc start → processing → results,
 * cancel-lands-in-Runs, deep entry, group-by consistency, per-answer
 * grades, flag sorting (pair-aware), the population disclosure, frozen
 * run revisits, and the Documents lens with both viewers.
 */
import { expect, test, type Page } from '@playwright/test'

const RUN = '/erm/runs/erm-run-2026-09-18-0912'

async function fresh(page: Page, path = '/erm') {
  // NOTE: not an addInitScript — that would re-clear persisted state on
  // every navigation and delete the very run the arc tests assert on.
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(path)
  await page.evaluate(() => localStorage.removeItem('sentinel.mock.state'))
  await page.reload()
}

test('landing card and masthead switcher both enter ERM', async ({ page }) => {
  await fresh(page, '/apps')
  await page
    .getByRole('navigation', { name: 'Applications' })
    .getByRole('link', { name: /ERM.*Open/s })
    .click()
  await expect(page.getByRole('heading', { name: 'Start a portfolio analysis' })).toBeVisible()
  await expect(page).toHaveURL(/\/erm$/)
  expect(await page.evaluate(() => localStorage.getItem('sentinel.lastApp'))).toBe('erm')
  await expect(page.getByRole('button', { name: 'Switch application' })).toContainText(
    'Sentinel · ERM',
  )
})

test('full arc: start → staged processing at the run URL → results; refresh stays on the run', async ({
  page,
}) => {
  await fresh(page)
  await expect(page.getByText(/resolves to 6 borrowers · 11 documents/)).toBeVisible()
  await page.getByRole('button', { name: 'Run analysis' }).click()
  await expect(page.getByRole('heading', { name: 'Running the analysis' })).toBeVisible()
  await expect(page).toHaveURL(/\/erm\/runs\/erm-run-/)
  await expect(page.getByText('You can leave — the run continues and lands in Runs.')).toBeVisible()
  await expect(page.getByText('Population resolved')).toBeVisible()
  // refresh mid-run lands back on the same run, still processing or done
  await page.reload()
  await expect(
    page
      .getByRole('heading', { name: 'Running the analysis' })
      .or(page.getByRole('heading', { name: 'Portfolio monitor' })),
  ).toBeVisible()
  // the timer-driven state machine completes without our help
  await expect(page.getByRole('heading', { name: 'Portfolio monitor' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText(/102 answers/)).toBeVisible()
})

test('cancel: the run becomes cancelled and is kept in Runs, honestly rendered', async ({
  page,
}) => {
  await fresh(page)
  await page.getByRole('button', { name: 'Run analysis' }).click()
  await expect(page.getByRole('heading', { name: 'Running the analysis' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel run' }).click()
  await expect(page).toHaveURL(/\/erm\/runs$/)
  const row = page.locator('div', { hasText: 'cancelled' }).first()
  await expect(row).toBeVisible()
  // revisit the cancelled run: kept as a record, no answers claimed
  await page.getByRole('link', { name: 'View results' }).first().click()
  await expect(page.getByText(/cancelled before completion/)).toBeVisible()
})

test('deep entry to a run URL renders the frozen results', async ({ page }) => {
  await fresh(page, RUN)
  await expect(page.getByRole('heading', { name: 'Portfolio monitor' })).toBeVisible()
  await expect(page.getByText('87 stated')).toBeVisible()
  await expect(page.getByText('7 derived')).toBeVisible()
  await expect(page.getByText('8 unsupported').first()).toBeVisible()
})

test('population disclosure: criteria, named exclusions, amber indeterminate', async ({ page }) => {
  await fresh(page, RUN)
  await page.getByRole('button', { name: /Population — why these borrowers/ }).click()
  await expect(page.getByText('excluded — no documents on system as of the run')).toBeVisible()
  await expect(
    page.getByText('excluded — outside selected portfolio (Wealth Management)'),
  ).toBeVisible()
  await expect(page.getByText('excluded — no exposure at the as-of date')).toBeVisible()
  await expect(
    page.getByText(/insufficient look-through information; included in the count/),
  ).toBeVisible()
  await expect(page.getByText(/6 included · 3 excluded · 1 indeterminate/)).toBeVisible()
})

test('group-by: two renderings of the same answer store', async ({ page }) => {
  await fresh(page, RUN)
  const table = page.getByTestId('erm-monitor')
  // by borrower: Ambervale's derived headroom cell
  await expect(table.locator('tr[data-rxm="RXM-5120"]')).toContainText('0.4x')
  // by question: the same answer, same value and grade
  await page.getByRole('tab', { name: 'By question' }).click()
  const block = page
    .locator('div', { hasText: 'What covenant headroom exists at the latest test?' })
    .last()
  await expect(page.getByText('What covenant headroom exists at the latest test?')).toBeVisible()
  const row = page.locator('div').filter({ hasText: /^derivedAmbervale Foods Group0\.4x$/ })
  await expect(row).toHaveCount(1)
  await page.getByRole('tab', { name: 'By borrower' }).click()
  await expect(table).toBeVisible()
  void block
})

test('flags default sort + pair-aware column sort (expansion travels with its row)', async ({
  page,
}) => {
  await fresh(page, RUN)
  const rows = page.locator('tr[data-rxm]')
  await expect(rows.first()).toHaveAttribute('data-rxm', 'RXM-6292') // most flags first
  // open Redfenn's expansion, then sort by Borrower — the pair moves together
  await rows.first().click()
  await expect(page.locator('tr[data-expansion="RXM-6292"]')).toBeVisible()
  await page.getByRole('columnheader', { name: /^Borrower/ }).click()
  await page.getByRole('columnheader', { name: /^Borrower/ }).click() // asc
  const order = await page
    .locator('tr[data-rxm]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-rxm')))
  expect(order[0]).toBe('RXM-5120') // Ambervale first alphabetically
  const redfenn = page.locator('tr[data-rxm="RXM-6292"]')
  const expansion = page.locator('tr[data-expansion="RXM-6292"]')
  await expect(expansion).toBeVisible()
  // the expansion row is the data row's immediate sibling after sorting
  const paired = await redfenn.evaluate((el) =>
    el.nextElementSibling?.getAttribute('data-expansion'),
  )
  expect(paired).toBe('RXM-6292')
})

test('expansion: all 17 answers with grade + conf chips; detail modal chains to source', async ({
  page,
}) => {
  await fresh(page, RUN)
  await page.locator('tr[data-rxm="RXM-5120"]').click()
  const x = page.locator('tr[data-expansion="RXM-5120"]')
  await expect(x).toBeVisible()
  await expect(x.getByText('Covenant Headroom', { exact: true })).toBeVisible()
  await expect(x.getByText('derived').first()).toBeVisible()
  await expect(x.getByText(/conf medium/).first()).toBeVisible()
  await expect(
    x.getByText(/stated \(quote passes entailment\) · derived \(computed from stated inputs\)/),
  ).toBeVisible()
  await x.getByRole('button', { name: 'Detail & evidence →' }).click()
  const modal = page.getByRole('dialog', { name: /Ambervale Foods Group — covenant headroom/ })
  await expect(modal).toBeVisible()
  await expect(modal.getByText('Memo facts')).toBeVisible()
  await expect(modal.getByText('Basis')).toBeVisible()
  await expect(
    modal.getByText(/The June compliance certificate has not been provided/),
  ).toBeVisible()
  // View source chains the source-image modal; Escape closes top-most only
  await modal.getByRole('button', { name: 'View source →' }).first().click()
  const source = page.getByRole('dialog', { name: /Covenant Compliance/ })
  await expect(source).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(source).toHaveCount(0)
  await expect(modal).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
})

test('runs: newest first, frozen revisit of a historical run', async ({ page }) => {
  await fresh(page, '/erm/runs')
  await expect(page.getByRole('heading', { name: 'Runs', exact: true })).toBeVisible()
  await expect(page.getByText('Covenant sweep')).toBeVisible()
  const rows = page.getByRole('link', { name: 'View results' })
  await expect(rows).toHaveCount(3)
  await rows.nth(1).click() // the covenant sweep
  await expect(page.getByRole('heading', { name: 'Portfolio monitor' })).toBeVisible()
  await expect(page.getByText(/Covenant sweep · 5 questions/)).toBeVisible()
  await expect(page.getByText(/20 answers/)).toBeVisible()
})

test('documents: lens grouping, collapse, search, extraction and raw viewers', async ({ page }) => {
  await fresh(page, '/erm/documents')
  await expect(
    page.getByText('17 documents · 7 borrowers on system for ERM', { exact: false }),
  ).toBeVisible()
  // first group open with 3 visible then scroll; chips are data-driven
  await expect(page.getByText('Ambervale_Foods_Annual_Review_FY25.pdf')).toBeVisible()
  await expect(page.getByText('in monitor scope').first()).toBeVisible()
  // 3 documents visible then scroll: the group body is a scroll container
  const body = page.locator('.max-h-\\[176px\\]').first()
  expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
  // collapse the group
  await page.getByRole('button', { name: /Ambervale Foods Group/ }).click()
  await expect(page.getByText('Ambervale_Foods_Annual_Review_FY25.pdf')).toBeHidden()
  // expand another and open the extraction viewer
  await page.getByRole('button', { name: /Torvane Aggregates/ }).click()
  const row = page
    .locator('div', { hasText: 'Torvane_Aggregates_Credit_Agreement_2026.pdf' })
    .last()
  await row.getByRole('button', { name: 'View extraction' }).click()
  await expect(
    page.getByRole('dialog', { name: /Torvane_Aggregates_Credit_Agreement_2026\.pdf/ }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  // raw viewer renders placeholder pages with provenance
  await row.getByRole('button', { name: 'Raw document' }).click()
  const raw = page.getByRole('dialog', { name: /raw document/ })
  await expect(raw).toBeVisible()
  await expect(raw.getByText('page image')).toBeVisible()
  await expect(raw.getByText(/Showing 3 of 54 pages/)).toBeVisible()
  await page.keyboard.press('Escape')
  // RXM search narrows to one borrower
  await page.getByLabel('Search documents').fill('6292')
  await expect(page.getByRole('button', { name: /Redfenn Timber Holdings/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Torvane Aggregates/ })).toHaveCount(0)
})
