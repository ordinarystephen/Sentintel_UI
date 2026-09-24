/**
 * CPEA borrower scope + the single-question shape (demo feedback round,
 * concept r4 pins E15/E16, Inquiry r1 pin I3): the typeahead over the
 * borrower index (name or RXM) → the chip → the four dropdowns stood down
 * → the resolve line; a scoped run's accounting names the borrower
 * everywhere it shows; clearing restores the full scope; Documents' "Ask
 * about this borrower →" pre-scopes Start; a Prompt-only run renders
 * Borrower · RXM · Flags · Answer with no group-by toggle.
 */
import { expect, test, type Page } from '@playwright/test'

async function fresh(page: Page, path = '/erm') {
  // NOT an addInitScript: that would re-clear persisted state on every
  // navigation and delete the very run these tests assert on.
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(path)
  await page.evaluate(() => localStorage.removeItem('sentinel.mock.state'))
  await page.reload()
}

const UNSCOPED =
  'Will run against: IB Lending · All sub-portfolios · All regions — resolves to 6 borrowers · 11 documents'

test('typeahead → chip → dropdowns stand down → resolve line; clear restores the full scope', async ({
  page,
}) => {
  await fresh(page)
  const scopeLine = page.getByTestId('scope-line')
  await expect(scopeLine).toHaveText(UNSCOPED)
  const search = page.getByRole('combobox', { name: 'Borrower search' })
  await expect(page.getByText('Borrower — optional')).toBeVisible()

  // by name: substring, case-insensitive, filtered
  await search.fill('AMB')
  const list = page.getByRole('listbox', { name: 'Matching borrowers' })
  await expect(list.getByRole('option')).toHaveCount(1)
  await expect(list.getByRole('option', { name: /Ambervale Foods Group\s*RXM-5120/ })).toBeVisible()
  // by RXM, with or without the prefix
  await search.fill('4100')
  await expect(list.getByRole('option', { name: /Torvane Aggregates/ })).toBeVisible()
  await search.fill('rxm-5120')
  await list.getByRole('option', { name: /Ambervale Foods Group/ }).click()

  // the chip replaces the input: serif name, mono RXM, clear ✕ (focused)
  const chip = page.getByTestId('borrower-chip')
  await expect(chip).toContainText('Ambervale Foods Group')
  await expect(chip).toContainText('RXM-5120')
  await expect(search).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Clear borrower' })).toBeFocused()

  // the four dropdowns stand down: disabled AND dimmed
  const dropdowns = page.getByTestId('population-dropdowns')
  for (const name of ['Portfolio', 'Sub-portfolio', 'Region', 'As of'])
    await expect(dropdowns.getByRole('combobox', { name, exact: true })).toBeDisabled()
  expect(await dropdowns.evaluate((el) => getComputedStyle(el).opacity)).toBe('0.4')

  await expect(scopeLine).toHaveText(
    'Will run against: Ambervale Foods Group (RXM-5120) — resolves to 1 borrower · 5 documents',
  )

  // clear: the input returns (focused), the dropdowns return, the full scope returns
  await page.getByRole('button', { name: 'Clear borrower' }).click()
  await expect(page.getByRole('combobox', { name: 'Borrower search' })).toBeFocused()
  await expect(dropdowns.getByRole('combobox', { name: 'Portfolio', exact: true })).toBeEnabled()
  expect(await dropdowns.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
  await expect(scopeLine).toHaveText(UNSCOPED)
})

test('keyboard: arrows move, Enter picks, Escape closes; a miss says so', async ({ page }) => {
  await fresh(page)
  const search = page.getByRole('combobox', { name: 'Borrower search' })
  await search.fill('zzz')
  await expect(page.getByText('No borrower matches — try a name or an RXM.')).toBeVisible()
  await search.fill('rxm-')
  const list = page.getByRole('listbox', { name: 'Matching borrowers' })
  await expect(list.getByRole('option')).toHaveCount(7)
  await search.press('Escape')
  await expect(list).toHaveCount(0)
  await search.press('ArrowDown') // reopens on the first option
  await expect(list.getByRole('option').first()).toHaveAttribute('aria-selected', 'true')
  await search.press('ArrowDown')
  await search.press('Enter')
  await expect(page.getByTestId('borrower-chip')).toContainText('Veyland US Holdco LLC')
  await expect(page.getByTestId('scope-line')).toHaveText(
    'Will run against: Veyland US Holdco LLC (RXM-6430) — resolves to 1 borrower · 4 documents',
  )
})

test('a scoped run names the borrower as its criterion — processing, results, disclosure, Runs', async ({
  page,
}) => {
  await fresh(page)
  await page.getByRole('combobox', { name: 'Borrower search' }).fill('Veyland')
  await page.getByRole('option', { name: /Veyland US Holdco LLC/ }).click()
  await page
    .getByRole('radiogroup', { name: 'Question mode' })
    .getByRole('radio', { name: 'Question set' })
    .click()
  await page.getByRole('button', { name: 'Run analysis' }).click()
  await expect(page.getByRole('heading', { name: 'Running the analysis' })).toBeVisible()
  await expect(
    page.getByText(
      'Quarterly credit pulse · 17 questions · Veyland US Holdco LLC (RXM-6430) — 1 borrower, 4 documents.',
    ),
  ).toBeVisible()
  // one arc, one results anatomy: the monitor, with one row
  await expect(page.getByRole('heading', { name: 'Portfolio monitor' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.locator('tr[data-rxm]')).toHaveCount(1)
  await expect(page.locator('tr[data-rxm="RXM-6430"]')).toBeVisible()
  await expect(
    page.getByText(/1 borrower analyzed · 4 documents · 17 questions · 17 answers/),
  ).toBeVisible()
  // the accounting still states itself, however trivially
  const disclosure = page.getByRole('button', { name: /Population — why these borrowers/ })
  await expect(disclosure).toContainText('1 included · 0 excluded · 0 indeterminate')
  await disclosure.click()
  await expect(
    page.getByText(
      'Criteria: Veyland US Holdco LLC (RXM-6430) — the borrower you named, with all of their documents on system. One borrower in scope; nothing excluded.',
    ),
  ).toBeVisible()
  // and the run is a record that says what it was scoped to
  await page
    .getByRole('navigation', { name: 'Credit Portfolio Event Assessment navigation' })
    .getByRole('link', { name: 'Runs' })
    .click()
  await expect(
    page.getByText('Veyland US Holdco LLC (RXM-6430) — 1 borrower · 4 documents'),
  ).toBeVisible()
})

test('Prompt only asks ONE question: the single-question shape, no group-by toggle', async ({
  page,
}) => {
  await fresh(page)
  await page
    .getByLabel('Prompt')
    .fill('Which borrowers face refinancing risk in the next 12 months?')
  await page.getByRole('button', { name: 'Run analysis' }).click()
  await expect(page.getByRole('heading', { name: 'Running the analysis' })).toBeVisible()
  await expect(
    page.getByText(/One-off question · IB Lending — 6 borrowers, 11 documents\./),
  ).toBeVisible()
  await expect(page.getByText('Running the question across 11 documents')).toBeVisible()
  await expect(page.getByTestId('single-question-table')).toBeVisible({ timeout: 15_000 })
  const headers = await page
    .getByTestId('single-question-table')
    .getByRole('columnheader')
    .allTextContents()
  expect(headers.map((h) => h.replace(/ [↓↑]$/, ''))).toEqual([
    'Borrower',
    'RXM',
    'Flags',
    'Answer',
  ])
  await expect(page.getByRole('tab', { name: 'By question' })).toHaveCount(0)
  await expect(page.getByText('One-off question')).toBeVisible()
  await expect(
    page.getByText('"Which borrowers face refinancing risk in the next 12 months?"'),
  ).toBeVisible()
  await expect(
    page.getByText(/6 borrowers analyzed · 11 documents · 1 question · 6 answers/),
  ).toBeVisible()
  // most flags first: Redfenn's ungrounded answer leads, amber em-dash in the row
  const rows = page.locator('tr[data-rxm]')
  await expect(rows).toHaveCount(6)
  await expect(rows.first()).toHaveAttribute('data-rxm', 'RXM-6292')
  // expansion: the full answer with grade + confidence, then Detail & evidence
  await page.locator('tr[data-rxm="RXM-6430"]').click()
  const x = page.locator('tr[data-expansion="RXM-6430"]')
  await expect(x).toContainText('revolver renewal due Q2 2027')
  await expect(x.getByText('derived', { exact: true })).toBeVisible()
  await expect(x.getByText('conf medium')).toBeVisible()
  await x.getByRole('button', { name: 'Detail & evidence →' }).click()
  const modal = page.getByRole('dialog', { name: 'Veyland US Holdco LLC — answer' })
  await expect(modal).toBeVisible()
  await expect(modal.getByText('Evidence (2)')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
})

test('Prompt only with nothing typed asks for a question — no silent 17-question run', async ({
  page,
}) => {
  await fresh(page)
  await page.getByRole('button', { name: 'Run analysis' }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'Type a question first — or choose a question set.',
  )
  await expect(page).toHaveURL(/\/erm$/)
  // typing clears the prompt to act
  await page.getByLabel('Prompt').fill('Anything?')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('Documents: "Ask about this borrower →" on every group pre-scopes Start', async ({ page }) => {
  await fresh(page, '/erm/documents')
  await expect(page.getByRole('button', { name: 'Ask about this borrower →' })).toHaveCount(7)
  // the first group is open; asking from it navigates without collapsing first
  const ambervale = page.getByRole('button', { name: /Ambervale Foods Group/ }).first()
  await expect(ambervale).toHaveAttribute('aria-expanded', 'true')
  // a collapsed group's shortcut: Torvane, one document
  const torvaneRow = page
    .locator('div', { has: page.getByRole('heading', { name: 'Torvane Aggregates' }) })
    .last()
  await torvaneRow.getByRole('button', { name: 'Ask about this borrower →' }).click()
  await expect(page).toHaveURL(/\/erm$/)
  await expect(page.getByRole('heading', { name: 'Start a portfolio analysis' })).toBeVisible()
  await expect(page.getByTestId('borrower-chip')).toContainText('Torvane Aggregates')
  await expect(page.getByTestId('borrower-chip')).toContainText('RXM-4100')
  await expect(page.getByTestId('scope-line')).toHaveText(
    'Will run against: Torvane Aggregates (RXM-4100) — resolves to 1 borrower · 1 document',
  )
  await expect(
    page.getByTestId('population-dropdowns').getByRole('combobox', { name: 'Region' }),
  ).toBeDisabled()
})

// ---- review regressions (v1.8) ----

test('Enter right after typing never picks the previous query’s match', async ({ page }) => {
  await fresh(page)
  const search = page.getByRole('combobox', { name: 'Borrower search' })
  await search.fill('amb')
  await expect(page.getByRole('option', { name: /Ambervale/ })).toBeVisible()
  await search.fill('torv')
  await search.press('Enter')
  await expect(page.getByTestId('borrower-chip')).toContainText('Torvane Aggregates')
})

test('the suggestion list sits on top of the blocks below: every option is hit-testable', async ({
  page,
}) => {
  await fresh(page)
  await page.getByRole('combobox', { name: 'Borrower search' }).fill('rxm')
  const options = page.getByRole('listbox', { name: 'Matching borrowers' }).getByRole('option')
  await expect(options).toHaveCount(7)
  // whatever sits under each option's centre must BE that option — not the
  // resolve line or the disclaimer painted over the list
  const covered = await options.evaluateAll((els) =>
    els
      .map((el) => {
        const r = el.getBoundingClientRect()
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
        return hit?.closest('[role="option"]') === el ? null : el.textContent
      })
      .filter(Boolean),
  )
  expect(covered).toEqual([])
  await options.last().click()
  await expect(page.getByTestId('borrower-chip')).toContainText('Farrowdale Logistics')
})

test('a scoped run never narrows Documents: the whole lens remains', async ({ page }) => {
  await fresh(page, '/erm/documents')
  await expect(page.getByRole('button', { name: 'Ask about this borrower →' })).toHaveCount(7)
  await page.getByRole('button', { name: 'Ask about this borrower →' }).nth(1).click()
  await page.getByLabel('Prompt').fill('Any maturities inside 12 months?')
  await page.getByRole('button', { name: 'Run analysis' }).click()
  await expect(page.getByTestId('single-question-table')).toBeVisible({ timeout: 15_000 })
  await page.goto('/erm/documents')
  await expect(
    page.getByText('17 documents · 7 borrowers on system for this application', { exact: false }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ask about this borrower →' })).toHaveCount(7)
})

test('switching applications never carries a typed question or a borrower scope', async ({
  page,
}) => {
  await fresh(page)
  await page.getByLabel('Prompt').fill('CPEA-only prompt text')
  await page.getByRole('combobox', { name: 'Borrower search' }).fill('amber')
  await page.getByRole('option', { name: /Ambervale/ }).click()
  await page.getByRole('button', { name: 'Switch application' }).click()
  await page
    .getByRole('menu')
    .getByRole('menuitem', { name: /Inquiry/ })
    .click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ask a question of the portfolio' }),
  ).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Your question' })).toHaveValue('')
  await expect(page.getByTestId('borrower-chip')).toHaveCount(0)
  await expect(page.getByTestId('scope-line')).toContainText('resolves to 6 borrowers')
})
